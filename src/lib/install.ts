// Instalar a app no ecrã principal (PWA).
// O Chrome e o Edge disparam "beforeinstallprompt" logo no arranque: guardamos o evento
// para mostrar o nosso próprio botão "Instalar". No iPhone não há esse evento, por isso
// explicamos os passos no Safari. Dentro do Instagram, TikTok e afins não é possível
// instalar: é preciso abrir o endereço no browser do telemóvel.
import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'installed' | 'prompt' | 'ios' | 'in-app' | 'android' | 'desktop'

let deferred: InstallPromptEvent | null = null
let justInstalled = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(f => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault() // mostramos o convite quando faz sentido, não no primeiro segundo
    deferred = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    notify()
  })
}

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return justInstalled || window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function isIOS(ua = navigator.userAgent, platform = navigator.platform, touch = navigator.maxTouchPoints): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && touch > 1)
}

/** Browsers dentro de outras apps (redes sociais), onde não se consegue instalar. */
export function isInAppBrowser(ua = navigator.userAgent): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|TikTok|Twitter|LinkedInApp|Snapchat|Line\/|Pinterest|WhatsApp/i.test(ua)
}

export function detectPlatform(): Platform {
  if (isInstalled()) return 'installed'
  if (isInAppBrowser()) return 'in-app'
  if (deferred) return 'prompt'
  if (isIOS()) return 'ios'
  if (/Android/i.test(navigator.userAgent)) return 'android'
  return 'desktop'
}

/** Abre a janela de instalação do browser. Devolve true se a pessoa aceitou. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  notify()
  return outcome === 'accepted'
}

/** Plataforma atual, atualizada quando o browser deixa instalar ou a app é instalada. */
export function useInstall(): Platform {
  const [p, setP] = useState<Platform>(() => detectPlatform())
  useEffect(() => {
    const f = () => setP(detectPlatform())
    listeners.add(f)
    f()
    return () => { listeners.delete(f) }
  }, [])
  return p
}

const SNOOZE_KEY = 'installNudge'

/** O convite no Hoje foi fechado há menos de 14 dias? */
export function installNudgeSnoozed(): boolean {
  try { return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) ?? 0) < 14 * 86_400_000 } catch { return false }
}

export function snoozeInstallNudge() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())) } catch { /* sem armazenamento */ }
}
