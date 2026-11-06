// Camada de armazenamento: tudo o que é pessoal é guardado cifrado no IndexedDB.
// Metadados (modo, sal) não revelam conteúdo.
import { createStore, get, set, del, clear, keys } from 'idb-keyval'
import {
  decryptBytes, decryptJSON, deriveKey, encryptBytes, encryptJSON, fromB64, generateDataKey, generateRecoveryCode,
  generateDeviceKey, importDataKey, normalizeRecoveryCode, PBKDF2_ITERATIONS, randomBytes, toB64, type Sealed,
} from './crypto'
import { emptyVault, type Vault } from './types'

const store = createStore('notas-db', 'kv')

export type LockMode = 'device' | 'pin'

interface Meta {
  v: 1
  mode: LockMode
  salt?: string
  iterations?: number
  /** Tentativas falhadas consecutivas (para atrasar ataques de força bruta) */
  failures?: number
  lockedUntil?: number
  /** Chave de dados embrulhada com a chave do PIN (formato com recuperação). */
  wrapPin?: Sealed
  /** A mesma chave de dados, embrulhada com a chave do código de recuperação. */
  wrapRec?: Sealed
  recSalt?: string
}

const META = 'meta'
const VAULT = 'vault'
const DEVICE_KEY = 'device-key'
const PHOTO_PREFIX = 'photo:'

export async function getMeta(): Promise<Meta | undefined> {
  return get<Meta>(META, store)
}

export async function isInitialised(): Promise<boolean> {
  return (await getMeta()) !== undefined
}

/** Primeira utilização: sem conta, sem PIN, chave aleatória do dispositivo. */
export async function initDevice(): Promise<{ key: CryptoKey; vault: Vault }> {
  const key = await generateDeviceKey()
  const vault = emptyVault()
  await set(DEVICE_KEY, key, store)
  await set(META, { v: 1, mode: 'device' } satisfies Meta, store)
  await set(VAULT, await encryptJSON(key, vault), store)
  return { key, vault }
}

export async function unlockDevice(): Promise<{ key: CryptoKey; vault: Vault }> {
  const key = await get<CryptoKey>(DEVICE_KEY, store)
  if (!key) throw new Error('Chave do dispositivo em falta')
  return { key, vault: await loadVault(key) }
}

export class LockedOutError extends Error {
  constructor(public until: number) { super('locked') }
}

/** Atrasa tentativas falhadas (PIN ou código de recuperação): após 5 falhas, 30 s, 60 s, 120 s, ... */
async function registerFailure(meta: Meta): Promise<void> {
  const failures = (meta.failures ?? 0) + 1
  const lockedUntil = failures >= 5 ? Date.now() + 30_000 * 2 ** (failures - 5) : undefined
  await set(META, { ...meta, failures, lockedUntil }, store)
}

async function pinMeta(): Promise<Meta> {
  const meta = await getMeta()
  if (!meta || meta.mode !== 'pin' || !meta.salt) throw new Error('Sem PIN definido')
  if (meta.lockedUntil && meta.lockedUntil > Date.now()) throw new LockedOutError(meta.lockedUntil)
  return meta
}

export async function unlockPin(pin: string): Promise<{ key: CryptoKey; vault: Vault }> {
  const meta = await pinMeta()
  const kek = await deriveKey(pin, fromB64(meta.salt!), meta.iterations ?? PBKDF2_ITERATIONS)
  try {
    // Formato antigo (sem recuperação): a chave do PIN cifra os dados diretamente.
    const key = meta.wrapPin ? await importDataKey(await decryptBytes(kek, meta.wrapPin)) : kek
    const vault = await loadVault(key)
    if (meta.failures) await set(META, { ...meta, failures: 0, lockedUntil: undefined }, store)
    return { key, vault }
  } catch {
    await registerFailure(meta)
    throw new Error('PIN incorreto')
  }
}

/** Entra com o código de recuperação, quando a pessoa se esqueceu do PIN. */
export async function unlockRecovery(code: string): Promise<{ key: CryptoKey; vault: Vault }> {
  const meta = await pinMeta()
  if (!meta.wrapRec || !meta.recSalt) throw new Error('Sem código de recuperação')
  const kek = await deriveKey(normalizeRecoveryCode(code), fromB64(meta.recSalt), meta.iterations ?? PBKDF2_ITERATIONS)
  try {
    const key = await importDataKey(await decryptBytes(kek, meta.wrapRec))
    const vault = await loadVault(key)
    if (meta.failures) await set(META, { ...meta, failures: 0, lockedUntil: undefined }, store)
    return { key, vault }
  } catch {
    await registerFailure(meta)
    throw new Error('Código de recuperação incorreto')
  }
}

