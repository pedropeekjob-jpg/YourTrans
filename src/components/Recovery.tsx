import { useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from './Icon'
import { tr } from '../i18n'

// Janelas que não se podem fechar sem uma ação: mostrar o código de recuperação (uma única vez)
// e escolher um código novo depois de entrar com o código de recuperação.

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function RecoveryCodeSheet() {
  const { recoveryCode, clearRecoveryCode } = useVault()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!recoveryCode) return null

  const copy = async () => {
    try { await navigator.clipboard.writeText(recoveryCode); setCopied(true) } catch { /* sem acesso à área de transferência */ }
  }
  const download = () => {
    const blob = new Blob([tr('Código de recuperação das Notas: {0}', recoveryCode) + '\n'], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'notas-recuperacao.txt'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <Modal title={tr('Código de recuperação')}>
      <p className="small">{tr('Se te esqueceres do teu código, este permite-te entrar sem perder nada. Só o vês agora.')}</p>
      <div className="recovery-code" aria-label={tr('Código de recuperação')}>{recoveryCode}</div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn secondary grow" onClick={copy}><Icon name="copy" size={18} /> {copied ? tr('Copiado') : tr('Copiar')}</button>
        <button className="btn secondary grow" onClick={download}>{tr('Guardar ficheiro')}</button>
      </div>
      <p className="xs muted">{tr('Guarda-o fora deste telemóvel: num gestor de palavras-passe, numa foto noutro dispositivo ou em papel. Quem tiver este código consegue abrir a app.')}</p>
      <label className="row small" style={{ gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> {tr('Guardei o código num sítio seguro')}
      </label>
      <button className="btn block" disabled={!saved} onClick={clearRecoveryCode}>{tr('Continuar')}</button>
    </Modal>
  )
}

export function NewPinSheet() {
  const { needsNewPin, recoveryCode, setPin } = useVault()
  const [pin, setPinV] = useState('')
  const [pin2, setPin2] = useState('')
  const [busy, setBusy] = useState(false)
  if (!needsNewPin || recoveryCode) return null
  const mismatch = pin2.length >= 6 && pin !== pin2
  return (
    <Modal title={tr('Escolhe um código novo')}>
      <p className="small">{tr('Entraste com o código de recuperação. Escolhe um código novo para abrir a app; a seguir recebes também um código de recuperação novo e o antigo deixa de funcionar.')}</p>
      <label className="field">{tr('Código (6 a 8 algarismos)')}<input className="input" inputMode="numeric" type="password" autoFocus value={pin} onChange={e => setPinV(e.target.value.replace(/\D/g, '').slice(0, 8))} /></label>
      <label className="field">{tr('Repetir código')}<input className="input" inputMode="numeric" type="password" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 8))} /></label>
      {mismatch && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{tr('Os códigos não coincidem.')}</p>}
      <button className="btn block" disabled={busy || pin.length < 6 || pin !== pin2} onClick={async () => { setBusy(true); try { await setPin(pin) } finally { setBusy(false) } }}>{tr('Guardar código novo')}</button>
    </Modal>
  )
}
