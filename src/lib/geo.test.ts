import { describe, expect, it } from 'vitest'
import { distance, formatDistance, inPortugal, round4 } from './geo'

describe('geo', () => {
  it('calcula distâncias reais', () => {
    const lisboa = { lat: 38.7223, lng: -9.1393 }
    const porto = { lat: 41.1579, lng: -8.6291 }
    const d = distance(lisboa, porto)
    expect(d).toBeGreaterThan(270e3)
    expect(d).toBeLessThan(280e3)
  })
  it('formata em pt-PT', () => {
    expect(formatDistance(234)).toBe('230 m')
    expect(formatDistance(1530)).toBe('1,5 km')
    expect(formatDistance(23400)).toBe('23 km')
  })
  it('limita precisão e território', () => {
    expect(round4(38.722345678)).toBe(38.7223)
    expect(inPortugal({ lat: 32.65, lng: -16.9 })).toBe(true)
    expect(inPortugal({ lat: 40.4, lng: -3.7 })).toBe(false)
  })
})
