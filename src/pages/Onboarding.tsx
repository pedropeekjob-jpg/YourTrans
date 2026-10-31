import { useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from '../components/Icon'

export const pronounOptions = ['ela/dela', 'ele/dele', 'elu/delu', 'sem preferência']
export const interestOptions = [
  { id: 'docs', label: 'Mudar nome e documentos' },
  { id: 'hormonas', label: 'Hormonas e saúde' },
  { id: 'explorar', label: 'Ainda estou a explorar' },
  { id: 'mental', label: 'Saúde mental' },
  { id: 'comunidade', label: 'Conhecer pessoas' },
  { id: 'seguranca', label: 'Sentir-me em segurança' },
  { id: 'emprego', label: 'Trabalho' },
]

export function Onboarding() {
  const { update, setPin } = useVault()
  const [disguise, setDisguise] = useState(false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [pin, setPinValue] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')

  const finish = async (withPin: boolean) => {
    if (withPin) {
      if (!/^\d{4,8}$/.test(pin)) { setError('O código deve ter entre 4 e 8 algarismos.'); return }
      if (pin !== pin2) { setError('Os códigos não coincidem.'); return }
      await setPin(pin)
    }
    update(v => ({ ...v, settings: { ...v.settings, displayName: name.trim(), pronouns, interests, disguise, onboarded: true } }))
  }

  const slides = [
    {
      art: 'sparkle',
      title: 'Um espaço só teu',
      body: 'Documentos, saúde, diário, segurança e comunidade, tudo num só sítio e pensado para Portugal.',
    },
    {
      art: 'lock',
      title: 'Os teus dados são só teus',
      body: 'Não precisas de conta. Tudo fica cifrado neste telemóvel e és tu quem decide o que partilhar. Se alguma vez te sentires em perigo, o botão SOS, sempre no canto superior direito, avisa as tuas pessoas de confiança com a tua localização.',
    },
  ]

  return (
    <div className="onb">
      <div className="row between">
        <div className="steps-dots" aria-hidden="true">
          {[0, 1, 2, 3].map(i => <span key={i} className={i === step ? 'on' : ''} />)}
        </div>
      </div>

      {step < 2 && (
        <div className="stack-lg pop" key={step} style={{ alignContent: 'center' }}>
          <div className="art"><Icon name={slides[step].art} size={96} /></div>
          <h1>{slides[step].title}</h1>
          <p className="muted">{slides[step].body}</p>
        </div>
      )}

      {step === 2 && (
        <div className="stack-lg" style={{ alignContent: 'start' }}>
          <h1>Como queres que te tratemos?</h1>
          <label className="field">
            Nome
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="O nome que queres usar" autoComplete="off" />
          </label>
          <div className="stack">
            <span className="small" style={{ fontWeight: 600 }}>Pronomes</span>
            <div className="row wrap">
              {pronounOptions.map(p => (
                <button key={p} className={'chip' + (pronouns === p ? ' on' : '')} onClick={() => setPronouns(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div className="stack">
            <span className="small" style={{ fontWeight: 600 }}>O que te traz aqui? <span className="muted">(escolhe as que quiseres)</span></span>
            <div className="row wrap">
              {interestOptions.map(i => {
                const on = interests.includes(i.id)
                return (
                  <button key={i.id} className={'chip' + (on ? ' on' : '')}
                    onClick={() => setInterests(on ? interests.filter(x => x !== i.id) : [...interests, i.id])}>{i.label}</button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="stack-lg" style={{ alignContent: 'start' }}>
          <h1>Proteger com um código</h1>
          <p className="muted">Recomendado se outras pessoas usam o teu telemóvel.</p>
          <label className="field">Código (4 a 8 algarismos)
            <input className="input" inputMode="numeric" type="password" value={pin} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
          <label className="field">Repetir código
            <input className="input" inputMode="numeric" type="password" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
          {error && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{error}</p>}
          <p className="xs muted">Se esqueceres o código não há forma de recuperar os dados. É essa a garantia de que ninguém mais lhes chega.</p>
          <label className="card flat row" style={{ gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={disguise} onChange={e => setDisguise(e.target.checked)} style={{ marginTop: 4 }} />
            <span className="stack" style={{ gap: 2 }}>
              <b className="small">Modo privado</b>
              <span className="xs muted">Para quem ainda não pode estar à vontade em casa: um ícone discreto transforma a app numa calculadora. Podes mudar isto nas Definições.</span>
            </span>
          </label>
        </div>
      )}

      <div className="stack">
        {step < 3 ? (
          <button className="btn block" onClick={() => setStep(step + 1)}>{step === 2 ? 'Continuar' : 'Seguinte'}</button>
        ) : (
          <>
            <button className="btn block" onClick={() => finish(true)} disabled={pin.length < 4}>Ativar código e começar</button>
            <button className="btn secondary block" onClick={() => finish(false)}>Agora não</button>
          </>
        )}
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Voltar</button>}
      </div>
    </div>
  )
}
