// Servidor comunitário do Casulo no Node (Render). A lógica está em core.mjs e é a mesma que corre
// nos Cloudflare Workers (worker.mjs); aqui fica só o que é do Node: SQLite em ficheiro, HTTP,
// temporizadores e a cópia de segurança diária para o R2.
import { createServer } from 'node:http'
import { mkdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './core.mjs'
import { clientIp } from './privacy.mjs'
import { backupConfigured, runBackup } from './backup.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 8787)
const DB_PATH = process.env.DB_PATH ?? join(here, 'data', 'community.db')
const MAX_BODY = 16_384

if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true })
const sqlite = new DatabaseSync(DB_PATH)
// WAL: as leituras não esperam pelas escritas (e vice-versa).
sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 3000;')

/** A mesma interface assíncrona que o D1 dá nos Workers. */
const db = {
  all: async (sql, ...p) => sqlite.prepare(sql).all(...p),
  get: async (sql, ...p) => sqlite.prepare(sql).get(...p),
  run: async (sql, ...p) => ({ changes: Number(sqlite.prepare(sql).run(...p).changes) }),
  exec: async sql => { sqlite.exec(sql) },
}

const modHtml = () => readFileSync(join(here, 'mod.html'), 'utf8')
export const app = await createApp({ db, env: process.env, modHtml })
export const push = app.push
export const retriage = () => app.retriage()

/** Lê o corpo com limite de tamanho (16 KB). */
async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > MAX_BODY) return null
    chunks.push(c)
  }
  return Buffer.concat(chunks)
}

export const server = createServer(async (req, res) => {
  try {
    const body = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS' ? undefined : await readBody(req)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
    // Corpo grande demais: segue como JSON inválido (400), como antes.
    const request = new Request('http://localhost' + (req.url ?? '/'), { method: req.method, headers, body: body === null ? '\u0000' : body })
    const response = await app.handle(request, clientIp(req))
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end('{"error":"Erro interno"}')
  }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!app.moderators) console.warn('Aviso: MOD_TOKEN/MOD_TOKENS não definidos, a moderação está desativada.')
  if (!app.contactsEncrypted) console.warn('Aviso: DATA_KEY não definido, os contactos ficam guardados sem cifra.')
  if (backupConfigured()) {
    const backup = () => runBackup(sqlite, DB_PATH + '.backup').then(r => console.log(`Cópia de segurança enviada (${Math.round(r.bytes / 1024)} KB)`)).catch(e => console.error('Cópia de segurança falhou:', e.message))
    setTimeout(backup, 60_000).unref()
    setInterval(backup, 86_400_000).unref()
  } else console.warn('Aviso: cópias de segurança desligadas (faltam as variáveis R2_* e DATA_KEY).')
  await app.purgeOld()
  setInterval(() => { app.purgeOld().catch(() => {}) }, 86_400_000).unref()
  if (app.auto) {
    const r = await app.retriage()
    if (r.checked) console.log(`Fila revista: ${r.published} publicados automaticamente, ${r.waiting} à espera de moderação.`)
  }
  // Lembretes: vê a cada minuto o que está na hora de avisar.
  setInterval(() => { app.push.sendDue().catch(() => {}) }, 60_000).unref()
  server.listen(PORT, () => console.log(`Servidor comunitário em http://localhost:${PORT}`))
}
