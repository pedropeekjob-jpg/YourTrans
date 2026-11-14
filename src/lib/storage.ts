// Camada de armazenamento: tudo o que é pessoal é guardado cifrado no IndexedDB.
// Metadados (modo, sal) não revelam conteúdo.
import { createStore, get, set, del, clear, keys, promisifyRequest } from 'idb-keyval'
import {
  decryptBytes, decryptJSON, deriveKey, encryptBytes, encryptJSON, fromB64, generateDataKey, generateRecoveryCode,
  generateDeviceKey, importDataKey, normalizeRecoveryCode, PBKDF2_ITERATIONS, randomBytes, toB64, type Sealed,
} from './crypto'
import { emptyVault, type Vault } from './types'
import { createPasskey, prfToKey, passkeySecret, type PasskeyWrap } from './passkey'

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
  /** Passkey: a mesma chave de dados, embrulhada com o segredo PRF do autenticador. */
  passkey?: PasskeyWrap & { wrap: Sealed }
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
  saved = {}
  await saveVault(key, vault)
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

/**
 * Liga o desbloqueio com passkey. Pede o código atual para recuperar a chave de dados (a chave em uso
 * não é exportável, de propósito). Mudar ou remover o código apaga a passkey (a chave de dados muda).
 */
export async function enablePasskey(pin: string, label: string): Promise<void> {
  const meta = await pinMeta()
  if (!meta.wrapPin) throw new Error('Formato antigo: muda o código primeiro')
  const kek = await deriveKey(pin, fromB64(meta.salt!), meta.iterations ?? PBKDF2_ITERATIONS)
  let raw: Uint8Array<ArrayBuffer>
  try { raw = await decryptBytes(kek, meta.wrapPin) } catch { throw new Error('PIN incorreto') }
  const { wrap, prf } = await createPasskey(label)
  const sealed = await encryptBytes(await prfToKey(prf), raw)
  await set(META, { ...meta, passkey: { ...wrap, wrap: sealed } }, store)
}

export async function disablePasskey(): Promise<void> {
  const meta = await getMeta()
  if (meta?.passkey) await set(META, { ...meta, passkey: undefined }, store)
}

export async function hasPasskey(): Promise<boolean> {
  return !!(await getMeta())?.passkey
}

/** Entra com a passkey. Uma falha aqui não conta como tentativa errada (é o autenticador que verifica). */
export async function unlockPasskey(): Promise<{ key: CryptoKey; vault: Vault }> {
  const meta = await pinMeta()
  if (!meta.passkey) throw new Error('Sem passkey')
  const prf = await passkeySecret(meta.passkey)
  const key = await importDataKey(await decryptBytes(await prfToKey(prf), meta.passkey.wrap))
  const vault = await loadVault(key)
  if (meta.failures) await set(META, { ...meta, failures: 0, lockedUntil: undefined }, store)
  return { key, vault }
}

export async function hasRecovery(): Promise<boolean> {
  const meta = await getMeta()
  return !!meta?.wrapRec
}

/**
 * O cofre está dividido: o essencial (definições, listas pequenas) numa entrada e cada coleção que cresce
 * (diário, efeitos, tomas…) na sua. Assim, escrever uma linha no diário já não recifra os registos todos.
 * Cofres antigos (tudo numa entrada) abrem igual e passam ao novo formato na primeira gravação.
 */
export const SPLIT = ['journal', 'effects', 'doseLog', 'feelings', 'incidents', 'appointments', 'checkins', 'practiceDays', 'summaries', 'received'] as const
type SplitKey = (typeof SPLIT)[number]
const COL = 'col:'

/** Última versão gravada de cada coleção (por referência), para só gravar o que mudou. */
let saved: Partial<Record<SplitKey, unknown>> = {}

