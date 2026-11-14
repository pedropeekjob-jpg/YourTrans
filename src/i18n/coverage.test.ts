import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import en from './en.json'

// O inglês é a língua de recurso: quem vive num país e usa outra língua (por exemplo, uma
// pessoa estrangeira em Espanha) lê o conteúdo desse país em inglês. Nenhum texto dos
// pacotes de país pode ficar só em português. (O alemão segue o inglês: ver dicts.test.ts.)
const FILES = ['../data/countryInfo.ts', '../data/guidesWorld.ts', '../data/supportWorld.ts']

const keysOf = (file: string) =>
  [...readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/\btr\('((?:[^'\\]|\\.)*)'/g)]
    .map(m => m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n'))

describe('tradução do conteúdo por país', () => {
  for (const file of FILES) {
    it(`${file.split('/').pop()} tem todos os textos em inglês`, () => {
      const dict = en as Record<string, string>
      expect(keysOf(file).filter(k => !(k in dict))).toEqual([])
    })
  }
})
