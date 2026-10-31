// Exporta lembretes para o calendário (.ics), com título neutro opcional.
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function icsEvent(opts: { title: string; start: Date; durationMin?: number; everyDays?: number; description?: string; allDay?: boolean }): string {
  const end = new Date(opts.start.getTime() + (opts.durationMin ?? 30) * 60_000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Notas//PT', 'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}`, `DTSTAMP:${stamp(new Date())}`,
    opts.allDay
      ? `DTSTART;VALUE=DATE:${opts.start.toISOString().slice(0, 10).replace(/-/g, '')}`
      : `DTSTART:${stamp(opts.start)}`,
    ...(opts.allDay ? [] : [`DTEND:${stamp(end)}`]),
    `SUMMARY:${opts.title.replace(/[,;\n]/g, ' ')}`,
    ...(opts.description ? [`DESCRIPTION:${opts.description.replace(/\n/g, '\\n').replace(/[,;]/g, ' ')}`] : []),
    ...(opts.everyDays ? [`RRULE:FREQ=DAILY;INTERVAL=${opts.everyDays}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

export function downloadIcs(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name + '.ics'
  a.click()
  URL.revokeObjectURL(a.href)
}
