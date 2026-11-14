// Servidor comunitário do Casulo: a lógica toda, sem depender de onde corre.
// O mesmo código serve no Node (index.mjs, Render) e nos Cloudflare Workers (worker.mjs, D1).
// Guarda apenas o que as pessoas escolhem partilhar, sempre anónimo. Não guarda IPs.
// Pré-moderação automática (moderation.mjs): o que passa limpo é publicado logo; o que levanta
// suspeitas fica à espera de uma pessoa em /mod. Qualquer pessoa pode denunciar o que já está
// publicado e, com denúncias suficientes de pessoas diferentes, volta para a fila.
//
// db é um objeto assíncrono: { all(sql, ...p), get(sql, ...p), run(sql, ...p) → { changes }, exec(sql) }.
import { ALWAYS_HUMAN, fingerprint, screen } from './moderation.mjs'
import { authorTag, b64u, fieldCipher, randomId, sameSecret, sha256 } from './webcrypto.mjs'
import { PUSH_SCHEMA, initPush, validSubscription } from './push.mjs'
import { K_EXPERIENCE, SEAL_MIN_REVIEWS, SEAL_MONTHS, SEAL_QUESTIONS, SEAL_THRESHOLD, STAGE_QUESTIONS, pick, validAuthor, validators } from './validation.mjs'

const K_ANON = 5 // mínimo de relatos para mostrar uma estatística
/**
 * Denúncias de pessoas diferentes precisas para tirar algo do ar: 2 no que foi publicado
 * automaticamente, 3 no que uma pessoa aprovou. Com uma só, um troll conseguia esvaziar a
 * comunidade. O que tem sinais de risco (ameaça, autolesão) não chega a ser publicado sozinho.
 */
const REPORTS_TO_HIDE_AUTO = 2
const REPORTS_TO_HIDE = 3
const MAX_BODY = 16_384
/** Tipos que só a equipa lê: nunca são publicados. */
const RECEIVED_ONLY = new Set(['incident', 'wish'])

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    flags TEXT NOT NULL DEFAULT '[]', month TEXT NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS idx_type_status ON submissions(type, status)',
  'CREATE TABLE IF NOT EXISTS support (story_id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)',
  // Quem já denunciou cada envio: um código que muda todos os dias, nunca o IP.
  'CREATE TABLE IF NOT EXISTS reports (submission_id TEXT NOT NULL, reporter TEXT NOT NULL, PRIMARY KEY (submission_id, reporter))',
  // Registo das ações de moderação (quem, o quê, quando), guardado 12 meses.
  'CREATE TABLE IF NOT EXISTS mod_log (at TEXT NOT NULL, moderator TEXT NOT NULL, action TEXT NOT NULL, submission_id TEXT, type TEXT)',
  'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS banned (author TEXT PRIMARY KEY, at TEXT NOT NULL, moderator TEXT NOT NULL)',
]
// Colunas acrescentadas depois da primeira versão (bases de dados já existentes).
const LATER_COLUMNS = {
  auto: 'ALTER TABLE submissions ADD COLUMN auto INTEGER NOT NULL DEFAULT 0',
  reports: 'ALTER TABLE submissions ADD COLUMN reports INTEGER NOT NULL DEFAULT 0',
  fp: 'ALTER TABLE submissions ADD COLUMN fp TEXT',
  // Assinatura pública de quem publicou, para bloquear e moderar.
  author: 'ALTER TABLE submissions ADD COLUMN author TEXT',
}

/** Cria (ou atualiza) as tabelas. Pode correr várias vezes. */
export async function migrate(db) {
  for (const s of SCHEMA) await db.exec(s)
  const cols = new Set((await db.all('PRAGMA table_info(submissions)')).map(c => c.name))
  for (const [c, sql] of Object.entries(LATER_COLUMNS)) if (!cols.has(c)) await db.exec(sql)
  await db.exec('CREATE INDEX IF NOT EXISTS idx_type_fp ON submissions(type, fp)')
  for (const s of PUSH_SCHEMA) await db.exec(s)
}

