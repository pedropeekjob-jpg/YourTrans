import { describe, expect, it } from 'vitest'
import { decryptJSON, deriveKey, encryptJSON, randomBytes } from './crypto'
import { buildLetter } from './letters'
import { screeningsFor } from '../data/health'
import { nextOccurrence, annualEvents } from '../data/events'
import * as storage from './storage'

describe('cifragem', () => {
  it('cifra e decifra com a chave derivada do PIN, e falha com outro PIN', async () => {
    const salt = randomBytes(16)
    const k = await deriveKey('1234', salt, 1000)
    const sealed = await encryptJSON(k, { a: 1 })
    expect(await decryptJSON(k, sealed)).toEqual({ a: 1 })
    await expect(decryptJSON(await deriveKey('9999', salt, 1000), sealed)).rejects.toThrow()
  })
})

describe('armazenamento', () => {
  it('passa de modo dispositivo para PIN e só abre com o PIN certo', async () => {
    const { key, vault } = await storage.initDevice()
    vault.settings.displayName = 'Sam'
    await storage.saveVault(key, vault)
    await storage.setPin(key, vault, '2468')
    await expect(storage.unlockPin('1111')).rejects.toThrow()
    const { vault: v } = await storage.unlockPin('2468')
    expect(v.settings.displayName).toBe('Sam')
  }, 20_000)
})

describe('pedidos', () => {
  it('inclui nomes, entidade e base legal', () => {
    const { body } = buildLetter('generic', { oldName: 'A', newName: 'B', entity: 'Banco X', reference: '123', city: 'Porto', email: '' })
    expect(body).toContain('Banco X')
    expect(body).toContain('artigo 16.º')
    expect(body).toContain('Lei n.º 38/2018')
  })
})

describe('rastreios', () => {
  it('baseiam-se nos órgãos e não no género', () => {
    expect(screeningsFor(30, ['colo']).map(s => s.id)).toEqual(['colo'])
    expect(screeningsFor(30, []).length).toBe(0)
    expect(screeningsFor(55, ['prostata']).map(s => s.id)).toContain('prostata')
  })
})

describe('agenda', () => {
  it('passa para o ano seguinte depois da data', () => {
    const tdor = annualEvents.find(e => e.id === 'tdor')!
    expect(nextOccurrence(tdor, new Date(2026, 10, 25)).getFullYear()).toBe(2027)
    expect(nextOccurrence(tdor, new Date(2026, 10, 1)).getFullYear()).toBe(2026)
  })
})
