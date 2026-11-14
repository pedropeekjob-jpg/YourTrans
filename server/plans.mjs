// Pacotes pagos para entidades (empresas, profissionais, escolas, autarquias).
// A app é gratuita para quem a usa; pagar dá ferramentas e visibilidade identificada como paga,
// nunca muda o selo, as avaliações nem a ordem no mapa, e nunca dá acesso a dados de utilizadores.
// Corre igual no Node e nos Workers: db é a interface assíncrona de core.mjs.
import { b64u, randomId, sameSecret, sha256 } from './webcrypto.mjs'
import { SEAL_MONTHS, SEAL_QUESTIONS } from './validation.mjs'

/**
 * Pacotes (iguais a src/data/plans.ts). jobs: ofertas de emprego por ano; services: pode listar
 * serviços especializados e aceitar sessões solidárias; incidents: relatório do distrito (autarquias).
 */
export const PLANS = {
  aliada: { jobs: 5 },
  parceira: { jobs: Infinity },
  profissional: { services: true },
  clinica: { services: true },
  escola: {},
  municipio: { incidents: true },
}
/** Políticas que uma empresa pode declarar (iguais aos critérios de src/pages/Work.tsx). */
export const POLICIES = ['politica', 'nome', 'wc', 'saude', 'licenca', 'formacao', 'denuncia']
/** Serviços especializados (iguais a src/data/plans.ts). */
export const SERVICE_KINDS = ['juridico', 'voz', 'psicologia', 'imagem']
/** Mínimo de avaliações ou relatos para aparecer num relatório de entidade. */
export const K_REPORT = 5
/** Um código de sessão solidária vale 3 meses. */
const VOUCHER_MONTHS = 3
/** Códigos por dia e por ligação, para ninguém esgotar a reserva. */
const VOUCHERS_PER_DAY = 2

export const PLANS_SCHEMA = [
  // Só o hash da chave de acesso de cada entidade.
  'CREATE TABLE IF NOT EXISTS entity_keys (entity_id TEXT PRIMARY KEY, hash TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS entity_plans (entity_id TEXT PRIMARY KEY, plan TEXT NOT NULL, until TEXT NOT NULL, district TEXT)',
  'CREATE TABLE IF NOT EXISTS voucher_credits (id INTEGER PRIMARY KEY CHECK (id = 1), balance INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS vouchers (code TEXT PRIMARY KEY, kind TEXT NOT NULL, month TEXT NOT NULL, redeemed_by TEXT, redeemed_month TEXT)',
  'INSERT OR IGNORE INTO voucher_credits (id, balance) VALUES (1, 0)',
]

const str = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
const opt = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max)
const bool = v => typeof v === 'boolean'
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
const email = v => typeof v === 'string' && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const httpsUrl = v => v === undefined || v === null || v === '' || (typeof v === 'string' && v.length <= 300 && /^https:\/\/[^\s]+$/.test(v))

/** Pedido de adesão: só a equipa lê (para enviar a fatura); o e-mail é cifrado; apagado ao fim de 12 meses. */
export const planRequestOk = b => str(b.org, 2, 160) && Object.hasOwn(PLANS, b.plan) && ['pequena', 'media', 'grande'].includes(b.size) && email(b.contact) &&
  opt(b.nif, 20) && opt(b.message, 1000) && opt(b.entityId, 40)
export const pickPlanRequest = b => ({ org: b.org.trim(), plan: b.plan, size: b.size, contact: b.contact.trim(), nif: b.nif?.trim() || undefined, message: b.message?.trim() || undefined, entityId: b.entityId || undefined })

/** Ficha completa: tudo opcional; nada sobre quem a visita. */
export const profileOk = b => opt(b.about, 1200) && opt(b.benefits, 600) && opt(b.prices, 300) && opt(b.languages, 120) &&
  httpsUrl(b.bookingUrl) && httpsUrl(b.contactUrl) && (b.contactEmail === undefined || b.contactEmail === '' || email(b.contactEmail)) &&
  (b.sns === undefined || bool(b.sns)) && (b.vouchers === undefined || bool(b.vouchers)) &&
  (b.policies === undefined || (Array.isArray(b.policies) && b.policies.every(x => POLICIES.includes(x)))) &&
  (b.services === undefined || (Array.isArray(b.services) && b.services.length <= 8 &&
    b.services.every(x => x && SERVICE_KINDS.includes(x.kind) && int(x.price, 0, 500) && bool(x.online))))
