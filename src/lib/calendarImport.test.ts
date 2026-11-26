import { describe, expect, it } from 'vitest'
import { addEvents, icsFromZip, nextOccurrence, parseIcs, parseIcsDate, parseMessage, refreshLinked, rruleToDays, upcoming } from './calendarImport'
import { fromDeviceEvents } from './deviceCalendar'
import { icsCalendar } from './ics'

const google = [
  'BEGIN:VCALENDAR', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN', 'VERSION:2.0',
  'BEGIN:VTIMEZONE', 'TZID:Europe/Lisbon', 'BEGIN:STANDARD', 'DTSTART:19701025T020000', 'END:STANDARD', 'END:VTIMEZONE',
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Lisbon:20261210T093000', 'DTEND;TZID=Europe/Lisbon:20261210T100000',
  'UID:abc123@google.com', 'SUMMARY:Consulta de endocrinologia\\, ULS São José',
  'LOCATION:Rua José António Serrano\\, Lisboa', 'DESCRIPTION:Levar análises\\nE o relatório',
  'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Isto não é o resumo', 'TRIGGER:-P0DT0H30M0S', 'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261224', 'UID:natal@google.com', 'SUMMARY:Consoada', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261101T080000Z', 'RRULE:FREQ=WEEKLY;INTERVAL=2', 'UID:gel@google.com', 'SUMMARY:Injeção', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261201T080000Z', 'UID:x@google.com', 'STATUS:CANCELLED', 'SUMMARY:Cancelado', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261115T080000Z', 'RECURRENCE-ID:20261115T080000Z', 'UID:gel@google.com', 'SUMMARY:Exceção', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261212T080000Z', 'UID:long@google.com', 'SUMMARY:Um título muito comprido que o Google',
  '  dobra em várias linhas', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('importar calendário (.ics)', () => {
  const evs = parseIcs(google)

  it('lê os eventos, ignora cancelados, exceções e os alarmes', () => {
    expect(evs.map(e => e.uid)).toEqual(['abc123@google.com', 'natal@google.com', 'gel@google.com', 'long@google.com'])
    expect(evs[0].title).toBe('Consulta de endocrinologia, ULS São José')
    expect(evs[0].location).toBe('Rua José António Serrano, Lisboa')
    expect(evs[0].description).toBe('Levar análises\nE o relatório')
    expect(evs[3].title).toBe('Um título muito comprido que o Google dobra em várias linhas')
  })

  it('converte o fuso horário do evento', () => {
    // Lisboa em dezembro está em UTC+0
    expect(evs[0].start.toISOString()).toBe('2026-12-10T09:30:00.000Z')
    const summer = parseIcsDate('20260710T093000', { TZID: 'Europe/Lisbon' })!
    expect(summer.date.toISOString()).toBe('2026-07-10T08:30:00.000Z')
    const berlin = parseIcsDate('20260710T093000', { TZID: 'Europe/Berlin' })!
    expect(berlin.date.toISOString()).toBe('2026-07-10T07:30:00.000Z')
  })

  it('dias inteiros e repetições', () => {
    expect(evs[1].allDay).toBe(true)
    expect(evs[1].start.getDate()).toBe(24)
    expect(evs[2].everyDays).toBe(14)
    expect(rruleToDays('FREQ=MONTHLY;INTERVAL=3')).toBe(90)
    expect(rruleToDays('FREQ=HOURLY')).toBe(0)
  })

  it('mostra só o que vem aí e avança os repetidos', () => {
    const now = Date.UTC(2026, 10, 26, 12)
    const next = nextOccurrence(evs[2], now)
    expect(next.toISOString()).toBe('2026-11-29T08:00:00.000Z')
    expect(upcoming(evs, now).map(e => e.uid)).toEqual(['gel@google.com', 'abc123@google.com', 'long@google.com', 'natal@google.com'])
  })

  it('lê de volta o que o Casulo exporta', () => {
    const out = icsCalendar([{ title: 'Gel; dose 2', start: new Date('2026-12-01T08:00:00Z'), everyDays: 1, uid: 'r1', location: 'Casa' }])
    const [e] = parseIcs(out)
    expect(e).toMatchObject({ uid: 'r1', title: 'Gel; dose 2', everyDays: 1, location: 'Casa' })
    expect(e.start.toISOString()).toBe('2026-12-01T08:00:00.000Z')
  })
})

describe('importar .zip do Google', () => {
  it('lê os .ics guardados e comprimidos dentro do zip', async () => {
    const { deflateRawSync } = await import('node:zlib')
    const files = [{ name: 'pedro@gmail.com.ics', data: new TextEncoder().encode(google), deflate: true }, { name: 'leia.txt', data: new TextEncoder().encode('x'), deflate: false }]
    const parts: Uint8Array[] = [], central: Uint8Array[] = []
    let offset = 0
    for (const f of files) {
      const body = f.deflate ? new Uint8Array(deflateRawSync(f.data)) : f.data
      const name = new TextEncoder().encode(f.name)
      const lh = new DataView(new ArrayBuffer(30))
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(8, f.deflate ? 8 : 0, true)
      lh.setUint32(18, body.length, true); lh.setUint32(22, f.data.length, true); lh.setUint16(26, name.length, true)
      parts.push(new Uint8Array(lh.buffer), name, body)
      const ch = new DataView(new ArrayBuffer(46))
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(10, f.deflate ? 8 : 0, true)
      ch.setUint32(20, body.length, true); ch.setUint32(24, f.data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true)
      central.push(new Uint8Array(ch.buffer), name)
      offset += 30 + name.length + body.length
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0)
    const end = new DataView(new ArrayBuffer(22))
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true)
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true)
    const all = [...parts, ...central, new Uint8Array(end.buffer)]
    const zip = new Uint8Array(all.reduce((a, b) => a + b.length, 0))
    let p = 0
    for (const a of all) { zip.set(a, p); p += a.length }
    const texts = await icsFromZip(zip.buffer)
    expect(texts.length).toBe(1)
    expect(parseIcs(texts[0]).length).toBe(4)
  })
})

