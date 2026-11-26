import type { IconName } from '../components/Icon'
import { tr } from '../i18n'

/**
 * Atalhos que se adaptam ao uso. Tudo o que aqui se regista fica no cofre (cifrado, só neste
 * aparelho) e nunca é enviado. Nada é escondido: a lista completa está sempre em "Ver tudo".
 */

export type Tone = 'accent' | 'rose' | 'mint' | 'amber' | 'sky'

export interface Feature {
  id: string
  /** Caminho e, se for o caso, o separador (?tab=) */
  path: string
  tab?: string
  /** Também conta quando o ecrã abre sem separador (é o separador por omissão). */
  dflt?: boolean
  title: string
  icon: IconName
  tone: Tone
  group: string
  /** Não conta para os atalhos nem para "Continuar" (ecrãs de arrumação, como as Definições). */
  noTrack?: boolean
}

/** Pontos de uso: valor já com o desconto do tempo até "t" (ms). */
export type Usage = Record<string, { s: number; t: number }>

/** Meia-vida do uso: o que se usou há duas semanas vale metade. */
export const HALF_LIFE_MS = 14 * 86_400_000
/** Abrir o mesmo ecrã outra vez em menos de 30 s não conta (mudar de separador, voltar atrás). */
const REPEAT_MS = 30_000

export const TRANS_TILES = 8
export const ALLY_TILES = 4

export function featureHref(f: Feature): string {
  return f.tab ? `${f.path}?tab=${f.tab}` : f.path
}

export function transFeatures(): Feature[] {
  const papers = tr('Documentos e direitos')
  const health = tr('Saúde')
  const me = tr('Eu')
  const people = tr('Comunidade')
  const safe = tr('Segurança e trabalho')
  const data = tr('Os teus dados')
  return [
    { id: 'documentos', path: '/documentos', title: tr('Documentos'), icon: 'doc', tone: 'accent', group: papers },
    { id: 'pedidos', path: '/documentos', tab: 'pedidos', title: tr('Cartas e pedidos'), icon: 'copy', tone: 'accent', group: papers },
    { id: 'direitos', path: '/direitos', title: tr('Direitos e lei'), icon: 'book', tone: 'amber', group: papers },
    { id: 'registo', path: '/direitos', tab: 'registo', title: tr('Registo de ocorrências'), icon: 'lock', tone: 'amber', group: papers },
    { id: 'percurso-saude', path: '/percurso/saude', title: tr('Percurso de saúde'), icon: 'heart', tone: 'rose', group: health },
    { id: 'lembretes', path: '/saude', tab: 'tratamento', title: tr('Lembretes'), icon: 'bell', tone: 'amber', group: health },
    { id: 'profissionais', path: '/saude', tab: 'diretorio', dflt: true, title: tr('Profissionais de saúde'), icon: 'star', tone: 'accent', group: health },
    { id: 'mente', path: '/saude', tab: 'mente', title: tr('Cuidar da cabeça'), icon: 'heart', tone: 'mint', group: health },
    { id: 'rastreios', path: '/saude', tab: 'rastreios', title: tr('Rastreios'), icon: 'check', tone: 'sky', group: health },
    { id: 'percurso', path: '/percurso', title: tr('O meu percurso'), icon: 'chart', tone: 'accent', group: me },
    { id: 'diario', path: '/diario', title: tr('Diário e fotos'), icon: 'camera', tone: 'mint', group: me },
    { id: 'nome', path: '/nome', title: tr('Treino do nome'), icon: 'sparkle', tone: 'accent', group: me },
    { id: 'cartao-nome', path: '/cartao-nome', title: tr('Cartão para balcões'), icon: 'people', tone: 'accent', group: me },
    { id: 'voz', path: '/voz', title: tr('Treino de voz'), icon: 'chat', tone: 'rose', group: me },
    { id: 'viagem', path: '/viagem', title: tr('Modo viagem'), icon: 'map', tone: 'sky', group: me },
    { id: 'partilhas', path: '/comunidade', tab: 'testemunhos', dflt: true, title: tr('Partilhas'), icon: 'people', tone: 'accent', group: people },
    { id: 'agenda', path: '/comunidade', tab: 'agenda', title: tr('Agenda'), icon: 'calendar', tone: 'rose', group: people },
    { id: 'locais', path: '/comunidade', tab: 'locais', title: tr('Locais seguros'), icon: 'pin', tone: 'mint', group: people },
    { id: 'mentoria', path: '/comunidade', tab: 'mentoria', title: tr('Mentoria'), icon: 'chat', tone: 'sky', group: people },
    { id: 'partilhar', path: '/partilhar', title: tr('Partilhar com quem me apoia'), icon: 'share', tone: 'mint', group: people },
    { id: 'seguranca', path: '/seguranca', title: tr('Segurança'), icon: 'shield', tone: 'mint', group: safe },
    { id: 'emprego', path: '/emprego', title: tr('Emprego'), icon: 'briefcase', tone: 'amber', group: safe },
    { id: 'selo', path: '/selo', title: tr('Selo Casulo'), icon: 'star', tone: 'accent', group: safe },
    { id: 'dados', path: '/dados', title: tr('Cópia de segurança'), icon: 'lock', tone: 'sky', group: data, noTrack: true },
    { id: 'definicoes', path: '/definicoes', title: tr('Definições'), icon: 'gear', tone: 'sky', group: data, noTrack: true },
  ]
}

