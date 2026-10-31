import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as storage from './storage'
import type { Vault } from './types'

type Status = 'loading' | 'locked' | 'decoy' | 'open'

interface Ctx {
  status: Status
  vault: Vault
  mode: storage.LockMode
  key: CryptoKey | null
  update: (fn: (v: Vault) => Vault) => void
  unlock: (pin: string) => Promise<void>
  /** Sai imediatamente: esquece a chave em memória e mostra o disfarce. */
  panic: () => void
  leaveDecoy: () => Promise<void>
  lock: () => void
  setPin: (pin: string) => Promise<void>
  removePin: () => Promise<void>
  replaceVault: (v: Vault) => Promise<void>
  wipe: () => Promise<void>
}

const VaultCtx = createContext<Ctx | null>(null)

export function useVault(): Ctx {
  const c = useContext(VaultCtx)
  if (!c) throw new Error('VaultProvider em falta')
  return c
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [vault, setVault] = useState<Vault | null>(null)
  const [mode, setMode] = useState<storage.LockMode>('device')
  const keyRef = useRef<CryptoKey | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const pending = useRef<Vault | null>(null)

  const flush = useCallback(async () => {
    window.clearTimeout(saveTimer.current)
    if (pending.current && keyRef.current) {
      const v = pending.current
      pending.current = null
      await storage.saveVault(keyRef.current, v)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const meta = await storage.getMeta()
      if (!meta) {
        const { key, vault } = await storage.initDevice()
        keyRef.current = key
        setVault(vault)
        setStatus('open')
      } else if (meta.mode === 'device') {
        const { key, vault } = await storage.unlockDevice()
        keyRef.current = key
        setVault(vault)
        setStatus(sessionStorage.getItem('d') ? 'decoy' : 'open')
      } else {
        setMode('pin')
        setStatus(sessionStorage.getItem('d') ? 'decoy' : 'locked')
      }
    })()
  }, [])

  const update = useCallback((fn: (v: Vault) => Vault) => {
    setVault(prev => {
      if (!prev) return prev
      const next = fn(prev)
      pending.current = next
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(flush, 300)
      return next
    })
  }, [flush])

  const forget = useCallback(() => {
    keyRef.current = null
    setVault(null)
  }, [])

  const lock = useCallback(() => {
    void flush().then(() => {
      if (mode === 'pin') { forget(); setStatus('locked') }
    })
  }, [flush, forget, mode])

  const panic = useCallback(() => {
    const target = vault?.settings.panicTarget ?? 'calculator'
    void flush()
    try { sessionStorage.setItem('d', '1') } catch { /* ignorado */ }
    history.replaceState(null, '', location.pathname + '#/')
    if (mode === 'pin') forget()
    if (target === 'weather') location.replace('https://www.ipma.pt/pt/index.html')
    else setStatus('decoy')
  }, [flush, forget, mode, vault])

  const unlock = useCallback(async (pin: string) => {
    const { key, vault } = await storage.unlockPin(pin)
    keyRef.current = key
    setVault(vault)
    try { sessionStorage.removeItem('d') } catch { /* ignorado */ }
    setStatus('open')
  }, [])

  const leaveDecoy = useCallback(async () => {
    if (mode !== 'device') return
    try { sessionStorage.removeItem('d') } catch { /* ignorado */ }
    const { key, vault } = await storage.unlockDevice()
    keyRef.current = key
    setVault(vault)
    setStatus('open')
  }, [mode])

  const setPin = useCallback(async (pin: string) => {
    if (!keyRef.current || !vault) return
    await flush()
    keyRef.current = await storage.setPin(keyRef.current, vault, pin)
    setMode('pin')
  }, [flush, vault])

  const removePin = useCallback(async () => {
    if (!keyRef.current || !vault) return
    await flush()
    keyRef.current = await storage.removePin(keyRef.current, vault)
    setMode('device')
  }, [flush, vault])

  const replaceVault = useCallback(async (v: Vault) => {
    if (!keyRef.current) return
    await storage.saveVault(keyRef.current, v)
    setVault(v)
  }, [])

  const wipe = useCallback(async () => {
    window.clearTimeout(saveTimer.current)
    pending.current = null
    await storage.wipeAll()
    location.replace(location.pathname)
  }, [])

  // Bloqueio automático quando a app fica em segundo plano (modo PIN).
  useEffect(() => {
    if (mode !== 'pin' || status !== 'open') return
    let hiddenAt = 0
    const minutes = vault?.settings.autoLockMinutes ?? 5
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        void flush()
        if (minutes === 0) lock()
      } else if (hiddenAt && Date.now() - hiddenAt > minutes * 60_000) lock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [mode, status, vault?.settings.autoLockMinutes, flush, lock])

  // Gravar antes de fechar.
  useEffect(() => {
    const h = () => { void flush() }
    window.addEventListener('pagehide', h)
    return () => window.removeEventListener('pagehide', h)
  }, [flush])

  const value: Ctx = {
    status,
    vault: vault ?? (null as unknown as Vault),
    mode,
    key: keyRef.current,
    update, unlock, panic, leaveDecoy, lock, setPin, removePin, replaceVault, wipe,
  }
  return <VaultCtx.Provider value={value}>{children}</VaultCtx.Provider>
}
