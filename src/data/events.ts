// Datas anuais da comunidade trans e LGBTI+. As marchas mudam de data todos
// os anos: a app mostra o mês habitual e pede confirmação junto da organização.
export interface CommunityEvent {
  id: string
  title: string
  /** Mês (1-12) e dia; dia ausente quando a data varia */
  month: number
  day?: number
  endDay?: number
  description: string
  where?: string
  kind: 'dia' | 'marcha' | 'vigília'
  url?: string
}

export const annualEvents: CommunityEvent[] = [
  { id: 'tdov', title: 'Dia Internacional da Visibilidade Trans', month: 3, day: 31, kind: 'dia', description: 'Celebração das pessoas trans e das suas conquistas. Costuma haver encontros e ações de rua.' },
  { id: 'idahobit', title: 'Dia Internacional contra a Homofobia, Bifobia e Transfobia', month: 5, day: 17, kind: 'dia', description: 'Ações e concentrações em várias cidades.' },
  { id: 'marcha-lisboa', title: 'Marcha do Orgulho LGBTI+ de Lisboa', month: 6, kind: 'marcha', where: 'Lisboa', description: 'Normalmente num sábado de junho. Confirma a data e o percurso junto da organização.', url: 'https://ilga-portugal.pt' },
  { id: 'arraial', title: 'Arraial Lisboa Pride', month: 6, kind: 'marcha', where: 'Lisboa', description: 'Festa do orgulho, normalmente em junho.', url: 'https://ilga-portugal.pt' },
  { id: 'marcha-porto', title: 'Marcha do Orgulho LGBTI+ do Porto', month: 7, kind: 'marcha', where: 'Porto', description: 'Normalmente no início de julho. Confirma a data junto da organização.' },
  { id: 'nb', title: 'Dia Internacional das Pessoas Não-Binárias', month: 7, day: 14, kind: 'dia', description: 'Dia de visibilidade para pessoas não-binárias.' },
  { id: 'taw', title: 'Semana de Consciencialização Trans', month: 11, day: 13, endDay: 19, kind: 'dia', description: 'Semana de sensibilização que antecede o Dia da Memória Trans.' },
  { id: 'tdor', title: 'Dia da Memória Trans', month: 11, day: 20, kind: 'vigília', description: 'Homenagem às pessoas trans vítimas de violência. Há vigílias em Lisboa, Porto e outras cidades.' },
]

/** Próxima ocorrência (data aproximada ao dia 1 do mês quando o dia varia). */
export function nextOccurrence(e: CommunityEvent, from = new Date()): Date {
  const y = from.getFullYear()
  const make = (year: number) => new Date(year, e.month - 1, e.day ?? 1, 10, 0, 0)
  let d = make(y)
  const endOfEvent = new Date(y, e.month - 1, e.endDay ?? e.day ?? 28, 23, 59)
  if (endOfEvent < from) d = make(y + 1)
  return d
}
