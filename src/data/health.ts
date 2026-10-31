// Diretório de cuidados de saúde.
// Entradas "pública" vêm de informação institucional; entradas da comunidade
// chegam pelo servidor e só aparecem depois de moderadas.

export type ProviderKind = 'Medicina geral' | 'Endocrinologia' | 'Psicologia' | 'Psiquiatria' | 'Cirurgia' | 'Terapia da fala' | 'Sexologia' | 'Clínica'

export interface Provider {
  id: string
  name: string
  kind: ProviderKind
  district: string
  sector: 'SNS' | 'Privado' | 'Associação'
  address?: string
  url?: string
  phone?: string
  source: 'pública' | 'comunidade'
  notes?: string
  /** Média das respostas da comunidade (0-1), quando existir */
  scores?: Partial<Record<ReviewQuestion, number>>
  reviewCount?: number
}

export const reviewQuestions = [
  'nomeCerto',
  'semJulgamento',
  'conhecimento',
  'recomendaria',
] as const
export type ReviewQuestion = (typeof reviewQuestions)[number]

export const reviewQuestionLabels: Record<ReviewQuestion, string> = {
  nomeCerto: 'Trataram-me pelo nome e pronomes certos?',
  semJulgamento: 'Senti-me sem julgamento?',
  conhecimento: 'Mostraram conhecimento sobre saúde trans?',
  recomendaria: 'Recomendaria a outras pessoas trans?',
}

export const districts = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria',
  'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
  'Açores', 'Madeira', 'Online',
]

export const publicProviders: Provider[] = [
  {
    id: 'pub-sjose',
    name: 'ULS São José – centro especializado em identidade de género',
    kind: 'Sexologia',
    district: 'Lisboa',
    sector: 'SNS',
    source: 'pública',
    url: 'https://www.sns.gov.pt',
    notes: 'Um dos três centros especializados do SNS (desde 2022). Acesso por referenciação do/a médico/a de família.',
  },
  {
    id: 'pub-santoantonio',
    name: 'ULS Santo António – centro especializado em identidade de género',
    kind: 'Sexologia',
    district: 'Porto',
    sector: 'SNS',
    source: 'pública',
    url: 'https://www.sns.gov.pt',
    notes: 'Um dos três centros especializados do SNS (desde 2022). Acesso por referenciação do/a médico/a de família.',
  },
  {
    id: 'pub-urgus',
    name: 'URGUS – Unidade de Reconstrução Génito-Urinária e Sexual (ULS Coimbra)',
    kind: 'Cirurgia',
    district: 'Coimbra',
    sector: 'SNS',
    source: 'pública',
    url: 'https://www.chuc.min-saude.pt',
    notes: 'Unidade de referência do SNS para cirurgias de afirmação de género. Acesso por referenciação hospitalar.',
  },
  {
    id: 'pub-sns24',
    name: 'SNS 24 – aconselhamento psicológico',
    kind: 'Psicologia',
    district: 'Online',
    sector: 'SNS',
    source: 'pública',
    phone: '808242424',
    url: 'https://www.sns24.gov.pt',
    notes: 'Linha telefónica do SNS com opção de aconselhamento psicológico.',
  },
  {
    id: 'pub-ilga',
    name: 'ILGA Portugal – serviço de apoio psicológico',
    kind: 'Psicologia',
    district: 'Lisboa',
    sector: 'Associação',
    source: 'pública',
    url: 'https://ilga-portugal.pt',
    notes: 'Apoio psicológico com profissionais informados/as sobre identidade de género.',
  },
]

export interface PathStep { id: string; title: string; body: string; tip?: string; stories?: string }

/** Percurso típico no SNS (pode variar entre regiões e unidades). */
export const snsPathway: PathStep[] = [
  {
    id: 'mf',
    title: 'Médico/a de família',
    body: 'Começa no centro de saúde. Pede referenciação para consulta hospitalar de identidade de género / sexologia ou endocrinologia.',
    tip: 'Leva por escrito o que queres pedir. A preparação de consultas da app ajuda.',
  },
  {
    id: 'aval',
    title: 'Consulta de especialidade',
    body: 'Consulta hospitalar (sexologia, psiquiatria ou psicologia) que acompanha o processo e emite os relatórios necessários para tratamentos médicos.',
    tip: 'As listas de espera variam muito entre hospitais. Pergunta ao centro de saúde qual tem resposta mais rápida.',
  },
  {
    id: 'hormonas',
    title: 'Terapia hormonal',
    body: 'Início e acompanhamento pela endocrinologia, com análises regulares. A app lembra-te das tomas e das análises.',
    stories: 'hormonas-t',
  },
  {
    id: 'cirurgia',
    title: 'Cirurgias (se quiseres)',
    body: 'Nem todas as pessoas querem ou precisam. No SNS são feitas em unidades de referência, mediante referenciação.',
    stories: 'mastectomia',
  },
  {
    id: 'outros',
    title: 'Outros cuidados',
    body: 'Terapia da fala, depilação definitiva, saúde mental e fertilidade (preservação de gâmetas antes de iniciar hormonas).',
    tip: 'Pergunta pela preservação de fertilidade antes de iniciar hormonas.',
  },
]

/**
 * Rastreios baseados nos órgãos que a pessoa tem, e não no sexo registado.
 * O software de rastreio do SNS usa o sexo do registo: quem já o atualizou
 * pode deixar de ser convocado/a para rastreios de que ainda precisa.
 */
export type Organ = 'colo' | 'mama' | 'prostata'

export const organLabels: Record<Organ, string> = {
  colo: 'Colo do útero',
  mama: 'Tecido mamário (de nascença ou com estrogénio há 5+ anos)',
  prostata: 'Próstata',
}

export interface Screening { id: string; title: string; who: string; when: string; minAge: number; maxAge: number; organ?: Organ }

export const screenings: Screening[] = [
  { id: 'colo', organ: 'colo', title: 'Rastreio do cancro do colo do útero', who: 'Quem tem colo do útero, incluindo homens trans e pessoas não-binárias, mesmo com testosterona.', when: 'Teste de HPV de 5 em 5 anos, normalmente dos 25 aos 60 anos.', minAge: 25, maxAge: 64 },
  { id: 'mama', organ: 'mama', title: 'Rastreio do cancro da mama', who: 'Quem tem tecido mamário: mulheres cis e trans (após anos de estrogénio) e pessoas com mama de nascença sem mastectomia completa.', when: 'Mamografia de 2 em 2 anos, normalmente a partir dos 50 anos.', minAge: 50, maxAge: 74 },
  { id: 'prostata', organ: 'prostata', title: 'Vigilância da próstata', who: 'Quem tem próstata, incluindo mulheres trans (a próstata mantém-se após cirurgia).', when: 'Não há rastreio organizado: conversa com o/a médico/a a partir dos 50 anos.', minAge: 50, maxAge: 120 },
  { id: 'colorretal', title: 'Rastreio do cancro colorretal', who: 'Todas as pessoas.', when: 'Pesquisa de sangue oculto nas fezes de 2 em 2 anos, dos 50 aos 74 anos.', minAge: 50, maxAge: 74 },
]

export function screeningsFor(age: number, organs: Organ[]): Screening[] {
  return screenings.filter(s => age >= s.minAge - 5 && age <= s.maxAge && (!s.organ || organs.includes(s.organ)))
}
