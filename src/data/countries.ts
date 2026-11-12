import { tr, type Lang } from '../i18n'
import { guides, type CountryGuide } from './guides'
import { supportOrgs, supportOrgsBR, type SupportOrg } from './support'

// Pacotes por país. A língua e o país são independentes: uma pessoa brasileira
// em Lisboa pode ler o pacote de Portugal em português do Brasil.
// Todos os pacotes vão dentro da app, por isso o servidor nunca fica a saber
// o país de ninguém. Como acrescentar um país: ver docs/paises.md.

export type CountryCode = 'PT' | 'BR'

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

export interface CountryPack {
  code: CountryCode
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

const guideFor = (c: CountryCode) => guides.find(g => g.country === c)

export const countries: CountryPack[] = [
  {
    code: 'PT', name: tr('Portugal'), flag: '🇵🇹', lang: 'pt', emergency: '112', healthSystem: tr('SNS'),
    risk: 'protegido',
    coverage: { guide: true, letters: true, health: true, rights: true, support: true },
    guide: guideFor('PT'), support: supportOrgs, reviewedAt: '2026-11',
  },
  {
    code: 'BR', name: tr('Brasil'), flag: '🇧🇷', lang: 'br', emergency: '190', healthSystem: tr('SUS'),
    risk: 'atencao',
    coverage: { guide: true, letters: false, health: false, rights: false, support: true },
    guide: guideFor('BR'), support: supportOrgsBR, reviewedAt: '2026-11',
  },
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
export function countryForLang(l: Lang): CountryCode {
  return countries.find(p => p.lang === l)?.code ?? DEFAULT_COUNTRY
}

/** A comunidade, o mapa e as partilhas ficam desligados em países hostis. */
export function communityAllowed(p: CountryPack): boolean {
  return p.risk !== 'hostil'
}
