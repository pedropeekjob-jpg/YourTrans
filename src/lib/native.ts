// Ponte para as apps nativas (Capacitor, App Store e Google Play).
// Na web nada disto corre: os plugins só são carregados quando a app está dentro do invólucro
// nativo, para não pesar na PWA.
import type { Reminder } from './types'

interface CapacitorGlobal { isNativePlatform?: () => boolean; getPlatform?: () => string }
const cap = (): CapacitorGlobal | undefined =>
  typeof window === 'undefined' ? undefined : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor

/** A app está a correr dentro da app nativa (iOS ou Android)? */
export function isNative(): boolean {
  return cap()?.isNativePlatform?.() === true
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  const p = cap()?.getPlatform?.()
  return p === 'ios' || p === 'android' ? p : 'web'
}

/** Endereço público da app. Na app nativa a origem é "localhost", que não serve para partilhar. */
export const PUBLIC_URL = 'https://casulo.space/'

export function publicAppUrl(): string {
  return isNative() ? PUBLIC_URL : `${location.origin}${location.pathname}`
}

// ---------------------------------------------------------------------------------------------
// Ficheiros e partilha. Dentro de uma app, <a download> e navigator.share não funcionam (ou
// funcionam mal). Em vez de mudar cada ecrã, trocamos estas duas peças por versões nativas:
// o ficheiro é escrito na pasta temporária da app e aberto na folha de partilha do sistema,
// onde a pessoa escolhe "Guardar em Ficheiros", o calendário, o e-mail, etc.

const blobs = new Map<string, Blob>()

function toBase64(buf: ArrayBuffer): string {
  let s = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Escreve um ficheiro temporário e abre a folha de partilha do sistema. */
export async function saveFile(name: string, blob: Blob): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const safe = name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 80) || 'casulo'
  const { uri } = await Filesystem.writeFile({ path: safe, data: toBase64(await blob.arrayBuffer()), directory: Directory.Cache })
  try {
    await Share.share({ title: safe, files: [uri] })
  } catch { /* a pessoa fechou a folha de partilha */ }
}

let shimsInstalled = false

/** Chamado uma vez no arranque, só na app nativa. */
export function installNativeShims() {
  if (shimsInstalled || !isNative()) return
  shimsInstalled = true

  const create = URL.createObjectURL.bind(URL)
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = create(obj)
    if (obj instanceof Blob) blobs.set(url, obj)
    return url
  }
  const revoke = URL.revokeObjectURL.bind(URL)
  // Guardamos o Blob mais um pouco: os ecrãs revogam o URL logo a seguir ao clique.
  URL.revokeObjectURL = (url: string) => { window.setTimeout(() => { blobs.delete(url); revoke(url) }, 60_000) }

  const click = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const blob = this.hasAttribute('download') ? blobs.get(this.href) : undefined
    if (blob) { void saveFile(this.getAttribute('download') || 'casulo', blob); return }
    click.call(this)
  }

  const nativeShare = async (data?: ShareData) => {
    const { Share } = await import('@capacitor/share')
    try {
      await Share.share({ title: data?.title, text: data?.text, url: data?.url })
    } catch (e) {
      // Igual à web: cancelar a partilha rejeita com AbortError.
      throw new DOMException(String((e as Error)?.message ?? e), 'AbortError')
    }
  }
  Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare })
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
}

// ---------------------------------------------------------------------------------------------
// Lembretes: na app nativa passam a ser notificações locais do sistema, agendadas no próprio
// aparelho. Não há servidor nem push: nada sobre os lembretes sai do telemóvel.

const DAY = 86_400_000
/** O iOS guarda no máximo 64 notificações agendadas. Reagendamos sempre que a app abre. */
const MAX_SCHEDULED = 60
const HORIZON_DAYS = 60

export interface PlannedNotification { id: number; at: number; reminder: Reminder }

/** Próximas ocorrências dos lembretes, por ordem, no máximo MAX_SCHEDULED. */
export function planReminders(reminders: Reminder[], now = Date.now()): PlannedNotification[] {
  const horizon = now + HORIZON_DAYS * DAY
  const out: { at: number; reminder: Reminder }[] = []
  for (const r of reminders) {
    let t = new Date(r.next).getTime()
    if (!Number.isFinite(t)) continue
    if (!r.everyDays) { if (t > now && t <= horizon) out.push({ at: t, reminder: r }); continue }
    const step = r.everyDays * DAY
    if (t <= now) t += Math.ceil((now - t + 1) / step) * step
    for (let n = 0; t <= horizon && n < MAX_SCHEDULED; t += step, n++) out.push({ at: t, reminder: r })
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED).map((x, i) => ({ id: i + 1, ...x }))
}

let lastPlan = ''

/** Substitui todas as notificações agendadas pelas dos lembretes atuais. */
export async function syncNativeReminders(reminders: Reminder[], text: { discreet: boolean; title: (r: Reminder) => string; body: (r: Reminder) => string }) {
  if (!isNative()) return
  const plan = planReminders(reminders)
  const key = JSON.stringify([text.discreet, plan.map(p => [p.at, p.reminder.label, p.reminder.notes])])
  if (key === lastPlan) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
  lastPlan = key
  if (!plan.length) return
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') { lastPlan = ''; return }
  await LocalNotifications.schedule({
    notifications: plan.map(p => ({
      id: p.id,
      title: text.title(p.reminder),
      body: text.body(p.reminder),
      schedule: { at: new Date(p.at), allowWhileIdle: true },
      smallIcon: 'ic_stat_lembrete',
      extra: { route: '/diario' },
    })),
  })
}

// ---------------------------------------------------------------------------------------------
// Ícone discreto (plugin próprio: android/…/DiscreetIconPlugin.java e ios/App/App/AppDelegate.swift).

interface DiscreetIconPlugin {
  get(): Promise<{ discreet: boolean; changesName: boolean }>
  set(o: { discreet: boolean }): Promise<void>
}

let discreet: Promise<DiscreetIconPlugin> | undefined
function discreetPlugin(): Promise<DiscreetIconPlugin> {
  discreet ??= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin<DiscreetIconPlugin>('DiscreetIcon'))
  return discreet
}

export async function getDiscreetIcon(): Promise<{ discreet: boolean; changesName: boolean }> {
  return (await discreetPlugin()).get()
}

export async function setDiscreetIcon(discreet: boolean): Promise<void> {
  await (await discreetPlugin()).set({ discreet })
}
