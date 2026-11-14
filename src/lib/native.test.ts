import { describe, expect, it } from 'vitest'
import { isNative, planReminders, publicAppUrl, PUBLIC_URL } from './native'
import type { Reminder } from './types'

const DAY = 86_400_000
const now = Date.UTC(2026, 10, 14, 9)
const r = (o: Partial<Reminder>): Reminder => ({ id: 'a', kind: 'hormona', label: 'Gel', next: new Date(now + 3600_000).toISOString(), everyDays: 0, ...o })

describe('app nativa', () => {
  it('na web não é nativa', () => {
    expect(isNative()).toBe(false)
    ;(globalThis as unknown as { window: unknown }).window = { Capacitor: { isNativePlatform: () => true } }
    expect(isNative()).toBe(true)
    expect(publicAppUrl()).toBe(PUBLIC_URL)
    delete (globalThis as unknown as { window?: unknown }).window
  })

  it('lembrete único no futuro: uma notificação; no passado: nenhuma', () => {
    expect(planReminders([r({})], now)).toHaveLength(1)
    expect(planReminders([r({ next: new Date(now - DAY).toISOString() })], now)).toHaveLength(0)
  })

  it('lembrete que se repete avança a partir de hoje e fica dentro de 60 dias', () => {
    const plan = planReminders([r({ next: new Date(now - 10 * DAY + 3600_000).toISOString(), everyDays: 7 })], now)
    expect(plan[0].at).toBeGreaterThan(now)
    expect(plan[0].at - now).toBeLessThanOrEqual(7 * DAY)
    expect(plan.every(p => p.at <= now + 60 * DAY)).toBe(true)
    expect(plan).toHaveLength(8) // dias 4, 11, 18, 25, 32, 39, 46 e 53
  })

  it('nunca passa das 60 notificações (limite do iOS é 64) e os ids são únicos', () => {
    const plan = planReminders([r({ everyDays: 1 }), r({ id: 'b', everyDays: 1 })], now)
    expect(plan).toHaveLength(60)
    expect(new Set(plan.map(p => p.id)).size).toBe(60)
    expect(plan.map(p => p.at)).toEqual([...plan.map(p => p.at)].sort((a, b) => a - b))
  })
})
