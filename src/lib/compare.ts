import type { ExperienceStat } from './api'

/** Uma linha do comparador SNS vs privado para uma cirurgia (só intervalos com 3+ relatos). */
export interface CompareRow {
  snsWait?: ExperienceStat
  privWait?: ExperienceStat
  privCost?: ExperienceStat
  material: ExperienceStat[]
}

export function compareRow(stats: ExperienceStat[], track: string): CompareRow {
  const mine = stats.filter(s => s.track === track)
  const pick = (kind: ExperienceStat['kind'], sector: ExperienceStat['sector']) => mine.find(s => s.kind === kind && s.sector === sector)
  return {
    snsWait: pick('espera', 'SNS'),
    privWait: pick('espera', 'Privado'),
    privCost: pick('custo', 'Privado'),
    material: mine.filter(s => s.kind === 'material'),
  }
}

/** Diferença de espera entre medianas (meses), só se houver os dois lados. */
export function waitGap(row: CompareRow): number | undefined {
  if (!row.snsWait || !row.privWait) return undefined
  return row.snsWait.median - row.privWait.median
}
