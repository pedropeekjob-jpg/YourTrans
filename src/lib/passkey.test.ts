import { describe, expect, it } from 'vitest'
import { prfToKey } from './passkey'
import { decryptBytes, encryptBytes, randomBytes } from './crypto'

describe('passkey', () => {
  it('o mesmo segredo PRF abre a chave de dados; outro não', async () => {
    const prf = randomBytes(32).buffer
    const raw = randomBytes(32)
    const sealed = await encryptBytes(await prfToKey(prf), raw)
    expect(await decryptBytes(await prfToKey(prf), sealed)).toEqual(raw)
    await expect(decryptBytes(await prfToKey(randomBytes(32).buffer), sealed)).rejects.toThrow()
  })
})
