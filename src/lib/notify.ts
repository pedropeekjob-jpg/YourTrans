// Avisos dos lembretes com a app fechada (Web Push), com o mínimo de dados.
// O servidor recebe só o endereço de notificações do aparelho e as horas dos avisos,
// nunca o texto nem o tipo de lembrete. A notificação chega vazia e é o próprio telemóvel
// que escreve "Tens um lembrete" (public/push-sw.js).
// Na app nativa (lojas), esta parte é trocada por notificações locais, sem servidor.
import { useEffect } from 'react'
import { api, apiEnabled } from './api'
import { tr } from '../i18n'
import type { Reminder } from './types'

/** Janela de avisos enviada ao servidor; a app volta a enviá-la sempre que é aberta. */
const DAYS_AHEAD = 35
const MAX = 120

export function notificationsSupported(): boolean {
  return apiEnabled && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Próximas horas de todos os lembretes (só números: nada diz o que é cada um). */
export function upcomingTimes(reminders: Reminder[], now = Date.now()): number[] {
  const until = now + DAYS_AHEAD * 86_400_000
  const out: number[] = []
  for (const r of reminders) {
    let t = new Date(r.next).getTime()
    if (!Number.isFinite(t)) continue
    if (r.everyDays > 0) while (t <= now) t += r.everyDays * 86_400_000
    for (; t <= until && out.length < MAX * 2; t += (r.everyDays || Infinity) * 86_400_000) {
      if (t > now) out.push(t)
      if (!r.everyDays) break
    }
  }
  return out.sort((a, b) => a - b).slice(0, MAX)
}

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

/** Texto que o service worker mostra (na língua da app e respeitando o nome discreto). */
async function savePrefs(discreet: boolean) {
  try {
    const c = await caches.open('casulo-prefs')
    await c.put('./__prefs', new Response(JSON.stringify({
      title: discreet ? tr('Notas') : 'Casulo',
      body: discreet ? tr('Tens uma nota') : tr('Tens um lembrete'),
      icon: discreet ? './icon-192.png' : './casulo-192.png',
    }), { headers: { 'content-type': 'application/json' } }))
  } catch { /* sem cache: o service worker usa um texto neutro */ }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** Liga os avisos: pede autorização, cria a subscrição e envia as horas. */
export async function enablePush(reminders: Reminder[], discreet: boolean): Promise<boolean> {
  if (!notificationsSupported()) return false
  if ((await Notification.requestPermission()) !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const { key } = await api.pushKey()
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(key) })
  await savePrefs(discreet)
  await api.pushSync(sub.toJSON(), upcomingTimes(reminders))
  return true
}

/** Desliga: o servidor esquece o aparelho e as horas. */
export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const sub = await currentSubscription().catch(() => null)
  if (!sub) return
  await api.pushForget(sub.endpoint).catch(() => {})
  await sub.unsubscribe().catch(() => {})
}

/** Mantém as horas no servidor iguais aos lembretes (ao abrir a app e a cada mudança). */
export function useReminderPushSync(reminders: Reminder[] | undefined, enabled: boolean | undefined, discreet: boolean | undefined) {
  useEffect(() => {
    if (!enabled || !reminders || !notificationsSupported() || Notification.permission !== 'granted') return
    const t = window.setTimeout(async () => {
      try {
        const sub = await currentSubscription()
        if (!sub) return
        await savePrefs(!!discreet)
        await api.pushSync(sub.toJSON(), upcomingTimes(reminders))
      } catch { /* sem rede: tenta outra vez na próxima abertura */ }
    }, 1500)
    return () => window.clearTimeout(t)
  }, [reminders, enabled, discreet])
}
