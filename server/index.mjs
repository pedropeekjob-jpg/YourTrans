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
`)
// Colunas acrescentadas depois da primeira versão (bases de dados já existentes).
const cols = new Set(db.prepare('PRAGMA table_info(submissions)').all().map(c => c.name))
if (!cols.has('auto')) db.exec('ALTER TABLE submissions ADD COLUMN auto INTEGER NOT NULL DEFAULT 0')
if (!cols.has('reports')) db.exec('ALTER TABLE submissions ADD COLUMN reports INTEGER NOT NULL DEFAULT 0')
if (!cols.has('fp')) db.exec('ALTER TABLE submissions ADD COLUMN fp TEXT')
// Procura de textos repetidos (corre a cada envio).
db.exec('CREATE INDEX IF NOT EXISTS idx_type_fp ON submissions(type, fp)')
// Pacotes para entidades: chave de acesso (só o hash), plano pago e sessões solidárias.
db.exec(`
  CREATE TABLE IF NOT EXISTS entity_keys (entity_id TEXT PRIMARY KEY, hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS entity_plans (entity_id TEXT PRIMARY KEY, plan TEXT NOT NULL, until TEXT NOT NULL, district TEXT);
  CREATE TABLE IF NOT EXISTS voucher_credits (id INTEGER PRIMARY KEY CHECK (id = 1), balance INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS vouchers (code TEXT PRIMARY KEY, kind TEXT NOT NULL, month TEXT NOT NULL, redeemed_by TEXT, redeemed_month TEXT);
  INSERT OR IGNORE INTO voucher_credits (id, balance) VALUES (1, 0);
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
/** Zonas da app para as sugestões (iguais a src/pages/Suggest.tsx). */
export const WISH_AREAS = ['percurso', 'documentos', 'saude', 'direitos', 'comunidade', 'seguranca', 'trabalho', 'outro']
/**
 * Pacotes pagos (iguais a src/data/plans.ts). Pagar dá ferramentas e visibilidade identificada
 * como paga; nunca muda o selo, as avaliações nem a ordem no mapa.
 * jobs: ofertas de emprego por ano; services: pode listar serviços especializados;
 * incidents: relatório anónimo de incidentes do distrito (autarquias).
 */
export const PLANS = {
  aliada: { jobs: 5 },
  parceira: { jobs: Infinity },
  profissional: { services: true },
  clinica: { services: true },
  escola: {},
  municipio: { incidents: true },
}
/** Políticas que uma empresa pode declarar na ficha (iguais aos critérios de src/pages/Work.tsx). */
export const POLICIES = ['politica', 'nome', 'wc', 'saude', 'licenca', 'formacao', 'denuncia']
/** Serviços especializados que um profissional pode oferecer (iguais a src/data/plans.ts). */
export const SERVICE_KINDS = ['juridico', 'voz', 'psicologia', 'imagem']
/** Mínimo de avaliações ou relatos para aparecer num relatório de entidade (nunca menos de 5). */
export const K_REPORT = 5
/** Sessões solidárias: o código vale 3 meses. */
const VOUCHER_MONTHS = 3
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
  event: b => str(b.title, 3, 160) && !isNaN(Date.parse(b.date)) && opt(b.place, 160) && httpsUrl(b.url),
  incident: b => str(b.kind, 2, 60) && str(b.setting, 2, 60) && str(b.district, 2, 40) && opt(b.description, 1000) && bool(b.reported),
  mentorship: b => ['mentee', 'mentor'].includes(b.role) && str(b.nickname, 1, 40) && str(b.stage, 2, 60) && Array.isArray(b.topics) && b.topics.length <= 12 && str(b.contact, 5, 120),
  // Relato anónimo: só números e escolhas fixas, sem texto livre.
  experience: b => TRACKS.includes(b.track) && ['custo', 'espera', 'material'].includes(b.kind) && ['SNS', 'Privado'].includes(b.sector) &&
    int(b.year, thisYear() - 5, thisYear()) &&
    (b.kind === 'espera' ? int(b.value, 0, 240) : b.kind === 'custo' ? int(b.value, 1, 200_000) && b.sector === 'Privado' : int(b.value, 1, 5_000) && MATERIAL.includes(b.item)),
  stageReview: b => TRACKS.includes(b.track) && b.answers && STAGE_QUESTIONS.every(k => bool(b.answers[k])) && opt(b.comment, 600),
  // "Procurei e não encontrei": só para a equipa, nunca é publicado.
  wish: b => ['procurei', 'gostava'].includes(b.kind) && str(b.text, 5, 1000) && (b.area === undefined || WISH_AREAS.includes(b.area)) &&
    (b.country === undefined || (typeof b.country === 'string' && /^[A-Z]{2}$/.test(b.country))),
  employer: b => str(b.company, 2, 120) && b.answers && typeof b.answers === 'object' && Object.keys(b.answers).length <= 12 && opt(b.comment, 600),
  // Registo para o selo: a entidade aceita todos os compromissos e deixa um e-mail (só para a moderação).
  entity: b => str(b.name, 2, 160) && ENTITY_KINDS.includes(b.kind) && str(b.district, 2, 40) && opt(b.address, 200) && httpsUrl(b.url) && opt(b.notes, 600) &&
    email(b.contact) && b.commitments && SEAL_COMMITMENTS.every(k => b.commitments[k] === true) && (b.transparente === undefined || bool(b.transparente)) &&
    (b.facilities === undefined || (typeof b.facilities === 'object' && (b.facilities.duches === undefined || SHOWERS.includes(b.facilities.duches)))) && coord(b.lat, b.lng),
  // Avaliação de quem lá foi: "wc" pode ser null (não se aplica).
  sealReview: b => str(b.entityId, 1, 40) && b.answers && SEAL_QUESTIONS.every(k => bool(b.answers[k]) || (k === 'wc' && b.answers[k] === null)) && opt(b.comment, 600),
  // Pedido de adesão a um pacote: só a equipa lê (para enviar a fatura); apagado ao fim de 12 meses.
  planRequest: b => str(b.org, 2, 160) && Object.hasOwn(PLANS, b.plan) && ['pequena', 'media', 'grande'].includes(b.size) && email(b.contact) &&
    opt(b.nif, 20) && opt(b.message, 1000) && opt(b.entityId, 40),
}

/** Ficha completa de uma entidade com pacote pago. Tudo opcional; nada sobre quem a visita. */
const profileOk = b => opt(b.about, 1200) && opt(b.benefits, 600) && opt(b.prices, 300) && opt(b.languages, 120) &&
  httpsUrl(b.bookingUrl) && httpsUrl(b.contactUrl) && (b.contactEmail === undefined || b.contactEmail === '' || email(b.contactEmail)) &&
  (b.sns === undefined || bool(b.sns)) && (b.vouchers === undefined || bool(b.vouchers)) &&
  (b.policies === undefined || (Array.isArray(b.policies) && b.policies.every(x => POLICIES.includes(x)))) &&
  (b.services === undefined || (Array.isArray(b.services) && b.services.length <= SERVICE_KINDS.length &&
    b.services.every(x => x && SERVICE_KINDS.includes(x.kind) && int(x.price, 0, 500) && bool(x.online))))
const pickProfile = b => ({
  about: b.about?.trim() || undefined, benefits: b.benefits?.trim() || undefined, prices: b.prices?.trim() || undefined, languages: b.languages?.trim() || undefined,
  bookingUrl: b.bookingUrl?.trim() || undefined, contactUrl: b.contactUrl?.trim() || undefined, contactEmail: b.contactEmail?.trim() || undefined,
  sns: b.sns || undefined, vouchers: b.vouchers || undefined,
  policies: b.policies?.length ? [...new Set(b.policies)] : undefined,
  services: b.services?.length ? b.services.filter((x, i, a) => a.findIndex(y => y.kind === x.kind) === i).map(x => ({ kind: x.kind, price: x.price, online: x.online })) : undefined,
})
/** Oferta de emprego de uma empresa Aliada ou Parceira. */
const jobOk = b => str(b.title, 3, 120) && str(b.district, 2, 40) && bool(b.remote) && httpsUrl(b.url) && b.url && opt(b.description, 1500)
const pickJob = b => ({ title: b.title.trim(), district: b.district, remote: b.remote, url: b.url.trim(), description: b.description?.trim() || undefined })

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
  wish: b => ({ kind: b.kind, text: b.text.trim(), area: b.area, country: b.country }),
  employer: b => ({ company: b.company.trim(), answers: Object.fromEntries(Object.entries(b.answers).map(([k, v]) => [k, !!v])), comment: b.comment?.trim() || undefined }),
  entity: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, address: b.address?.trim() || undefined, url: b.url?.trim() || undefined,
    notes: b.notes?.trim() || undefined, contact: b.contact.trim(), transparente: b.transparente || undefined,
    commitments: Object.fromEntries(SEAL_COMMITMENTS.map(k => [k, true])),
    facilities: b.facilities ? { wcNeutro: !!b.facilities.wcNeutro, vestiarioNeutro: !!b.facilities.vestiarioNeutro, cabinesIndividuais: !!b.facilities.cabinesIndividuais, duches: b.facilities.duches } : {},
    lat: r4(b.lat), lng: r4(b.lng) }),
  sealReview: b => ({ entityId: b.entityId, answers: Object.fromEntries(SEAL_QUESTIONS.map(k => [k, b.answers[k]])), comment: b.comment?.trim() || undefined }),
  planRequest: b => ({ org: b.org.trim(), plan: b.plan, size: b.size, contact: b.contact.trim(), nif: b.nif?.trim() || undefined, message: b.message?.trim() || undefined, entityId: b.entityId || undefined }),
}

