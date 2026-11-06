import { describe, expect, it } from 'vitest'
import { Collector, newTransferCode, packVault, parseFrame, unpackVault } from './transfer'
import { emptyVault } from './types'

describe('passar dados por QR', () => {
  it('reconstrói o cofre a partir dos pedaços, em qualquer ordem', async () => {
    const v = emptyVault()
    v.settings.displayName = 'Alex'
    v.checkins = Array.from({ length: 400 }, (_, i) => `2026-01-${String(i % 28 + 1).padStart(2, '0')}x${i}`)
    const code = newTransferCode()
    const frames = await packVault(v, code)
    expect(frames.length).toBeGreaterThan(1)
    const c = new Collector()
    for (const f of [...frames].reverse().concat(frames)) c.add(parseFrame(f)!)
    expect(c.done).toBe(true)
    const back = await unpackVault(c.blob, code.toLowerCase())
    expect(back.settings.displayName).toBe('Alex')
    expect(back.checkins).toEqual(v.checkins)
    await expect(unpackVault(c.blob, 'AAAA-AAAA')).rejects.toThrow()
  })
  it('ignora QR que não são da app', () => {
    expect(parseFrame('https://exemplo.pt')).toBeNull()
  })
})
