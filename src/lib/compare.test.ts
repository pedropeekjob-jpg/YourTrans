import { describe, expect, it } from 'vitest'
import { compareRow, waitGap } from './compare'
import type { ExperienceStat } from './api'

const s = (p: Partial<ExperienceStat>): ExperienceStat => ({ track: 'mastectomia', kind: 'espera', sector: 'SNS', n: 3, min: 1, max: 2, median: 1, fromYear: 2025, toYear: 2026, ...p })

describe('comparador SNS vs privado', () => {
  it('separa espera SNS, espera e custo no privado e material, só da cirurgia pedida', () => {
    const stats = [
      s({ median: 24 }),
      s({ sector: 'Privado', median: 2 }),
      s({ kind: 'custo', sector: 'Privado', median: 6000 }),
      s({ kind: 'material', sector: 'Privado', item: 'colete', median: 60 }),
      s({ track: 'histerectomia', median: 30 }),
    ]
    const r = compareRow(stats, 'mastectomia')
    expect(r.snsWait?.median).toBe(24)
    expect(r.privWait?.median).toBe(2)
    expect(r.privCost?.median).toBe(6000)
    expect(r.material).toHaveLength(1)
    expect(waitGap(r)).toBe(22)
  })

  it('sem relatos suficientes não inventa valores', () => {
    const r = compareRow([], 'mastectomia')
    expect(r.snsWait).toBeUndefined()
    expect(r.privCost).toBeUndefined()
    expect(waitGap(r)).toBeUndefined()
  })
})
