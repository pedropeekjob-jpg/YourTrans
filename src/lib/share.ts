// Partilha de cartões e planos por ligação ou QR, sem servidor.
// O conteúdo vai no fragmento do URL (#/receber/...), que os browsers nunca enviam
// ao servidor. Formato: "p.<dados>" (simples) ou "e.<dados>" (cifrado com palavra-passe).
import { deriveKey, randomBytes } from './crypto'
import type { SharedPayload } from './types'

const SHARE_ITERATIONS = 200_000

function toB64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  const out = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i)
  return out
}

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Response(new Blob([data]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

const deflate = (d: Uint8Array<ArrayBuffer>) => pipe(d, new CompressionStream('deflate-raw'))
const inflate = (d: Uint8Array<ArrayBuffer>) => pipe(d, new DecompressionStream('deflate-raw'))

export async function encodeShare(payload: SharedPayload, passphrase?: string): Promise<string> {
  const packed = await deflate(new TextEncoder().encode(JSON.stringify(payload)))
  if (!passphrase) return 'p.' + toB64url(packed)
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await deriveKey(passphrase, salt, SHARE_ITERATIONS)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, packed))
  const all = new Uint8Array(28 + ct.length)
  all.set(salt, 0); all.set(iv, 16); all.set(ct, 28)
  return 'e.' + toB64url(all)
}

export function isEncrypted(code: string): boolean {
  return code.startsWith('e.')
}

export async function decodeShare(code: string, passphrase?: string): Promise<SharedPayload> {
  const [kind, data] = [code.slice(0, 2), code.slice(2)]
  let packed = fromB64url(data)
  if (kind === 'e.') {
    if (!passphrase) throw new Error('Precisa de palavra-passe')
    const key = await deriveKey(passphrase, packed.slice(0, 16), SHARE_ITERATIONS)
    packed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(16, 28) }, key, packed.slice(28)))
  } else if (kind !== 'p.') throw new Error('Ligação inválida')
  const payload = JSON.parse(new TextDecoder().decode(await inflate(packed))) as SharedPayload
  if (payload.v !== 1 || (!payload.card && !payload.plan)) throw new Error('Ligação inválida')
  return payload
}

export function shareUrl(code: string): string {
  return `${location.origin}${location.pathname}#/receber/${code}`
}

/** Extrai o código de uma ligação colada (ou do próprio código). */
export function codeFromText(text: string): string | undefined {
  const m = text.trim().match(/(?:receber\/)?([pe]\.[A-Za-z0-9_-]+)\s*$/)
  return m?.[1]
}
