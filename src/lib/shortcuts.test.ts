import { describe, expect, it } from 'vitest'
import { HALF_LIFE_MS, allyFeatures, featureFor, learned, movePin, rankShortcuts, recordVisit, scoreAt, togglePin, transFeatures } from './shortcuts'

const list = transFeatures()
const base = { list, pins: [] as string[], usage: undefined, interests: [] as string[], adaptive: true, ally: false, now: 1_000_000_000_000, count: 8 }

describe('atalhos que se adaptam ao uso', () => {
  it('reconhece o ecrã e o separador', () => {
    expect(featureFor(list, '/saude', '?tab=tratamento')?.id).toBe('lembretes')
    expect(featureFor(list, '/saude', '')?.id).toBe('profissionais')
    expect(featureFor(list, '/comunidade', '')?.id).toBe('partilhas')
    expect(featureFor(list, '/direitos', '?tab=agir')?.id).toBe('direitos')
    expect(featureFor(list, '/ajuda', '')).toBeUndefined()
    expect(featureFor(list, '/', '')).toBeUndefined()
    expect(featureFor(list, '/definicoes', '')?.noTrack).toBe(true)
  })

  it('o uso antigo vale menos (meia-vida de duas semanas)', () => {
    expect(scoreAt({ s: 4, t: 0 }, HALF_LIFE_MS)).toBeCloseTo(2)
  })

  it('não conta a mesma visita duas vezes seguidas', () => {
    const u = recordVisit(undefined, 'voz', 0)
    expect(recordVisit(u, 'voz', 5_000)).toBe(u)
    expect(recordVisit(u, 'voz', 60_000).voz.s).toBeGreaterThan(1.9)
  })

  it('começa pelas escolhas iniciais e depois pelos habituais', () => {
    const r = rankShortcuts({ ...base, interests: ['emprego'] }).map(f => f.id)
    expect(r.slice(0, 2)).toEqual(['emprego', 'selo'])
    expect(r).toHaveLength(8)
    expect(new Set(r).size).toBe(8)
  })

  it('fixados primeiro, depois os mais usados', () => {
    const usage = { voz: { s: 5, t: base.now }, viagem: { s: 2, t: base.now } }
    const r = rankShortcuts({ ...base, pins: ['agenda'], usage }).map(f => f.id)
    expect(r.slice(0, 3)).toEqual(['agenda', 'voz', 'viagem'])
  })

  it('com a adaptação desligada ignora o uso', () => {
    const usage = { voz: { s: 5, t: base.now } }
    expect(rankShortcuts({ ...base, usage, adaptive: false }).map(f => f.id)).not.toContain('voz')
  })

  it('ignora fixados que já não existem', () => {
    expect(rankShortcuts({ ...base, pins: ['nao-existe'] })[0].id).toBe('documentos')
  })

  it('quem apoia tem os seus atalhos', () => {
    const r = rankShortcuts({ ...base, list: allyFeatures(), ally: true, count: 4 }).map(f => f.id)
    expect(r).toEqual(['aprender', 'praticar', 'dizer', 'para-mim'])
  })

  it('fixar, desafixar e ordenar', () => {
    expect(togglePin(['a'], 'b')).toEqual(['a', 'b'])
    expect(togglePin(['a', 'b'], 'a')).toEqual(['b'])
    expect(movePin(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(movePin(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
  })

  it('mostra o que aprendeu, do mais para o menos usado', () => {
    const usage = { voz: { s: 1, t: base.now }, diario: { s: 3, t: base.now }, x: { s: 9, t: base.now } }
    expect(learned(list, usage, base.now).map(x => x.f.id)).toEqual(['diario', 'voz'])
  })
})
