import { useEffect, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { LockedOutError } from '../lib/storage'
import { Icon } from './Icon'
import { locale, tr } from '../i18n'

// Ecrã de bloqueio neutro: não revela o propósito da app.
export function Lock() {
  const { unlock } = useVault()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (p: string) => {
    setBusy(true)
    try { await unlock(p) } catch (e) {
      setShake(true); setPin('')
      setError(e instanceof LockedOutError
        ? tr('Demasiadas tentativas. Tenta de novo às {0}.', new Date(e.until).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))
        : tr('Código incorreto'))
      window.setTimeout(() => setShake(false), 400)
    } finally { setBusy(false) }
  }

  const press = (d: string) => {
    if (busy) return
    setError('')
    const next = (pin + d).slice(0, 8)
    setPin(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
      else if (e.key === 'Enter' && pin.length >= 4) void submit(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="lock">
      <div className="box">
        <div className="icon-btn" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="lock" size={28} /></div>
        <h2>{tr('Notas')}</h2>
        <p className="muted small">{tr('Introduz o código')}</p>
        <div className={'dots' + (shake ? ' shake' : '')} aria-label={tr('{0} dígitos', pin.length)}>
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <p className="small" style={{ color: 'var(--danger)', minHeight: 21 }} role="alert">{error}</p>
        <div className="pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} onClick={() => press(d)}>{d}</button>)}
          <button className="blank" onClick={() => setPin(p => p.slice(0, -1))} aria-label={tr('Apagar')}><Icon name="back" /></button>
          <button onClick={() => press('0')}>0</button>
          <button className="blank" onClick={() => pin.length >= 4 && submit(pin)} aria-label={tr('Entrar')} disabled={pin.length < 4}>
            <Icon name="check" />
          </button>
        </div>
      </div>
    </div>
  )
}
