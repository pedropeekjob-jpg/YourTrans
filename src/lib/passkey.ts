// Desbloqueio com passkey (impressão digital, rosto ou PIN do telemóvel), usando a extensão PRF do WebAuthn.
// O autenticador devolve um segredo de 32 bytes que nunca sai do aparelho e só existe depois de a pessoa
// se identificar. Desse segredo derivamos uma chave que embrulha a chave de dados (como o código faz).
// Não há servidor: o "relying party" é o próprio site e nada é enviado para fora.
import { Capacitor } from '@capacitor/core'
import { fromB64, randomBytes, toB64 } from './crypto'

export interface PasskeyWrap { id: string; salt: string }

/** Só no browser (nas apps das lojas a biometria nativa substitui isto) e com WebAuthn disponível. */
export function passkeySupported(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return false
  } catch { /* fora do Capacitor */ }
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && window.isSecureContext
}

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } }

/** Transforma a saída do PRF numa chave AES-GCM (HKDF), para embrulhar a chave de dados. */
export async function prfToKey(prf: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', prf, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('casulo-passkey-v1') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  )
}

async function evaluate(id: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null
  const out = (cred?.getClientExtensionResults() as PrfResults | undefined)?.prf?.results?.first
  if (!out) throw new Error('prf-unsupported')
  return out
}

/** Cria a passkey e devolve o segredo PRF e o que é preciso guardar para voltar a pedi-lo. */
export async function createPasskey(label: string): Promise<{ wrap: PasskeyWrap; prf: ArrayBuffer }> {
  const salt = randomBytes(32)
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { id: location.hostname, name: label },
      // Identificador aleatório: não liga a passkey a nenhuma pessoa nem conta.
      user: { id: randomBytes(16), name: label, displayName: label },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'discouraged', userVerification: 'required' },
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null
  if (!cred) throw new Error('cancelled')
  const ext = cred.getClientExtensionResults() as PrfResults
  if (ext.prf?.enabled === false) throw new Error('prf-unsupported')
  const id = new Uint8Array(cred.rawId)
  // Alguns autenticadores só devolvem o PRF num pedido de autenticação, não na criação.
  const prf = ext.prf?.results?.first ?? await evaluate(id, salt)
  return { wrap: { id: toB64(id), salt: toB64(salt) }, prf }
}

/** Pede a passkey (impressão digital/rosto) e devolve o segredo PRF. */
export function passkeySecret(wrap: PasskeyWrap): Promise<ArrayBuffer> {
  return evaluate(fromB64(wrap.id), fromB64(wrap.salt))
}
