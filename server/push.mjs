// Notificações de lembretes (Web Push), com o mínimo de dados:
// - o servidor guarda o endereço de notificações do aparelho (cifrado) e as horas dos avisos;
// - não guarda o texto, o tipo de lembrete nem quem é a pessoa;
// - a notificação vai VAZIA: o próprio telemóvel escreve "Tens um lembrete" (ou o nome discreto);
// - cada hora é apagada depois de enviada, e o aparelho sem horas futuras é apagado ao fim de 60 dias.
import { createHash, createPrivateKey, generateKeyPairSync, sign } from 'node:crypto'
import { openField, sealField } from './privacy.mjs'

/** Só serviços de notificações conhecidos (evita usar o servidor para pedir outros endereços). */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]
export const MAX_TIMES = 120
const b64u = buf => Buffer.from(buf).toString('base64url')

export function validSubscription(sub) {
  if (!sub || typeof sub !== 'object' || typeof sub.endpoint !== 'string' || sub.endpoint.length > 600) return false
  try {
    const u = new URL(sub.endpoint)
    return u.protocol === 'https:' && PUSH_HOSTS.some(r => r.test(u.hostname))
  } catch { return false }
}

export function initPush(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subs (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, touched TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_jobs (sub_id TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (sub_id, at));
    CREATE INDEX IF NOT EXISTS idx_push_at ON push_jobs(at);
  `)
  // Chaves VAPID: criadas uma vez e guardadas na base de dados (nada a configurar no Render).
  let row = db.prepare("SELECT value FROM meta WHERE key = 'vapid'").get()
  if (!row) {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    row = { value: JSON.stringify(privateKey.export({ format: 'jwk' })) }
    db.prepare("INSERT INTO meta (key, value) VALUES ('vapid', ?)").run(row.value)
  }
  const jwk = JSON.parse(row.value)
  const key = createPrivateKey({ key: jwk, format: 'jwk' })
  const publicKey = b64u(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]))

  const idOf = endpoint => createHash('sha256').update('push:' + endpoint).digest('base64url').slice(0, 22)

  /** Substitui as horas de um aparelho (as antigas são esquecidas). */
  function sync(sub, times) {
    const id = idOf(sub.endpoint)
    const now = Date.now()
    const clean = [...new Set(times.filter(t => Number.isInteger(t) && t > now && t < now + 40 * 86_400_000).map(t => Math.floor(t / 60_000) * 60_000))].slice(0, MAX_TIMES)
    db.prepare('INSERT INTO push_subs (id, endpoint, touched) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, touched = excluded.touched')
      .run(id, sealField(sub.endpoint), new Date().toISOString())
    db.prepare('DELETE FROM push_jobs WHERE sub_id = ?').run(id)
    const ins = db.prepare('INSERT OR IGNORE INTO push_jobs (sub_id, at) VALUES (?, ?)')
    for (const t of clean) ins.run(id, t)
    return clean.length
  }

  function forget(endpoint) {
    const id = idOf(endpoint)
    db.prepare('DELETE FROM push_jobs WHERE sub_id = ?').run(id)
    db.prepare('DELETE FROM push_subs WHERE id = ?').run(id)
  }

  function vapidHeaders(endpoint) {
    const aud = new URL(endpoint).origin
    const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    const payload = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:privacidade@casulo.space' }))
    const sig = sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' })
    return { authorization: `vapid t=${header}.${payload}.${b64u(sig)}, k=${publicKey}`, ttl: '3600', urgency: 'normal', 'content-length': '0' }
  }

  /** Envia o que está na hora (corre a cada minuto). Devolve quantas foram enviadas. */
  async function sendDue(fetchImpl = fetch) {
    const now = Date.now()
    const due = db.prepare('SELECT DISTINCT sub_id FROM push_jobs WHERE at <= ?').all(now)
    let sent = 0
    for (const { sub_id } of due) {
      db.prepare('DELETE FROM push_jobs WHERE sub_id = ? AND at <= ?').run(sub_id, now)
      const row = db.prepare('SELECT endpoint FROM push_subs WHERE id = ?').get(sub_id)
      if (!row) continue
      const endpoint = openField(row.endpoint)
      try {
        const res = await fetchImpl(endpoint, { method: 'POST', headers: vapidHeaders(endpoint) })
        if (res.status === 404 || res.status === 410) forget(endpoint) // o aparelho desligou as notificações
        else if (res.ok) sent++
      } catch { /* tenta-se só uma vez: um lembrete atrasado não serve de nada */ }
    }
    // Aparelhos sem horas futuras há mais de 60 dias são esquecidos.
    const old = new Date(now - 60 * 86_400_000).toISOString()
    db.prepare('DELETE FROM push_subs WHERE touched < ? AND id NOT IN (SELECT sub_id FROM push_jobs)').run(old)
    return sent
  }

  return { publicKey, sync, forget, sendDue, vapidHeaders }
}
