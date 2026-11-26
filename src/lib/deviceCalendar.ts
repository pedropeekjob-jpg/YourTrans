// Calendário do telemóvel (só nas apps nativas). O calendário do sistema já sincroniza com o
// Google, a Apple ou o Outlook, por isso basta lê-lo aqui: sem conta Google, sem OAuth e sem
// servidor. Só se pede permissão de leitura, e só quando a pessoa toca no botão.
import { isNative, nativePlatform } from './native'
import type { ImportedEvent } from './calendarImport'

export const deviceCalendarAvailable = () => isNative()

type Plugin = typeof import('@ebarooni/capacitor-calendar')
const load = (): Promise<Plugin> => import('@ebarooni/capacitor-calendar')

/** Já tem permissão? Nunca mostra o pedido do sistema. */
export async function hasCalendarAccess(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { CapacitorCalendar, CalendarPermissionScope } = await load()
    const { result } = await CapacitorCalendar.checkPermission({ scope: CalendarPermissionScope.READ_CALENDAR })
    return result === 'granted'
  } catch { return false }
}

/** Pede acesso de leitura (no iOS 17+ ler exige o "acesso total"; o Casulo nunca escreve). */
export async function requestCalendarAccess(): Promise<boolean> {
  const { CapacitorCalendar } = await load()
  const { result } = nativePlatform() === 'ios'
    ? await CapacitorCalendar.requestFullCalendarAccess()
    : await CapacitorCalendar.requestReadOnlyCalendarAccess()
  return result === 'granted'
}

/** Lê os eventos dos próximos dias. Eventos repetidos ficam só com a próxima ocorrência. */
export async function readDeviceEvents(days = 365, now = Date.now()): Promise<ImportedEvent[]> {
  const { CapacitorCalendar } = await load()
  const { result } = await CapacitorCalendar.listEventsInRange({ from: now - 86_400_000, to: now + days * 86_400_000 })
  return fromDeviceEvents(result, now)
}

type DeviceEvent = { id: string; title: string; startDate: number; isAllDay: boolean; location: string | null; description: string | null; status?: string | null; calendarItemExternalIdentifier?: string | null }

export function fromDeviceEvents(list: DeviceEvent[], now = Date.now()): ImportedEvent[] {
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const seen = new Map<string, ImportedEvent>()
  for (const e of [...list].sort((a, b) => a.startDate - b.startDate)) {
    if (e.startDate < today.getTime() || String(e.status ?? '').toLowerCase() === 'canceled') continue
    const uid = `device:${e.calendarItemExternalIdentifier || e.id}`
    if (seen.has(uid)) continue
    seen.set(uid, {
      uid,
      title: e.title?.trim() || '(sem título)',
      start: new Date(e.startDate),
      allDay: e.isAllDay,
      location: e.location?.trim() || undefined,
      description: e.description?.trim().slice(0, 500) || undefined,
      everyDays: 0,
    })
  }
  return [...seen.values()]
}