/** Lê as pessoas moderadoras: MOD_TOKENS="Ana:código1,Rui:código2" (16+ caracteres) e MOD_TOKEN ("equipa"). */
export function moderatorsFrom(env) {
  return [
    ...(env.MOD_TOKEN ? [['equipa', env.MOD_TOKEN]] : []),
    ...(env.MOD_TOKENS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(s => [s.slice(0, s.indexOf(':')).trim(), s.slice(s.indexOf(':') + 1).trim()])
      .filter(([name, token]) => name && token.length >= 16),
  ]
}

/**
 * env: MOD_TOKEN, MOD_TOKENS, ALLOWED_ORIGIN, DATA_KEY, AUTO_MODERATION, RATE_LIMIT (textos).
 * modHtml: () => texto da página de moderação.
 */
export async function createApp({ db, env = {}, modHtml = () => '' }) {
  await migrate(db)
  const MODERATORS = moderatorsFrom(env)
  /** Origens autorizadas, separadas por vírgulas. */
  const ORIGINS = (env.ALLOWED_ORIGIN ?? '*').split(',').map(s => s.trim()).filter(Boolean)
  /** AUTO_MODERATION=off volta a pôr tudo à espera de aprovação humana. */
  const AUTO = (env.AUTO_MODERATION ?? 'on') !== 'off'
  /** Envios por hora e por ligação. */
  const RATE_LIMIT = Number(env.RATE_LIMIT ?? 30)
  const cipher = fieldCipher(env.DATA_KEY)

  /** Segredo do servidor para as assinaturas: criado uma vez e guardado na base de dados. */
  await db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('author-secret', ?)", randomId(32))
  const AUTHOR_SECRET = (await db.get("SELECT value FROM meta WHERE key = 'author-secret'")).value
  const push = await initPush(db, cipher)
  const isBanned = async tag => !!tag && !!(await db.get('SELECT 1 FROM banned WHERE author = ?', tag))

  /* ---------- pré-moderação automática ---------- */

  /** Sinais de um envio: os do filtro mais "repetido" se o mesmo texto já foi enviado. */
  async function flagsFor(type, payload, id = '') {
    const flags = screen(type, payload)
    const fp = fingerprint(type, payload)
    if (fp.length >= 12 && await db.get('SELECT 1 FROM submissions WHERE type = ? AND fp = ? AND id != ?', type, fp, id)) flags.push('repetido')
    return { flags, fp }
  }

  /** Decide o estado: publicado se estiver limpo e o tipo o permitir, senão fica à espera. */
  const decide = (type, flags) => RECEIVED_ONLY.has(type) ? 'received' : AUTO && !ALWAYS_HUMAN.has(type) && flags.length === 0 ? 'approved' : 'pending'

  /** Passa pelo filtro o que já estava à espera (ao arrancar, ou a pedido em /mod). */
  async function retriage() {
    const rows = await db.all("SELECT id, type, payload, reports, author FROM submissions WHERE status = 'pending' ORDER BY rowid")
    let published = 0
    for (const r of rows) {
      const { flags, fp } = await flagsFor(r.type, JSON.parse(r.payload), r.id)
      if (r.reports > 0) flags.push('denunciado') // o que foi denunciado só volta com uma pessoa
      if (await isBanned(r.author)) flags.push('autor bloqueado')
      const status = decide(r.type, flags)
      await db.run('UPDATE submissions SET status = ?, flags = ?, fp = ?, auto = ? WHERE id = ?', status, JSON.stringify(flags), fp, status === 'approved' ? 1 : 0, r.id)
      if (status === 'approved') published++
    }
    publicCache.clear()
    return { checked: rows.length, published, waiting: rows.length - published }
  }

  /* ---------- limite de pedidos sem guardar IPs ---------- */

  let salt = randomId(16)
  let saltDay = new Date().toDateString()
  const hits = new Map()
  /** Código da ligação de hoje: o IP misturado com um sal que muda todos os dias e nunca é guardado. */
  async function visitorKey(ip) {
    const today = new Date().toDateString()
    if (today !== saltDay) { salt = randomId(16); saltDay = today; hits.clear() }
    return b64u(await sha256(salt + '|' + ip))
  }
  async function limited(ip) {
    const key = await visitorKey(ip)
    const now = Date.now()
    const list = (hits.get(key) ?? []).filter(t => now - t < 3600_000)
    list.push(now)
    hits.set(key, list)
    return list.length > RATE_LIMIT
  }

  /* ---------- leitura pública (só aprovado) ---------- */

  async function stories() {
    const rows = await db.all("SELECT id, payload, month, author FROM submissions WHERE type = 'story' AND status = 'approved' ORDER BY rowid DESC")
    const replies = new Map()
    for (const r of await db.all("SELECT id, payload, month, author FROM submissions WHERE type = 'reply' AND status = 'approved' ORDER BY rowid")) {
      const { storyId, body, nickname } = JSON.parse(r.payload)
      replies.set(storyId, [...(replies.get(storyId) ?? []), { id: r.id, body, nickname, month: r.month, author: r.author ?? undefined }])
    }
    const support = new Map((await db.all('SELECT story_id, count FROM support')).map(r => [r.story_id, r.count]))
    return rows.map(r => ({
      id: r.id, month: r.month, ...JSON.parse(r.payload), author: r.author ?? undefined, support: support.get(r.id) ?? 0,
      replies: replies.get(r.id) ?? [],
    }))
  }

  const isApprovedStory = async id => !!(await db.get("SELECT 1 FROM submissions WHERE id = ? AND type = 'story' AND status = 'approved'", id))

  const approved = async type => (await db.all("SELECT id, payload FROM submissions WHERE type = ? AND status = 'approved'", type))
    .map(r => ({ id: r.id, ...JSON.parse(r.payload) }))

  async function providers() {
    const reviews = new Map()
    for (const r of await approved('review')) reviews.set(r.providerId, [...(reviews.get(r.providerId) ?? []), r])
    return (await approved('provider')).map(p => {
      const rs = reviews.get(p.id) ?? []
      const scores = {}
      if (rs.length) for (const k of ['nomeCerto', 'semJulgamento', 'conhecimento', 'recomendaria']) scores[k] = rs.filter(r => r.answers[k]).length / rs.length
      return { ...p, source: 'comunidade', reviewCount: rs.length, scores: rs.length ? scores : undefined }
    })
  }

  async function employers() {
    const by = new Map()
    for (const r of await approved('employer')) {
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
  async function entities() {
    const since = new Date(); since.setUTCMonth(since.getUTCMonth() - SEAL_MONTHS)
    const from = since.toISOString().slice(0, 7)
    const reviews = (await db.all("SELECT id, payload, month, author FROM submissions WHERE type = 'sealReview' AND status = 'approved' ORDER BY rowid DESC"))
      .map(r => ({ id: r.id, month: r.month, author: r.author ?? undefined, ...JSON.parse(r.payload) }))
    return (await db.all("SELECT id, payload, month FROM submissions WHERE type = 'entity' AND status = 'approved' ORDER BY rowid DESC")).map(r => {
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
  async function experienceStats() {
    const groups = new Map()
    for (const r of await approved('experience')) {
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
  async function stageReviews() {
    const by = new Map()
    for (const r of await db.all("SELECT id, payload, month, author FROM submissions WHERE type = 'stageReview' AND status = 'approved' ORDER BY rowid DESC")) {
      const p = { id: r.id, month: r.month, author: r.author ?? undefined, ...JSON.parse(r.payload) }
      by.set(p.track, [...(by.get(p.track) ?? []), p])
    }
    return [...by.entries()].map(([track, rs]) => ({
      track, n: rs.length,
      scores: rs.length >= K_EXPERIENCE ? Object.fromEntries(STAGE_QUESTIONS.map(k => [k, rs.filter(r => r.answers[k]).length / rs.length])) : undefined,
      comments: rs.filter(r => r.comment).slice(0, 30).map(r => ({ id: r.id, month: r.month, comment: r.comment, author: r.author })),
    }))
  }

  async function incidentStats() {
    const rows = (await db.all("SELECT payload, month FROM submissions WHERE type = 'incident'")).map(r => ({ ...JSON.parse(r.payload), month: r.month }))
    const count = key => {
      const m = {}
      for (const r of rows) m[r[key]] = (m[r[key]] ?? 0) + 1
      return Object.fromEntries(Object.entries(m).filter(([, n]) => n >= K_ANON))
    }
    return { total: rows.length, byKind: count('kind'), bySetting: count('setting'), byDistrict: count('district'), byMonth: count('month') }
  }

  /* ---------- prazos de conservação ---------- */

  /** Corre uma vez por dia: apaga o que já não deve ser guardado. */
  async function purgeOld() {
    const d = new Date(); d.setMonth(d.getMonth() - 6)
    const six = d.toISOString().slice(0, 7)
    // Pedidos de mentoria (têm contacto): apagados ao fim de 6 meses.
    await db.run("DELETE FROM submissions WHERE type = 'mentorship' AND month < ?", six)
    // Pedidos de selo que nunca foram aprovados (têm e-mail): apagados ao fim de 6 meses.
    await db.run("DELETE FROM submissions WHERE type = 'entity' AND status != 'approved' AND month < ?", six)
    // Incidentes: ao fim de 12 meses fica só o que conta para as estatísticas, sem a descrição.
    const y1 = new Date(); y1.setMonth(y1.getMonth() - 12)
    for (const r of await db.all(`SELECT id, payload FROM submissions WHERE type = 'incident' AND month < ? AND payload LIKE '%"description"%'`, y1.toISOString().slice(0, 7))) {
      const { description, ...rest } = JSON.parse(r.payload)
      await db.run('UPDATE submissions SET payload = ? WHERE id = ?', JSON.stringify(rest), r.id)
    }
    await db.run('DELETE FROM mod_log WHERE at < ?', y1.toISOString())
    await db.run('DELETE FROM reports WHERE submission_id NOT IN (SELECT id FROM submissions)')
    // Sugestões "procurei e não encontrei": apagadas ao fim de 12 meses.
    await db.run("DELETE FROM submissions WHERE type = 'wish' AND month < ?", y1.toISOString().slice(0, 7))
    publicCache.clear()
  }

  /* ---------- HTTP ---------- */

  function allowOrigin(req) {
    if (ORIGINS.includes('*')) return '*'
    const o = req.headers.get('origin')
    return o && ORIGINS.includes(o) ? o : ORIGINS[0]
  }

  const json = (req, status, body) => new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': allowOrigin(req),
      vary: 'Origin',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    },
  })

  async function readBody(req) {
    const text = await req.text()
    if (text.length > MAX_BODY) throw new SyntaxError('too large')
    return JSON.parse(text || '{}')
  }

  /** Nome de quem modera (ou null): compara o código com todos, em tempo constante. */
  function moderator(req) {
    const h = req.headers.get('authorization') ?? ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : ''
    let who = null
    for (const [name, t] of MODERATORS) if (sameSecret(t, token)) who = name
    return token ? who : null
  }

  async function logAction(who, action, id) {
    const row = id ? await db.get('SELECT type FROM submissions WHERE id = ?', id) : undefined
    await db.run('INSERT INTO mod_log (at, moderator, action, submission_id, type) VALUES (?, ?, ?, ?, ?)', new Date().toISOString(), who, action, id ?? null, row?.type ?? null)
  }

  /** Campos de contacto: cifrados na base de dados, decifrados só para a moderação. */
  const CONTACT_FIELD = { mentorship: 'contact', entity: 'contact' }
  async function sealContacts(type, payload) {
    const f = CONTACT_FIELD[type]
    return f && payload[f] ? { ...payload, [f]: await cipher.seal(payload[f]) } : payload
  }
  async function openContacts(type, payload) {
    const f = CONTACT_FIELD[type]
    return f && payload[f] ? { ...payload, [f]: await cipher.open(payload[f]) } : payload
  }

  /* ---------- leituras públicas em cache ---------- */

  /**
   * As leituras públicas são calculadas a partir da base de dados toda. Guardamos o resultado
   * durante 30 s e esquecemo-lo a cada escrita (envio, apoio, denúncia, moderação), para que
   * muitas pessoas a abrir a app ao mesmo tempo não repitam o mesmo trabalho.
   */
  const PUBLIC_TTL = 30_000
  const publicCache = new Map()
  async function cached(path, compute) {
    const hit = publicCache.get(path)
    if (hit && Date.now() - hit.at < PUBLIC_TTL) return hit.data
    const data = await compute()
    publicCache.set(path, { at: Date.now(), data })
    return data
  }

  const publicRoutes = {
    '/api/providers': providers,
    '/api/places': async () => (await approved('place')).map(p => ({ ...p, source: 'comunidade' })),
    '/api/events': async () => (await approved('event')).filter(e => Date.parse(e.date) > Date.now() - 86_400_000),
    '/api/employers': employers,
    '/api/stories': stories,
    '/api/experiences': experienceStats,
    '/api/stage-reviews': stageReviews,
    '/api/entities': entities,
    '/api/incidents/stats': incidentStats,
  }

  const postRoutes = { '/api/stories': 'story', '/api/replies': 'reply', '/api/providers': 'provider', '/api/reviews': 'review', '/api/places': 'place', '/api/events': 'event', '/api/incidents': 'incident', '/api/mentorship': 'mentorship', '/api/employers': 'employer', '/api/experiences': 'experience', '/api/stage-reviews': 'stageReview', '/api/entities': 'entity', '/api/seal-reviews': 'sealReview', '/api/wishes': 'wish' }

  const tooMany = req => json(req, 429, { error: 'Demasiados pedidos. Tenta mais tarde.' })

  async function route(req, ip) {
    const url = new URL(req.url)
    const path = url.pathname
    if (req.method === 'OPTIONS') return json(req, 204)

    if (req.method === 'GET') {
      if (path === '/api/health') return json(req, 200, { ok: true })
      if (path === '/api/push/key') return json(req, 200, { key: push.publicKey })
      if (publicRoutes[path]) return json(req, 200, await cached(path, publicRoutes[path]))
      if (path === '/mod') return new Response(await modHtml(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' } })
      if (path === '/api/mod/log') {
        if (!moderator(req)) return json(req, 401, { error: 'Sem autorização' })
        return json(req, 200, await db.all('SELECT at, moderator, action, submission_id AS id, type FROM mod_log ORDER BY at DESC LIMIT 300'))
      }
      if (path === '/api/mod/queue') {
        if (!moderator(req)) return json(req, 401, { error: 'Sem autorização' })
        const status = url.searchParams.get('status') ?? 'pending'
        const onlyAuto = url.searchParams.get('auto') === '1'
        const type = url.searchParams.get('type')
        const rows = await db.all(`SELECT id, type, payload, status, flags, month, auto, reports, author FROM submissions WHERE status = ?${onlyAuto ? ' AND auto = 1' : ''}${type ? ' AND type = ?' : ''} ORDER BY rowid DESC LIMIT 200`, ...(type ? [status, type] : [status]))
        const out = []
        for (const r of rows) out.push({ ...r, payload: await openContacts(r.type, JSON.parse(r.payload)), flags: JSON.parse(r.flags) })
        // Risco de autolesão primeiro: pode haver alguém a precisar de resposta.
        const rank = r => (r.flags.includes('risco de autolesão') ? 0 : r.flags.includes('ameaça') ? 1 : 2)
        return json(req, 200, out.sort((a, b) => rank(a) - rank(b)))
      }
    }

    if (req.method === 'POST') {
      publicCache.clear()
      const type = postRoutes[path]
      if (type) {
        if (await limited(ip)) return tooMany(req)
        const body = await readBody(req)
        if (!validators[type](body)) return json(req, 400, { error: 'Dados inválidos' })
        const payload = pick[type](body)
        if (type === 'review' && !(await db.get("SELECT 1 FROM submissions WHERE id = ? AND type = 'provider' AND status = 'approved'", payload.providerId)) && !payload.providerId.startsWith('pub-')) {
          return json(req, 404, { error: 'Profissional não encontrado' })
        }
        if (type === 'sealReview' && !(await db.get("SELECT 1 FROM submissions WHERE id = ? AND type = 'entity' AND status = 'approved'", payload.entityId))) {
          return json(req, 404, { error: 'Entidade não encontrada' })
        }
        if (type === 'reply' && !(await isApprovedStory(payload.storyId))) return json(req, 404, { error: 'Testemunho não encontrado' })
        const { flags, fp } = await flagsFor(type, payload)
        const author = validAuthor(body.author) ? await authorTag(body.author, AUTHOR_SECRET) : null
        // Quem foi bloqueado pela moderação continua a poder enviar, mas nada é publicado sem revisão.
        if (await isBanned(author)) flags.push('autor bloqueado')
        // Relatos de incidentes contam logo para estatísticas (agregadas, k-anonimato);
        // as descrições só são vistas pela moderação.
        const status = decide(type, flags)
        await db.run('INSERT INTO submissions (id, type, payload, status, flags, month, auto, fp, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          randomId(9), type, JSON.stringify(await sealContacts(type, payload)), status, JSON.stringify(flags), new Date().toISOString().slice(0, 7), status === 'approved' ? 1 : 0, fp, author)
        return json(req, 201, { ok: true, published: status === 'approved' })
      }
      if (path === '/api/push/sync') {
        if (await limited(ip)) return tooMany(req)
        const { subscription, times } = await readBody(req)
        if (!validSubscription(subscription) || !Array.isArray(times)) return json(req, 400, { error: 'Dados inválidos' })
        return json(req, 200, { ok: true, scheduled: await push.sync(subscription, times) })
      }
      if (path === '/api/push/forget') {
        const { endpoint } = await readBody(req)
        if (typeof endpoint === 'string') await push.forget(endpoint)
        return json(req, 200, { ok: true })
      }
      const sup = path.match(/^\/api\/stories\/([\w-]+)\/support$/)
      if (sup) {
        if (await limited(ip)) return tooMany(req)
        if (!(await isApprovedStory(sup[1]))) return json(req, 404, { error: 'Testemunho não encontrado' })
        await db.run('INSERT INTO support (story_id, count) VALUES (?, 1) ON CONFLICT(story_id) DO UPDATE SET count = count + 1', sup[1])
        return json(req, 200, { ok: true, support: (await db.get('SELECT count FROM support WHERE story_id = ?', sup[1])).count })
      }
      const rep = path.match(/^\/api\/report\/([\w-]+)$/)
      if (rep) {
        if (await limited(ip)) return tooMany(req)
        const row = await db.get("SELECT auto, reports, flags FROM submissions WHERE id = ? AND status = 'approved'", rep[1])
        if (!row) return json(req, 404, { error: 'Não encontrado' })
        // A mesma ligação só conta uma vez por dia para cada envio.
        const fresh = (await db.run('INSERT OR IGNORE INTO reports (submission_id, reporter) VALUES (?, ?)', rep[1], await visitorKey(ip))).changes > 0
        if (!fresh) return json(req, 200, { ok: true })
        const reports = row.reports + 1
        if (reports >= (row.auto ? REPORTS_TO_HIDE_AUTO : REPORTS_TO_HIDE)) {
          const flags = [...new Set([...JSON.parse(row.flags), 'denunciado'])]
          await db.run("UPDATE submissions SET status = 'pending', reports = ?, flags = ? WHERE id = ?", reports, JSON.stringify(flags), rep[1])
        } else await db.run('UPDATE submissions SET reports = ? WHERE id = ?', reports, rep[1])
        return json(req, 200, { ok: true })
      }
      if (path === '/api/mod/retriage') {
        const who = moderator(req)
        if (!who) return json(req, 401, { error: 'Sem autorização' })
        await logAction(who, 'retriage')
        return json(req, 200, await retriage())
      }
      const m = path.match(/^\/api\/mod\/([\w-]+)$/)
      if (m) {
        const who = moderator(req)
        if (!who) return json(req, 401, { error: 'Sem autorização' })
        const { action } = await readBody(req)
        if (['delete', 'reject', 'approve', 'hide', 'ban', 'unban'].includes(action)) await logAction(who, action, m[1])
        if (action === 'ban' || action === 'unban') {
          const row = await db.get('SELECT author FROM submissions WHERE id = ?', m[1])
          if (!row?.author) return json(req, 400, { error: 'Este envio não tem assinatura' })
          if (action === 'unban') { await db.run('DELETE FROM banned WHERE author = ?', row.author); return json(req, 200, { ok: true }) }
          await db.run('INSERT OR IGNORE INTO banned (author, at, moderator) VALUES (?, ?, ?)', row.author, new Date().toISOString(), who)
          // Tudo o que essa assinatura publicou volta para a fila.
          const hidden = (await db.run("UPDATE submissions SET status = 'pending', auto = 0 WHERE author = ? AND status = 'approved'", row.author)).changes
          return json(req, 200, { ok: true, hidden })
        }
        // Rejeitar apaga logo o conteúdo: não guardamos o que não vai ser publicado.
        if (action === 'delete' || action === 'reject') await db.run('DELETE FROM submissions WHERE id = ?', m[1])
        else if (action === 'approve') {
          await db.run("UPDATE submissions SET status = 'approved', auto = 0, reports = 0 WHERE id = ?", m[1])
          await db.run('DELETE FROM reports WHERE submission_id = ?', m[1])
        }
        else if (action === 'hide') await db.run("UPDATE submissions SET status = 'pending', auto = 0 WHERE id = ?", m[1])
        else return json(req, 400, { error: 'Ação inválida' })
        return json(req, 200, { ok: true })
      }
    }
    return json(req, 404, { error: 'Não encontrado' })
  }

  /** Atende um pedido. ip só serve para os limites e nunca é guardado. */
  async function handle(req, ip = '') {
    try { return await route(req, ip) } catch (e) {
      return json(req, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'JSON inválido' : 'Erro interno' })
    }
  }

  return {
    handle, retriage, purgeOld, push, entities, experienceStats, stageReviews,
    moderators: MODERATORS.length, contactsEncrypted: cipher.enabled, auto: AUTO,
  }
}
