// Criptografia que corre igual no Node e nos Cloudflare Workers (Web Crypto), para o mesmo
// código do servidor servir nos dois sítios. Os formatos são os mesmos da versão antiga em
// node:crypto, por isso o que já está guardado continua a abrir.
const subtle = globalThis.crypto.subtle
const enc = new TextEncoder()
const dec = new TextDecoder()

export function b64u(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function fromB64u(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}
export const utf8 = s => enc.encode(s)

export const randomId = (n = 9) => b64u(globalThis.crypto.getRandomValues(new Uint8Array(n)))

export async function sha256(data) {
  return new Uint8Array(await subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data))
}

export async function hmac(secret, data) {
  const key = await subtle.importKey('raw', typeof secret === 'string' ? enc.encode(secret) : secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await subtle.sign('HMAC', key, enc.encode(data)))
}

/** Compara dois textos sem revelar, pelo tempo que demora, onde diferem. */
export function sameSecret(a, b) {
  const x = enc.encode(a), y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

/**
 * Assinatura pública de quem publica: HMAC do código do aparelho com um segredo do servidor.
 * Mostra-se só um resumo, que não permite chegar ao código.
 */
export async function authorTag(author, secret) {
  return b64u(await hmac(secret, 'autor:' + author)).slice(0, 16)
}

const PREFIX = 'enc1:'

/**
 * Cifra dos campos de contacto a partir de DATA_KEY (AES-256-GCM).
 * Formato: "enc1:" + base64url(iv 12 | etiqueta 16 | texto cifrado), igual ao antigo.
 * Sem DATA_KEY os contactos ficam em claro (o servidor avisa ao arrancar).
 */
export function fieldCipher(dataKey) {
  const keyP = dataKey ? sha256('casulo-contactos:' + dataKey).then(raw => subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])) : null
  return {
    enabled: !!keyP,
    async seal(text) {
      if (!keyP || typeof text !== 'string') return text
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
      const out = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await keyP, enc.encode(text)))
      const ct = out.subarray(0, out.length - 16), tag = out.subarray(out.length - 16)
      const all = new Uint8Array(12 + 16 + ct.length)
      all.set(iv, 0); all.set(tag, 12); all.set(ct, 28)
      return PREFIX + b64u(all)
    },
    async open(value) {
      if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value
      if (!keyP) return '(cifrado: falta DATA_KEY)'
      try {
        const raw = fromB64u(value.slice(PREFIX.length))
        const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), ct = raw.subarray(28)
        const joined = new Uint8Array(ct.length + 16)
        joined.set(ct, 0); joined.set(tag, ct.length)
        return dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv }, await keyP, joined))
      } catch { return '(não foi possível decifrar)' }
    },
  }
}

/** Chave VAPID nova (P-256), em JWK como a versão antiga guardava. */
export async function newVapidJwk() {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const { kty, crv, x, y, d } = await subtle.exportKey('jwk', pair.privateKey)
  return { kty, crv, x, y, d }
}

export async function importVapid(jwk) {
  const { kty, crv, x, y, d } = jwk
  const key = await subtle.importKey('jwk', { kty, crv, x, y, d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const pub = new Uint8Array(65)
  pub[0] = 4; pub.set(fromB64u(x), 1); pub.set(fromB64u(y), 33)
  return { key, publicKey: b64u(pub) }
}

/** Assinatura ES256 (r|s, 64 bytes), como pede o JWT do VAPID. */
export async function signES256(key, data) {
  return new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(data)))
}
