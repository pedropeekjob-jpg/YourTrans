// Exporta lembretes e consultas para o calendário (.ics), com título neutro opcional.
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')

export interface IcsEventInput {
  title: string
  start: Date
  durationMin?: number
  everyDays?: number
  description?: string
  location?: string
  allDay?: boolean
  /** UID estável: voltar a importar no calendário atualiza em vez de duplicar */
  uid?: string
  /** Aviso antes, em minutos (omisso: 15) */
  alarmMin?: number
}

function vevent(o: IcsEventInput): string[] {
  const end = new Date(o.start.getTime() + (o.durationMin ?? 30) * 60_000)
  const day = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return [
    'BEGIN:VEVENT',
    `UID:${o.uid ?? crypto.randomUUID()}`, `DTSTAMP:${stamp(new Date())}`,
    o.allDay ? `DTSTART;VALUE=DATE:${day(o.start)}` : `DTSTART:${stamp(o.start)}`,
    ...(o.allDay ? [] : [`DTEND:${stamp(end)}`]),
    `SUMMARY:${esc(o.title)}`,
    ...(o.location ? [`LOCATION:${esc(o.location)}`] : []),
    ...(o.description ? [`DESCRIPTION:${esc(o.description)}`] : []),
    ...(o.everyDays ? [`RRULE:FREQ=DAILY;INTERVAL=${o.everyDays}`] : []),
    'BEGIN:VALARM', `TRIGGER:-PT${o.alarmMin ?? 15}M`, 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', 'END:VALARM',
    'END:VEVENT',
  ]
}

/** Um calendário com vários eventos. */
export function icsCalendar(events: IcsEventInput[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Notas//PT', 'CALSCALE:GREGORIAN', ...events.flatMap(vevent), 'END:VCALENDAR'].join('\r\n')
}

export function icsEvent(opts: IcsEventInput): string {
  return icsCalendar([opts])
}

export function downloadIcs(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name + '.ics'
  a.click()
  URL.revokeObjectURL(a.href)
}
