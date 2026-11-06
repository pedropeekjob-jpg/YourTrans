// Cifragem local com WebCrypto (AES-GCM 256). Nada sai do dispositivo.
const enc = new TextEncoder()
const dec = new TextDecoder()

export const PBKDF2_ITERATIONS = 310_000

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

export function toB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

/** Chave aleatória não exportável, guardada no IndexedDB (modo sem PIN). */
export function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/** Deriva a chave a partir do PIN/palavra-passe. */
export async function deriveKey(secret: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface Sealed { iv: string; ct: string }

export async function encryptBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Sealed> {
  const iv = randomBytes(12)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data))
  return { iv: toB64(iv), ct: toB64(ct) }
}

export async function decryptBytes(key: CryptoKey, sealed: Sealed): Promise<Uint8Array<ArrayBuffer>> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct))
  return new Uint8Array(pt)
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<Sealed> {
  return encryptBytes(key, enc.encode(JSON.stringify(value)))
}

export async function decryptJSON<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  return JSON.parse(dec.decode(await decryptBytes(key, sealed))) as T
}

/** Chave de dados aleatória: devolve os bytes (para embrulhar) e a chave não exportável (para usar). */
export async function generateDataKey(): Promise<{ raw: Uint8Array<ArrayBuffer>; key: CryptoKey }> {
  const raw = randomBytes(32)
  return { raw, key: await importDataKey(raw) }
}

export function importDataKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

// Alfabeto sem letras ambíguas (sem I, L, O, U): fácil de copiar à mão.
const RECOVERY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Código de recuperação com 100 bits: 20 caracteres em grupos de 4 (ex.: 7K2M-…). */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(20)
  const chars = Array.from(bytes, b => RECOVERY_ALPHABET[b % 32])
  return chars.join('').match(/.{4}/g)!.join('-')
}

/** Normaliza o que a pessoa escreveu: maiúsculas, sem espaços nem traços, O→0, I/L→1. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
}
