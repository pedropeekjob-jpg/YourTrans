// Servidor comunitário mínimo, sem dependências (Node >= 22.5).
// Guarda apenas o que as pessoas escolhem partilhar, sempre anónimo. Não guarda IPs.
// Pré-moderação automática (moderation.mjs, corre só aqui): o que passa limpo é
// publicado logo; o que levanta suspeitas fica à espera de uma pessoa em /mod.
// Qualquer pessoa pode denunciar o que já está publicado e volta para a fila.
import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALWAYS_HUMAN, fingerprint, screen } from './moderation.mjs'
import { authorTag, clientIp, contactsEncrypted, openField, sealField, validAuthor } from './privacy.mjs'
import { backupConfigured, runBackup } from './backup.mjs'
import { K_EXPERIENCE, SEAL_MIN_REVIEWS, SEAL_MONTHS, SEAL_QUESTIONS, SEAL_THRESHOLD, STAGE_QUESTIONS, pick, validators } from './validation.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 8787)
const MOD_TOKEN = process.env.MOD_TOKEN ?? ''
/**
 * Um código por pessoa moderadora: MOD_TOKENS="Ana:código1,Rui:código2". Cada ação fica
 * registada com o nome. MOD_TOKEN (o antigo, partilhado) continua a funcionar como "equipa".
 */
const MODERATORS = [
  ...(MOD_TOKEN ? [['equipa', MOD_TOKEN]] : []),
  ...(process.env.MOD_TOKENS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(s => [s.slice(0, s.indexOf(':')).trim(), s.slice(s.indexOf(':') + 1).trim()])
    .filter(([name, token]) => name && token.length >= 16),
]
/** Origens autorizadas, separadas por vírgulas (ex.: https://casulo.space,https://www.casulo.space). */
const ORIGINS = (process.env.ALLOWED_ORIGIN ?? '*').split(',').map(s => s.trim()).filter(Boolean)
const DB_PATH = process.env.DB_PATH ?? join(here, 'data', 'community.db')
const K_ANON = 5 // mínimo de relatos para mostrar uma estatística
/** AUTO_MODERATION=off volta a pôr tudo à espera de aprovação humana. */
const AUTO = (process.env.AUTO_MODERATION ?? 'on') !== 'off'
/**
 * Denúncias de pessoas diferentes precisas para tirar algo do ar: 2 no que foi publicado
 * automaticamente, 3 no que uma pessoa aprovou. Com uma só, um troll conseguia esvaziar a
 * comunidade. O que tem sinais de risco (ameaça, autolesão) não chega a ser publicado sozinho.
 */
const REPORTS_TO_HIDE_AUTO = 2
const REPORTS_TO_HIDE = 3
/** Envios por hora e por ligação (os testes sobem-no). */
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 30)

