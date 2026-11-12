import { describe, expect, it } from 'vitest'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import br from './br.json'
import de from './de.json'

// Os dicionários mantêm os marcadores {0}, {1}… O alemão traduz tudo o que o inglês traduz.
const marks = (s: string) => new Set(s.match(/\{\d+\}/g) ?? [])

describe('dicionários', () => {
  const dicts: Record<string, Record<string, string>> = { es, fr, br, de }
  for (const [id, d] of Object.entries(dicts)) {
    it(`${id} mantém os marcadores`, () => {
      // Uma tradução pode omitir um marcador (ex.: o artigo), mas nunca inventar outro.
      const bad = Object.keys(d).filter(k => [...marks(d[k])].some(x => !marks(k).has(x)))
      expect(bad).toEqual([])
    })
  }
  it('o alemão tem todos os textos do inglês', () => {
    expect(Object.keys(en).filter(k => !(k in de))).toEqual([])
  })
})
