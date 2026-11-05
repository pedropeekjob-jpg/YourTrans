import { useEffect, useRef, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from './Icon'
import { useToast } from './ui'
import { uid } from '../lib/types'
import { tr } from '../i18n'

// Alerta de urgência: envia uma SMS com a localização às pessoas de confiança.
// Manter carregado evita envios por engano.
export function SosPanel({ compact = false }: { compact?: boolean }) {
  const { vault, update } = useVault()
  const toast = useToast()
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const send = () => {
    setHolding(false)
    const numbers = vault.contacts.map(c => c.phone.replace(/\s/g, '')).join(',')
    if (!numbers) { toast(tr('Adiciona primeiro um contacto de confiança')); return }
    const go = (loc?: string) => {
      const body = tr('Preciso de ajuda, é urgente.{0}', loc ? tr(' Estou aqui: {0}', loc) : '')
      location.href = tr('sms:{0}?body={1}', numbers, encodeURIComponent(body))
    }
    if (!navigator.geolocation) return go()
    navigator.geolocation.getCurrentPosition(
      p => go(`https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`),
      () => go(),
      { enableHighAccuracy: true, timeout: 6000 },
    )
  }
  const start = () => { setHolding(true); timer.current = window.setTimeout(send, 1500) }
  const cancel = () => { setHolding(false); window.clearTimeout(timer.current) }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const size = compact ? 132 : 156

  return (
    <div className="stack-lg">
      <section className="card tint-danger" style={{ justifyItems: 'center', textAlign: 'center', padding: 24 }}>
        <button
          onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onContextMenu={e => e.preventDefault()}
          aria-label={tr('Manter carregado para enviar alerta SOS')}
          style={{
            width: size, height: size, borderRadius: '50%', border: 0, background: 'var(--danger)', color: '#fff', fontWeight: 800, fontSize: '1.3rem',
            boxShadow: holding ? '0 0 0 18px rgba(217,67,75,.25)' : '0 10px 30px rgba(217,67,75,.35)', transition: 'box-shadow 1.5s, transform .2s',
            transform: holding ? 'scale(.96)' : 'none', cursor: 'pointer', userSelect: 'none', touchAction: 'none',
          }}>
          <Icon name="alert" size={36} /><br />{holding ? tr('A enviar…') : tr('SOS')}
        </button>
        <p className="small">
          {tr('Mantém carregado 1,5 s para enviar uma mensagem com a tua localização')}{vault.contacts.length ? tr(' a {0}.', vault.contacts.map(c => c.name).join(', ')) : tr(' às tuas pessoas de confiança.')}
        </p>
        <a className="btn danger" href="tel:112"><Icon name="phone" size={18} />{tr('Ligar 112')}</a>
      </section>

      <section className="stack">
        <h3>{tr('Pessoas de confiança')}</h3>
        {vault.contacts.length > 0 && (
          <div className="list">
            {vault.contacts.map(c => (
              <div key={c.id} className="item">
                <div className="lead" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{c.name.slice(0, 1).toUpperCase()}</div>
                <div className="grow"><h3>{c.name}</h3><p className="small muted">{c.phone}</p></div>
                <a className="btn sm secondary" href={`tel:${c.phone}`} aria-label={tr('Ligar a {0}', c.name)}><Icon name="phone" size={16} /></a>
                <button className="btn sm ghost" onClick={() => update(v => ({ ...v, contacts: v.contacts.filter(x => x.id !== c.id) }))} aria-label={tr('Remover')}><Icon name="trash" size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="card flat">
          <div className="grid2">
            <input className="input" placeholder={tr('Nome')} value={name} onChange={e => setName(e.target.value)} aria-label={tr('Nome do contacto')} />
            <input className="input" placeholder={tr('Telemóvel')} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} aria-label={tr('Telemóvel do contacto')} />
          </div>
          <button className="btn secondary" disabled={!name.trim() || phone.replace(/\D/g, '').length < 9}
            onClick={() => { update(v => ({ ...v, contacts: [...v.contacts, { id: uid(), name: name.trim(), phone: phone.trim() }] })); setName(''); setPhone('') }}>
            <Icon name="plus" size={18} />{tr('Adicionar pessoa de confiança')}</button>
        </div>
      </section>
    </div>
  )
}
