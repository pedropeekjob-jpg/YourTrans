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

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 8787)
const MOD_TOKEN = process.env.MOD_TOKEN ?? ''
/** Origens autorizadas, separadas por vírgulas (ex.: https://casulo.space,https://www.casulo.space). */
const ORIGINS = (process.env.ALLOWED_ORIGIN ?? '*').split(',').map(s => s.trim()).filter(Boolean)
const DB_PATH = process.env.DB_PATH ?? join(here, 'data', 'community.db')
const K_ANON = 5 // mínimo de relatos para mostrar uma estatística
/** AUTO_MODERATION=off volta a pôr tudo à espera de aprovação humana. */
const AUTO = (process.env.AUTO_MODERATION ?? 'on') !== 'off'
/** Denúncias precisas para tirar do ar algo aprovado por uma pessoa (o publicado automaticamente sai à primeira). */
const REPORTS_TO_HIDE = 3
/** Envios por hora e por ligação (os testes sobem-no). */
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 30)

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
// Colunas acrescentadas depois da primeira versão (bases de dados já existentes).
const cols = new Set(db.prepare('PRAGMA table_info(submissions)').all().map(c => c.name))
if (!cols.has('auto')) db.exec('ALTER TABLE submissions ADD COLUMN auto INTEGER NOT NULL DEFAULT 0')
if (!cols.has('reports')) db.exec('ALTER TABLE submissions ADD COLUMN reports INTEGER NOT NULL DEFAULT 0')
if (!cols.has('fp')) db.exec('ALTER TABLE submissions ADD COLUMN fp TEXT')

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
/** Partes do percurso de saúde (iguais a src/data/healthPath.ts). */
export const TRACKS = ['inicio', 'psicologia', 'psiquiatria', 'sexologia', 'hormonas', 'fertilidade', 'voz', 'depilacao', 'mastectomia', 'mamoplastia', 'histerectomia', 'orquiectomia', 'vaginoplastia', 'faloplastia']
const MATERIAL = ['colete', 'dilatadores', 'almofada', 'pensos', 'outro']
/** Relatos de custos e esperas: mínimo para mostrar um intervalo (decisão do Pedro, 11/11/2026). */
const K_EXPERIENCE = 3
const STAGE_QUESTIONS = ['respeito', 'informacao', 'tempoRazoavel', 'recomendaria']
/** Selo Casulo: compromissos que uma entidade aceita ao registar-se (iguais a src/data/seal.ts). */
export const SEAL_COMMITMENTS = ['nome', 'wc', 'formacao', 'regras', 'contacto', 'formularios']
export const SEAL_QUESTIONS = ['nomeCerto', 'seguro', 'wc', 'recomendaria']
export const ENTITY_KINDS = ['Café/Restaurante', 'Bar/Discoteca', 'Ginásio', 'Piscina', 'Loja', 'Serviço público', 'Associação', 'Alojamento', 'Empresa', 'Saúde', 'Ensino', 'Cultura', 'Outro']
/** O selo exige pelo menos 3 avaliações dos últimos 24 meses, com 80% ou mais em cada pergunta. */
export const SEAL_MIN_REVIEWS = 3
export const SEAL_THRESHOLD = 0.8
const SEAL_MONTHS = 24
const email = v => typeof v === 'string' && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const httpsUrl = v => v === undefined || v === null || v === '' || (typeof v === 'string' && v.length <= 300 && /^https:\/\/[^\s]+$/.test(v))
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
const thisYear = () => new Date().getUTCFullYear()

