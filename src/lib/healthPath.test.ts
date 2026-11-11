import { describe, expect, it } from 'vitest'
import { allSteps, chosenSteps, monthsSince, tracks } from '../data/healthPath'

describe('percurso de saúde', () => {
  it('conta meses completos de espera', () => {
    const now = new Date('2026-11-11T12:00:00')
    expect(monthsSince('2026-04-11', now)).toBe(7)
    expect(monthsSince('2026-04-12', now)).toBe(6)
    expect(monthsSince('2026-11-01', now)).toBe(0)
    expect(monthsSince('data-má', now)).toBe(0)
  })

  it('nada está escolhido por omissão e só mostra as partes escolhidas', () => {
    expect(chosenSteps({ tracks: [], steps: {} })).toHaveLength(0)
    const only = chosenSteps({ tracks: ['mastectomia'], steps: {} })
    expect(only.length).toBeGreaterThan(0)
    expect(only.every(i => i.track.id === 'mastectomia')).toBe(true)
  })

  it('ids de passos são únicos (as marcações não se misturam)', () => {
    const ids = allSteps.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(tracks.map(t => t.id)).size).toBe(tracks.length)
  })

  it('cada recuperação indica fontes', () => {
    for (const t of tracks) if (t.recovery) expect(t.recovery.sources.length).toBeGreaterThan(0)
  })
})