export const pickProfile = b => ({
  about: b.about?.trim() || undefined, benefits: b.benefits?.trim() || undefined, prices: b.prices?.trim() || undefined, languages: b.languages?.trim() || undefined,
  bookingUrl: b.bookingUrl?.trim() || undefined, contactUrl: b.contactUrl?.trim() || undefined, contactEmail: b.contactEmail?.trim() || undefined,
  sns: b.sns || undefined, vouchers: b.vouchers || undefined,
  policies: b.policies?.length ? [...new Set(b.policies)] : undefined,
  services: b.services?.length ? b.services.filter((x, i, a) => a.findIndex(y => y.kind === x.kind) === i).map(x => ({ kind: x.kind, price: x.price, online: x.online })) : undefined,
})
export const jobOk = b => str(b.title, 3, 120) && str(b.district, 2, 40) && bool(b.remote) && !!b.url && httpsUrl(b.url) && opt(b.description, 1500)
export const pickJob = b => ({ title: b.title.trim(), district: b.district, remote: b.remote, url: b.url.trim(), description: b.description?.trim() || undefined })

const month = () => new Date().toISOString().slice(0, 7)
const monthsAgo = n => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7) }
const quarter = m => `${m.slice(0, 4)}-T${Math.ceil(Number(m.slice(5, 7)) / 3)}`
/** Contagens com menos de K_REPORT ficam de fora: ninguém pode ser reconhecido pelo relatório. */
const kCount = (rows, key) => {
  const m = {}
  for (const r of rows) m[key(r)] = (m[key(r)] ?? 0) + 1
  return Object.fromEntries(Object.entries(m).filter(([, n]) => n >= K_REPORT))
}
const VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => 'CSL-' + [...globalThis.crypto.getRandomValues(new Uint8Array(8))].map(b => VOUCHER_ALPHABET[b % VOUCHER_ALPHABET.length]).join('').replace(/(.{4})(.{4})/, '$1-$2')

/**
 * ctx: { db, json, readBody, moderator, logAction, limited, visitorKey, flagsFor, decide, entities }.
 * Devolve as leituras públicas, as rotas e o que core.mjs precisa para as entidades.
 */