async function loadVault(key: CryptoKey): Promise<Vault> {
  saved = {}
  const sealed = await get<Sealed>(VAULT, store)
  if (!sealed) return emptyVault()
  const v = await decryptJSON<Vault>(key, sealed)
  for (const k of SPLIT) {
    const col = await get<Sealed>(COL + k, store)
    if (col) {
      const value = await decryptJSON<unknown>(key, col)
      ;(v as unknown as Record<string, unknown>)[k] = value
      saved[k] = value
    }
    // Sem entrada própria (cofre antigo): o valor veio do essencial e ainda não foi gravado à parte,
    // por isso "saved" fica vazio e a primeira gravação escreve a coleção antes de a tirar do essencial.
  }
  const base = emptyVault()
  const out = { ...base, ...v, settings: { ...base.settings, ...v.settings } }
  for (const k of SPLIT) if (k in saved) saved[k] = out[k]
  return out
}

/** Prepara as escritas: o essencial sem as coleções e cada coleção que mudou (ou todas, com all). */
async function vaultWrites(key: CryptoKey, vault: Vault, all: boolean): Promise<[string, unknown][]> {
  const core: Record<string, unknown> = { ...vault }
  const writes: [string, unknown][] = []
  for (const k of SPLIT) {
    delete core[k]
    if (all || saved[k] !== vault[k]) writes.push([COL + k, await encryptJSON(key, vault[k])])
  }
  writes.push([VAULT, await encryptJSON(key, core)])
  return writes
}

function markSaved(vault: Vault) {
  saved = {}
  for (const k of SPLIT) saved[k] = vault[k]
}

async function putAll(writes: [string, unknown][], remove: string[] = []): Promise<void> {
  await store('readwrite', s => {
    for (const [k, v] of writes) s.put(v, k)
    for (const k of remove) s.delete(k)
    return promisifyRequest(s.transaction)
  })
}

/** Grava numa só transação: se a app fechar a meio, fica a versão anterior inteira. */
export async function saveVault(key: CryptoKey, vault: Vault): Promise<void> {
  await putAll(await vaultWrites(key, vault, false))
  markSaved(vault)
}

/**
 * Recifra tudo (cofre + fotos) com uma nova chave e grava de uma só vez.
 * Primeiro cifra tudo em memória; depois grava fotos, cofre e metadados numa única
 * transação do IndexedDB. Se a app fechar a meio, fica tudo como estava (antes,
 * podia ficar parte com a chave nova e o resto com a antiga, e perdiam-se dados).
 */
async function rekey(oldKey: CryptoKey, newKey: CryptoKey, vault: Vault, finalWrites: [string, unknown][], remove: string[] = []): Promise<void> {
  const writes: [string, unknown][] = []
  for (const k of await keys(store)) {
    if (typeof k === 'string' && k.startsWith(PHOTO_PREFIX)) {
      const sealed = await get<Sealed>(k, store)
      if (sealed) writes.push([k, await encryptBytes(newKey, await decryptBytes(oldKey, sealed))])
    }
  }
  writes.push(...await vaultWrites(newKey, vault, true), ...finalWrites)
  await putAll(writes, remove)
  markSaved(vault)
}

/** Ativa (ou muda) o PIN: cria uma chave de dados nova, recifra tudo e devolve um código de recuperação novo. */
export async function setPin(oldKey: CryptoKey, vault: Vault, pin: string): Promise<{ key: CryptoKey; recoveryCode: string }> {
  const { raw, key } = await generateDataKey()
  const salt = randomBytes(16)
  const recSalt = randomBytes(16)
  const recoveryCode = generateRecoveryCode()
  const wrapPin = await encryptBytes(await deriveKey(pin, salt), raw)
  const wrapRec = await encryptBytes(await deriveKey(normalizeRecoveryCode(recoveryCode), recSalt), raw)
  const meta: Meta = { v: 1, mode: 'pin', salt: toB64(salt), iterations: PBKDF2_ITERATIONS, wrapPin, wrapRec, recSalt: toB64(recSalt) }
  await rekey(oldKey, key, vault, [[META, meta]], [DEVICE_KEY])
  return { key, recoveryCode }
}

export async function removePin(oldKey: CryptoKey, vault: Vault): Promise<CryptoKey> {
  const key = await generateDeviceKey()
  await rekey(oldKey, key, vault, [[DEVICE_KEY, key], [META, { v: 1, mode: 'device' } satisfies Meta]])
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
  saved = {}
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
