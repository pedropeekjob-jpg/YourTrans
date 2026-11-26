// Importação de calendários e mensagens, toda feita no aparelho.
// Nada do que se lê aqui é enviado para nenhum servidor: o ficheiro .ics (ou o .zip que o
// Google Calendar exporta) é lido no navegador e só os eventos que a pessoa escolhe entram no cofre.

export interface ImportedEvent {
  /** UID do evento no calendário de origem (serve para não duplicar ao importar outra vez) */
  uid: string
  title: string
  start: Date
  allDay: boolean
  location?: string
  description?: string
  /** Repetição aproximada em dias (0 = única) */
  everyDays: number
}

const unescapeText = (s: string) =>
  s.replace(/\\([\\nN,;:"])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c)).trim()

/** Separa "NOME;PARAM=a;X="b:c":valor" em nome, parâmetros e valor. */
function splitLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  let quoted = false
  let colon = -1
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') quoted = !quoted
    else if (c === ':' && !quoted) { colon = i; break }
  }
  if (colon < 0) return null
  const [name, ...rest] = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  for (const p of rest) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) }
}

/** Diferença (ms) entre a hora de parede num fuso e UTC, num dado instante. */
function tzOffset(utcMs: number, timeZone: string): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map(x => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs
}

/** Lê DTSTART: data (dia inteiro), UTC (…Z), com fuso (TZID) ou "flutuante" (hora local). */
export function parseIcsDate(value: string, params: Record<string, string> = {}): { date: Date; allDay: boolean } | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (h === undefined || params.VALUE === 'DATE') return { date: new Date(+y, +mo - 1, +d), allDay: true }
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0))
  if (z) return { date: new Date(wall), allDay: false }
  const tz = params.TZID
  if (tz) {
    try {
      // Duas passagens acertam as mudanças de hora.
      let utc = wall - tzOffset(wall, tz)
      utc = wall - tzOffset(utc, tz)
      return { date: new Date(utc), allDay: false }
    } catch { /* fuso desconhecido (ex.: nomes do Windows): usa a hora local */ }
  }
  return { date: new Date(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)), allDay: false }
}

/** Converte a regra de repetição numa repetição em dias (os lembretes do Casulo só repetem em dias). */
export function rruleToDays(rule: string): number {
  const p = Object.fromEntries(rule.split(';').map(x => x.split('=') as [string, string]))
  const n = Math.max(1, parseInt(p.INTERVAL ?? '1', 10) || 1)
  switch (p.FREQ) {
    case 'DAILY': return n
    case 'WEEKLY': return 7 * n
    case 'MONTHLY': return 30 * n
    case 'YEARLY': return 365 * n
    default: return 0
  }
}

/** Lê um ficheiro iCalendar (.ics) e devolve os eventos. */
export function parseIcs(text: string): ImportedEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out: ImportedEvent[] = []
  let ev: Record<string, { params: Record<string, string>; value: string }> | null = null
  let nested = 0
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line === 'BEGIN:VEVENT') { ev = {}; nested = 0; continue }
    if (!ev) continue
    if (line.startsWith('BEGIN:')) { nested++; continue }
    if (line.startsWith('END:') && nested > 0) { nested--; continue }
    if (line === 'END:VEVENT') {
      const start = ev.DTSTART && parseIcsDate(ev.DTSTART.value, ev.DTSTART.params)
      const cancelled = ev.STATUS?.value.toUpperCase() === 'CANCELLED'
      // Exceções de um evento repetido (RECURRENCE-ID) ficam de fora: conta o evento principal.
      if (start && !cancelled && !ev['RECURRENCE-ID']) {
        out.push({
          uid: ev.UID?.value.trim() || `${ev.DTSTART.value}-${ev.SUMMARY?.value ?? ''}`,
          title: unescapeText(ev.SUMMARY?.value ?? '') || '(sem título)',
          start: start.date,
          allDay: start.allDay,
          location: ev.LOCATION ? unescapeText(ev.LOCATION.value) || undefined : undefined,
          description: ev.DESCRIPTION ? unescapeText(ev.DESCRIPTION.value).slice(0, 500) || undefined : undefined,
          everyDays: ev.RRULE ? rruleToDays(ev.RRULE.value) : 0,
        })
      }
      ev = null
      continue
    }
    if (nested > 0) continue
    const p = splitLine(line)
    if (p && !(p.name in ev)) ev[p.name] = { params: p.params, value: p.value }
  }
  return out
}

/** Próxima ocorrência a partir de agora (para eventos repetidos que começaram no passado). */
export function nextOccurrence(e: ImportedEvent, now = Date.now()): Date {
  let t = e.start.getTime()
  if (e.everyDays && t < now) {
    const step = e.everyDays * 86_400_000
    t += Math.ceil((now - t) / step) * step
  }
  return new Date(t)
}