mkdirSync(dirname(DB_PATH), { recursive: true })
const db = new DatabaseSync(DB_PATH)
// WAL: as leituras não esperam pelas escritas (e vice-versa).
db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 3000;')
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    flags TEXT NOT NULL DEFAULT '[]',
    month TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_type_status ON submissions(type, status);
  CREATE TABLE IF NOT EXISTS support (story_id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
  -- Quem já denunciou cada envio: um código que muda todos os dias, nunca o IP.
  CREATE TABLE IF NOT EXISTS reports (submission_id TEXT NOT NULL, reporter TEXT NOT NULL, PRIMARY KEY (submission_id, reporter));
  -- Registo das ações de moderação (quem, o quê, quando), guardado 12 meses.
  CREATE TABLE IF NOT EXISTS mod_log (at TEXT NOT NULL, moderator TEXT NOT NULL, action TEXT NOT NULL, submission_id TEXT, type TEXT);
`)
// Colunas acrescentadas depois da primeira versão (bases de dados já existentes).
const cols = new Set(db.prepare('PRAGMA table_info(submissions)').all().map(c => c.name))
if (!cols.has('auto')) db.exec('ALTER TABLE submissions ADD COLUMN auto INTEGER NOT NULL DEFAULT 0')
if (!cols.has('reports')) db.exec('ALTER TABLE submissions ADD COLUMN reports INTEGER NOT NULL DEFAULT 0')
if (!cols.has('fp')) db.exec('ALTER TABLE submissions ADD COLUMN fp TEXT')
// Assinatura pública de quem publicou (ver authorTag em privacy.mjs), para bloquear e moderar.
if (!cols.has('author')) db.exec('ALTER TABLE submissions ADD COLUMN author TEXT')
db.exec(`
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS banned (author TEXT PRIMARY KEY, at TEXT NOT NULL, moderator TEXT NOT NULL);
`)
/** Segredo do servidor para as assinaturas: criado uma vez e guardado na base de dados. */
const AUTHOR_SECRET = (() => {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'author-secret'").get()
  if (row) return row.value
  const v = randomBytes(32).toString('base64url')
  db.prepare("INSERT INTO meta (key, value) VALUES ('author-secret', ?)").run(v)
  return v
})()
const isBanned = tag => !!tag && !!db.prepare('SELECT 1 FROM banned WHERE author = ?').get(tag)
// Procura de textos repetidos (corre a cada envio).
db.exec('CREATE INDEX IF NOT EXISTS idx_type_fp ON submissions(type, fp)')

/* ---------- validação (validation.mjs) ---------- */

/* ---------- pré-moderação automática ---------- */

/** Sinais de um envio: os do filtro mais "repetido" se o mesmo texto já foi enviado. */
function flagsFor(type, payload, id = '') {
  const flags = screen(type, payload)
  const fp = fingerprint(type, payload)
  if (fp.length >= 12 && db.prepare('SELECT 1 FROM submissions WHERE type = ? AND fp = ? AND id != ?').get(type, fp, id)) flags.push('repetido')
  return { flags, fp }
}

/** Tipos que só a equipa lê: nunca são publicados. */
const RECEIVED_ONLY = new Set(['incident', 'wish'])

/** Decide o estado: publicado se estiver limpo e o tipo o permitir, senão fica à espera. */
const decide = (type, flags) => RECEIVED_ONLY.has(type) ? 'received' : AUTO && !ALWAYS_HUMAN.has(type) && flags.length === 0 ? 'approved' : 'pending'

/** Passa pelo filtro o que já estava à espera (ao arrancar, ou a pedido em /mod). */
export function retriage() {
  const rows = db.prepare("SELECT id, type, payload, reports, author FROM submissions WHERE status = 'pending' ORDER BY rowid").all()
  let published = 0
  for (const r of rows) {
    const payload = JSON.parse(r.payload)
    const { flags, fp } = flagsFor(r.type, payload, r.id)
    if (r.reports > 0) flags.push('denunciado') // o que foi denunciado só volta com uma pessoa
    if (isBanned(r.author)) flags.push('autor bloqueado')
    const status = decide(r.type, flags)
    db.prepare('UPDATE submissions SET status = ?, flags = ?, fp = ?, auto = ? WHERE id = ?').run(status, JSON.stringify(flags), fp, status === 'approved' ? 1 : 0, r.id)
    if (status === 'approved') published++
  }
  return { checked: rows.length, published, waiting: rows.length - published }
}

/* ---------- limite de pedidos sem guardar IPs ---------- */

let salt = randomBytes(16)
let saltDay = new Date().toDateString()
const hits = new Map()
/** Código da ligação de hoje: o IP misturado com um sal que muda todos os dias e nunca é guardado. */
function visitorKey(req) {
  const today = new Date().toDateString()
  if (today !== saltDay) { salt = randomBytes(16); saltDay = today; hits.clear() }
  return createHash('sha256').update(salt).update(clientIp(req)).digest('base64')
}
function limited(req) {
  const key = visitorKey(req)
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter(t => now - t < 3600_000)
  list.push(now)
  hits.set(key, list)
  return list.length > RATE_LIMIT
}

/* ---------- leitura pública (só aprovado) ---------- */

function stories() {
  const rows = db.prepare("SELECT id, payload, month, author FROM submissions WHERE type = 'story' AND status = 'approved' ORDER BY rowid DESC").all()
  // Respostas agrupadas por testemunho de uma vez (antes: uma procura na lista toda por testemunho).
  const replies = new Map()
  for (const r of db.prepare("SELECT id, payload, month, author FROM submissions WHERE type = 'reply' AND status = 'approved' ORDER BY rowid").all()) {
    const { storyId, body, nickname } = JSON.parse(r.payload)
    replies.set(storyId, [...(replies.get(storyId) ?? []), { id: r.id, body, nickname, month: r.month, author: r.author ?? undefined }])
  }
  const support = new Map(db.prepare('SELECT story_id, count FROM support').all().map(r => [r.story_id, r.count]))
  return rows.map(r => ({
    id: r.id, month: r.month, ...JSON.parse(r.payload), author: r.author ?? undefined, support: support.get(r.id) ?? 0,
    replies: replies.get(r.id) ?? [],
  }))
}

const isApprovedStory = id => !!db.prepare("SELECT 1 FROM submissions WHERE id = ? AND type = 'story' AND status = 'approved'").get(id)

const approved = type => db.prepare("SELECT id, payload FROM submissions WHERE type = ? AND status = 'approved'").all(type)
  .map(r => ({ id: r.id, ...JSON.parse(r.payload) }))

function providers() {
  const reviews = new Map()
  for (const r of approved('review')) reviews.set(r.providerId, [...(reviews.get(r.providerId) ?? []), r])
  return approved('provider').map(p => {
    const rs = reviews.get(p.id) ?? []
    const scores = {}
    if (rs.length) for (const k of ['nomeCerto', 'semJulgamento', 'conhecimento', 'recomendaria']) scores[k] = rs.filter(r => r.answers[k]).length / rs.length
    return { ...p, source: 'comunidade', reviewCount: rs.length, scores: rs.length ? scores : undefined }
  })
}

function employers() {
  const by = new Map()
  for (const r of approved('employer')) {
    const k = r.company.toLowerCase()
    const vals = Object.values(r.answers)
    const s = vals.length ? vals.filter(Boolean).length / 8 : 0
    const cur = by.get(k) ?? { company: r.company, total: 0, reviews: 0 }
    cur.total += Math.min(1, s); cur.reviews++
    by.set(k, cur)
  }
  return [...by.values()].filter(e => e.reviews >= 3).map(e => ({ company: e.company, score: e.total / e.reviews, reviews: e.reviews })).sort((a, b) => b.score - a.score)
}

/**
 * Entidades registadas para o selo, com o estado calculado a partir das avaliações:
 * "selo" (3+ avaliações recentes e 80%+ em cada pergunta), "em-avaliacao" (ainda poucas)
 * ou "sem-selo" (avaliações abaixo do mínimo: o selo cai sozinho se a experiência piorar).
 * O e-mail de contacto nunca sai do servidor.
 */
export function entities() {
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - SEAL_MONTHS)
  const from = since.toISOString().slice(0, 7)
  const reviews = db.prepare("SELECT id, payload, month, author FROM submissions WHERE type = 'sealReview' AND status = 'approved' ORDER BY rowid DESC").all()
    .map(r => ({ id: r.id, month: r.month, author: r.author ?? undefined, ...JSON.parse(r.payload) }))
  return db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'entity' AND status = 'approved' ORDER BY rowid DESC").all().map(r => {
    const { contact, commitments, ...e } = JSON.parse(r.payload)
    const all = reviews.filter(x => x.entityId === r.id)
    const rs = all.filter(x => x.month >= from)
    const scores = {}
    for (const k of SEAL_QUESTIONS) {
      const answered = rs.filter(x => typeof x.answers[k] === 'boolean')
      if (answered.length) scores[k] = answered.filter(x => x.answers[k]).length / answered.length
    }
    const enough = rs.length >= SEAL_MIN_REVIEWS
    const seal = !enough ? 'em-avaliacao' : Object.values(scores).every(v => v >= SEAL_THRESHOLD) ? 'selo' : 'sem-selo'
    return {
      id: r.id, since: r.month, ...e, commitments: Object.keys(commitments ?? {}), seal, reviewCount: rs.length,
      scores: enough ? scores : undefined,
      comments: all.filter(x => x.comment).slice(0, 20).map(x => ({ id: x.id, month: x.month, comment: x.comment, author: x.author })),
    }
  })
}

/** Intervalos por parte do percurso, só com K_EXPERIENCE ou mais relatos (nunca valores individuais). */
export function experienceStats() {
  const groups = new Map()
  for (const r of approved('experience')) {
    const k = [r.track, r.kind, r.sector, r.item ?? ''].join('|')
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  const out = []
  for (const rs of groups.values()) {
    if (rs.length < K_EXPERIENCE) continue
    const v = rs.map(r => r.value).sort((a, b) => a - b)
    const mid = Math.floor(v.length / 2)
    const years = rs.map(r => r.year)
    const { track, kind, sector, item } = rs[0]
    out.push({ track, kind, sector, item, n: v.length, min: v[0], max: v[v.length - 1], median: v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2), fromYear: Math.min(...years), toYear: Math.max(...years) })
  }
  return out
}

/** Avaliações de cada etapa: percentagens só com K_EXPERIENCE ou mais; comentários moderados. */
export function stageReviews() {
  const by = new Map()
  for (const r of db.prepare("SELECT id, payload, month, author FROM submissions WHERE type = 'stageReview' AND status = 'approved' ORDER BY rowid DESC").all()) {
    const p = { id: r.id, month: r.month, author: r.author ?? undefined, ...JSON.parse(r.payload) }
    by.set(p.track, [...(by.get(p.track) ?? []), p])
  }
  return [...by.entries()].map(([track, rs]) => ({
    track, n: rs.length,
    scores: rs.length >= K_EXPERIENCE ? Object.fromEntries(STAGE_QUESTIONS.map(k => [k, rs.filter(r => r.answers[k]).length / rs.length])) : undefined,
    comments: rs.filter(r => r.comment).slice(0, 30).map(r => ({ id: r.id, month: r.month, comment: r.comment, author: r.author })),
  }))
}

function incidentStats() {
  const rows = db.prepare("SELECT payload, month FROM submissions WHERE type = 'incident'").all().map(r => ({ ...JSON.parse(r.payload), month: r.month }))
  const count = key => {
    const m = {}
    for (const r of rows) m[r[key]] = (m[r[key]] ?? 0) + 1
    return Object.fromEntries(Object.entries(m).filter(([, n]) => n >= K_ANON))
  }
  return { total: rows.length, byKind: count('kind'), bySetting: count('setting'), byDistrict: count('district'), byMonth: count('month') }
}

/* ---------- prazos de conservação ---------- */

/** Pedidos de mentoria (têm contacto) são apagados ao fim de 6 meses; sugestões ao fim de 12. */
function purgeOld() {
  const d = new Date(); d.setMonth(d.getMonth() - 6)
  const six = d.toISOString().slice(0, 7)
  db.prepare("DELETE FROM submissions WHERE type = 'mentorship' AND month < ?").run(six)
  // Pedidos de selo que nunca foram aprovados (têm e-mail): apagados ao fim de 6 meses.
  db.prepare("DELETE FROM submissions WHERE type = 'entity' AND status != 'approved' AND month < ?").run(six)
  // Incidentes: ao fim de 12 meses fica só o que conta para as estatísticas, sem a descrição.
  const y1 = new Date(); y1.setMonth(y1.getMonth() - 12)
  for (const r of db.prepare(`SELECT id, payload FROM submissions WHERE type = 'incident' AND month < ? AND payload LIKE '%"description"%'`).all(y1.toISOString().slice(0, 7))) {
    const { description, ...rest } = JSON.parse(r.payload)
    db.prepare('UPDATE submissions SET payload = ? WHERE id = ?').run(JSON.stringify(rest), r.id)
  }
  db.prepare('DELETE FROM mod_log WHERE at < ?').run(y1.toISOString())
  db.prepare('DELETE FROM reports WHERE submission_id NOT IN (SELECT id FROM submissions)').run()
  // Sugestões "procurei e não encontrei": apagadas ao fim de 12 meses.
  const y = new Date(); y.setMonth(y.getMonth() - 12)
  db.prepare("DELETE FROM submissions WHERE type = 'wish' AND month < ?").run(y.toISOString().slice(0, 7))
}
purgeOld()
setInterval(() => { purgeOld(); publicCache.clear() }, 86_400_000).unref()

/* ---------- HTTP ---------- */

function allowOrigin(req) {
  if (ORIGINS.includes('*')) return '*'
  const o = req?.headers.origin
  return o && ORIGINS.includes(o) ? o : ORIGINS[0]
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': allowOrigin(res.req),
    vary: 'Origin',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

async function readBody(req) {
  let size = 0
  const chunks = []
  for await (const c of req) {
    size += c.length
    if (size > 16_384) throw new Error('too large')
    chunks.push(c)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

/** Nome de quem modera (ou null): compara o código com todos, em tempo constante. */
function moderator(req) {
  const h = req.headers.authorization ?? ''
  const token = Buffer.from(h.startsWith('Bearer ') ? h.slice(7) : '')
  let who = null
  for (const [name, t] of MODERATORS) {
    const tb = Buffer.from(t)
    if (tb.length === token.length && timingSafeEqual(tb, token)) who = name
  }
  return who
}
const isMod = req => moderator(req) !== null

function logAction(who, action, id) {
  const row = id ? db.prepare('SELECT type FROM submissions WHERE id = ?').get(id) : undefined
  db.prepare('INSERT INTO mod_log (at, moderator, action, submission_id, type) VALUES (?, ?, ?, ?, ?)').run(new Date().toISOString(), who, action, id ?? null, row?.type ?? null)
}

/** Campos de contacto: cifrados na base de dados, decifrados só para a moderação. */
const CONTACT_FIELD = { mentorship: 'contact', entity: 'contact' }
function sealContacts(type, payload) {
  const f = CONTACT_FIELD[type]
  return f && payload[f] ? { ...payload, [f]: sealField(payload[f]) } : payload
}
function openContacts(type, payload) {
  const f = CONTACT_FIELD[type]
  return f && payload[f] ? { ...payload, [f]: openField(payload[f]) } : payload
}

/* ---------- leituras públicas em cache ---------- */

/**
 * As leituras públicas são calculadas a partir da base de dados toda. Guardamos o resultado
 * durante 30 s e esquecemo-lo a cada escrita (envio, apoio, denúncia, moderação), para que
 * muitas pessoas a abrir a app ao mesmo tempo não repitam o mesmo trabalho.
 */
const PUBLIC_TTL = 30_000
const publicCache = new Map()
function cached(path, compute) {
  const hit = publicCache.get(path)
  if (hit && Date.now() - hit.at < PUBLIC_TTL) return hit.data
  const data = compute()
  publicCache.set(path, { at: Date.now(), data })
  return data
}
const invalidate = () => publicCache.clear()

const publicRoutes = {
  '/api/providers': () => providers(),
  '/api/places': () => approved('place').map(p => ({ ...p, source: 'comunidade' })),
  '/api/events': () => approved('event').filter(e => Date.parse(e.date) > Date.now() - 86_400_000),
  '/api/employers': () => employers(),
  '/api/stories': () => stories(),
  '/api/experiences': () => experienceStats(),
  '/api/stage-reviews': () => stageReviews(),
  '/api/entities': () => entities(),
  '/api/incidents/stats': () => incidentStats(),
}

const postRoutes = { '/api/stories': 'story', '/api/replies': 'reply', '/api/providers': 'provider', '/api/reviews': 'review', '/api/places': 'place', '/api/events': 'event', '/api/incidents': 'incident', '/api/mentorship': 'mentorship', '/api/employers': 'employer', '/api/experiences': 'experience', '/api/stage-reviews': 'stageReview', '/api/entities': 'entity', '/api/seal-reviews': 'sealReview', '/api/wishes': 'wish' }

export const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const path = url.pathname
  try {
    if (req.method === 'OPTIONS') return send(res, 204)

    if (req.method === 'GET') {
      if (path === '/api/health') return send(res, 200, { ok: true })
      if (publicRoutes[path]) return send(res, 200, cached(path, publicRoutes[path]))
      if (path === '/mod') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' })
        return res.end(readFileSync(join(here, 'mod.html')))
      }
      if (path === '/api/mod/log') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        return send(res, 200, db.prepare('SELECT at, moderator, action, submission_id AS id, type FROM mod_log ORDER BY at DESC LIMIT 300').all())
      }
      if (path === '/api/mod/queue') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const status = url.searchParams.get('status') ?? 'pending'
        const onlyAuto = url.searchParams.get('auto') === '1'
        const type = url.searchParams.get('type')
        const rows = db.prepare(`SELECT id, type, payload, status, flags, month, auto, reports, author FROM submissions WHERE status = ?${onlyAuto ? ' AND auto = 1' : ''}${type ? ' AND type = ?' : ''} ORDER BY rowid DESC LIMIT 200`).all(...(type ? [status, type] : [status]))
          .map(r => ({ ...r, payload: openContacts(r.type, JSON.parse(r.payload)), flags: JSON.parse(r.flags) }))
        // Risco de autolesão primeiro: pode haver alguém a precisar de resposta.
        const rank = r => (r.flags.includes('risco de autolesão') ? 0 : r.flags.includes('ameaça') ? 1 : 2)
        return send(res, 200, rows.sort((a, b) => rank(a) - rank(b)))
      }
    }

    if (req.method === 'POST') {
      invalidate()
      const type = postRoutes[path]
      if (type) {
        if (limited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        const body = await readBody(req)
        if (!validators[type](body)) return send(res, 400, { error: 'Dados inválidos' })
        const payload = pick[type](body)
        if (type === 'review' && !db.prepare("SELECT 1 FROM submissions WHERE id = ? AND type = 'provider' AND status = 'approved'").get(payload.providerId) && !payload.providerId.startsWith('pub-')) {
          return send(res, 404, { error: 'Profissional não encontrado' })
        }
        if (type === 'sealReview' && !db.prepare("SELECT 1 FROM submissions WHERE id = ? AND type = 'entity' AND status = 'approved'").get(payload.entityId)) {
          return send(res, 404, { error: 'Entidade não encontrada' })
        }
        if (type === 'reply' && !isApprovedStory(payload.storyId)) return send(res, 404, { error: 'Testemunho não encontrado' })
        const { flags, fp } = flagsFor(type, payload)
        const author = validAuthor(body.author) ? authorTag(body.author, AUTHOR_SECRET) : null
        // Quem foi bloqueado pela moderação continua a poder enviar, mas nada é publicado sem revisão.
        if (isBanned(author)) flags.push('autor bloqueado')
        // Relatos de incidentes contam logo para estatísticas (agregadas, k-anonimato);
        // as descrições só são vistas pela moderação.
        const status = decide(type, flags)
        db.prepare('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(randomBytes(9).toString('base64url'), type, JSON.stringify(sealContacts(type, payload)), status, JSON.stringify(flags), new Date().toISOString().slice(0, 7), status === 'approved' ? 1 : 0, fp, author)
        return send(res, 201, { ok: true, published: status === 'approved' })
      }
      const sup = path.match(/^\/api\/stories\/([\w-]+)\/support$/)
      if (sup) {
        if (limited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        if (!isApprovedStory(sup[1])) return send(res, 404, { error: 'Testemunho não encontrado' })
        db.prepare('INSERT INTO support (story_id, count) VALUES (?, 1) ON CONFLICT(story_id) DO UPDATE SET count = count + 1').run(sup[1])
        return send(res, 200, { ok: true, support: db.prepare('SELECT count FROM support WHERE story_id = ?').get(sup[1]).count })
      }
      const rep = path.match(/^\/api\/report\/([\w-]+)$/)
      if (rep) {
        if (limited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        const row = db.prepare("SELECT auto, reports, flags FROM submissions WHERE id = ? AND status = 'approved'").get(rep[1])
        if (!row) return send(res, 404, { error: 'Não encontrado' })
        // A mesma ligação só conta uma vez por dia para cada envio.
        const fresh = db.prepare('INSERT OR IGNORE INTO reports (submission_id, reporter) VALUES (?, ?)').run(rep[1], visitorKey(req)).changes > 0
        if (!fresh) return send(res, 200, { ok: true })
        const reports = row.reports + 1
        if (reports >= (row.auto ? REPORTS_TO_HIDE_AUTO : REPORTS_TO_HIDE)) {
          const flags = [...new Set([...JSON.parse(row.flags), 'denunciado'])]
          db.prepare("UPDATE submissions SET status = 'pending', reports = ?, flags = ? WHERE id = ?").run(reports, JSON.stringify(flags), rep[1])
        } else db.prepare('UPDATE submissions SET reports = ? WHERE id = ?').run(reports, rep[1])
        return send(res, 200, { ok: true })
      }
      if (path === '/api/mod/retriage') {
        const who = moderator(req)
        if (!who) return send(res, 401, { error: 'Sem autorização' })
        logAction(who, 'retriage')
        return send(res, 200, retriage())
      }
      const m = path.match(/^\/api\/mod\/([\w-]+)$/)
      if (m) {
        const who = moderator(req)
        if (!who) return send(res, 401, { error: 'Sem autorização' })
        const { action } = await readBody(req)
        if (['delete', 'reject', 'approve', 'hide', 'ban', 'unban'].includes(action)) logAction(who, action, m[1])
        if (action === 'ban' || action === 'unban') {
          const row = db.prepare('SELECT author FROM submissions WHERE id = ?').get(m[1])
          if (!row?.author) return send(res, 400, { error: 'Este envio não tem assinatura' })
          if (action === 'unban') { db.prepare('DELETE FROM banned WHERE author = ?').run(row.author); return send(res, 200, { ok: true }) }
          db.prepare('INSERT OR IGNORE INTO banned (author, at, moderator) VALUES (?, ?, ?)').run(row.author, new Date().toISOString(), who)
          // Tudo o que essa assinatura publicou volta para a fila.
          const hidden = db.prepare("UPDATE submissions SET status = 'pending', auto = 0 WHERE author = ? AND status = 'approved'").run(row.author).changes
          return send(res, 200, { ok: true, hidden })
        }
        // Rejeitar apaga logo o conteúdo: não guardamos o que não vai ser publicado.
        if (action === 'delete' || action === 'reject') db.prepare('DELETE FROM submissions WHERE id = ?').run(m[1])
        else if (action === 'approve') {
          db.prepare("UPDATE submissions SET status = 'approved', auto = 0, reports = 0 WHERE id = ?").run(m[1])
          db.prepare('DELETE FROM reports WHERE submission_id = ?').run(m[1])
        }
        else if (action === 'hide') db.prepare("UPDATE submissions SET status = 'pending', auto = 0 WHERE id = ?").run(m[1])
        else return send(res, 400, { error: 'Ação inválida' })
        return send(res, 200, { ok: true })
      }
    }
    send(res, 404, { error: 'Não encontrado' })
  } catch (e) {
    send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'JSON inválido' : 'Erro interno' })
  }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!MODERATORS.length) console.warn('Aviso: MOD_TOKEN/MOD_TOKENS não definidos, a moderação está desativada.')
  if (!contactsEncrypted) console.warn('Aviso: DATA_KEY não definido, os contactos ficam guardados sem cifra.')
  if (backupConfigured()) {
    const backup = () => runBackup(db, DB_PATH + '.backup').then(r => console.log(`Cópia de segurança enviada (${Math.round(r.bytes / 1024)} KB)`)).catch(e => console.error('Cópia de segurança falhou:', e.message))
    setTimeout(backup, 60_000).unref()
    setInterval(backup, 86_400_000).unref()
  } else console.warn('Aviso: cópias de segurança desligadas (faltam as variáveis R2_* e DATA_KEY).')
  if (AUTO) {
    const r = retriage()
    if (r.checked) console.log(`Fila revista: ${r.published} publicados automaticamente, ${r.waiting} à espera de moderação.`)
  }
  server.listen(PORT, () => console.log(`Servidor comunitário em http://localhost:${PORT}`))
}
