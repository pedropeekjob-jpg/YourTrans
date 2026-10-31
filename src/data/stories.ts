// Temas e fases para os testemunhos. A ideia é encontrar alguém que passou
// pela mesma coisa, no mesmo momento do caminho.
export const storyTopics = [
  { id: 'hormonas-e', label: 'Estrogénio e bloqueadores' },
  { id: 'hormonas-t', label: 'Testosterona' },
  { id: 'mastectomia', label: 'Mastectomia' },
  { id: 'mamoplastia', label: 'Mamoplastia de aumento' },
  { id: 'vaginoplastia', label: 'Vaginoplastia' },
  { id: 'faloplastia', label: 'Faloplastia / metoidioplastia' },
  { id: 'histerectomia', label: 'Histerectomia' },
  { id: 'ffs', label: 'Cirurgia facial' },
  { id: 'voz', label: 'Voz' },
  { id: 'emocional', label: 'Emoções e saúde mental' },
  { id: 'outro', label: 'Outro' },
] as const

export const storyPhases = [
  { id: 'antes', label: 'Antes de começar' },
  { id: 'primeiros-dias', label: 'Primeiros dias' },
  { id: 'semanas', label: 'Primeiras semanas' },
  { id: 'meses', label: '3 a 6 meses' },
  { id: 'ano', label: '1 ano ou mais' },
] as const

export type StoryTopic = (typeof storyTopics)[number]['id']
export type StoryPhase = (typeof storyPhases)[number]['id']

export interface Story {
  id: string
  kind: 'testemunho' | 'pergunta'
  topic: StoryTopic
  phase: StoryPhase
  title: string
  body: string
  nickname?: string
  /** Aviso de conteúdo (ex.: descrição de dor, fotos médicas descritas) */
  warning?: string
  month: string
  support: number
  replies: { id: string; body: string; nickname?: string; month: string }[]
}

export const topicLabel = (id: string) => storyTopics.find(t => t.id === id)?.label ?? id
export const phaseLabel = (id: string) => storyPhases.find(p => p.id === id)?.label ?? id