/** Eventos que ainda vêm aí (ou repetidos que continuam), ordenados por data. */
export function upcoming(events: ImportedEvent[], now = Date.now()): ImportedEvent[] {
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  return events
    .map(e => ({ ...e, start: nextOccurrence(e, now) }))
    .filter(e => e.start.getTime() >= today.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

/* ---------- .zip (o Google Calendar exporta um .zip com um .ics por calendário) ---------- */

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Lê os ficheiros .ics de dentro de um .zip, sem bibliotecas (diretório central do zip). */
export async function icsFromZip(buf: ArrayBuffer): Promise<string[]> {
  const b = new Uint8Array(buf)
  const v = new DataView(buf)
  let eocd = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('zip')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const out: string[] = []
  const dec = new TextDecoder()
  for (let n = 0; n < count && v.getUint32(p, true) === 0x02014b50; n++) {
    const method = v.getUint16(p + 10, true)
    const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const extraLen = v.getUint16(p + 30, true)
    const commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(b.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (!/\.ics$/i.test(name)) continue
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const raw = b.subarray(start, start + size)
    if (method === 0) out.push(dec.decode(raw))
    else if (method === 8) out.push(dec.decode(await inflateRaw(raw)))
  }
  return out
}

/** Lê um ficheiro escolhido pela pessoa (.ics ou .zip) e devolve todos os eventos. */
export async function readCalendarFile(file: File): Promise<ImportedEvent[]> {
  const buf = await file.arrayBuffer()
  const head = new Uint8Array(buf.slice(0, 4))
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  const texts = isZip ? await icsFromZip(buf) : [new TextDecoder().decode(buf)]
  return texts.flatMap(parseIcs)
}

/* ---------- Mensagens (SMS ou email do SNS 24, do centro de saúde, da clínica) ---------- */

export type MessageKind = 'consulta' | 'analises' | 'receita' | 'outro'

export interface MessageGuess {
  kind: MessageKind
  date?: Date
  /** Hora encontrada na mensagem */
  hasTime: boolean
  /** Local encontrado (USF, hospital…) */
  place?: string
  /** Texto original, para guardar nas notas */
  text: string
}

const months: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
}

/**
 * Procura a data, a hora e o tipo numa mensagem colada. Não tenta adivinhar mais do que isso:
 * a pessoa confirma tudo antes de guardar.
 */
export function parseMessage(text: string, now = new Date()): MessageGuess {
  const t = text.replace(/\s+/g, ' ').trim()
  const low = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  let date: Date | undefined
  const num = low.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/)
  const iso = low.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  const word = low.match(/\b(\d{1,2})\s+(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:\s+(?:de\s+)?(\d{4}))?/)
  const mk = (y: number | undefined, m: number, d: number) => {
    if (m < 0 || m > 11 || d < 1 || d > 31) return undefined
    let year = y ?? now.getFullYear()
    if (year < 100) year += 2000
    const out = new Date(year, m, d)
    // Sem ano e já passou: é do ano seguinte.
    if (y === undefined && out.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) out.setFullYear(year + 1)
    return out
  }
  if (iso) date = mk(+iso[1], +iso[2] - 1, +iso[3])
  else if (num) date = mk(num[3] ? +num[3] : undefined, +num[2] - 1, +num[1])
  else if (word) date = mk(word[3] ? +word[3] : undefined, months[word[2]], +word[1])

  const time = low.match(/\b(\d{1,2})\s*(?::|h)\s*(\d{2})\b/) ?? low.match(/\b(\d{1,2})\s*h\b/)
  let hasTime = false
  if (date && time && +time[1] < 24 && +(time[2] ?? 0) < 60) {
    date.setHours(+time[1], +(time[2] ?? 0), 0, 0)
    hasTime = true
  } else if (date) date.setHours(9, 0, 0, 0)

  const kind: MessageKind =
    /receita|medicament|farmacia|dispensa/.test(low) ? 'receita'
      : /analise|exame|colheita|ecografia|raio|rx\b|tac\b|ressonancia|mcdt|rastreio/.test(low) ? 'analises'
        : /consulta|teleconsulta|medic|centro de saude|usf|hospital|clinica/.test(low) ? 'consulta'
          : 'outro'
  const place = t.match(/\b(?:na|no|em)\s+((?:USF|UCSP|Centro de Sa[úu]de|Hospital|ULS|Cl[íi]nica)[^.,;\n]{0,50})/i)?.[1]?.trim()
  return { kind, date, hasTime, place, text: t.slice(0, 600) }
}
