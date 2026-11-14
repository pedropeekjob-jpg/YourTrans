import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as storage from './storage'
import { newAuthorId, type Vault } from './types'
import { setAuthor } from './api'

type Status = 'loading' | 'locked' | 'open'

interface Ctx {
  status: Status
  vault: Vault
  mode: storage.LockMode
  key: CryptoKey | null
  update: (fn: (v: Vault) => Vault) => void
  unlock: (pin: string) => Promise<void>
  /** Entra com o código de recuperação; depois é preciso escolher um código novo. */
  unlockRecovery: (code: string) => Promise<void>
  /** Sai imediatamente para outro site; se houver código, bloqueia a app. */
  panic: () => void
  lock: () => void
  setPin: (pin: string) => Promise<void>
  /** Código de recuperação acabado de gerar, para mostrar uma única vez. */
  recoveryCode: string | null
  clearRecoveryCode: () => void
  hasRecovery: boolean
  /** Entrou com o código de recuperação e ainda não escolheu um código novo. */
  needsNewPin: boolean
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
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [hasRecovery, setHasRecovery] = useState(false)
  const [needsNewPin, setNeedsNewPin] = useState(false)
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
      setHasRecovery(!!meta?.wrapRec)
      if (!meta) {
        const { key, vault } = await storage.initDevice()
        keyRef.current = key
        setVault(vault)
        setStatus('open')
      } else if (meta.mode === 'device') {
        const { key, vault } = await storage.unlockDevice()
        keyRef.current = key
        setVault(vault)
        setStatus('open')
      } else {
        setMode('pin')
        setStatus('locked')
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
    void flush()
    history.replaceState(null, '', location.pathname + '#/')
    if (mode === 'pin') { forget(); setStatus('locked') }
    // Site do tempo: o IPMA em Portugal; noutros países um site internacional, para não destoar.
    const country = vault?.settings.country ?? 'PT'
    location.replace(country === 'PT' ? 'https://www.ipma.pt/pt/index.html' : 'https://www.accuweather.com')
  }, [flush, forget, mode, vault?.settings.country])

  const unlock = useCallback(async (pin: string) => {
    const { key, vault } = await storage.unlockPin(pin)
    keyRef.current = key
    setVault(vault)
    setStatus('open')
  }, [])

  const unlockRecovery = useCallback(async (code: string) => {
    const { key, vault } = await storage.unlockRecovery(code)
    keyRef.current = key
    setVault(vault)
    setNeedsNewPin(true)
    setStatus('open')
  }, [])

  const setPin = useCallback(async (pin: string) => {
    if (!keyRef.current || !vault) return
    await flush()
    const res = await storage.setPin(keyRef.current, vault, pin)
    keyRef.current = res.key
    setMode('pin')
    setHasRecovery(true)
    setNeedsNewPin(false)
    setRecoveryCode(res.recoveryCode)
  }, [flush, vault])

  const clearRecoveryCode = useCallback(() => setRecoveryCode(null), [])

  const removePin = useCallback(async () => {
    if (!keyRef.current || !vault) return
    await flush()
    keyRef.current = await storage.removePin(keyRef.current, vault)
    setMode('device')
    setHasRecovery(false)
    setNeedsNewPin(false)
  }, [flush, vault])

  const replaceVault = useCallback(async (v: Vault) => {
    if (!keyRef.current) return
    // Uma gravação pendente (dos últimos 300 ms) não pode escrever por cima do cofre importado.
    window.clearTimeout(saveTimer.current)
    pending.current = null
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

  // Assinatura para a comunidade: criada na primeira vez e entregue ao cliente da API.
  useEffect(() => {
    if (status !== 'open' || !vault) return
    if (!vault.authorId) update(v => ({ ...v, authorId: newAuthorId() }))
    setAuthor(vault.authorId)
  }, [status, vault?.authorId, update]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pede ao browser para não apagar os dados sozinho (é concedido sobretudo a apps instaladas).
  useEffect(() => {
    if (status !== 'open' || !vault?.settings.onboarded) return
    navigator.storage?.persisted?.().then(p => { if (!p) void navigator.storage.persist?.() }).catch(() => {})
  }, [status, vault?.settings.onboarded])

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
    update, unlock, unlockRecovery, panic, lock, setPin, removePin, replaceVault, wipe,
    recoveryCode, clearRecoveryCode, hasRecovery, needsNewPin,
  }
  return <VaultCtx.Provider value={value}>{children}</VaultCtx.Provider>
}
