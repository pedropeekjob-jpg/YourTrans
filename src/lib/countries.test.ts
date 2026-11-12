import { describe, expect, it } from 'vitest'
import { communityAllowed, countries, countryForLang, countryPack, isCountry } from '../data/countries'
import { emptyVault } from './types'

describe('pacotes por país', () => {
  it('cada país tem código único, emergência e contactos de apoio', () => {
    expect(new Set(countries.map(c => c.code)).size).toBe(countries.length)
    for (const c of countries) {
      expect(c.emergency).toMatch(/^\d{3}$/)
      expect(c.support.some(o => o.phone === c.emergency)).toBe(true)
      expect(c.reviewedAt).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('só diz que tem guia quando o guia existe, e os passos não repetem ids entre países', () => {
    for (const c of countries) expect(!!c.guide).toBe(c.coverage.guide)
    const ids = countries.flatMap(c => c.guide?.steps.map(s => s.id) ?? [])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Portugal é o pacote completo e o país por omissão', () => {
    const pt = countryPack('PT')
    expect(Object.values(pt.coverage).every(Boolean)).toBe(true)
    expect(countryPack('XX').code).toBe('PT')
    expect(countryPack(undefined).code).toBe('PT')
    expect(emptyVault().settings.country).toBe('PT')
  })

  it('a língua sugere o país sem o impor', () => {
    expect(countryForLang('br')).toBe('BR')
    expect(countryForLang('pt')).toBe('PT')
    expect(countryForLang('en')).toBe('PT')
    expect(countryForLang('es')).toBe('ES')
    expect(countryForLang('fr')).toBe('FR')
    expect(isCountry('BR')).toBe(true)
    expect(isCountry('US')).toBe(false)
  })

  it('a comunidade só fica desligada em países hostis', () => {
    for (const c of countries) expect(communityAllowed(c)).toBe(c.risk !== 'hostil')
    expect(communityAllowed({ ...countryPack('PT'), risk: 'hostil' })).toBe(false)
  })
})
