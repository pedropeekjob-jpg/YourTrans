import { tr } from '../i18n'
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
  nomeCerto: tr('Trataram-me pelo nome e pronomes certos?'),
  semJulgamento: tr('Senti-me sem julgamento?'),
  conhecimento: tr('Mostraram conhecimento sobre saúde trans?'),
  recomendaria: tr('Recomendaria a outras pessoas trans?'),
}

export const districts = [
  tr('Aveiro'), tr('Beja'), tr('Braga'), tr('Bragança'), tr('Castelo Branco'), tr('Coimbra'), tr('Évora'), tr('Faro'), tr('Guarda'), tr('Leiria'),
  tr('Lisboa'), tr('Portalegre'), tr('Porto'), tr('Santarém'), tr('Setúbal'), tr('Viana do Castelo'), tr('Vila Real'), tr('Viseu'),
  tr('Açores'), tr('Madeira'), tr('Online'),
]

export const publicProviders: Provider[] = [
  {
    id: 'pub-sjose',
    name: tr('ULS São José – centro especializado em identidade de género'),
    kind: 'Sexologia',
    district: 'Lisboa',
    sector: 'SNS',
    source: 'pública',
    url: 'https://www.sns.gov.pt',
    notes: tr('Um dos três centros especializados do SNS (desde 2022). Acesso por referenciação do/a médico/a de família.'),
  },
  {
    id: 'pub-santoantonio',
    name: tr('ULS Santo António – centro especializado em identidade de género'),
    kind: 'Sexologia',
    district: 'Porto',
    sector: 'SNS',
    source: 'pública',
    url: 'https://www.sns.gov.pt',
    notes: tr('Um dos três centros especializados do SNS (desde 2022). Acesso por referenciação do/a médico/a de família.'),
  },
  {
    id: 'pub-urgus',
    name: tr('URGUS – Unidade de Reconstrução Génito-Urinária e Sexual (ULS Coimbra)'),
    kind: 'Cirurgia',
    district: 'Coimbra',
    sector: 'SNS',
    source: 'pública',
    url: 'https://www.chuc.min-saude.pt',
    notes: tr('Unidade de referência do SNS para cirurgias de afirmação de género. Acesso por referenciação hospitalar.'),
  },
  {
    id: 'pub-sns24',
    name: tr('SNS 24 – aconselhamento psicológico'),
    kind: 'Psicologia',
    district: 'Online',
    sector: 'SNS',
    source: 'pública',
    phone: '808242424',
    url: 'https://www.sns24.gov.pt',
    notes: tr('Linha telefónica do SNS com opção de aconselhamento psicológico.'),
  },
  {
    id: 'pub-ilga',
    name: tr('ILGA Portugal – serviço de apoio psicológico'),
    kind: 'Psicologia',
    district: 'Lisboa',
    sector: 'Associação',
    source: 'pública',
    url: 'https://ilga-portugal.pt',
    notes: tr('Apoio psicológico com profissionais informados/as sobre identidade de género.'),
  },
]

export interface PathStep { id: string; title: string; body: string; tip?: string; stories?: string }

/** Percurso típico no SNS (pode variar entre regiões e unidades). */
export const snsPathway: PathStep[] = [
  {
    id: 'mf',
    title: tr('Médico/a de família'),
    body: tr('Começa no centro de saúde. Pede referenciação para consulta hospitalar de identidade de género / sexologia ou endocrinologia.'),
    tip: tr('Leva por escrito o que queres pedir. A preparação de consultas da app ajuda.'),
  },
  {
    id: 'aval',
    title: tr('Consulta de especialidade'),
    body: tr('Consulta hospitalar (sexologia, psiquiatria ou psicologia) que acompanha o processo e emite os relatórios necessários para tratamentos médicos.'),
    tip: tr('As listas de espera variam muito entre hospitais. Pergunta ao centro de saúde qual tem resposta mais rápida.'),
  },
  {
    id: 'hormonas',
    title: tr('Terapia hormonal'),
    body: tr('Início e acompanhamento pela endocrinologia, com análises regulares. A app lembra-te das tomas e das análises.'),
    stories: 'hormonas-t',
  },
  {
    id: 'cirurgia',
    title: tr('Cirurgias (se quiseres)'),
    body: tr('Nem todas as pessoas querem ou precisam. No SNS são feitas em unidades de referência, mediante referenciação.'),
    stories: 'mastectomia',
  },
  {
    id: 'outros',
    title: tr('Outros cuidados'),
    body: tr('Terapia da fala, depilação definitiva, saúde mental e fertilidade (preservação de gâmetas antes de iniciar hormonas).'),
    tip: tr('Pergunta pela preservação de fertilidade antes de iniciar hormonas.'),
  },
]

/**
 * Rastreios baseados nos órgãos que a pessoa tem, e não no sexo registado.
 * O software de rastreio do SNS usa o sexo do registo: quem já o atualizou
 * pode deixar de ser convocado/a para rastreios de que ainda precisa.
 */
export type Organ = 'colo' | 'mama' | 'prostata'

export const organLabels: Record<Organ, string> = {
  colo: tr('Colo do útero'),
  mama: tr('Tecido mamário (de nascença ou com estrogénio há 5+ anos)'),
  prostata: tr('Próstata'),
}

export interface Screening { id: string; title: string; who: string; when: string; minAge: number; maxAge: number; organ?: Organ }

export const screenings: Screening[] = [
  { id: 'colo', organ: 'colo', title: tr('Rastreio do cancro do colo do útero'), who: tr('Quem tem colo do útero, incluindo homens trans e pessoas não-binárias, mesmo com testosterona.'), when: tr('Teste de HPV de 5 em 5 anos, normalmente dos 25 aos 60 anos.'), minAge: 25, maxAge: 64 },
  { id: 'mama', organ: 'mama', title: tr('Rastreio do cancro da mama'), who: tr('Quem tem tecido mamário: mulheres cis e trans (após anos de estrogénio) e pessoas com mama de nascença sem mastectomia completa.'), when: tr('Mamografia de 2 em 2 anos, normalmente a partir dos 50 anos.'), minAge: 50, maxAge: 74 },
  { id: 'prostata', organ: 'prostata', title: tr('Vigilância da próstata'), who: tr('Quem tem próstata, incluindo mulheres trans (a próstata mantém-se após cirurgia).'), when: tr('Não há rastreio organizado: conversa com o/a médico/a a partir dos 50 anos.'), minAge: 50, maxAge: 120 },
  { id: 'colorretal', title: tr('Rastreio do cancro colorretal'), who: tr('Todas as pessoas.'), when: tr('Pesquisa de sangue oculto nas fezes de 2 em 2 anos, dos 50 aos 74 anos.'), minAge: 50, maxAge: 74 },
]

export function screeningsFor(age: number, organs: Organ[]): Screening[] {
  return screenings.filter(s => age >= s.minAge - 5 && age <= s.maxAge && (!s.organ || organs.includes(s.organ)))
}
