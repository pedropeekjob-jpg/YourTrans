// Servidor comunitário mínimo, sem dependências (Node >= 22.5).
// Guarda apenas o que as pessoas escolhem partilhar, sempre anónimo e
// sujeito a moderação humana antes de ser publicado. Não guarda IPs.
import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 8787)
const MOD_TOKEN = process.env.MOD_TOKEN ?? ''
/** Origens autorizadas, separadas por vírgulas (ex.: https://casulo.space,https://www.casulo.space). */
const ORIGINS = (process.env.ALLOWED_ORIGIN ?? '*').split(',').map(s => s.trim()).filter(Boolean)
const DB_PATH = process.env.DB_PATH ?? join(here, 'data', 'community.db')
const K_ANON = 5 // mínimo de relatos para mostrar uma estatística

mkdirSync(dirname(DB_PATH), { recursive: true })
const db = new DatabaseSync(DB_PATH)
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
`)

/* ---------- validação ---------- */

const str = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
const opt = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max)
const bool = v => typeof v === 'boolean'
/** Coordenadas opcionais, só em Portugal (continente, Açores e Madeira). */
const coord = (lat, lng) => (lat === undefined && lng === undefined) ||
  (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 29.5 && lat <= 42.5 && lng >= -31.8 && lng <= -6)
const r4 = n => (Number.isFinite(n) ? Math.round(n * 1e4) / 1e4 : undefined)
const PROVIDER_KINDS = ['Medicina geral', 'Endocrinologia', 'Psicologia', 'Psiquiatria', 'Cirurgia', 'Terapia da fala', 'Sexologia', 'Clínica']
const SHOWERS = ['individuais', 'comuns', 'ambos', 'sem']
const STORY_TOPICS = ['hormonas-e', 'hormonas-t', 'mastectomia', 'mamoplastia', 'vaginoplastia', 'faloplastia', 'histerectomia', 'ffs', 'voz', 'emocional', 'outro']
const STORY_PHASES = ['antes', 'primeiros-dias', 'semanas', 'meses', 'ano']

const validators = {
  provider: b => str(b.name, 3, 160) && PROVIDER_KINDS.includes(b.kind) && str(b.district, 2, 40) && ['SNS', 'Privado', 'Associação'].includes(b.sector) && opt(b.notes, 600),
  review: b => str(b.providerId, 1, 80) && b.answers && ['nomeCerto', 'semJulgamento', 'conhecimento', 'recomendaria'].every(k => bool(b.answers[k])) && opt(b.comment, 600),
  place: b => str(b.name, 2, 160) && str(b.kind, 2, 40) && str(b.district, 2, 40) && opt(b.notes, 600) &&
    typeof b.facilities === 'object' && (b.facilities.duches === undefined || SHOWERS.includes(b.facilities.duches)) && coord(b.lat, b.lng),
  story: b => ['testemunho', 'pergunta'].includes(b.kind) && STORY_TOPICS.includes(b.topic) && STORY_PHASES.includes(b.phase) &&
    str(b.title, 3, 120) && str(b.body, 20, 4000) && opt(b.nickname, 40) && opt(b.warning, 120),
  reply: b => str(b.storyId, 1, 40) && str(b.body, 2, 1500) && opt(b.nickname, 40),
  event: b => str(b.title, 3, 160) && !isNaN(Date.parse(b.date)) && opt(b.place, 160) && opt(b.url, 300),
  incident: b => str(b.kind, 2, 60) && str(b.setting, 2, 60) && str(b.district, 2, 40) && opt(b.description, 1000) && bool(b.reported),
  mentorship: b => ['mentee', 'mentor'].includes(b.role) && str(b.nickname, 1, 40) && str(b.stage, 2, 60) && Array.isArray(b.topics) && b.topics.length <= 12 && str(b.contact, 5, 120),
  employer: b => str(b.company, 2, 120) && b.answers && typeof b.answers === 'object' && Object.keys(b.answers).length <= 12 && opt(b.comment, 600),
}

/** Campos guardados por tipo: tudo o resto é descartado. */
const pick = {
  provider: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, sector: b.sector, notes: b.notes?.trim() || undefined }),
  review: b => ({ providerId: b.providerId, answers: b.answers, comment: b.comment?.trim() || undefined }),
  place: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, notes: b.notes?.trim() || undefined,
    facilities: { wcNeutro: !!b.facilities.wcNeutro, vestiarioNeutro: !!b.facilities.vestiarioNeutro, cabinesIndividuais: !!b.facilities.cabinesIndividuais, duches: b.facilities.duches },
    lat: r4(b.lat), lng: r4(b.lng) }),
  story: b => ({ kind: b.kind, topic: b.topic, phase: b.phase, title: b.title.trim(), body: b.body.trim(), nickname: b.nickname?.trim() || undefined, warning: b.warning?.trim() || undefined }),
  reply: b => ({ storyId: b.storyId, body: b.body.trim(), nickname: b.nickname?.trim() || undefined }),
  event: b => ({ title: b.title.trim(), date: new Date(b.date).toISOString(), place: b.place?.trim() || undefined, url: b.url?.trim() || undefined }),
  incident: b => ({ kind: b.kind, setting: b.setting, district: b.district, description: b.description?.trim() || undefined, reported: b.reported }),
  mentorship: b => ({ role: b.role, nickname: b.nickname.trim(), stage: b.stage, topics: b.topics.map(String).slice(0, 12), contact: b.contact.trim() }),
  employer: b => ({ company: b.company.trim(), answers: Object.fromEntries(Object.entries(b.answers).map(([k, v]) => [k, !!v])), comment: b.comment?.trim() || undefined }),
}

/* ---------- moderação automática (só sinaliza; quem decide é uma pessoa) ---------- */

let blocklist = []
try { blocklist = readFileSync(join(here, 'blocklist.txt'), 'utf8').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean) } catch { /* opcional */ }

function autoFlags(payload) {
  const text = Object.values(payload).filter(v => typeof v === 'string').join(' ').toLowerCase()
  const flags = []
  if (blocklist.some(w => text.includes(w))) flags.push('linguagem ofensiva')
  if (/https?:\/\/|www\./.test(text) && !('url' in payload)) flags.push('ligação')
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text) && !('contact' in payload)) flags.push('e-mail')
  if (/(\+?351)?\s?9\d{2}\s?\d{3}\s?\d{3}/.test(text) && !('contact' in payload)) flags.push('telefone')
  if (/(.)\1{7,}/.test(text)) flags.push('spam')
  return flags
}

/* ---------- limite de pedidos sem guardar IPs ---------- */

let salt = randomBytes(16)
let saltDay = new Date().toDateString()
const hits = new Map()
function limited(req) {
  const today = new Date().toDateString()
  if (today !== saltDay) { salt = randomBytes(16); saltDay = today; hits.clear() }
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket.remoteAddress ?? '').trim()
  const key = createHash('sha256').update(salt).update(ip).digest('base64')
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter(t => now - t < 3600_000)
  list.push(now)
  hits.set(key, list)
  return list.length > 30
}

/* ---------- leitura pública (só aprovado) ---------- */

function stories() {
  const rows = db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'story' AND status = 'approved' ORDER BY rowid DESC").all()
  const replies = db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'reply' AND status = 'approved' ORDER BY rowid").all()
    .map(r => ({ id: r.id, month: r.month, ...JSON.parse(r.payload) }))
  const support = new Map(db.prepare('SELECT story_id, count FROM support').all().map(r => [r.story_id, r.count]))
  return rows.map(r => ({
    id: r.id, month: r.month, ...JSON.parse(r.payload), support: support.get(r.id) ?? 0,
    replies: replies.filter(x => x.storyId === r.id).map(({ id, body, nickname, month }) => ({ id, body, nickname, month })),
  }))
}

const isApprovedStory = id => !!db.prepare("SELECT 1 FROM submissions WHERE id = ? AND type = 'story' AND status = 'approved'").get(id)

const approved = type => db.prepare("SELECT id, payload FROM submissions WHERE type = ? AND status = 'approved'").all(type)
  .map(r => ({ id: r.id, ...JSON.parse(r.payload) }))

function providers() {
  const reviews = approved('review')
  return approved('provider').map(p => {
    const rs = reviews.filter(r => r.providerId === p.id)
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

function incidentStats() {
  const rows = db.prepare("SELECT payload, month FROM submissions WHERE type = 'incident'").all().map(r => ({ ...JSON.parse(r.payload), month: r.month }))
  const count = key => {
    const m = {}
    for (const r of rows) m[r[key]] = (m[r[key]] ?? 0) + 1
    return Object.fromEntries(Object.entries(m).filter(([, n]) => n >= K_ANON))
  }
  return { total: rows.length, byKind: count('kind'), bySetting: count('setting'), byDistrict: count('district'), byMonth: count('month') }
}

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

function isMod(req) {
  const h = req.headers.authorization ?? ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!MOD_TOKEN || token.length !== MOD_TOKEN.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(MOD_TOKEN))
}

const postRoutes = { '/api/stories': 'story', '/api/replies': 'reply', '/api/providers': 'provider', '/api/reviews': 'review', '/api/places': 'place', '/api/events': 'event', '/api/incidents': 'incident', '/api/mentorship': 'mentorship', '/api/employers': 'employer' }

export const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const path = url.pathname
  try {
    if (req.method === 'OPTIONS') return send(res, 204)

    if (req.method === 'GET') {
      if (path === '/api/health') return send(res, 200, { ok: true })
      if (path === '/api/providers') return send(res, 200, providers())
      if (path === '/api/places') return send(res, 200, approved('place').map(p => ({ ...p, source: 'comunidade' })))
      if (path === '/api/events') return send(res, 200, approved('event').filter(e => Date.parse(e.date) > Date.now() - 86_400_000))
      if (path === '/api/employers') return send(res, 200, employers())
      if (path === '/api/stories') return send(res, 200, stories())
      if (path === '/api/incidents/stats') return send(res, 200, incidentStats())
      if (path === '/mod') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' })
        return res.end(readFileSync(join(here, 'mod.html')))
      }
      if (path === '/api/mod/queue') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const status = url.searchParams.get('status') ?? 'pending'
        const rows = db.prepare('SELECT * FROM submissions WHERE status = ? ORDER BY rowid DESC LIMIT 200').all(status)
        return send(res, 200, rows.map(r => ({ ...r, payload: JSON.parse(r.payload), flags: JSON.parse(r.flags) })))
      }
    }

    if (req.method === 'POST') {
      const type = postRoutes[path]
      if (type) {
        if (limited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        const body = await readBody(req)
        if (!validators[type](body)) return send(res, 400, { error: 'Dados inválidos' })
        const payload = pick[type](body)
        if (type === 'review' && !db.prepare("SELECT 1 FROM submissions WHERE id = ? AND type = 'provider' AND status = 'approved'").get(payload.providerId) && !payload.providerId.startsWith('pub-')) {
          return send(res, 404, { error: 'Profissional não encontrado' })
        }
        if (type === 'reply' && !isApprovedStory(payload.storyId)) return send(res, 404, { error: 'Testemunho não encontrado' })
        const flags = autoFlags(payload)
        // Relatos de incidentes contam logo para estatísticas (agregadas, k-anonimato);
        // as descrições só são vistas pela moderação.
        const status = type === 'incident' ? 'received' : 'pending'
        db.prepare('INSERT INTO submissions (id, type, payload, status, flags, month) VALUES (?, ?, ?, ?, ?, ?)')
          .run(randomBytes(9).toString('base64url'), type, JSON.stringify(payload), status, JSON.stringify(flags), new Date().toISOString().slice(0, 7))
        return send(res, 201, { ok: true })
      }
      const sup = path.match(/^\/api\/stories\/([\w-]+)\/support$/)
      if (sup) {
        if (limited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        if (!isApprovedStory(sup[1])) return send(res, 404, { error: 'Testemunho não encontrado' })
        db.prepare('INSERT INTO support (story_id, count) VALUES (?, 1) ON CONFLICT(story_id) DO UPDATE SET count = count + 1').run(sup[1])
        return send(res, 200, { ok: true, support: db.prepare('SELECT count FROM support WHERE story_id = ?').get(sup[1]).count })
      }
      const m = path.match(/^\/api\/mod\/([\w-]+)$/)
      if (m) {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const { action } = await readBody(req)
        if (action === 'delete') db.prepare('DELETE FROM submissions WHERE id = ?').run(m[1])
        else if (action === 'approve' || action === 'reject') db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(action === 'approve' ? 'approved' : 'rejected', m[1])
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
  if (!MOD_TOKEN) console.warn('Aviso: MOD_TOKEN não definido, a moderação está desativada.')
  server.listen(PORT, () => console.log(`Servidor comunitário em http://localhost:${PORT}`))
}