const validators = {
  provider: b => str(b.name, 3, 160) && PROVIDER_KINDS.includes(b.kind) && str(b.district, 2, 40) && ['SNS', 'Privado', 'Associação'].includes(b.sector) && opt(b.notes, 600) &&
    (b.person === undefined || bool(b.person)) && (b.worksAt === undefined || (Array.isArray(b.worksAt) && b.worksAt.length <= 8 && b.worksAt.every(w => str(w, 2, 120)))),
  review: b => str(b.providerId, 1, 80) && b.answers && ['nomeCerto', 'semJulgamento', 'conhecimento', 'recomendaria'].every(k => bool(b.answers[k])) && opt(b.comment, 600),
  place: b => str(b.name, 2, 160) && str(b.kind, 2, 40) && str(b.district, 2, 40) && opt(b.notes, 600) &&
    typeof b.facilities === 'object' && (b.facilities.duches === undefined || SHOWERS.includes(b.facilities.duches)) && coord(b.lat, b.lng),
  story: b => ['testemunho', 'pergunta'].includes(b.kind) && STORY_TOPICS.includes(b.topic) && STORY_PHASES.includes(b.phase) &&
    str(b.title, 3, 120) && str(b.body, 20, 4000) && opt(b.nickname, 40) && opt(b.warning, 120),
  reply: b => str(b.storyId, 1, 40) && str(b.body, 2, 1500) && opt(b.nickname, 40),
  event: b => str(b.title, 3, 160) && !isNaN(Date.parse(b.date)) && opt(b.place, 160) && opt(b.url, 300),
  incident: b => str(b.kind, 2, 60) && str(b.setting, 2, 60) && str(b.district, 2, 40) && opt(b.description, 1000) && bool(b.reported),
  mentorship: b => ['mentee', 'mentor'].includes(b.role) && str(b.nickname, 1, 40) && str(b.stage, 2, 60) && Array.isArray(b.topics) && b.topics.length <= 12 && str(b.contact, 5, 120),
  // Relato anónimo: só números e escolhas fixas, sem texto livre.
  experience: b => TRACKS.includes(b.track) && ['custo', 'espera', 'material'].includes(b.kind) && ['SNS', 'Privado'].includes(b.sector) &&
    int(b.year, thisYear() - 5, thisYear()) &&
    (b.kind === 'espera' ? int(b.value, 0, 240) : b.kind === 'custo' ? int(b.value, 1, 200_000) && b.sector === 'Privado' : int(b.value, 1, 5_000) && MATERIAL.includes(b.item)),
  stageReview: b => TRACKS.includes(b.track) && b.answers && STAGE_QUESTIONS.every(k => bool(b.answers[k])) && opt(b.comment, 600),
  employer: b => str(b.company, 2, 120) && b.answers && typeof b.answers === 'object' && Object.keys(b.answers).length <= 12 && opt(b.comment, 600),
  // Registo para o selo: a entidade aceita todos os compromissos e deixa um e-mail (só para a moderação).
  entity: b => str(b.name, 2, 160) && ENTITY_KINDS.includes(b.kind) && str(b.district, 2, 40) && opt(b.address, 200) && httpsUrl(b.url) && opt(b.notes, 600) &&
    email(b.contact) && b.commitments && SEAL_COMMITMENTS.every(k => b.commitments[k] === true) && (b.transparente === undefined || bool(b.transparente)) &&
    (b.facilities === undefined || (typeof b.facilities === 'object' && (b.facilities.duches === undefined || SHOWERS.includes(b.facilities.duches)))) && coord(b.lat, b.lng),
  // Avaliação de quem lá foi: "wc" pode ser null (não se aplica).
  sealReview: b => str(b.entityId, 1, 40) && b.answers && SEAL_QUESTIONS.every(k => bool(b.answers[k]) || (k === 'wc' && b.answers[k] === null)) && opt(b.comment, 600),
}

/** Campos guardados por tipo: tudo o resto é descartado. */
const pick = {
  provider: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, sector: b.sector, notes: b.notes?.trim() || undefined,
    person: b.person || undefined, worksAt: b.worksAt?.length ? b.worksAt.map(w => w.trim()) : undefined }),
  review: b => ({ providerId: b.providerId, answers: b.answers, comment: b.comment?.trim() || undefined }),
  place: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, notes: b.notes?.trim() || undefined,
    facilities: { wcNeutro: !!b.facilities.wcNeutro, vestiarioNeutro: !!b.facilities.vestiarioNeutro, cabinesIndividuais: !!b.facilities.cabinesIndividuais, duches: b.facilities.duches },
    lat: r4(b.lat), lng: r4(b.lng) }),
  story: b => ({ kind: b.kind, topic: b.topic, phase: b.phase, title: b.title.trim(), body: b.body.trim(), nickname: b.nickname?.trim() || undefined, warning: b.warning?.trim() || undefined }),
  reply: b => ({ storyId: b.storyId, body: b.body.trim(), nickname: b.nickname?.trim() || undefined }),
  event: b => ({ title: b.title.trim(), date: new Date(b.date).toISOString(), place: b.place?.trim() || undefined, url: b.url?.trim() || undefined }),
  incident: b => ({ kind: b.kind, setting: b.setting, district: b.district, description: b.description?.trim() || undefined, reported: b.reported }),
  mentorship: b => ({ role: b.role, nickname: b.nickname.trim(), stage: b.stage, topics: b.topics.map(String).slice(0, 12), contact: b.contact.trim() }),
  experience: b => ({ track: b.track, kind: b.kind, sector: b.sector, year: b.year, value: b.value, item: b.kind === 'material' ? b.item : undefined }),
  stageReview: b => ({ track: b.track, answers: Object.fromEntries(STAGE_QUESTIONS.map(k => [k, b.answers[k]])), comment: b.comment?.trim() || undefined }),
  employer: b => ({ company: b.company.trim(), answers: Object.fromEntries(Object.entries(b.answers).map(([k, v]) => [k, !!v])), comment: b.comment?.trim() || undefined }),
  entity: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, address: b.address?.trim() || undefined, url: b.url?.trim() || undefined,
    notes: b.notes?.trim() || undefined, contact: b.contact.trim(), transparente: b.transparente || undefined,
    commitments: Object.fromEntries(SEAL_COMMITMENTS.map(k => [k, true])),
    facilities: b.facilities ? { wcNeutro: !!b.facilities.wcNeutro, vestiarioNeutro: !!b.facilities.vestiarioNeutro, cabinesIndividuais: !!b.facilities.cabinesIndividuais, duches: b.facilities.duches } : {},
    lat: r4(b.lat), lng: r4(b.lng) }),
  sealReview: b => ({ entityId: b.entityId, answers: Object.fromEntries(SEAL_QUESTIONS.map(k => [k, b.answers[k]])), comment: b.comment?.trim() || undefined }),
}

