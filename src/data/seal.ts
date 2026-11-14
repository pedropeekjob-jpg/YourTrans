// Selo Casulo: uma entidade (local, serviço ou empresa) regista-se e compromete-se;
// a comunidade avalia; o selo aparece com avaliações suficientes e boas, e cai se piorarem.
// As regras do cálculo estão no servidor (server/index.mjs, entities()).
import { tr } from '../i18n'
import type { Facilities } from '../lib/types'
import type { PlanId, ServiceKind } from './plans'

export type SealCommitment = 'nome' | 'wc' | 'formacao' | 'regras' | 'contacto' | 'formularios'
export const sealCommitments: { id: SealCommitment; label: string }[] = [
  { id: 'nome', label: tr('Tratamos cada pessoa pelo nome e pronomes que indica, mesmo que os documentos digam outra coisa.') },
  { id: 'wc', label: tr('Cada pessoa usa a casa de banho e o balneário com que se identifica, sem perguntas.') },
  { id: 'formacao', label: tr('A equipa que atende o público sabe o que fazer (formação ou, no mínimo, estas regras explicadas a todas as pessoas).') },
  { id: 'regras', label: tr('Temos regras escritas contra a discriminação e o assédio, também por parte de clientes.') },
  { id: 'contacto', label: tr('Há uma pessoa responsável a quem se pode fazer uma queixa, e respondemos.') },
  { id: 'formularios', label: tr('Os nossos formulários não obrigam a escolher entre masculino e feminino, nem pedem o género sem necessidade.') },
]

export type SealQuestion = 'nomeCerto' | 'seguro' | 'wc' | 'recomendaria'
export const sealQuestions: { id: SealQuestion; label: string; optional?: boolean }[] = [
  { id: 'nomeCerto', label: tr('Trataram-te pelo nome e pronomes certos?') },
  { id: 'seguro', label: tr('Sentiste-te em segurança?') },
  { id: 'wc', label: tr('Pudeste usar a casa de banho ou o balneário sem problemas?'), optional: true },
  { id: 'recomendaria', label: tr('Recomendavas a outras pessoas trans?') },
]

export const entityKinds = ['Café/Restaurante', 'Bar/Discoteca', 'Ginásio', 'Piscina', 'Loja', 'Serviço público', 'Associação', 'Alojamento', 'Empresa', 'Saúde', 'Ensino', 'Cultura', 'Outro']

export const SEAL_MIN_REVIEWS = 3
export const SEAL_THRESHOLD = 0.8

export type SealStatus = 'selo' | 'em-avaliacao' | 'sem-selo'
export const sealStatusLabel: Record<SealStatus, string> = {
  selo: tr('🏅 Selo Casulo'),
  'em-avaliacao': tr('Em avaliação'),
  'sem-selo': tr('Sem selo neste momento'),
}

/** Entidade registada, como o servidor a publica (sem o contacto). */
export interface SealEntity {
  id: string
  since: string
  name: string
  kind: string
  district: string
  address?: string
  url?: string
  notes?: string
  transparente?: boolean
  commitments: SealCommitment[]
  facilities: Facilities
  lat?: number
  lng?: number
  seal: SealStatus
  reviewCount: number
  scores?: Partial<Record<SealQuestion, number>>
  comments: { id: string; month: string; comment: string; author?: string }[]
  /** Pacote pago ativo (mostrado sempre como pago; não mexe no selo nem na ordem). */
  partner?: PlanId
  profile?: EntityProfile
}

/** Ficha completa de uma entidade com pacote pago. */
export interface EntityProfile {
  about?: string
  benefits?: string
  prices?: string
  languages?: string
  bookingUrl?: string
  contactUrl?: string
  contactEmail?: string
  sns?: boolean
  vouchers?: boolean
  policies?: string[]
  services?: { kind: ServiceKind; price: number; online: boolean }[]
}

/** Lista de Entidades Queer Inclusivas (EQI) da plataforma TransParente. */
export const TRANSPARENTE_EQI_URL = 'https://transparente.com.pt/eqi/'
