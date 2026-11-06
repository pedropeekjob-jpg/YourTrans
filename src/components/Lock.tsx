import { useEffect, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { LockedOutError } from '../lib/storage'
import { Icon } from './Icon'
import { locale, tr } from '../i18n'

// Ecrã de bloqueio neutro: não revela o propósito da app.
export function Lock() {
  const { unlock, unlockRecovery, hasRecovery, wipe } = useVault()
  const [view, setView] = useState<'pin' | 'forgot' | 'wipe'>('pin')
  const [code, setCode] = useState('')
  const [confirmWipe, setConfirmWipe] = useState('')
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

  const tryRecovery = async () => {
    setBusy(true); setError('')
    try { await unlockRecovery(code) } catch (e) {
      setError(e instanceof LockedOutError
        ? tr('Demasiadas tentativas. Tenta de novo às {0}.', new Date(e.until).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))
        : tr('Código de recuperação incorreto'))
    } finally { setBusy(false) }
  }

  const wipeWord = tr('APAGAR')

  useEffect(() => {
    if (view !== 'pin') return
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
      else if (e.key === 'Enter' && pin.length >= 4) void submit(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (view === 'forgot') return (
    <div className="lock">
      <div className="box">
        <div className="icon-btn" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="lock" size={28} /></div>
        <h2>{tr('Esqueci-me do código')}</h2>
        {hasRecovery ? (<>
          <p className="muted small">{tr('Escreve o código de recuperação que guardaste quando ativaste o código.')}</p>
          <input className="input" style={{ textAlign: 'center', letterSpacing: '.08em', fontFamily: 'ui-monospace, monospace' }} autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} onKeyDown={e => e.key === 'Enter' && code.replace(/[^0-9A-Z]/gi, '').length >= 20 && tryRecovery()} />
          <p className="small" style={{ color: 'var(--danger)', minHeight: 21 }} role="alert">{error}</p>
          <button className="btn block" disabled={busy || code.replace(/[^0-9A-Z]/gi, '').length < 20} onClick={tryRecovery}>{busy ? tr('A verificar…') : tr('Entrar')}</button>
        </>) : (
          <p className="muted small">{tr('Este código foi criado antes de existir o código de recuperação. Sem o código, os dados não podem ser abertos por ninguém, nem por nós.')}</p>
        )}
        <button className="btn ghost block" onClick={() => { setView('wipe'); setError('') }}>{tr('Não tenho o código de recuperação')}</button>
        <button className="btn ghost block" onClick={() => { setView('pin'); setError(''); setCode('') }}>{tr('Voltar')}</button>
      </div>
    </div>
  )

  if (view === 'wipe') return (
    <div className="lock">
      <div className="box">
        <div className="icon-btn" style={{ width: 64, height: 64, borderRadius: 20, color: 'var(--danger)' }}><Icon name="trash" size={28} /></div>
        <h2>{tr('Apagar tudo e recomeçar')}</h2>
        <p className="small">{tr('Os dados estão cifrados com o teu código e não há outra forma de os abrir. Podes apagar tudo deste telemóvel e começar do zero.')}</p>
        <p className="small muted">{tr('Se tiveres uma cópia de segurança, podes importá-la depois em Definições.')}</p>
        <label className="field" style={{ width: '100%' }}>{tr('Para confirmar, escreve {0}', wipeWord)}
          <input className="input" style={{ textAlign: 'center' }} autoComplete="off" value={confirmWipe} onChange={e => setConfirmWipe(e.target.value)} />
        </label>
        <button className="btn danger block" disabled={confirmWipe.trim().toUpperCase() !== wipeWord.toUpperCase()} onClick={() => void wipe()}>{tr('Apagar tudo e recomeçar')}</button>
        <button className="btn ghost block" onClick={() => { setView('pin'); setConfirmWipe('') }}>{tr('Voltar')}</button>
      </div>
    </div>
  )

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
        <button className="btn ghost small" onClick={() => { setView('forgot'); setError(''); setPin('') }}>{tr('Esqueci-me do código')}</button>
      </div>
    </div>
  )
}
