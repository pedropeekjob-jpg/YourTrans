import { describe, expect, it } from 'vitest'
import { buildIndex, fold, search } from './search'
import { countryPack } from '../data/countries'

describe('pesquisa', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(fold('Saúde Ação')).toBe('saude acao')
  })
  it('encontra conteúdo de Portugal sem acentos', () => {
    const idx = buildIndex(countryPack('PT'))
    const r = search(idx, 'conservatoria')
    expect(r.length).toBeGreaterThan(0)
    expect(r.some(e => e.to === '/documentos')).toBe(true)
  })
  it('exige todas as palavras', () => {
    const idx = buildIndex(countryPack('PT'))
    expect(search(idx, 'hormonas xyzzyq')).toEqual([])
  })
  it('não mostra nada com menos de duas letras', () => {
    expect(search(buildIndex(countryPack('PT')), 'a')).toEqual([])
  })
})
