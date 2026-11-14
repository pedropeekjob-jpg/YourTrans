// Proteções de privacidade do servidor: IP de quem pede (só para limites, nunca guardado)
// e cifra da cópia de segurança.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

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

// Os campos de contacto são cifrados em webcrypto.mjs (fieldCipher), que corre também nos Workers.
// Aqui fica só o que é exclusivo do Node: a cifra da cópia de segurança (ficheiro inteiro).
const KEY = process.env.DATA_KEY ? createHash('sha256').update('casulo-contactos:' + process.env.DATA_KEY).digest() : null

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