describe('colar mensagem (SNS 24, centro de saúde)', () => {
  const now = new Date(2026, 10, 26, 12)
  it('consulta com data e hora', () => {
    const g = parseMessage('SNS: Tem consulta marcada para 15/12/2026 às 10:30 na USF Ribeirinha. Se não puder comparecer, desmarque.', now)
    expect(g.kind).toBe('consulta')
    expect(g.hasTime).toBe(true)
    expect(g.date).toEqual(new Date(2026, 11, 15, 10, 30))
    expect(g.place).toBe('USF Ribeirinha')
  })
  it('exame com data por extenso e sem ano', () => {
    const g = parseMessage('Lembrete: colheita de sangue dia 3 de dezembro, 8h15, jejum de 8 horas.', now)
    expect(g.kind).toBe('analises')
    expect(g.date).toEqual(new Date(2026, 11, 3, 8, 15))
  })
  it('receita sem data', () => {
    const g = parseMessage('Receita médica n.º 1234567890123456789. Código de acesso e dispensa: 123456. Código de direito de opção: 1234.', now)
    expect(g.kind).toBe('receita')
    expect(g.date).toBeUndefined()
  })
  it('data sem ano já passada fica para o ano seguinte', () => {
    expect(parseMessage('Consulta 10/01 às 9h', now).date).toEqual(new Date(2027, 0, 10, 9, 0))
  })
})

describe('guardar e sincronizar', () => {
  const base = { reminders: [], appointments: [] } as unknown as import('./types').Vault
  const ev = (uid: string, iso: string, title = 'Consulta endocrinologia') => ({ uid, title, start: new Date(iso), allDay: false, everyDays: 0, location: 'ULS' })
  let n = 0
  const id = () => `id${++n}`

  it('importar duas vezes não duplica', () => {
    let v = addEvents(base, [ev('a', '2026-12-10T09:30:00Z')], 'consultas', id)
    v = addEvents(v, [ev('a', '2026-12-11T09:30:00Z')], 'consultas', id)
    expect(v.appointments.length).toBe(1)
    expect(v.appointments[0].date).toBe('2026-12-11T09:30:00.000Z')
    v = addEvents(v, [ev('b', '2026-12-03T08:00:00Z', 'Análises ao sangue')], 'lembretes', id)
    expect(v.reminders[0]).toMatchObject({ kind: 'analises', sourceUid: 'b', everyDays: 0 })
  })

  it('sincronizar atualiza só o que veio do calendário e mantém as perguntas', () => {
    let v = addEvents(base, [ev('a', '2026-12-10T09:30:00Z')], 'consultas', id)
    v = { ...v, appointments: [...v.appointments.map(a => ({ ...a, questions: [{ id: 'q', text: 'Fertilidade?', done: false }] })), { id: 'manual', date: '2026-12-01T10:00:00.000Z', with: 'Psicologia', questions: [] }] }
    const r = refreshLinked(v, [ev('a', '2026-12-17T09:30:00Z'), ev('outro', '2026-12-20T10:00:00Z')])
    expect(r.changed).toBe(1)
    expect(r.vault.appointments[0]).toMatchObject({ date: '2026-12-17T09:30:00.000Z', questions: [{ text: 'Fertilidade?' }] })
    expect(r.vault.appointments[1].id).toBe('manual')
    expect(r.vault.appointments.length).toBe(2)
    expect(refreshLinked(r.vault, [ev('a', '2026-12-17T09:30:00Z')]).changed).toBe(0)
  })
})

describe('calendário do telemóvel', () => {
  it('fica com a próxima ocorrência e ignora passados e cancelados', () => {
    const now = Date.UTC(2026, 10, 26, 12)
    const d = (iso: string) => Date.parse(iso)
    const evs = fromDeviceEvents([
      { id: '1', title: 'Gel', startDate: d('2026-12-03T08:00:00Z'), isAllDay: false, location: null, description: null },
      { id: '1', title: 'Gel', startDate: d('2026-11-27T08:00:00Z'), isAllDay: false, location: null, description: null },
      { id: '2', title: 'Antigo', startDate: d('2026-11-20T08:00:00Z'), isAllDay: false, location: null, description: null },
      { id: '3', title: 'Cancelado', startDate: d('2026-12-01T08:00:00Z'), isAllDay: false, location: null, description: null, status: 'canceled' },
      { id: '4', title: ' ', startDate: d('2026-12-05T08:00:00Z'), isAllDay: true, location: ' USF ', description: null },
    ], now)
    expect(evs.map(e => [e.uid, e.start.toISOString()])).toEqual([['device:1', '2026-11-27T08:00:00.000Z'], ['device:4', '2026-12-05T08:00:00.000Z']])
    expect(evs[1]).toMatchObject({ title: '(sem título)', location: 'USF', allDay: true })
  })
})
