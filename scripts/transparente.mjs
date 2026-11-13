// Atualiza src/data/transparente.ts a partir da rede EQI da TransParente (API pública do site).
// Uso: node scripts/transparente.mjs   (autorização da TransParente dada ao Pedro a 13/11/2026)
// A TransParente não publica moradas nem coordenadas: as entidades aparecem na lista
// e só vão para o mapa se alguém acrescentar lat/lng à mão em OVERRIDES.
import { writeFileSync } from 'node:fs'

const API = 'https://transparente.com.pt/wp-json/wp/v2/entidade-inclusiva?per_page=100&_fields=title,link,class_list'
/** Região da TransParente → distrito do Casulo (a primeira que existir). */
const REGION = { lisboa: 'Lisboa', norte: 'Porto', centro: 'Coimbra', alentejo: 'Évora', algarve: 'Faro', acores: 'Açores', madeira: 'Madeira', remoto: 'Online' }
/** Correções à mão quando o nome diz mais do que a região. */
const OVERRIDES = {
  'LGBTI Viseu': { district: 'Viseu' },
  'Nucleo AMPLOS do Baixo-Alentejo': { district: 'Beja' },
  'Rita Andrade, Psicóloga e Educadora Menstrual': { district: 'Online' },
  'Leandro Treinarte – Personal Trainer': { kind: 'Outro' },
  // Morada pública (diretório da CIG); coordenadas do OpenStreetMap (Nominatim), ao nível da rua.
  'Opus Diversidades': { address: 'Rua da Ilha Terceira, 34, 2.º, 1000-173 Lisboa', lat: 38.7335, lng: -9.1392 },
}
const decode = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').trim()

const res = await fetch(API)
if (!res.ok) throw new Error(`TransParente respondeu ${res.status}`)
const list = (await res.json()).map(e => {
  const cls = new Set(e.class_list)
  const has = s => cls.has(s)
  const regions = [...cls].filter(c => c.startsWith('localizacao-')).map(c => c.slice(12))
  const name = decode(e.title.rendered)
  const kind = has('tipo-de-entidade-organizacao-nao-lucrativa-ong') ? 'Associação'
    : has('setor-de-atividade-saude-estetica-e-bem-estar') ? 'Saúde'
    : has('setor-de-atividade-cultura-desporto-e-entretenimento') ? 'Cultura'
    : has('tipo-de-entidade-setor-publico-estatal') ? 'Serviço público' : 'Outro'
  const district = REGION[regions.find(r => r !== 'remoto') ?? regions[0]] ?? 'Online'
  const level = has('nivel-de-inclusao-eqi-3-excelente') ? 3 : has('nivel-de-inclusao-eqi-2-confiante') ? 2 : has('nivel-de-inclusao-eqi-1-iniciante') ? 1 : undefined
  const seal = has('nivel-de-inclusao-com-selo-transparente') || has('categoria-entidades-inclusivas-com-selo-transparente')
  return { name, kind, district, remote: regions.includes('remoto') || undefined, url: e.link, seal, level, ...OVERRIDES[name] }
}).sort((a, b) => a.name.localeCompare(b.name, 'pt'))

const out = `// Gerado por scripts/transparente.mjs a partir de https://transparente.com.pt/eqi/ — não editar à mão.
// Entidades Queer Inclusivas (EQI) da plataforma TransParente, mostradas com autorização
// (dada ao Pedro a 13/11/2026), citando sempre a TransParente como fonte, com ligação.
import type { Facilities } from '../lib/types'

export const TRANSPARENTE_UPDATED = '${new Date().toISOString().slice(0, 10)}'

export interface TransparenteEntity {
  name: string
  /** Um dos tipos do mapa (src/data/seal.ts, entityKinds). */
  kind: string
  district: string
  address?: string
  /** Também atende à distância. */
  remote?: boolean
  /** Página da entidade na TransParente. */
  url: string
  /** Tem o selo TransParente (as outras são da rede EQI por confiança, sem selo). */
  seal: boolean
  /** Nível EQI: 1 iniciante, 2 confiante, 3 excelente. */
  level?: 1 | 2 | 3
  facilities?: Facilities
  lat?: number
  lng?: number
}

export const transparenteEntities: TransparenteEntity[] = ${JSON.stringify(list, null, 2).replace(/"(\w+)":/g, '$1:')}
`
writeFileSync(new URL('../src/data/transparente.ts', import.meta.url), out)
console.log(`${list.length} entidades escritas em src/data/transparente.ts`)
