import { describe, expect, it } from 'vitest'
import { upcomingTimes } from './notify'
import type { Reminder } from './types'

const H = 3600_000, D = 24 * H
const now = Date.UTC(2026, 10, 14, 10)
const r = (next: number, everyDays: number): Reminder => ({ id: String(next), kind: 'hormona', label: 'x', next: new Date(next).toISOString(), everyDays })

describe('horas dos avisos', () => {
  it('repete os lembretes periódicos até 35 dias e ignora o passado', () => {
    const times = upcomingTimes([r(now - 2 * D, 7)], now)
    expect(times[0]).toBe(now + 5 * D)
    expect(times.every(t => t > now && t <= now + 35 * D)).toBe(true)
    expect(times.length).toBe(5)
  })
  it('lembretes únicos só contam se forem no futuro', () => {
    expect(upcomingTimes([r(now + H, 0), r(now - H, 0)], now)).toEqual([now + H])
  })
  it('nunca envia mais de 120 horas', () => {
    expect(upcomingTimes([r(now + H, 1), r(now + 2 * H, 1), r(now + 3 * H, 1), r(now + 4 * H, 1)], now).length).toBe(120)
  })
})
