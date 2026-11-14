import { locale, tr, type Lang } from '../i18n'
import { guides, type CountryGuide } from './guides'
import { supportOrgs, supportOrgsBR, supportOrgsES, supportOrgsFR, type SupportOrg } from './support'
import { guidesWorld } from './guidesWorld'
import { emergencyOrg, supportWorld } from './supportWorld'

// Pacotes por país. A língua e o país são independentes: uma pessoa brasileira
// em Lisboa pode ler o pacote de Portugal em português do Brasil.
// Todos os pacotes vão dentro da app, por isso o servidor nunca fica a saber
// o país de ninguém. Como acrescentar um país: ver docs/paises.md.

/** Código ISO 3166-1 do país (PT, BR, US…). Só são válidos os que estão em `countries`. */
export type CountryCode = string

/** Quão seguro é usar uma app trans no país. Decide o que a app mostra. */
export type Risk =
  | 'protegido' // há reconhecimento legal e proteção contra discriminação
  | 'atencao' // há reconhecimento legal, mas muita violência ou leis instáveis
  | 'hostil' // criminalização ou proibição de "propaganda": sem comunidade nem mapa

/** Partes da app com conteúdo verificado para o país. O resto é de Portugal e diz-se isso. */
export interface Coverage {
  /** Passo a passo da mudança de nome e género */
  guide: boolean
  /** Checklist de entidades e cartas prontas (são para entidades portuguesas) */
  letters: boolean
  /** Percurso de saúde, centros e listas de espera do sistema público */
  health: boolean
  /** Direitos e lei, queixas e apoio jurídico */
  rights: boolean
  /** Associações e linhas de apoio */
  support: boolean
}

export type Region = 'europa' | 'america-norte' | 'america-central' | 'america-sul'

export const regionLabels: Record<Region, string> = {
  europa: tr('Europa'),
  'america-norte': tr('América do Norte'),
  'america-central': tr('América Central e Caraíbas'),
  'america-sul': tr('América do Sul'),
}

export interface CountryPack {
  code: CountryCode
  region: Region
  name: string
  flag: string
  /** Língua sugerida quando a pessoa ainda não escolheu nenhuma */
  lang: Lang
  /** Número de emergência para o botão SOS */
  emergency: string
  /** Nome do sistema público de saúde, para os avisos */
  healthSystem: string
  risk: Risk
  coverage: Coverage
  guide?: CountryGuide
  support: SupportOrg[]
  /** Mês da última revisão do pacote (AAAA-MM) */
  reviewedAt: string
  /** Quem revê o conteúdo (associação parceira). Vazio enquanto não houver parceria. */
  reviewedBy?: string
}

const guideFor = (c: CountryCode) => guides.find(g => g.country === c) ?? guidesWorld.find(g => g.country === c)

/** Nome do país na língua da app (o browser já traz os nomes de todos os países). */
function countryName(code: string): string {
  try { return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code } catch { return code }
}

/** Bandeira em emoji a partir do código ISO. */
const flagOf = (code: string) => String.fromCodePoint(...[...code].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))

/**
 * Países com informação de direitos e saúde em countryInfo.ts. Fica aqui só a lista de códigos para o
 * texto completo não entrar no arranque: vai num ficheiro à parte, que o service worker guarda na mesma
 * para toda a gente (o servidor nunca fica a saber o país de ninguém). Um teste garante que coincidem.
 */
export const COUNTRIES_WITH_INFO = new Set(['AR', 'BR', 'CA', 'CL', 'CO', 'DE', 'ES', 'FR', 'MX', 'US', 'UY'])
const infoFor = (code: string) => COUNTRIES_WITH_INFO.has(code)

const none: Coverage = { guide: false, letters: false, health: false, rights: false, support: false }

/**
 * Países ainda só com o essencial: número de emergência, risco e, onde existe, guia e linhas de apoio.
 * [código, região, emergência, risco]
 * Risco "hostil": relações entre pessoas do mesmo sexo ainda são crime (confirmado em novembro de 2026).
 */
const basic: [string, Region, string, Risk][] = [
  ['DE', 'europa', '112', 'protegido'],
  ['US', 'america-norte', '911', 'atencao'],
  ['CA', 'america-norte', '911', 'protegido'],
  ['MX', 'america-norte', '911', 'atencao'],
  ['AG', 'america-central', '911', 'atencao'],
  ['BS', 'america-central', '919', 'atencao'],
  ['BB', 'america-central', '211', 'atencao'],
  ['BZ', 'america-central', '911', 'atencao'],
  ['CR', 'america-central', '911', 'protegido'],
  ['CU', 'america-central', '106', 'atencao'],
  ['DM', 'america-central', '999', 'atencao'],
  ['SV', 'america-central', '911', 'atencao'],
  ['GD', 'america-central', '911', 'hostil'],
  ['GT', 'america-central', '110', 'atencao'],
  ['HT', 'america-central', '114', 'atencao'],
  ['HN', 'america-central', '911', 'atencao'],
  ['JM', 'america-central', '119', 'hostil'],
  ['NI', 'america-central', '118', 'atencao'],
  ['PA', 'america-central', '911', 'atencao'],
  ['DO', 'america-central', '911', 'atencao'],
  ['KN', 'america-central', '911', 'atencao'],
  ['LC', 'america-central', '911', 'atencao'],
  ['VC', 'america-central', '911', 'hostil'],
  ['TT', 'america-central', '999', 'atencao'],
  ['AR', 'america-sul', '911', 'protegido'],
  ['BO', 'america-sul', '110', 'atencao'],
  ['CL', 'america-sul', '133', 'protegido'],
  ['CO', 'america-sul', '123', 'atencao'],
  ['EC', 'america-sul', '911', 'atencao'],
  ['GY', 'america-sul', '911', 'hostil'],
  ['PY', 'america-sul', '911', 'atencao'],
  ['PE', 'america-sul', '105', 'atencao'],
  ['SR', 'america-sul', '115', 'atencao'],
  ['UY', 'america-sul', '911', 'protegido'],
  ['VE', 'america-sul', '911', 'atencao'],
]