export async function hasRecovery(): Promise<boolean> {
  const meta = await getMeta()
  return !!meta?.wrapRec
}

async function loadVault(key: CryptoKey): Promise<Vault> {
  const sealed = await get<Sealed>(VAULT, store)
  if (!sealed) return emptyVault()
  const v = await decryptJSON<Vault>(key, sealed)
  const base = emptyVault()
  return { ...base, ...v, settings: { ...base.settings, ...v.settings } }
}

export async function saveVault(key: CryptoKey, vault: Vault): Promise<void> {
  await set(VAULT, await encryptJSON(key, vault), store)
}

/** Recifra tudo (cofre + fotos) com uma nova chave. */
async function rekey(oldKey: CryptoKey, newKey: CryptoKey, vault: Vault): Promise<void> {
  const all = await keys(store)
  for (const k of all) {
    if (typeof k === 'string' && k.startsWith(PHOTO_PREFIX)) {
      const sealed = await get<Sealed>(k, store)
      if (sealed) await set(k, await encryptBytes(newKey, await decryptBytes(oldKey, sealed)), store)
    }
  }
  await saveVault(newKey, vault)
}

/** Ativa (ou muda) o PIN: cria uma chave de dados nova, recifra tudo e devolve um código de recuperação novo. */
export async function setPin(oldKey: CryptoKey, vault: Vault, pin: string): Promise<{ key: CryptoKey; recoveryCode: string }> {
  const { raw, key } = await generateDataKey()
  await rekey(oldKey, key, vault)
  const salt = randomBytes(16)
  const recSalt = randomBytes(16)
  const recoveryCode = generateRecoveryCode()
  const wrapPin = await encryptBytes(await deriveKey(pin, salt), raw)
  const wrapRec = await encryptBytes(await deriveKey(normalizeRecoveryCode(recoveryCode), recSalt), raw)
  await set(META, { v: 1, mode: 'pin', salt: toB64(salt), iterations: PBKDF2_ITERATIONS, wrapPin, wrapRec, recSalt: toB64(recSalt) } satisfies Meta, store)
  await del(DEVICE_KEY, store)
  return { key, recoveryCode }
}

export async function removePin(oldKey: CryptoKey, vault: Vault): Promise<CryptoKey> {
  const key = await generateDeviceKey()
  await rekey(oldKey, key, vault)
  await set(DEVICE_KEY, key, store)
  await set(META, { v: 1, mode: 'device' } satisfies Meta, store)
  return key
}

export async function savePhoto(key: CryptoKey, id: string, data: Uint8Array<ArrayBuffer>): Promise<void> {
  await set(PHOTO_PREFIX + id, await encryptBytes(key, data), store)
}

export async function loadPhoto(key: CryptoKey, id: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const sealed = await get<Sealed>(PHOTO_PREFIX + id, store)
  return sealed ? decryptBytes(key, sealed) : undefined
}

export async function deletePhoto(id: string): Promise<void> {
  await del(PHOTO_PREFIX + id, store)
}

/** Apaga absolutamente tudo deste dispositivo. */
export async function wipeAll(): Promise<void> {
  await clear(store)
  try { localStorage.clear(); sessionStorage.clear() } catch { /* ignorado */ }
  if ('caches' in globalThis) {
    for (const name of await caches.keys()) await caches.delete(name)
  }
}

/** Cópia de segurança cifrada com uma palavra-passe escolhida no momento. */
export async function exportBackup(vault: Vault, password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  const sealed = await encryptJSON(key, vault)
  return JSON.stringify({ format: 'notas-backup', v: 1, salt: toB64(salt), iterations: PBKDF2_ITERATIONS, ...sealed })
}

export async function importBackup(text: string, password: string): Promise<Vault> {
  const data = JSON.parse(text) as { format: string; salt: string; iterations: number } & Sealed
  if (data.format !== 'notas-backup') throw new Error('Ficheiro inválido')
  const key = await deriveKey(password, fromB64(data.salt), data.iterations)
  const v = await decryptJSON<Vault>(key, data)
  const base = emptyVault()
  return { ...base, ...v, settings: { ...base.settings, ...v.settings } }
}
