// Passar os dados para outro aparelho por códigos QR animados, sem servidor.
// Os dados (sem fotos) são comprimidos, cifrados com um código curto que se escreve à mão
// no outro aparelho, e partidos em pedaços. Quem filmar o ecrã sem o código não consegue lê-los.
import { decryptBytes, deriveKey, encryptBytes, fromB64, generateRecoveryCode, normalizeRecoveryCode, randomBytes, toB64 } from './crypto'
import { emptyVault, type Vault } from './types'

export const FRAME_PREFIX = 'CS1'
/** Caracteres base64 por código QR: legível por câmaras de portátil a partir de um ecrã. */
export const CHUNK = 500

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Response(new Blob([data]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export function newTransferCode(): string {
  // 12 caracteres (60 bits): mesmo quem filme o ecrã não consegue adivinhar o código.
  return generateRecoveryCode(12)
}

/** Cifra o cofre e devolve as frases a mostrar como QR, por ordem. */
export async function packVault(vault: Vault, code: string): Promise<string[]> {
  const json = new TextEncoder().encode(JSON.stringify(vault))
  const zipped = await pipe(json, new CompressionStream('gzip'))
  const salt = randomBytes(16)
  const key = await deriveKey(normalizeRecoveryCode(code), salt)
  const sealed = await encryptBytes(key, zipped)
  const blob = `${toB64(salt)}.${sealed.iv}.${sealed.ct}`
  const id = toB64(randomBytes(3))
  const n = Math.ceil(blob.length / CHUNK)
  return Array.from({ length: n }, (_, i) => `${FRAME_PREFIX}|${id}|${i}|${n}|${blob.slice(i * CHUNK, (i + 1) * CHUNK)}`)
}

export interface Frame { id: string; i: number; n: number; data: string }

export function parseFrame(text: string): Frame | null {
  const m = /^CS1\|([^|]+)\|(\d+)\|(\d+)\|(.*)$/s.exec(text)
  if (!m) return null
  const i = Number(m[2]), n = Number(m[3])
  if (!(n > 0 && i < n && n < 10_000)) return null
  return { id: m[1], i, n, data: m[4] }
}

/** Junta pedaços à medida que chegam (em qualquer ordem, com repetições). */
export class Collector {
  id = ''
  n = 0
  parts = new Map<number, string>()
  add(f: Frame): boolean {
    if (f.id !== this.id) { this.id = f.id; this.n = f.n; this.parts.clear() }
    const isNew = !this.parts.has(f.i)
    this.parts.set(f.i, f.data)
    return isNew
  }
  get done() { return this.n > 0 && this.parts.size === this.n }
  get blob() { return Array.from({ length: this.n }, (_, i) => this.parts.get(i) ?? '').join('') }
}

export async function unpackVault(blob: string, code: string): Promise<Vault> {
  const [salt, iv, ct] = blob.split('.')
  if (!salt || !iv || !ct) throw new Error('Dados incompletos')
  const key = await deriveKey(normalizeRecoveryCode(code), fromB64(salt))
  const zipped = await decryptBytes(key, { iv, ct })
  const v = JSON.parse(new TextDecoder().decode(await pipe(zipped, new DecompressionStream('gzip')))) as Vault
  const base = emptyVault()
  return { ...base, ...v, settings: { ...base.settings, ...v.settings } }
}
