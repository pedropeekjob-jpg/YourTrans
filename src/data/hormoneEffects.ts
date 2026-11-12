import { tr } from '../i18n'
import type { Source } from './healthPath'
// Mudanças típicas com hormonas e quando costumam aparecer.
// Valores das tabelas da WPATH (SOC8, anexo C) e da Endocrine Society (2017).
// Onde as fontes divergem, mostramos o intervalo mais largo.

export type Hormone = 'estrogenio' | 'testosterona'

export interface Effect {
  id: string
  title: string
  /** Meses até começar (mínimo e máximo do intervalo típico) */
  onset: [number, number]
  /** Quando costuma atingir o máximo (texto, porque às vezes é "desconhecido" ou "variável") */
  max: string
  /** Mantém-se se as hormonas pararem */
  permanent?: boolean
  note?: string
}

export const effects: Record<Hormone, Effect[]> = {
  estrogenio: [
    { id: 'e-libido', title: tr('Menos desejo sexual'), onset: [1, 3], max: tr('1 a 2 anos') },
    { id: 'e-erecoes', title: tr('Menos ereções espontâneas'), onset: [1, 3], max: tr('3 a 6 meses') },
    { id: 'e-calvicie', title: tr('A calvície deixa de avançar'), onset: [1, 3], max: tr('1 a 2 anos'), note: tr('O cabelo que já caiu normalmente não volta a crescer.') },
    { id: 'e-mama', title: tr('Crescimento mamário'), onset: [3, 6], max: tr('2 a 5 anos'), permanent: true, note: tr('Começa muitas vezes com sensibilidade ou um nódulo atrás do mamilo. O tamanho final varia muito.') },
    { id: 'e-gordura', title: tr('Redistribuição da gordura (ancas, coxas, rosto)'), onset: [3, 6], max: tr('2 a 5 anos') },
    { id: 'e-musculo', title: tr('Menos massa muscular e força'), onset: [3, 6], max: tr('1 a 2 anos') },
    { id: 'e-pele', title: tr('Pele mais macia e menos oleosa'), onset: [3, 6], max: tr('desconhecido') },
    { id: 'e-testiculos', title: tr('Testículos mais pequenos'), onset: [3, 6], max: tr('2 a 3 anos') },
    { id: 'e-pelos', title: tr('Pelos do corpo e da cara mais finos e lentos'), onset: [6, 12], max: tr('mais de 3 anos'), note: tr('Os pelos da cara raramente desaparecem só com hormonas: muitas pessoas fazem depilação definitiva.') },
    { id: 'e-voz', title: tr('A voz não muda com estrogénio'), onset: [0, 0], max: '—', note: tr('Treino de voz com terapeuta da fala é a forma mais comum de a mudar.') },
  ],
  testosterona: [
    { id: 't-pele', title: tr('Pele mais oleosa e acne'), onset: [1, 6], max: tr('1 a 2 anos') },
    { id: 't-menstruacao', title: tr('A menstruação para'), onset: [1, 6], max: '—', note: tr('Parar a menstruação não é contraceção: ainda pode haver gravidez.') },
    { id: 't-clitoris', title: tr('Crescimento do clítoris'), onset: [1, 6], max: tr('1 a 2 anos'), permanent: true },
    { id: 't-vaginal', title: tr('Secura vaginal (atrofia)'), onset: [1, 6], max: tr('1 a 2 anos') },
    { id: 't-gordura', title: tr('Redistribuição da gordura'), onset: [1, 6], max: tr('2 a 5 anos') },
    { id: 't-voz', title: tr('Voz mais grave'), onset: [1, 12], max: tr('1 a 2 anos'), permanent: true, note: tr('Pode haver uma fase em que a voz falha ou fica instável.') },
    { id: 't-pelos', title: tr('Mais pelos na cara e no corpo'), onset: [6, 12], max: tr('4 a 5 anos ou mais'), permanent: true },
    { id: 't-musculo', title: tr('Mais massa muscular e força'), onset: [6, 12], max: tr('2 a 5 anos'), note: tr('Depende muito do exercício.') },
    { id: 't-calvicie', title: tr('Queda de cabelo (calvície)'), onset: [12, 12], max: tr('variável'), permanent: true, note: tr('Depende muito da genética da família.') },
  ],
}

/** Fases pela ordem em que as mudanças costumam começar. */
export const phases = [
  { id: 'p1', title: tr('Primeiros 3 meses'), from: 0, to: 3 },
  { id: 'p2', title: tr('3 a 6 meses'), from: 3, to: 6 },
  { id: 'p3', title: tr('6 a 12 meses'), from: 6, to: 12 },
  { id: 'p4', title: tr('Depois do primeiro ano'), from: 12, to: Infinity },
]

/** Fase em que cada mudança costuma começar (pelo início do intervalo). */
export function phaseOf(e: Effect): string {
  const start = e.onset[0]
  return phases.find(p => start >= p.from && start < p.to)?.id ?? 'p1'
}

export function onsetLabel(e: Effect): string {
  const [a, b] = e.onset
  if (b === 0) return '—'
  if (a === b) return a >= 12 ? tr('a partir de 1 ano') : tr('por volta dos {0} meses', a)
  return tr('{0} a {1} meses', a, b)
}

export const effectSources: Source[] = [
  { label: tr('WPATH, Standards of Care 8 (2022), anexo C'), url: 'https://www.wpath.org/soc8' },
  { label: tr('Endocrine Society, guideline de 2017'), url: 'https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence' },
  { label: tr('Rainbow Health Ontario, guidelines (2023)'), url: 'https://www.rainbowhealthontario.ca/wp-content/uploads/2021/09/Guidelines-FINAL-4TH-EDITION-With-2023-Updates.pdf' },
  { label: tr('Nebraska Medicine, efeitos da terapia hormonal'), url: 'https://www.nebraskamed.com/sites/default/files/documents/transgender/hormone-therapy.pdf' },
]
