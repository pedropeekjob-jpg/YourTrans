// Pacotes pagos para entidades. A app é sempre gratuita para pessoas trans e quem as apoia;
// quem paga são empresas, profissionais, escolas e autarquias. Os nomes dos pacotes e dos
// serviços são iguais aos de server/index.mjs (PLANS, SERVICE_KINDS, POLICIES).
// Preços sem IVA, definidos a 14/11/2026 (documento "Casulo — Pacotes e preços para entidades").
import { tr } from '../i18n'

export type PlanId = 'aliada' | 'parceira' | 'profissional' | 'clinica' | 'escola' | 'municipio'
export type OrgSize = 'pequena' | 'media' | 'grande'
export type ServiceKind = 'juridico' | 'voz' | 'psicologia' | 'imagem'

export const planLabel: Record<PlanId, string> = {
  aliada: tr('Aliada'),
  parceira: tr('Parceira'),
  profissional: tr('Perfil profissional'),
  clinica: tr('Clínica'),
  escola: tr('Escola segura'),
  municipio: tr('Município inclusivo'),
}

/** Rótulo mostrado na app em tudo o que é pago: nunca se confunde com o selo. */
export const paidLabel = (p: PlanId) => tr('{0} · pacote pago', planLabel[p])

export const sizeLabel: Record<OrgSize, string> = {
  pequena: tr('Até 49 pessoas'),
  media: tr('50 a 249 pessoas'),
  grande: tr('250 ou mais pessoas'),
}

export interface Plan {
  id: PlanId
  audience: 'empresas' | 'saude' | 'publico'
  /** Preço anual por dimensão (empresas) ou preço único. */
  price: Partial<Record<OrgSize, number>> & { base?: number; monthly?: number }
  priceNote?: string
  features: string[]
}

export const plans: Plan[] = [
  {
    id: 'aliada', audience: 'empresas', price: { pequena: 390, media: 890, grande: 1900 },
    features: [
      tr('Ficha completa: políticas, benefícios, balneários e um contacto seguro de RH'),
      tr('Até 5 ofertas de emprego por ano, com o rótulo de empregadora Aliada'),
      tr('Kit de políticas: transição no trabalho, WC e balneários, linguagem'),
      tr('Relatório anual anónimo das avaliações (só com 5 ou mais)'),
      tr('1 webinar aberto por ano'),
      tr('2 sessões solidárias para quem não pode pagar'),
    ],
  },
  {
    id: 'parceira', audience: 'empresas', price: { pequena: 1900, media: 2900, grande: 4900 },
    features: [
      tr('Tudo o que a Aliada inclui'),
      tr('Ofertas de emprego ilimitadas'),
      tr('2 sessões de formação só para a vossa equipa'),
      tr('Diagnóstico das políticas internas, com plano de melhoria'),
      tr('Apoio quando alguém da equipa faz a transição (até 4 horas)'),
      tr('10 sessões solidárias para quem não pode pagar'),
    ],
  },
  {
    id: 'profissional', audience: 'saude', price: { base: 120, monthly: 12 },
    features: [
      tr('Ficha editada por si: especialidades, acordos, SNS, preços, línguas'),
      tr('Ligação para a sua agenda ou site de marcações'),
      tr('Serviços especializados na lista de serviços da app'),
      tr('Curso "Cuidados afirmativos" com certificado'),
      tr('Relatório anónimo das avaliações (só com 5 ou mais)'),
    ],
  },
  {
    id: 'clinica', audience: 'saude', price: { base: 390, monthly: 39 }, priceNote: tr('até 10 profissionais'),
    features: [
      tr('Tudo o que o Perfil profissional inclui, para a clínica'),
      tr('Curso "Cuidados afirmativos" para toda a equipa'),
    ],
  },
  {
    id: 'escola', audience: 'publico', price: { base: 290 }, priceNote: tr('por agrupamento; universidade 990 €'),
    features: [
      tr('Guia para docentes e materiais para a turma'),
      tr('1 webinar por ano para a equipa'),
      tr('Cartões para aliados'),
      tr('Ficha completa no mapa'),
    ],
  },
  {
    id: 'municipio', audience: 'publico', price: { pequena: 1500, grande: 3500 }, priceNote: tr('até 50 000 habitantes / acima'),
    features: [
      tr('Espaços municipais no mapa, com ficha completa'),
      tr('2 formações por ano para o atendimento ao público'),
      tr('Relatório anónimo de incidentes do distrito, por tipo e trimestre (só grupos de 5 ou mais)'),
    ],
  },
]

/** Formação avulsa, para quem não quer adesão anual. */
export const trainings = [
  { label: tr('Webinar online, até 30 pessoas'), hours: 2, price: 450 },
  { label: tr('Workshop presencial, até 25 pessoas, mais deslocação'), hours: 3, price: 900 },
  { label: tr('Formação para chefias e RH, com casos práticos'), hours: 6, price: 1200 },
  { label: tr('Curso online ao ritmo de cada pessoa (mínimo 20 pessoas), por pessoa'), hours: 1.5, price: 15 },
]

export const serviceLabel: Record<ServiceKind, string> = {
  juridico: tr('Apoio jurídico'),
  voz: tr('Treino de voz'),
  psicologia: tr('Psicologia afirmativa'),
  imagem: tr('Imagem: maquilhagem, roupa, binders'),
}
export const serviceKinds = Object.keys(serviceLabel) as ServiceKind[]

/** Políticas que uma empresa pode declarar na ficha (iguais aos critérios de avaliação em Trabalho). */
export const policyLabel: Record<string, string> = {
  politica: tr('Política escrita de inclusão que inclui identidade de género'),
  nome: tr('Atualiza nome e e-mail sem exigir a mudança legal'),
  wc: tr('Casas de banho e balneários neutros ou individuais'),
  saude: tr('Seguro de saúde cobre cuidados de afirmação de género'),
  licenca: tr('Dias de ausência para consultas e cirurgias, sem perguntas'),
  formacao: tr('Formação de chefias sobre inclusão trans'),
  denuncia: tr('Canal de denúncia confidencial'),
}

/** Contacto para pacotes e faturas. */
export const PLANS_EMAIL = 'parcerias@casulo.space'

/**
 * Pagamento com cartão (opcional): ligações de pagamento da Stripe, uma por pacote e dimensão,
 * em VITE_PAYMENT_LINKS como JSON, ex.: {"aliada-pequena":"https://buy.stripe.com/..."}.
 * Sem isto, a entidade pede a adesão e recebe a fatura por e-mail.
 */
export const paymentLinks: Record<string, string> = (() => {
  try { return JSON.parse((import.meta.env.VITE_PAYMENT_LINKS as string | undefined) || '{}') } catch { return {} }
})()

/**
 * Na app nativa (lojas da Apple e da Google) não pode haver preços, botões de compra nem ligações
 * para pagar pacotes: são vendidos só no site e por fatura. Na web fica tudo visível.
 * (Quando src/lib/native.ts chegar ao main, isto passa a usar isNative() de lá.)
 */
export const isNativeApp = () => (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
export const SITE_PLANS_URL = 'https://casulo.space/#/entidades'

export const euros = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 0 }) + ' €'
