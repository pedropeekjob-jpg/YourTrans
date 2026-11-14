// Notificações de lembretes (Web Push), com o mínimo de dados:
// - o servidor guarda o endereço de notificações do aparelho (cifrado) e as horas dos avisos;
// - não guarda o texto, o tipo de lembrete nem quem é a pessoa;
// - a notificação vai VAZIA: o próprio telemóvel escreve "Tens um lembrete" (ou o nome discreto);
// - cada hora é apagada depois de enviada, e o aparelho sem horas futuras é apagado ao fim de 60 dias.
// Corre igual no Node e nos Workers (db assíncrona, Web Crypto).
import { b64u, importVapid, newVapidJwk, sha256, signES256, utf8 } from './webcrypto.mjs'

/** Só serviços de notificações conhecidos (evita usar o servidor para pedir outros endereços). */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]
export const MAX_TIMES = 120

export const PUSH_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS push_subs (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, touched TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS push_jobs (sub_id TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (sub_id, at))',
  'CREATE INDEX IF NOT EXISTS idx_push_at ON push_jobs(at)',
]

export function validSubscription(sub) {
  if (!sub || typeof sub !== 'object' || typeof sub.endpoint !== 'string' || sub.endpoint.length > 600) return false
  try {
    const u = new URL(sub.endpoint)
    return u.protocol === 'https:' && PUSH_HOSTS.some(r => r.test(u.hostname))
  } catch { return false }
}

/** db: { get, all, run }, assíncronos. cipher: fieldCipher(DATA_KEY). */
export async function initPush(db, cipher) {
  // Chaves VAPID: criadas uma vez e guardadas na base de dados (nada a configurar).
  let row = await db.get("SELECT value FROM meta WHERE key = 'vapid'")
  if (!row) {
    await db.run("INSERT OR IGNORE INTO meta (key, value) VALUES ('vapid', ?)", JSON.stringify(await newVapidJwk()))
    row = await db.get("SELECT value FROM meta WHERE key = 'vapid'")
  }
  const { key, publicKey } = await importVapid(JSON.parse(row.value))

  const idOf = async endpoint => b64u(await sha256('push:' + endpoint)).slice(0, 22)

  /** Substitui as horas de um aparelho (as antigas são esquecidas). */
  async function sync(sub, times) {
    const id = await idOf(sub.endpoint)
    const now = Date.now()
    const clean = [...new Set(times.filter(t => Number.isInteger(t) && t > now && t < now + 40 * 86_400_000).map(t => Math.floor(t / 60_000) * 60_000))].slice(0, MAX_TIMES)
    await db.run('INSERT INTO push_subs (id, endpoint, touched) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, touched = excluded.touched',
      id, await cipher.seal(sub.endpoint), new Date().toISOString())
    await db.run('DELETE FROM push_jobs WHERE sub_id = ?', id)
    for (const t of clean) await db.run('INSERT OR IGNORE INTO push_jobs (sub_id, at) VALUES (?, ?)', id, t)
    return clean.length
  }

  async function forget(endpoint) {
    const id = await idOf(endpoint)
    await db.run('DELETE FROM push_jobs WHERE sub_id = ?', id)
    await db.run('DELETE FROM push_subs WHERE id = ?', id)
  }

  async function vapidHeaders(endpoint) {
    const aud = new URL(endpoint).origin
    const header = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
    const payload = b64u(utf8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:privacidade@casulo.space' })))
    const sig = await signES256(key, `${header}.${payload}`)
    return { authorization: `vapid t=${header}.${payload}.${b64u(sig)}, k=${publicKey}`, ttl: '3600', urgency: 'normal', 'content-length': '0' }
  }

  /** Envia o que está na hora (corre a cada minuto). Devolve quantas foram enviadas. */
  async function sendDue(fetchImpl = fetch) {
    const now = Date.now()
    const due = await db.all('SELECT DISTINCT sub_id FROM push_jobs WHERE at <= ?', now)
    let sent = 0
    for (const { sub_id } of due) {
      await db.run('DELETE FROM push_jobs WHERE sub_id = ? AND at <= ?', sub_id, now)
      const row = await db.get('SELECT endpoint FROM push_subs WHERE id = ?', sub_id)
      if (!row) continue
      const endpoint = await cipher.open(row.endpoint)
      try {
        const res = await fetchImpl(endpoint, { method: 'POST', headers: await vapidHeaders(endpoint) })
        if (res.status === 404 || res.status === 410) await forget(endpoint) // o aparelho desligou as notificações
        else if (res.ok) sent++
      } catch { /* tenta-se só uma vez: um lembrete atrasado não serve de nada */ }
    }
    // Aparelhos sem horas futuras há mais de 60 dias são esquecidos.
    const old = new Date(now - 60 * 86_400_000).toISOString()
    await db.run('DELETE FROM push_subs WHERE touched < ? AND id NOT IN (SELECT sub_id FROM push_jobs)', old)
    return sent
  }

  return { publicKey, sync, forget, sendDue, vapidHeaders }
}