export function initPlans(ctx) {
  const { db, json, readBody, moderator, logAction, limited, visitorKey, flagsFor, decide } = ctx
  const today = () => new Date().toISOString().slice(0, 10)
  const hashKey = async k => b64u(await sha256('entidade|' + k))
  const voucherHits = new Map()
  let voucherDay = new Date().toDateString()

  /** Pacotes ativos e últimas fichas aprovadas, de uma vez (para a lista de entidades). */
  async function activePlans() {
    const rows = await db.all('SELECT entity_id, plan, until, district FROM entity_plans WHERE until >= ?', today())
    return new Map(rows.filter(r => PLANS[r.plan]).map(r => [r.entity_id, r]))
  }
  async function approvedProfiles() {
    const out = new Map()
    for (const r of await db.all("SELECT payload FROM submissions WHERE type = 'profile' AND status = 'approved' ORDER BY rowid")) {
      const { entityId, ...p } = JSON.parse(r.payload)
      out.set(entityId, p)
    }
    return out
  }
  /** Junta a cada entidade o pacote ativo e a ficha (só com pacote). Não muda a ordem nem o selo. */
  async function decorate(list) {
    const [plans, profiles] = await Promise.all([activePlans(), approvedProfiles()])
    return list.map(e => {
      const p = plans.get(e.id)
      return p ? { ...e, partner: p.plan, profile: profiles.get(e.id) } : e
    })
  }
  const activePlan = async id => (await activePlans()).get(id)
  async function profileOf(id, status) {
    const r = await db.get("SELECT payload FROM submissions WHERE type = 'profile' AND status = ? AND json_extract(payload, '$.entityId') = ? ORDER BY rowid DESC LIMIT 1", status, id)
    if (!r) return undefined
    const { entityId, ...p } = JSON.parse(r.payload)
    return p
  }
  /** Uma ficha nova aprovada substitui as anteriores (não guardamos versões antigas). */
  const dropOldProfiles = (entityId, keepId) =>
    db.run("DELETE FROM submissions WHERE type = 'profile' AND id != ? AND status = 'approved' AND json_extract(payload, '$.entityId') = ?", keepId, entityId)

  /** Gera uma chave nova (substitui a anterior) e devolve-a. Só o hash fica guardado. */
  async function issueKey(entityId) {
    const key = randomId(18)
    await db.run('INSERT INTO entity_keys (entity_id, hash) VALUES (?, ?) ON CONFLICT(entity_id) DO UPDATE SET hash = excluded.hash', entityId, await hashKey(key))
    return key
  }
  async function entityAuth(b) {
    if (!b || typeof b.id !== 'string' || typeof b.key !== 'string' || b.key.length > 64) return false
    const row = await db.get('SELECT hash FROM entity_keys WHERE entity_id = ?', b.id)
    return !!row && sameSecret(row.hash, await hashKey(b.key))
  }
  const entityRow = id => db.get("SELECT id, payload, status, month FROM submissions WHERE id = ? AND type = 'entity'", id)
  const jobsThisYear = async id => (await db.get("SELECT COUNT(*) AS n FROM submissions WHERE type = 'job' AND json_extract(payload, '$.entityId') = ? AND month >= ?", id, monthsAgo(12))).n

  /** Ofertas publicadas, só de entidades com Aliada ou Parceira ativo. */
  async function jobs() {
    const ents = new Map((await ctx.entities()).map(e => [e.id, e]))
    return (await db.all("SELECT id, payload, month FROM submissions WHERE type = 'job' AND status = 'approved' ORDER BY rowid DESC"))
      .map(r => ({ id: r.id, month: r.month, ...JSON.parse(r.payload) }))
      .filter(j => ['aliada', 'parceira'].includes(ents.get(j.entityId)?.partner))
      .map(j => ({ ...j, entityName: ents.get(j.entityId).name, seal: ents.get(j.entityId).seal }))
  }
  /** Serviços de profissionais com pacote ativo. Ordem alfabética: pagar não dá destaque. */
  async function services() {
    return (await ctx.entities()).filter(e => PLANS[e.partner]?.services && e.profile?.services?.length)
      .map(e => ({ entityId: e.id, name: e.name, kind: e.kind, district: e.district, seal: e.seal, services: e.profile.services, bookingUrl: e.profile.bookingUrl, vouchers: !!e.profile.vouchers, languages: e.profile.languages }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  }

  /**
   * Relatório anónimo: totais e percentagens dos últimos 24 meses, só com K_REPORT ou mais avaliações,
   * sem comentários nem datas exatas. Autarquias: incidentes do distrito com o mesmo mínimo.
   */
  async function report(id) {
    const rs = (await db.all("SELECT payload, month FROM submissions WHERE type = 'sealReview' AND status = 'approved' AND json_extract(payload, '$.entityId') = ? AND month >= ?", id, monthsAgo(SEAL_MONTHS)))
      .map(r => ({ ...JSON.parse(r.payload), month: r.month }))
    const out = { enough: rs.length >= K_REPORT, min: K_REPORT, reviews: rs.length >= K_REPORT ? rs.length : undefined }
    if (out.enough) {
      out.scores = {}
      for (const k of SEAL_QUESTIONS) {
        const a = rs.filter(x => typeof x.answers[k] === 'boolean')
        if (a.length >= K_REPORT) out.scores[k] = Math.round(a.filter(x => x.answers[k]).length / a.length * 100) / 100
      }
      out.byQuarter = kCount(rs, r => quarter(r.month))
    }
    const plan = await activePlan(id)
    if (plan && PLANS[plan.plan].incidents && plan.district) {
      const inc = (await db.all("SELECT payload, month FROM submissions WHERE type = 'incident'")).map(r => ({ ...JSON.parse(r.payload), month: r.month })).filter(r => r.district === plan.district)
      out.incidents = { district: plan.district, total: inc.length >= K_REPORT ? inc.length : undefined, byKind: kCount(inc, r => r.kind), bySetting: kCount(inc, r => r.setting), byQuarter: kCount(inc, r => quarter(r.month)) }
    }
    return out
  }

  const balance = async () => (await db.get('SELECT balance FROM voucher_credits WHERE id = 1')).balance
  async function voucherSummary() {
    const names = new Map((await db.all("SELECT id, payload FROM submissions WHERE type = 'entity'")).map(r => [r.id, JSON.parse(r.payload).name]))
    return {
      balance: await balance(),
      issued: (await db.get('SELECT COUNT(*) AS n FROM vouchers WHERE redeemed_by IS NULL')).n,
      redeemed: (await db.all('SELECT redeemed_by, redeemed_month AS month, kind, COUNT(*) AS n FROM vouchers WHERE redeemed_by IS NOT NULL GROUP BY redeemed_by, redeemed_month, kind ORDER BY redeemed_month DESC'))
        .map(r => ({ entityId: r.redeemed_by, name: names.get(r.redeemed_by) ?? '?', month: r.month, kind: r.kind, n: r.n })),
    }
  }

  const publicRoutes = {
    '/api/jobs': jobs,
    '/api/services': services,
    '/api/vouchers/available': async () => ({ available: await balance() }),
  }

  /** Insere um envio de uma entidade (ficha ou oferta) pelo mesmo filtro que o resto. */
  async function insert(type, payload) {
    const { flags, fp } = await flagsFor(type, payload)
    const status = decide(type, flags)
    const id = randomId(9)
    await db.run('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, type, JSON.stringify(payload), status, JSON.stringify(flags), month(), status === 'approved' ? 1 : 0, fp)
    return { id, status }
  }

  /** Rotas POST dos pacotes; devolve undefined se o caminho não for daqui. */
  async function route(req, ip, path) {
    if (path === '/api/vouchers') {
      if (await limited(ip)) return json(req, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
      const today = new Date().toDateString()
      if (today !== voucherDay) { voucherDay = today; voucherHits.clear() }
      const who = await visitorKey(ip)
      if ((voucherHits.get(who) ?? 0) >= VOUCHERS_PER_DAY) return json(req, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
      const { kind } = await readBody(req)
      if (!SERVICE_KINDS.includes(kind)) return json(req, 400, { error: 'Dados inválidos' })
      if ((await db.run('UPDATE voucher_credits SET balance = balance - 1 WHERE id = 1 AND balance > 0')).changes === 0) {
        return json(req, 409, { error: 'Neste momento não há sessões solidárias disponíveis.' })
      }
      const code = newCode()
      await db.run('INSERT INTO vouchers (code, kind, month) VALUES (?, ?, ?)', code, kind, month())
      voucherHits.set(who, (voucherHits.get(who) ?? 0) + 1)
      return json(req, 201, { ok: true, code, months: VOUCHER_MONTHS })
    }

    // Painel da entidade: id e chave sempre no corpo (nunca no endereço, que fica em registos).
    const ent = path.match(/^\/api\/entity\/(me|profile|jobs|delete-job|report|redeem)$/)
    if (ent) {
      if (await limited(ip)) return json(req, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })
      const body = await readBody(req)
      if (!(await entityAuth(body))) return json(req, 401, { error: 'Chave inválida' })
      const row = await entityRow(body.id)
      if (!row) return json(req, 404, { error: 'Entidade não encontrada' })
      const plan = await activePlan(body.id)
      if (ent[1] === 'me') {
        const { contact, commitments, ...e } = JSON.parse(row.payload)
        const own = (await db.all("SELECT id, payload, status, month FROM submissions WHERE type = 'job' AND json_extract(payload, '$.entityId') = ? ORDER BY rowid DESC", body.id))
          .map(r => ({ id: r.id, status: r.status, month: r.month, ...JSON.parse(r.payload) }))
        const pub = row.status === 'approved' ? (await ctx.entities()).find(x => x.id === body.id) : undefined
        const waiting = await profileOf(body.id, 'pending')
        return json(req, 200, {
          entity: { id: row.id, ...e, status: row.status, seal: pub?.seal, reviewCount: pub?.reviewCount },
          plan: plan ? { plan: plan.plan, until: plan.until, district: plan.district ?? undefined } : null,
          profile: waiting ?? (await profileOf(body.id, 'approved')) ?? null, profileWaiting: !!waiting,
          jobs: own, jobsLeft: plan ? Math.max(0, (PLANS[plan.plan].jobs ?? 0) - await jobsThisYear(body.id)) : 0,
        })
      }
      if (!plan) return json(req, 402, { error: 'Esta funcionalidade faz parte dos pacotes pagos.' })
      if (ent[1] === 'report') return json(req, 200, await report(body.id))
      if (ent[1] === 'profile') {
        const p = body.profile ?? {}
        if (!profileOk(p)) return json(req, 400, { error: 'Dados inválidos' })
        const payload = { entityId: body.id, ...pickProfile(p) }
        if (!PLANS[plan.plan].services) { delete payload.services; delete payload.vouchers }
        await db.run("DELETE FROM submissions WHERE type = 'profile' AND status = 'pending' AND json_extract(payload, '$.entityId') = ?", body.id)
        const { id, status } = await insert('profile', payload)
        if (status === 'approved') await dropOldProfiles(body.id, id)
        return json(req, 201, { ok: true, published: status === 'approved' })
      }
      if (ent[1] === 'jobs') {
        if (!PLANS[plan.plan].jobs) return json(req, 402, { error: 'As ofertas de emprego fazem parte dos pacotes Aliada e Parceira.' })
        if (await jobsThisYear(body.id) >= PLANS[plan.plan].jobs) return json(req, 402, { error: 'Já usaram as ofertas de emprego incluídas este ano.' })
        if (!jobOk(body.job ?? {})) return json(req, 400, { error: 'Dados inválidos' })
        const { status } = await insert('job', { entityId: body.id, ...pickJob(body.job) })
        return json(req, 201, { ok: true, published: status === 'approved' })
      }
      if (ent[1] === 'delete-job') {
        await db.run("DELETE FROM submissions WHERE id = ? AND type = 'job' AND json_extract(payload, '$.entityId') = ?", String(body.jobId), body.id)
        return json(req, 200, { ok: true })
      }
      if (ent[1] === 'redeem') {
        if (!PLANS[plan.plan].services) return json(req, 402, { error: 'Só profissionais com perfil pago aceitam sessões solidárias.' })
        const code = String(body.code ?? '').trim().toUpperCase()
        const v = await db.get('SELECT month, redeemed_by FROM vouchers WHERE code = ?', code)
        if (!v) return json(req, 400, { error: 'Código não encontrado' })
        if (v.redeemed_by) return json(req, 400, { error: 'Este código já foi usado' })
        if (v.month < monthsAgo(VOUCHER_MONTHS)) return json(req, 400, { error: 'Este código já expirou' })
        await db.run('UPDATE vouchers SET redeemed_by = ?, redeemed_month = ? WHERE code = ? AND redeemed_by IS NULL', body.id, month(), code)
        return json(req, 200, { ok: true })
      }
    }

    // Moderação dos pacotes: atribuir pacote, nova chave, reserva de sessões solidárias.
    if (path === '/api/mod/plan' || path === '/api/mod/entity-key' || path === '/api/mod/vouchers') {
      const who = moderator(req)
      if (!who) return json(req, 401, { error: 'Sem autorização' })
      const body = await readBody(req)
      if (path === '/api/mod/vouchers') {
        if (!int(body.add, -1000, 1000)) return json(req, 400, { error: 'Dados inválidos' })
        await db.run('UPDATE voucher_credits SET balance = MAX(0, balance + ?) WHERE id = 1', body.add)
        await logAction(who, 'vouchers ' + body.add)
        return json(req, 200, await voucherSummary())
      }
      if (!(await entityRow(body.entityId))) return json(req, 404, { error: 'Entidade não encontrada' })
      if (path === '/api/mod/entity-key') {
        await logAction(who, 'entity-key', body.entityId)
        return json(req, 200, { ok: true, key: await issueKey(body.entityId) })
      }
      if (!body.plan) {
        await db.run('DELETE FROM entity_plans WHERE entity_id = ?', body.entityId)
        await logAction(who, 'plan none', body.entityId)
        return json(req, 200, { ok: true })
      }
      if (!Object.hasOwn(PLANS, body.plan) || !/^\d{4}-\d{2}-\d{2}$/.test(body.until ?? '') || (body.district !== undefined && !opt(body.district, 40))) return json(req, 400, { error: 'Dados inválidos' })
      await db.run('INSERT INTO entity_plans (entity_id, plan, until, district) VALUES (?, ?, ?, ?) ON CONFLICT(entity_id) DO UPDATE SET plan = excluded.plan, until = excluded.until, district = excluded.district',
        body.entityId, body.plan, body.until, body.district || null)
      await logAction(who, `plan ${body.plan} ${body.until}`, body.entityId)
      return json(req, 200, { ok: true })
    }
    return undefined
  }

  /** GET /api/mod/plans: pacotes, entidades e sessões solidárias, para a moderação. */
  async function modPlans() {
    const names = new Map((await db.all("SELECT id, payload FROM submissions WHERE type = 'entity'")).map(r => [r.id, JSON.parse(r.payload).name]))
    return {
      plans: (await db.all('SELECT entity_id AS entityId, plan, until, district FROM entity_plans ORDER BY until')).map(p => ({ ...p, name: names.get(p.entityId) ?? '?', active: p.until >= today() })),
      entities: [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
      vouchers: await voucherSummary(),
    }
  }

  /** Prazos: ofertas saem ao fim de 3 meses; pedidos de adesão e códigos usados ao fim de 12. */
  async function purge() {
    await db.run("DELETE FROM submissions WHERE type = 'job' AND month < ?", monthsAgo(VOUCHER_MONTHS))
    await db.run("DELETE FROM submissions WHERE type = 'planRequest' AND month < ?", monthsAgo(12))
    await db.run('DELETE FROM vouchers WHERE month < ?', monthsAgo(12))
  }

  return { decorate, issueKey, dropOldProfiles, publicRoutes, route, modPlans, purge }
}
