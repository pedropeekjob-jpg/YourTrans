// Proteções de privacidade do servidor: IP de quem pede (só para limites, nunca guardado)
// e cifragem dos campos de contacto guardados na base de dados.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'

/**
 * IP de quem fez o pedido, só para limitar abusos (nunca é guardado nem escrito em registos).
 * O Render está atrás da Cloudflare, que escreve o CF-Connecting-IP e não deixa o cliente
 * falsificá-lo. O proxy do Render só ACRESCENTA ao X-Forwarded-For, por isso o primeiro valor
 * é escolhido pelo cliente: usamos o último, o que o proxy acrescentou.
 */
export function clientIp(req) {
  const cf = req.headers['cf-connecting-ip'] ?? req.headers['true-client-ip']
  if (typeof cf === 'string' && cf.trim()) return cf.trim()
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.trim()) return xff.split(',').pop().trim()
  return req.socket?.remoteAddress ?? ''
}

/**
 * Chave para os contactos (mentoria, e-mail das entidades), a partir de DATA_KEY.
 * Sem DATA_KEY os contactos ficam como antes (em claro) e o servidor avisa ao arrancar.
 * Se a chave se perder, só se perdem estes contactos, que já são apagados ao fim de 6 meses.
 */
const KEY = process.env.DATA_KEY ? createHash('sha256').update('casulo-contactos:' + process.env.DATA_KEY).digest() : null
export const contactsEncrypted = !!KEY
const PREFIX = 'enc1:'

export function sealField(text) {
  if (!KEY || typeof text !== 'string') return text
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()])
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url')
}

export function openField(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value
  if (!KEY) return '(cifrado: falta DATA_KEY)'
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64url')
    const d = createDecipheriv('aes-256-gcm', KEY, raw.subarray(0, 12))
    d.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')
  } catch { return '(não foi possível decifrar)' }
}

/** Cifra um ficheiro inteiro (a cópia de segurança) com a mesma chave. */
export function sealBuffer(buf) {
  if (!KEY) throw new Error('DATA_KEY em falta')
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([c.update(buf), c.final()])
  return Buffer.concat([Buffer.from('CASULO1'), iv, c.getAuthTag(), ct])
}

export function openBuffer(buf) {
  if (!KEY) throw new Error('DATA_KEY em falta')
  if (buf.subarray(0, 7).toString() !== 'CASULO1') throw new Error('Formato desconhecido')
  const d = createDecipheriv('aes-256-gcm', KEY, buf.subarray(7, 19))
  d.setAuthTag(buf.subarray(19, 35))
  return Buffer.concat([d.update(buf.subarray(35)), d.final()])
}

/**
 * Assinatura pública de quem publica, para se poder bloquear e moderar sem saber quem é.
 * O telemóvel cria um código aleatório e envia-o com cada publicação; o servidor guarda e
 * mostra só um resumo (HMAC com um segredo do servidor), que não permite chegar ao código.
 */
export const validAuthor = v => typeof v === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(v)
export function authorTag(author, secret) {
  return createHmac('sha256', secret).update('autor:' + author).digest('base64url').slice(0, 16)
}