/* ---------- pré-moderação automática ---------- */

/** Sinais de um envio: os do filtro mais "repetido" se o mesmo texto já foi enviado. */
function flagsFor(type, payload, id = '') {
  const flags = screen(type, payload)
  const fp = fingerprint(type, payload)
  if (fp.length >= 12 && db.prepare('SELECT 1 FROM submissions WHERE type = ? AND fp = ? AND id != ?').get(type, fp, id)) flags.push('repetido')
  return { flags, fp }
}

/** Decide o estado: publicado se estiver limpo e o tipo o permitir, senão fica à espera. */
const decide = (type, flags) => type === 'incident' ? 'received' : AUTO && !ALWAYS_HUMAN.has(type) && flags.length === 0 ? 'approved' : 'pending'

/** Passa pelo filtro o que já estava à espera (ao arrancar, ou a pedido em /mod). */
export function retriage() {
  const rows = db.prepare("SELECT id, type, payload, reports FROM submissions WHERE status = 'pending' ORDER BY rowid").all()
  let published = 0
  for (const r of rows) {
    const payload = JSON.parse(r.payload)
    const { flags, fp } = flagsFor(r.type, payload, r.id)
    if (r.reports > 0) flags.push('denunciado') // o que foi denunciado só volta com uma pessoa
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
function limited(req) {
  const today = new Date().toDateString()
  if (today !== saltDay) { salt = randomBytes(16); saltDay = today; hits.clear() }
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket.remoteAddress ?? '').trim()
  const key = createHash('sha256').update(salt).update(ip).digest('base64')
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter(t => now - t < 3600_000)
  list.push(now)
  hits.set(key, list)
  return list.length > RATE_LIMIT
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

/**
 * Entidades registadas para o selo, com o estado calculado a partir das avaliações:
 * "selo" (3+ avaliações recentes e 80%+ em cada pergunta), "em-avaliacao" (ainda poucas)
 * ou "sem-selo" (avaliações abaixo do mínimo: o selo cai sozinho se a experiência piorar).
 * O e-mail de contacto nunca sai do servidor.
 */
export function entities() {
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - SEAL_MONTHS)
  const from = since.toISOString().slice(0, 7)
  const reviews = db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'sealReview' AND status = 'approved' ORDER BY rowid DESC").all()
    .map(r => ({ id: r.id, month: r.month, ...JSON.parse(r.payload) }))
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
      comments: all.filter(x => x.comment).slice(0, 20).map(x => ({ id: x.id, month: x.month, comment: x.comment })),
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
  for (const r of db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'stageReview' AND status = 'approved' ORDER BY rowid DESC").all()) {
    const p = { id: r.id, month: r.month, ...JSON.parse(r.payload) }
    by.set(p.track, [...(by.get(p.track) ?? []), p])
  }
  return [...by.entries()].map(([track, rs]) => ({
    track, n: rs.length,
    scores: rs.length >= K_EXPERIENCE ? Object.fromEntries(STAGE_QUESTIONS.map(k => [k, rs.filter(r => r.answers[k]).length / rs.length])) : undefined,
    comments: rs.filter(r => r.comment).slice(0, 30).map(r => ({ id: r.id, month: r.month, comment: r.comment })),
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

/** Pedidos de mentoria (têm contacto) são apagados ao fim de 6 meses. */
function purgeOld() {
  const d = new Date(); d.setMonth(d.getMonth() - 6)
  db.prepare("DELETE FROM submissions WHERE type = 'mentorship' AND month < ?").run(d.toISOString().slice(0, 7))
}
purgeOld()
setInterval(purgeOld, 86_400_000).unref()

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

const postRoutes = { '/api/stories': 'story', '/api/replies': 'reply', '/api/providers': 'provider', '/api/reviews': 'review', '/api/places': 'place', '/api/events': 'event', '/api/incidents': 'incident', '/api/mentorship': 'mentorship', '/api/employers': 'employer', '/api/experiences': 'experience', '/api/stage-reviews': 'stageReview', '/api/entities': 'entity', '/api/seal-reviews': 'sealReview' }

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
      if (path === '/api/experiences') return send(res, 200, experienceStats())
      if (path === '/api/stage-reviews') return send(res, 200, stageReviews())
      if (path === '/api/entities') return send(res, 200, entities())
      if (path === '/api/incidents/stats') return send(res, 200, incidentStats())
      if (path === '/mod') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' })
        return res.end(readFileSync(join(here, 'mod.html')))
      }
      if (path === '/api/mod/queue') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const status = url.searchParams.get('status') ?? 'pending'
        const onlyAuto = url.searchParams.get('auto') === '1'
        const rows = db.prepare(`SELECT id, type, payload, status, flags, month, auto, reports FROM submissions WHERE status = ?${onlyAuto ? ' AND auto = 1' : ''} ORDER BY rowid DESC LIMIT 200`).all(status)
          .map(r => ({ ...r, payload: JSON.parse(r.payload), flags: JSON.parse(r.flags) }))
        // Risco de autolesão primeiro: pode haver alguém a precisar de resposta.
        const rank = r => (r.flags.includes('risco de autolesão') ? 0 : r.flags.includes('ameaça') ? 1 : 2)
        return send(res, 200, rows.sort((a, b) => rank(a) - rank(b)))
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
        if (type === 'sealReview' && !db.prepare("SELECT 1 FROM submissions WHERE id = ? AND type = 'entity' AND status = 'approved'").get(payload.entityId)) {
          return send(res, 404, { error: 'Entidade não encontrada' })
        }
        if (type === 'reply' && !isApprovedStory(payload.storyId)) return send(res, 404, { error: 'Testemunho não encontrado' })
        const { flags, fp } = flagsFor(type, payload)
        // Relatos de incidentes contam logo para estatísticas (agregadas, k-anonimato);
        // as descrições só são vistas pela moderação.
        const status = decide(type, flags)
        db.prepare('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(randomBytes(9).toString('base64url'), type, JSON.stringify(payload), status, JSON.stringify(flags), new Date().toISOString().slice(0, 7), status === 'approved' ? 1 : 0, fp)
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
        const reports = row.reports + 1
        if (row.auto || reports >= REPORTS_TO_HIDE) {
          const flags = [...new Set([...JSON.parse(row.flags), 'denunciado'])]
          db.prepare("UPDATE submissions SET status = 'pending', reports = ?, flags = ? WHERE id = ?").run(reports, JSON.stringify(flags), rep[1])
        } else db.prepare('UPDATE submissions SET reports = ? WHERE id = ?').run(reports, rep[1])
        return send(res, 200, { ok: true })
      }
      if (path === '/api/mod/retriage') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        return send(res, 200, retriage())
      }
      const m = path.match(/^\/api\/mod\/([\w-]+)$/)
      if (m) {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const { action } = await readBody(req)
        // Rejeitar apaga logo o conteúdo: não guardamos o que não vai ser publicado.
        if (action === 'delete' || action === 'reject') db.prepare('DELETE FROM submissions WHERE id = ?').run(m[1])
        else if (action === 'approve') db.prepare("UPDATE submissions SET status = 'approved', auto = 0, reports = 0 WHERE id = ?").run(m[1])
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
  if (!MOD_TOKEN) console.warn('Aviso: MOD_TOKEN não definido, a moderação está desativada.')
  if (AUTO) {
    const r = retriage()
    if (r.checked) console.log(`Fila revista: ${r.published} publicados automaticamente, ${r.waiting} à espera de moderação.`)
  }
  server.listen(PORT, () => console.log(`Servidor comunitário em http://localhost:${PORT}`))
}