const spanish = new Set(['MX', 'CR', 'CU', 'SV', 'GT', 'HN', 'NI', 'PA', 'DO', 'AR', 'BO', 'CL', 'CO', 'EC', 'PY', 'PE', 'UY', 'VE'])
const langOf = (code: string): Lang => spanish.has(code) ? 'es' : code === 'HT' ? 'fr' : code === 'DE' ? 'de' : 'en'

const basicPacks: CountryPack[] = basic.map(([code, region, emergency, risk]) => {
  const guide = guideFor(code)
  const extra = supportWorld[code] ?? []
  return {
    code, region, name: countryName(code), flag: flagOf(code), lang: langOf(code), emergency, healthSystem: '',
    risk, coverage: { ...none, guide: !!guide, support: extra.length > 0, health: !!infoFor(code), rights: !!infoFor(code) },
    guide, support: [emergencyOrg(code, emergency), ...extra], reviewedAt: '2026-11',
  }
})

export const countries: CountryPack[] = [
  {
    code: 'PT', region: 'europa', name: countryName('PT'), flag: '🇵🇹', lang: 'pt', emergency: '112', healthSystem: tr('SNS'),
    risk: 'protegido',
    coverage: { guide: true, letters: true, health: true, rights: true, support: true },
    guide: guideFor('PT'), support: supportOrgs, reviewedAt: '2026-11',
  },
  {
    code: 'BR', region: 'america-sul', name: countryName('BR'), flag: '🇧🇷', lang: 'br', emergency: '190', healthSystem: tr('SUS'),
    risk: 'atencao',
    coverage: { guide: true, letters: false, health: true, rights: true, support: true },
    guide: guideFor('BR'), support: supportOrgsBR, reviewedAt: '2026-11',
  },
  {
    code: 'ES', region: 'europa', name: countryName('ES'), flag: '🇪🇸', lang: 'es', emergency: '112', healthSystem: tr('SNS espanhol'),
    risk: 'protegido',
    coverage: { guide: true, letters: false, health: true, rights: true, support: true },
    guide: guideFor('ES'), support: supportOrgsES, reviewedAt: '2026-11',
  },
  {
    code: 'FR', region: 'europa', name: countryName('FR'), flag: '🇫🇷', lang: 'fr', emergency: '112', healthSystem: tr('Assurance Maladie'),
    risk: 'protegido',
    coverage: { guide: true, letters: false, health: true, rights: true, support: true },
    guide: guideFor('FR'), support: supportOrgsFR, reviewedAt: '2026-11',
  },
  ...basicPacks,
]

export const DEFAULT_COUNTRY: CountryCode = 'PT'

export function isCountry(c: unknown): c is CountryCode {
  return countries.some(p => p.code === c)
}

/** Pacote do país. Um código desconhecido cai para Portugal. */
export function countryPack(code: string | undefined): CountryPack {
  return countries.find(p => p.code === code) ?? countries.find(p => p.code === DEFAULT_COUNTRY)!
}

/** País sugerido a partir da língua. Nunca usa localização nem rede. */
const countryByLang: Partial<Record<Lang, CountryCode>> = { pt: 'PT', br: 'BR', es: 'ES', fr: 'FR', de: 'DE' }
export function countryForLang(l: Lang): CountryCode {
  return countryByLang[l] ?? DEFAULT_COUNTRY
}

/** Países agrupados por região e ordenados pelo nome, para o seletor. */
export function countriesByRegion(): { region: Region; label: string; items: CountryPack[] }[] {
  return (Object.keys(regionLabels) as Region[]).map(region => ({
    region, label: regionLabels[region],
    items: countries.filter(c => c.region === region).sort((a, b) => a.name.localeCompare(b.name, locale)),
  }))
}

/** A comunidade, o mapa e as partilhas ficam desligados em países hostis. */
export function communityAllowed(p: CountryPack): boolean {
  return p.risk !== 'hostil'
}

/** Meses desde a última verificação do pacote (reviewedAt em AAAA-MM). */
export function monthsSinceReview(p: CountryPack, now = new Date()): number {
  const [y, m] = p.reviewedAt.split('-').map(Number)
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
}

/** Um pacote fica "por confirmar" passados 6 meses; países hostis, passados 3. */
export function isStale(p: CountryPack, now = new Date()): boolean {
  return monthsSinceReview(p, now) > (p.risk === 'hostil' ? 3 : 6)
}
