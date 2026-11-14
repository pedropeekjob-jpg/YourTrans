import { describe, expect, it } from 'vitest'
import { detectPitch } from './pitch'

const tone = (hz: number, sr = 44100, n = 2048) => Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin(2 * Math.PI * hz * i / sr) + 0.2 * Math.sin(4 * Math.PI * hz * i / sr))

describe('altura da voz', () => {
  for (const hz of [110, 165, 220]) {
    it(`deteta ${hz} Hz`, () => {
      const f = detectPitch(tone(hz), 44100)!
      expect(Math.abs(f - hz)).toBeLessThan(3)
    })
  }
  it('silêncio não tem altura', () => {
    expect(detectPitch(new Float32Array(2048), 44100)).toBeNull()
  })
})