export function allyFeatures(): Feature[] {
  const g = tr('Apoiar')
  return [
    { id: 'aprender', path: '/aprender', title: tr('Lições'), icon: 'book', tone: 'accent', group: g },
    { id: 'dizer', path: '/aprender', tab: 'dizer', title: tr('O que dizer'), icon: 'chat', tone: 'rose', group: g },
    { id: 'praticar', path: '/praticar', title: tr('Praticar'), icon: 'sparkle', tone: 'accent', group: g },
    { id: 'cartoes', path: '/cartoes', title: tr('Cartões'), icon: 'heart', tone: 'rose', group: g },
    { id: 'para-mim', path: '/para-mim', title: tr('Para mim'), icon: 'people', tone: 'mint', group: g },
    { id: 'comunidade', path: '/comunidade', title: tr('Comunidade'), icon: 'people', tone: 'accent', group: g },
    { id: 'selo', path: '/selo', title: tr('Selo Casulo'), icon: 'star', tone: 'amber', group: g },
    { id: 'definicoes', path: '/definicoes', title: tr('Definições'), icon: 'gear', tone: 'sky', group: g, noTrack: true },
  ]
}

/** Que funcionalidade é este ecrã? (Ajuda, Hoje e a pesquisa não contam.) */
export function featureFor(list: Feature[], pathname: string, search: string): Feature | undefined {
  const tab = new URLSearchParams(search).get('tab') ?? undefined
  const same = list.filter(f => f.path === pathname)
  if (tab) {
    const exact = same.find(f => f.tab === tab)
    if (exact) return exact
  }
  return same.find(f => !f.tab) ?? (tab ? undefined : same.find(f => f.dflt))
}

/** Pontos atuais, com o desconto do tempo. */
export function scoreAt(u: { s: number; t: number } | undefined, now: number): number {
  if (!u) return 0
  return u.s * Math.pow(0.5, Math.max(0, now - u.t) / HALF_LIFE_MS)
}

/** Soma uma visita. Devolve o mesmo objeto se a visita for repetida, para não gravar à toa. */
export function recordVisit(usage: Usage | undefined, id: string, now: number): Usage {
  const u = usage ?? {}
  const prev = u[id]
  if (prev && now - prev.t < REPEAT_MS) return u
  return { ...u, [id]: { s: scoreAt(prev, now) + 1, t: now } }
}

/** Funcionalidades sugeridas pelas escolhas iniciais ("O que te traz aqui?"). */
const fromInterests: Record<string, string[]> = {
  docs: ['documentos', 'pedidos'],
  hormonas: ['percurso-saude', 'lembretes'],
  mental: ['mente', 'diario'],
  comunidade: ['partilhas', 'mentoria'],
  seguranca: ['seguranca', 'locais'],
  emprego: ['emprego', 'selo'],
}
const transDefaults = ['documentos', 'lembretes', 'diario', 'nome', 'percurso-saude', 'partilhas', 'seguranca', 'direitos']
const allyDefaults = ['aprender', 'praticar', 'dizer', 'para-mim']

export interface RankInput {
  list: Feature[]
  pins: string[]
  usage: Usage | undefined
  interests: string[]
  adaptive: boolean
  ally: boolean
  now: number
  count: number
}

/**
 * Ordem dos atalhos: primeiro os fixados (pela ordem escolhida), depois os mais usados
 * (só com a adaptação ligada), depois os das escolhas iniciais e por fim os habituais.
 */
export function rankShortcuts(o: RankInput): Feature[] {
  const byId = new Map(o.list.map(f => [f.id, f]))
  const out: string[] = []
  const add = (id: string) => { if (byId.has(id) && !out.includes(id)) out.push(id) }
  o.pins.forEach(add)
  if (o.adaptive && o.usage) {
    Object.entries(o.usage)
      .map(([id, u]) => [id, scoreAt(u, o.now)] as const)
      .filter(([, s]) => s >= 0.5)
      .sort((a, b) => b[1] - a[1])
      .forEach(([id]) => add(id))
  }
  if (!o.ally) o.interests.flatMap(i => fromInterests[i] ?? []).forEach(add)
  ;(o.ally ? allyDefaults : transDefaults).forEach(add)
  o.list.forEach(f => add(f.id))
  return out.slice(0, o.count).map(id => byId.get(id)!)
}

/** O que o Casulo aprendeu, do mais usado para o menos usado (para mostrar nas Definições). */
export function learned(list: Feature[], usage: Usage | undefined, now: number, max = 5): { f: Feature; score: number }[] {
  if (!usage) return []
  const byId = new Map(list.map(f => [f.id, f]))
  return Object.entries(usage)
    .map(([id, u]) => ({ f: byId.get(id), score: scoreAt(u, now) }))
    .filter((x): x is { f: Feature; score: number } => !!x.f && x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}

/** Move um fixado uma posição para cima (-1) ou para baixo (+1). */
export function movePin(pins: string[], id: string, dir: -1 | 1): string[] {
  const i = pins.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= pins.length) return pins
  const next = [...pins]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function togglePin(pins: string[], id: string): string[] {
  return pins.includes(id) ? pins.filter(p => p !== id) : [...pins, id]
}

export const toneStyle = (t: Tone) => ({ background: `var(--${t}-soft)`, color: `var(--${t})` })