/* ---------- pré-moderação automática ---------- */

/** Sinais de um envio: os do filtro mais "repetido" se o mesmo texto já foi enviado. */
function flagsFor(type, payload, id = '') {
  const flags = screen(type, payload)
  const fp = fingerprint(type, payload)
  if (fp.length >= 12 && db.prepare('SELECT 1 FROM submissions WHERE type = ? AND fp = ? AND id != ?').get(type, fp, id)) flags.push('repetido')
  return { flags, fp }
}

/** Tipos que só a equipa lê: nunca são publicados. */
const RECEIVED_ONLY = new Set(['incident', 'wish', 'planRequest'])

/** Decide o estado: publicado se estiver limpo e o tipo o permitir, senão fica à espera. */
const decide = (type, flags) => RECEIVED_ONLY.has(type) ? 'received' : AUTO && !ALWAYS_HUMAN.has(type) && flags.length === 0 ? 'approved' : 'pending'

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

/** Sessões solidárias: no máximo 2 códigos por dia e por ligação, para ninguém esgotar a reserva. */
const voucherHits = new Map()
const voucherKey = req => createHash('sha256').update(salt).update('v' + (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket.remoteAddress ?? '').trim()).digest('base64')
const voucherLimited = req => (voucherHits.get(voucherKey(req)) ?? 0) >= 2
const voucherCounted = req => voucherHits.set(voucherKey(req), (voucherHits.get(voucherKey(req)) ?? 0) + 1)
setInterval(() => voucherHits.clear(), 86_400_000).unref()

