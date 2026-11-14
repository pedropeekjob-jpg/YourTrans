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

  it('as fotos acompanham a troca de chave ao ligar e desligar o PIN', async () => {
    await storage.wipeAll()
    const { key, vault } = await storage.initDevice()
    await storage.savePhoto(key, 'f1', new Uint8Array([1, 2, 3]))
    const { key: pinKey } = await storage.setPin(key, vault, '1357')
    expect(Array.from((await storage.loadPhoto(pinKey, 'f1'))!)).toEqual([1, 2, 3])
    const deviceKey = await storage.removePin(pinKey, vault)
    expect((await storage.getMeta())?.mode).toBe('device')
    const { key: reopened } = await storage.unlockDevice()
    expect(Array.from((await storage.loadPhoto(reopened, 'f1'))!)).toEqual([1, 2, 3])
    expect(Array.from((await storage.loadPhoto(deviceKey, 'f1'))!)).toEqual([1, 2, 3])
  }, 20_000)
})

describe('cofre dividido', () => {
  it('abre um cofre antigo (tudo numa entrada) e passa ao formato novo sem perder nada', async () => {
    await storage.wipeAll()
    const { key, vault } = await storage.initDevice()
    const { set, createStore } = await import('idb-keyval')
    const old = { ...vault, journal: [{ id: 'j1', date: '2026-01-01', text: 'olá', photoIds: [] }], checkins: ['2026-01-01'] }
    // Simula o formato antigo: só a entrada "vault", sem coleções à parte.
    await storage.wipeAll()
    await set('meta', { v: 1, mode: 'device' }, createStore('notas-db', 'kv'))
    await set('device-key', key, createStore('notas-db', 'kv'))
    await set('vault', await encryptJSON(key, old), createStore('notas-db', 'kv'))
    const a = await storage.unlockDevice()
    expect(a.vault.journal[0].text).toBe('olá')
    a.vault.settings.displayName = 'Rui'
    await storage.saveVault(a.key, { ...a.vault, settings: { ...a.vault.settings } })
    const b = await storage.unlockDevice()
    expect(b.vault.journal[0].text).toBe('olá')
    expect(b.vault.checkins).toEqual(['2026-01-01'])
    expect(b.vault.settings.displayName).toBe('Rui')
  })

  it('grava só as coleções que mudaram e mantém as outras', async () => {
    await storage.wipeAll()
    const { key, vault } = await storage.initDevice()
    const v1 = { ...vault, journal: [{ id: 'j1', date: '2026-01-01', text: 'a', photoIds: [] }] }
    await storage.saveVault(key, v1)
    const v2 = { ...v1, checkins: ['2026-02-02'] }
    await storage.saveVault(key, v2)
    const { vault: r } = await storage.unlockDevice()
    expect(r.journal.length).toBe(1)
    expect(r.checkins).toEqual(['2026-02-02'])
  })
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
