import { tr } from '../i18n'
// Temas e fases para os testemunhos. A ideia é encontrar alguém que passou
// pela mesma coisa, no mesmo momento do caminho.
export const storyTopics = [
  { id: 'hormonas-e', label: tr('Estrogénio e bloqueadores') },
  { id: 'hormonas-t', label: tr('Testosterona') },
  { id: 'mastectomia', label: tr('Mastectomia') },
  { id: 'mamoplastia', label: tr('Mamoplastia de aumento') },
  { id: 'vaginoplastia', label: tr('Vaginoplastia') },
  { id: 'faloplastia', label: tr('Faloplastia / metoidioplastia') },
  { id: 'histerectomia', label: tr('Histerectomia') },
  { id: 'ffs', label: tr('Cirurgia facial') },
  { id: 'voz', label: tr('Voz') },
  { id: 'emocional', label: tr('Emoções e saúde mental') },
  { id: 'outro', label: tr('Outro') },
] as const

export const storyPhases = [
  { id: 'antes', label: tr('Antes de começar') },
  { id: 'primeiros-dias', label: tr('Primeiros dias') },
  { id: 'semanas', label: tr('Primeiras semanas') },
  { id: 'meses', label: tr('3 a 6 meses') },
  { id: 'ano', label: tr('1 ano ou mais') },
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
  /** Assinatura pública de quem publicou (para bloquear) */
  author?: string
  support: number
  replies: { id: string; body: string; nickname?: string; month: string; author?: string }[]
}

export const topicLabel = (id: string) => storyTopics.find(t => t.id === id)?.label ?? id
export const phaseLabel = (id: string) => storyPhases.find(p => p.id === id)?.label ?? id