/** Uma ficha nova aprovada substitui as anteriores (não guardamos versões antigas). */
function dropOldProfiles(entityId, keepId) {
  db.prepare("DELETE FROM submissions WHERE type = 'profile' AND id != ? AND status = 'approved' AND json_extract(payload, '$.entityId') = ?").run(keepId, entityId)
}

/* ---------- leitura pública (só aprovado) ---------- */

function stories() {
  const rows = db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'story' AND status = 'approved' ORDER BY rowid DESC").all()
  // Respostas agrupadas por testemunho de uma vez (antes: uma procura na lista toda por testemunho).
  const replies = new Map()
  for (const r of db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'reply' AND status = 'approved' ORDER BY rowid").all()) {
    const { storyId, body, nickname } = JSON.parse(r.payload)
    replies.set(storyId, [...(replies.get(storyId) ?? []), { id: r.id, body, nickname, month: r.month }])
  }
  const support = new Map(db.prepare('SELECT story_id, count FROM support').all().map(r => [r.story_id, r.count]))
  return rows.map(r => ({
    id: r.id, month: r.month, ...JSON.parse(r.payload), support: support.get(r.id) ?? 0,
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
    const plan = activePlan(r.id)
    return {
      id: r.id, since: r.month, ...e, commitments: Object.keys(commitments ?? {}), seal, reviewCount: rs.length,
      // Pacote pago: só o nome do pacote e a ficha, sempre identificados como pagos na app.
      partner: plan?.plan, profile: plan ? profileOf(r.id) : undefined,
      scores: enough ? scores : undefined,
      comments: all.filter(x => x.comment).slice(0, 20).map(x => ({ id: x.id, month: x.month, comment: x.comment })),
    }
  })
}

/* ---------- pacotes para entidades ---------- */

const today = () => new Date().toISOString().slice(0, 10)
/** Pacote ativo de uma entidade (com a data de fim ainda por passar), ou undefined. */
export function activePlan(id) {
  const p = db.prepare('SELECT plan, until, district FROM entity_plans WHERE entity_id = ?').get(id)
  return p && p.until >= today() && PLANS[p.plan] ? p : undefined
}
/** Última ficha aprovada de uma entidade. */
function profileOf(id, status = 'approved') {
  const r = db.prepare("SELECT payload FROM submissions WHERE type = 'profile' AND status = ? AND json_extract(payload, '$.entityId') = ? ORDER BY rowid DESC LIMIT 1").get(status, id)
  if (!r) return undefined
  const { entityId, ...p } = JSON.parse(r.payload)
  return p
}
const hashKey = k => createHash('sha256').update(String(k)).digest('hex')
/** Gera uma chave nova para a entidade (substitui a anterior) e devolve-a. Só o hash fica guardado. */
export function issueKey(entityId) {
  const key = randomBytes(18).toString('base64url')
  db.prepare('INSERT INTO entity_keys (entity_id, hash) VALUES (?, ?) ON CONFLICT(entity_id) DO UPDATE SET hash = excluded.hash').run(entityId, hashKey(key))
  return key
}
/** Confirma a chave de uma entidade (comparação em tempo constante). */
function entityAuth(b) {
  if (!b || typeof b.id !== 'string' || typeof b.key !== 'string' || b.key.length > 64) return false
  const row = db.prepare('SELECT hash FROM entity_keys WHERE entity_id = ?').get(b.id)
  return !!row && timingSafeEqual(Buffer.from(row.hash), Buffer.from(hashKey(b.key)))
}
const entityRow = id => db.prepare("SELECT id, payload, status, month FROM submissions WHERE id = ? AND type = 'entity'").get(id)

/** Ofertas de emprego publicadas, só de entidades com pacote Aliada ou Parceira ativo. */
export function jobs() {
  const names = new Map(entities().map(e => [e.id, e]))
  return db.prepare("SELECT id, payload, month FROM submissions WHERE type = 'job' AND status = 'approved' ORDER BY rowid DESC").all()
    .map(r => ({ id: r.id, month: r.month, ...JSON.parse(r.payload) }))
    .filter(j => names.has(j.entityId) && ['aliada', 'parceira'].includes(names.get(j.entityId).partner))
    .map(j => ({ ...j, entityName: names.get(j.entityId).name, seal: names.get(j.entityId).seal }))
}
const jobsThisYear = id => {
  const y = new Date(); y.setMonth(y.getMonth() - 12)
  return db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE type = 'job' AND json_extract(payload, '$.entityId') = ? AND month >= ?").get(id, y.toISOString().slice(0, 7)).n
}

/** Serviços especializados, de profissionais com pacote ativo. Ordem alfabética: pagar não dá destaque. */
export function services() {
  return entities().filter(e => PLANS[e.partner]?.services && e.profile?.services?.length)
    .map(e => ({ entityId: e.id, name: e.name, kind: e.kind, district: e.district, seal: e.seal, services: e.profile.services, bookingUrl: e.profile.bookingUrl, vouchers: !!e.profile.vouchers, languages: e.profile.languages }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
}

const quarter = m => `${m.slice(0, 4)}-T${Math.ceil(Number(m.slice(5, 7)) / 3)}`
/** Contagens com menos de K_REPORT ficam de fora: nenhuma pessoa pode ser reconhecida pelo relatório. */
const kCount = (rows, key) => {
  const m = {}
  for (const r of rows) m[key(r)] = (m[key(r)] ?? 0) + 1
  return Object.fromEntries(Object.entries(m).filter(([, n]) => n >= K_REPORT))
}

/**
 * Relatório anónimo de uma entidade: só totais e percentagens dos últimos 24 meses, e só com
 * K_REPORT ou mais avaliações. Nunca há comentários, datas exatas nem nada sobre quem avaliou.
 * Autarquias: incidentes do distrito por tipo, contexto e trimestre, com o mesmo mínimo.
 */
export function entityReport(id) {
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - SEAL_MONTHS)
  const from = since.toISOString().slice(0, 7)
  const rs = db.prepare("SELECT payload, month FROM submissions WHERE type = 'sealReview' AND status = 'approved' AND json_extract(payload, '$.entityId') = ? AND month >= ?").all(id, from)
    .map(r => ({ ...JSON.parse(r.payload), month: r.month }))
  const out = { reviews: rs.length >= K_REPORT ? rs.length : undefined, enough: rs.length >= K_REPORT, min: K_REPORT }
  if (out.enough) {
    out.scores = {}
    for (const k of SEAL_QUESTIONS) {
      const a = rs.filter(x => typeof x.answers[k] === 'boolean')
      if (a.length >= K_REPORT) out.scores[k] = Math.round(a.filter(x => x.answers[k]).length / a.length * 100) / 100
    }
    out.byQuarter = kCount(rs, r => quarter(r.month))
  }
  const plan = activePlan(id)
  if (plan && PLANS[plan.plan].incidents && plan.district) {
    const inc = db.prepare("SELECT payload, month FROM submissions WHERE type = 'incident'").all()
      .map(r => ({ ...JSON.parse(r.payload), month: r.month })).filter(r => r.district === plan.district)
    out.incidents = { district: plan.district, total: inc.length >= K_REPORT ? inc.length : undefined,
      byKind: kCount(inc, r => r.kind), bySetting: kCount(inc, r => r.setting), byQuarter: kCount(inc, r => quarter(r.month)) }
  }
  return out
}

/* ---------- sessões solidárias ---------- */

const voucherBalance = () => db.prepare('SELECT balance FROM voucher_credits WHERE id = 1').get().balance
const VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => 'CSL-' + [...randomBytes(8)].map(b => VOUCHER_ALPHABET[b % VOUCHER_ALPHABET.length]).join('').replace(/(.{4})(.{4})/, '$1-$2')
/** Pedir um código: gasta uma sessão das pagas pelas entidades. Não guarda nada sobre quem pede. */
export function issueVoucher(kind) {
  const left = voucherBalance()
  if (left <= 0) return undefined
  const code = newCode()
  db.prepare('UPDATE voucher_credits SET balance = balance - 1 WHERE id = 1').run()
  db.prepare('INSERT INTO vouchers (code, kind, month) VALUES (?, ?, ?)').run(code, kind, new Date().toISOString().slice(0, 7))
  return code
}
/** O profissional usa o código numa sessão; a equipa paga-lhe as sessões usadas. */
function redeemVoucher(entityId, code) {
  const v = db.prepare('SELECT kind, month, redeemed_by FROM vouchers WHERE code = ?').get(String(code).trim().toUpperCase())
  if (!v) return 'Código não encontrado'
  if (v.redeemed_by) return 'Este código já foi usado'
  const limit = new Date(); limit.setMonth(limit.getMonth() - VOUCHER_MONTHS)
  if (v.month < limit.toISOString().slice(0, 7)) return 'Este código já expirou'
  db.prepare('UPDATE vouchers SET redeemed_by = ?, redeemed_month = ? WHERE code = ?').run(entityId, new Date().toISOString().slice(0, 7), String(code).trim().toUpperCase())
  return ''
}
/** Para a equipa pagar aos profissionais: sessões usadas por entidade e mês. */
function voucherSummary() {
  const names = new Map(db.prepare("SELECT id, payload FROM submissions WHERE type = 'entity'").all().map(r => [r.id, JSON.parse(r.payload).name]))
  return {
    balance: voucherBalance(),
    issued: db.prepare('SELECT COUNT(*) AS n FROM vouchers WHERE redeemed_by IS NULL').get().n,
    redeemed: db.prepare('SELECT redeemed_by, redeemed_month AS month, kind, COUNT(*) AS n FROM vouchers WHERE redeemed_by IS NOT NULL GROUP BY redeemed_by, redeemed_month, kind ORDER BY redeemed_month DESC')
      .all().map(r => ({ entityId: r.redeemed_by, name: names.get(r.redeemed_by) ?? '?', month: r.month, kind: r.kind, n: r.n })),
  }
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

/** Pedidos de mentoria (têm contacto) são apagados ao fim de 6 meses; sugestões ao fim de 12. */
function purgeOld() {
  const d = new Date(); d.setMonth(d.getMonth() - 6)
  db.prepare("DELETE FROM submissions WHERE type = 'mentorship' AND month < ?").run(d.toISOString().slice(0, 7))
  // Sugestões "procurei e não encontrei": apagadas ao fim de 12 meses.
  const y = new Date(); y.setMonth(y.getMonth() - 12)
  db.prepare("DELETE FROM submissions WHERE type IN ('wish', 'planRequest') AND month < ?").run(y.toISOString().slice(0, 7))
  // Ofertas de emprego: saem ao fim de 3 meses. Códigos de sessões solidárias: apagados 12 meses depois.
  const j = new Date(); j.setMonth(j.getMonth() - 3)
  db.prepare("DELETE FROM submissions WHERE type = 'job' AND month < ?").run(j.toISOString().slice(0, 7))
  db.prepare('DELETE FROM vouchers WHERE month < ?').run(y.toISOString().slice(0, 7))
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

function isMod(req) {
  const h = req.headers.authorization ?? ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!MOD_TOKEN || token.length !== MOD_TOKEN.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(MOD_TOKEN))
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
  '/api/jobs': () => jobs(),
  '/api/services': () => services(),
  '/api/vouchers/available': () => ({ available: voucherBalance() }),
}

const postRoutes = { '/api/stories': 'story', '/api/replies': 'reply', '/api/providers': 'provider', '/api/reviews': 'review', '/api/places': 'place', '/api/events': 'event', '/api/incidents': 'incident', '/api/mentorship': 'mentorship', '/api/employers': 'employer', '/api/experiences': 'experience', '/api/stage-reviews': 'stageReview', '/api/entities': 'entity', '/api/seal-reviews': 'sealReview', '/api/wishes': 'wish', '/api/plan-requests': 'planRequest' }

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
      if (path === '/api/mod/plans') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const names = new Map(db.prepare("SELECT id, payload FROM submissions WHERE type = 'entity'").all().map(r => [r.id, JSON.parse(r.payload).name]))
        return send(res, 200, {
          plans: db.prepare('SELECT entity_id AS entityId, plan, until, district FROM entity_plans ORDER BY until').all().map(p => ({ ...p, name: names.get(p.entityId) ?? '?', active: p.until >= today() })),
          entities: [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
          vouchers: voucherSummary(),
        })
      }
      if (path === '/api/mod/queue') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const status = url.searchParams.get('status') ?? 'pending'
        const onlyAuto = url.searchParams.get('auto') === '1'
        const type = url.searchParams.get('type')
        const rows = db.prepare(`SELECT id, type, payload, status, flags, month, auto, reports FROM submissions WHERE status = ?${onlyAuto ? ' AND auto = 1' : ''}${type ? ' AND type = ?' : ''} ORDER BY rowid DESC LIMIT 200`).all(...(type ? [status, type] : [status]))
          .map(r => ({ ...r, payload: JSON.parse(r.payload), flags: JSON.parse(r.flags) }))
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
        // Relatos de incidentes contam logo para estatísticas (agregadas, k-anonimato);
        // as descrições só são vistas pela moderação.
        const status = decide(type, flags)
        const id = randomBytes(9).toString('base64url')
        db.prepare('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, type, JSON.stringify(payload), status, JSON.stringify(flags), new Date().toISOString().slice(0, 7), status === 'approved' ? 1 : 0, fp)
        // Uma entidade recebe logo a sua chave (mostrada uma única vez): é com ela que edita a ficha.
        if (type === 'entity') return send(res, 201, { ok: true, published: false, id, key: issueKey(id) })
        return send(res, 201, { ok: true, published: status === 'approved' })
      }
      if (path === '/api/vouchers') {
        if (limited(req) || voucherLimited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        const { kind } = await readBody(req)
        if (!SERVICE_KINDS.includes(kind)) return send(res, 400, { error: 'Dados inválidos' })
        const code = issueVoucher(kind)
        if (!code) return send(res, 409, { error: 'Neste momento não há sessões solidárias disponíveis.' })
        voucherCounted(req)
        return send(res, 201, { ok: true, code, months: VOUCHER_MONTHS })
      }
      // Painel da entidade: tudo com o id e a chave no corpo (nunca no endereço, que fica em registos).
      const ent = path.match(/^\/api\/entity\/(me|profile|jobs|delete-job|report|redeem)$/)
      if (ent) {
        if (limited(req)) return send(res, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
        const body = await readBody(req)
        if (!entityAuth(body)) return send(res, 401, { error: 'Chave inválida' })
        const row = entityRow(body.id)
        if (!row) return send(res, 404, { error: 'Entidade não encontrada' })
        const plan = activePlan(body.id)
        const month = new Date().toISOString().slice(0, 7)
        if (ent[1] === 'me') {
          const { contact, commitments, ...e } = JSON.parse(row.payload)
          const own = db.prepare("SELECT id, payload, status, month FROM submissions WHERE type = 'job' AND json_extract(payload, '$.entityId') = ? ORDER BY rowid DESC").all(body.id)
            .map(r => ({ id: r.id, status: r.status, month: r.month, ...JSON.parse(r.payload) }))
          const pub = row.status === 'approved' ? entities().find(x => x.id === body.id) : undefined
          return send(res, 200, {
            entity: { id: row.id, ...e, status: row.status, seal: pub?.seal, reviewCount: pub?.reviewCount },
            plan: plan ?? null, profile: profileOf(body.id, 'pending') ?? profileOf(body.id) ?? null, profileWaiting: !!profileOf(body.id, 'pending'),
            jobs: own, jobsLeft: plan ? Math.max(0, (PLANS[plan.plan].jobs ?? 0) - jobsThisYear(body.id)) : 0,
          })
        }
        if (!plan) return send(res, 402, { error: 'Esta funcionalidade faz parte dos pacotes pagos.' })
        if (ent[1] === 'report') return send(res, 200, entityReport(body.id))
        if (ent[1] === 'profile') {
          const p = body.profile ?? {}
          if (!profileOk(p)) return send(res, 400, { error: 'Dados inválidos' })
          const payload = { entityId: body.id, ...pickProfile(p) }
          if (!PLANS[plan.plan].services) delete payload.services, delete payload.vouchers
          const { flags, fp } = flagsFor('profile', payload)
          const status = decide('profile', flags)
          db.prepare("DELETE FROM submissions WHERE type = 'profile' AND status = 'pending' AND json_extract(payload, '$.entityId') = ?").run(body.id)
          const id = randomBytes(9).toString('base64url')
          db.prepare('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, 'profile', JSON.stringify(payload), status, JSON.stringify(flags), month, status === 'approved' ? 1 : 0, fp)
          if (status === 'approved') dropOldProfiles(body.id, id)
          return send(res, 201, { ok: true, published: status === 'approved' })
        }
        if (ent[1] === 'jobs') {
          if (!PLANS[plan.plan].jobs) return send(res, 402, { error: 'As ofertas de emprego fazem parte dos pacotes Aliada e Parceira.' })
          if (jobsThisYear(body.id) >= PLANS[plan.plan].jobs) return send(res, 402, { error: 'Já usaram as ofertas de emprego incluídas este ano.' })
          if (!jobOk(body.job ?? {})) return send(res, 400, { error: 'Dados inválidos' })
          const payload = { entityId: body.id, ...pickJob(body.job) }
          const { flags, fp } = flagsFor('job', payload)
          const status = decide('job', flags)
          db.prepare('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(randomBytes(9).toString('base64url'), 'job', JSON.stringify(payload), status, JSON.stringify(flags), month, status === 'approved' ? 1 : 0, fp)
          return send(res, 201, { ok: true, published: status === 'approved' })
        }
        if (ent[1] === 'delete-job') {
          db.prepare("DELETE FROM submissions WHERE id = ? AND type = 'job' AND json_extract(payload, '$.entityId') = ?").run(String(body.jobId), body.id)
          return send(res, 200, { ok: true })
        }
        if (ent[1] === 'redeem') {
          if (!PLANS[plan.plan].services) return send(res, 402, { error: 'Só profissionais com perfil pago aceitam sessões solidárias.' })
          const err = redeemVoucher(body.id, body.code ?? '')
          return err ? send(res, 400, { error: err }) : send(res, 200, { ok: true })
        }
      }
      // Moderação dos pacotes: atribuir plano, nova chave, sessões solidárias.
      if (path === '/api/mod/plan') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const { entityId, plan, until, district } = await readBody(req)
        if (!entityRow(entityId)) return send(res, 404, { error: 'Entidade não encontrada' })
        if (!plan) { db.prepare('DELETE FROM entity_plans WHERE entity_id = ?').run(entityId); return send(res, 200, { ok: true }) }
        if (!Object.hasOwn(PLANS, plan) || !/^\d{4}-\d{2}-\d{2}$/.test(until ?? '') || (district !== undefined && !opt(district, 40))) return send(res, 400, { error: 'Dados inválidos' })
        db.prepare('INSERT INTO entity_plans (entity_id, plan, until, district) VALUES (?, ?, ?, ?) ON CONFLICT(entity_id) DO UPDATE SET plan = excluded.plan, until = excluded.until, district = excluded.district')
          .run(entityId, plan, until, district || null)
        return send(res, 200, { ok: true })
      }
      if (path === '/api/mod/entity-key') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const { entityId } = await readBody(req)
        if (!entityRow(entityId)) return send(res, 404, { error: 'Entidade não encontrada' })
        return send(res, 200, { ok: true, key: issueKey(entityId) })
      }
      if (path === '/api/mod/vouchers') {
        if (!isMod(req)) return send(res, 401, { error: 'Sem autorização' })
        const { add } = await readBody(req)
        if (!int(add, -1000, 1000)) return send(res, 400, { error: 'Dados inválidos' })
        db.prepare('UPDATE voucher_credits SET balance = MAX(0, balance + ?) WHERE id = 1').run(add)
        return send(res, 200, voucherSummary())
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
        else if (action === 'approve') {
          db.prepare("UPDATE submissions SET status = 'approved', auto = 0, reports = 0 WHERE id = ?").run(m[1])
          const p = db.prepare("SELECT payload FROM submissions WHERE id = ? AND type = 'profile'").get(m[1])
          if (p) dropOldProfiles(JSON.parse(p.payload).entityId, m[1])
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
  if (!MOD_TOKEN) console.warn('Aviso: MOD_TOKEN não definido, a moderação está desativada.')
  if (AUTO) {
    const r = retriage()
    if (r.checked) console.log(`Fila revista: ${r.published} publicados automaticamente, ${r.waiting} à espera de moderação.`)
  }
  server.listen(PORT, () => console.log(`Servidor comunitário em http://localhost:${PORT}`))
}
