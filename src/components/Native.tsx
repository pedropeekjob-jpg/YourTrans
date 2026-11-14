// Peças que só aparecem na app nativa (App Store e Google Play).
import { useEffect, useRef, useState } from 'react'
import { tr } from '../i18n'
import { useVault } from '../lib/vault-context'
import { getDiscreetIcon, isNative, nativePlatform, setDiscreetIcon, syncNativeReminders } from '../lib/native'
import { useToast } from './ui'

const PRIVACY_KEY = 'privacyScreen'

/** Esconder o conteúdo no seletor de apps (e, no Android, bloquear capturas de ecrã). Ligado por omissão. */
export function privacyScreenOn(): boolean {
  try { return localStorage.getItem(PRIVACY_KEY) !== '0' } catch { return true }
}

async function applyPrivacyScreen(on: boolean) {
  const { PrivacyScreen } = await import('@capacitor/privacy-screen')
  if (on) await PrivacyScreen.enable({ android: { dimBackground: true }, ios: { blurEffect: 'dark' } })
  else await PrivacyScreen.disable()
}

/**
 * Montado uma vez, por cima dos ecrãs. Na web não faz nada.
 * - botão "voltar" do Android navega dentro da app;
 * - barra de estado a condizer com o tema;
 * - bloqueio ao voltar à app, segundo o tempo escolhido nas Definições;
 * - lembretes agendados como notificações locais do sistema.
 */
export function NativeBridge() {
  const { status, vault, lock, mode } = useVault()
  const hiddenAt = useRef(0)

  useEffect(() => {
    if (!isNative()) return
    const subs: { remove: () => Promise<void> }[] = []
    let gone = false
    void (async () => {
      const { App } = await import('@capacitor/app')
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      void applyPrivacyScreen(privacyScreenOn()).catch(() => { /* aparelho sem suporte */ })
      const s = [
        await App.addListener('backButton', ({ canGoBack }) => {
          if (location.hash && location.hash !== '#/' && canGoBack) history.back()
          else void App.minimizeApp()
        }),
        await LocalNotifications.addListener('localNotificationActionPerformed', a => {
          const route = (a.notification.extra as { route?: string } | undefined)?.route
          if (route) location.hash = '#' + route
        }),
      ]
      if (gone) s.forEach(x => void x.remove()); else subs.push(...s)
    })()
    return () => { gone = true; subs.forEach(x => void x.remove()) }
  }, [])

  // Bloquear ao voltar à app (o WebView nem sempre avisa a página quando a app vai para trás).
  const minutes = vault?.settings.autoLockMinutes ?? 5
  useEffect(() => {
    if (!isNative() || mode !== 'pin' || status !== 'open') return
    let sub: { remove: () => Promise<void> } | undefined
    let gone = false
    void import('@capacitor/app').then(async ({ App }) => {
      const s = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) { hiddenAt.current = Date.now(); if (minutes === 0) lock(); return }
        if (hiddenAt.current && Date.now() - hiddenAt.current > minutes * 60_000) lock()
        hiddenAt.current = 0
      })
      if (gone) void s.remove(); else sub = s
    })
    return () => { gone = true; void sub?.remove() }
  }, [mode, status, minutes, lock])

  const theme = vault?.settings.theme ?? 'dark'
  useEffect(() => {
    if (!isNative()) return
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    void import('@capacitor/status-bar').then(({ StatusBar, Style }) => Promise.all([
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }),
      nativePlatform() === 'android' ? StatusBar.setBackgroundColor({ color: dark ? '#07080e' : '#f7f5f1' }) : undefined,
    ])).catch(() => { /* sem barra de estado */ })
  }, [theme])

  const reminders = vault?.reminders
  const discreet = vault?.settings.discreetNotifications ?? false
  useEffect(() => {
    if (!isNative() || status !== 'open' || !reminders) return
    void syncNativeReminders(reminders, {
      discreet,
      title: r => discreet ? tr('Notas') : r.label,
      body: r => discreet ? tr('Tens um lembrete') : (r.notes || tr('Lembrete')),
    }).catch(() => { /* sem permissão ou sem suporte: os lembretes continuam visíveis na app */ })
  }, [status, reminders, discreet])

  return null
}

/** Definições só da app nativa: ícone discreto e ecrã de privacidade. */
export function NativeSettings() {
  const toast = useToast()
  const [icon, setIcon] = useState<{ discreet: boolean; changesName: boolean } | null>(null)
  const [privacy, setPrivacy] = useState(privacyScreenOn)
  useEffect(() => { void getDiscreetIcon().then(setIcon).catch(() => setIcon(null)) }, [])
  if (!isNative()) return null

  const ios = nativePlatform() === 'ios'
  const toggleIcon = async (on: boolean) => {
    try {
      await setDiscreetIcon(on)
      setIcon(i => i && { ...i, discreet: on })
      toast(ios ? tr('Ícone alterado') : tr('Feito. O ícone pode demorar uns segundos a mudar no ecrã principal.'))
    } catch {
      toast(tr('Não foi possível mudar o ícone neste aparelho'))
    }
  }
  const togglePrivacy = async (on: boolean) => {
    try { localStorage.setItem(PRIVACY_KEY, on ? '1' : '0') } catch { /* sem armazenamento */ }
    setPrivacy(on)
    await applyPrivacyScreen(on).catch(() => { /* sem suporte */ })
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      {icon && (
        <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={icon.discreet} onChange={e => void toggleIcon(e.target.checked)} style={{ marginTop: 4 }} />
          <span className="stack" style={{ gap: 2 }}>
            <b className="small">{ios ? tr('Ícone discreto no ecrã principal') : tr('Nome e ícone discretos no ecrã principal')}</b>
            <span className="xs muted">{ios
              ? tr('Troca o ícone por um bloco de notas neutro. No iPhone o nome por baixo do ícone continua a ser "Casulo", e o sistema mostra um aviso quando o ícone muda. Para esconder também o nome, podes pôr a app numa pasta ou só na Biblioteca de Apps.')
              : tr('Mostra a app como "Notas", com um ícone neutro. O atalho no ecrã principal pode desaparecer: volta a pô-lo a partir da lista de apps.')}</span>
          </span>
        </label>
      )}
      <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={privacy} onChange={e => void togglePrivacy(e.target.checked)} style={{ marginTop: 4 }} />
        <span className="stack" style={{ gap: 2 }}>
          <b className="small">{tr('Esconder o conteúdo ao mudar de app')}</b>
          <span className="xs muted">{ios
            ? tr('Na lista de apps abertas aparece um ecrã desfocado em vez dos teus registos.')
            : tr('Na lista de apps abertas aparece um ecrã vazio. Também impede capturas de ecrã dentro da app.')}</span>
        </span>
      </label>
    </div>
  )
}
