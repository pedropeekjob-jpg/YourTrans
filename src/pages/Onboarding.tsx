import { useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from '../components/Icon'
import { LangPicker } from '../components/LangPicker'
import { ThemeToggle } from '../components/ThemePicker'
import { CasuloIntro } from '../components/CasuloIntro'
import { allyRoles, type AllyRole } from '../data/allies'
import { tr } from '../i18n'

export const pronounOptions = [tr('ela/dela'), tr('ele/dele'), tr('elu/delu'), tr('sem preferência')]
export const interestOptions = [
  { id: 'docs', label: tr('Mudar nome e documentos') },
  { id: 'hormonas', label: tr('Hormonas e saúde') },
  { id: 'explorar', label: tr('Ainda estou a explorar') },
  { id: 'mental', label: tr('Saúde mental') },
  { id: 'comunidade', label: tr('Conhecer pessoas') },
  { id: 'seguranca', label: tr('Sentir-me em segurança') },
  { id: 'emprego', label: tr('Trabalho') },
]

/** Primeiro ecrã: quem está a abrir a app. */
export function Onboarding() {
  const fromLink = location.hash.startsWith('#/receber/')
  const [profile, setProfile] = useState<'trans' | 'ally' | null>(fromLink ? 'ally' : null)
  if (profile === 'trans') return <TransOnboarding onBack={() => setProfile(null)} />
  if (profile === 'ally') return <AllyOnboarding fromLink={fromLink} onBack={() => setProfile(null)} />
  return (
    <div className="onb onb-start">
      <div className="stack-lg pop" style={{ alignContent: 'center' }}>
        <CasuloIntro className="casulo-intro" />
        <h1>{tr('Olá! Quem és?')}</h1>
        <p className="muted">{tr('Há um percurso para pessoas trans e outro para quem as rodeia: família, amigues, colegas, chefias e professores.')}</p>
      </div>
      <div className="stack">
        <button className="choice card" onClick={() => setProfile('trans')}>
          <span className="lead-ico" style={{ background: 'var(--sky-soft)', color: 'var(--accent)' }}><Icon name="sparkle" /></span>
          <span className="grow stack" style={{ gap: 2 }}><b>{tr('Sou uma pessoa trans')}</b><span className="small muted">{tr('Ou estou a questionar a minha identidade')}</span></span>
          <Icon name="chevron" />
        </button>
        <button className="choice card" onClick={() => setProfile('ally')}>
          <span className="lead-ico" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name="heart" /></span>
          <span className="grow stack" style={{ gap: 2 }}><b>{tr('Apoio alguém trans')}</b><span className="small muted">{tr('Família, amigue, colega, chefia ou professor/a')}</span></span>
          <Icon name="chevron" />
        </button>
        <p className="xs muted" style={{ textAlign: 'center' }}>{tr('Sem conta. Tudo fica cifrado neste telemóvel.')}<br /><LangPicker subtle />{' · '}<ThemeToggle /></p>
      </div>
    </div>
  )
}

function AllyOnboarding({ fromLink, onBack }: { fromLink: boolean; onBack: () => void }) {
  const { update, setPin } = useVault()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [role, setRole] = useState<AllyRole | null>(null)
  const [pin, setPinValue] = useState('')

  const finish = async (withPin: boolean) => {
    if (withPin && /^\d{4,8}$/.test(pin)) await setPin(pin)
    update(v => ({ ...v, settings: { ...v.settings, displayName: name.trim(), profile: 'ally', allyRole: role ?? 'amigue', onboarded: true } }))
  }

  return (
    <div className="onb">
      <div className="steps-dots" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={i === step ? 'on' : ''} />)}</div>
      {step === 0 && (
        <div className="stack-lg pop" style={{ alignContent: 'center' }}>
          <div className="art"><Icon name="heart" size={96} /></div>
          <h1>{fromLink ? tr('Alguém confia em ti') : tr('Obrigado por estares aqui')}</h1>
          <p className="muted">{fromLink
            ? tr('Recebeste um cartão com o que ajuda esta pessoa e o que a magoa. Vamos guardá-lo num espaço só teu, cifrado neste telemóvel.')
            : tr('Apoiar uma pessoa trans muda tudo para ela. Aqui aprendes em poucos minutos por dia, treinas o nome e os pronomes, e tens um espaço para o que tu sentes.')}</p>
        </div>
      )}
      {step === 1 && (
        <div className="stack-lg" style={{ alignContent: 'start' }}>
          <h1>{tr('Quem és para essa pessoa?')}</h1>
          <label className="field">{tr('O teu nome')}{' '}<span className="muted xs">(opcional)</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
          </label>
          <div className="grid2">
            {allyRoles.map(r => (
              <button key={r.id} className={'chip role' + (role === r.id ? ' on' : '')} onClick={() => setRole(r.id)}>
                <span aria-hidden="true">{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>
          <p className="xs muted">{tr('Os conteúdos adaptam-se: em casa, entre amigos, no trabalho ou na escola.')}</p>
        </div>
      )}
      {step === 2 && (
        <div className="stack-lg" style={{ alignContent: 'start' }}>
          <h1>{tr('Proteger com um código')}</h1>
          <p className="muted">{tr('O que a pessoa partilhou contigo é privado. Um código garante que só tu o vês.')}</p>
          <label className="field">{tr('Código (4 a 8 algarismos)')}<input className="input" inputMode="numeric" type="password" value={pin} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
        </div>
      )}
      <div className="stack">
        {step < 2 ? (
          <button className="btn block" disabled={step === 1 && !role} onClick={() => setStep(step + 1)}>{tr('Seguinte')}</button>
        ) : (
          <>
            <button className="btn block" onClick={() => finish(true)} disabled={pin.length < 4}>{tr('Ativar código e começar')}</button>
            <button className="btn secondary block" onClick={() => finish(false)}>{tr('Agora não')}</button>
          </>
        )}
        <button className="btn ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>{tr('Voltar')}</button>
      </div>
    </div>
  )
}

function TransOnboarding({ onBack }: { onBack: () => void }) {
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
      if (!/^\d{4,8}$/.test(pin)) { setError(tr('O código deve ter entre 4 e 8 algarismos.')); return }
      if (pin !== pin2) { setError(tr('Os códigos não coincidem.')); return }
      await setPin(pin)
    }
    update(v => ({ ...v, settings: { ...v.settings, displayName: name.trim(), pronouns, interests, disguise, profile: 'trans', onboarded: true } }))
  }

  const slides = [
    {
      art: 'sparkle',
      title: tr('Um espaço só teu'),
      body: tr('Documentos, saúde, diário, segurança e comunidade, tudo num só sítio e pensado para Portugal.'),
    },
    {
      art: 'lock',
      title: tr('Os teus dados são só teus'),
      body: tr('Não precisas de conta. Tudo fica cifrado neste telemóvel e és tu quem decide o que partilhar. Se alguma vez te sentires em perigo, o botão SOS, sempre no canto superior direito, avisa as tuas pessoas de confiança com a tua localização.'),
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
          <h1>{tr('Como queres que te tratemos?')}</h1>
          <label className="field">
            {tr('Nome')}<input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={tr('O nome que queres usar')} autoComplete="off" />
          </label>
          <div className="stack">
            <span className="small" style={{ fontWeight: 600 }}>{tr('Pronomes')}</span>
            <div className="row wrap">
              {pronounOptions.map(p => (
                <button key={p} className={'chip' + (pronouns === p ? ' on' : '')} onClick={() => setPronouns(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div className="stack">
            <span className="small" style={{ fontWeight: 600 }}>{tr('O que te traz aqui?')}{' '}<span className="muted">{tr('(escolhe as que quiseres)')}</span></span>
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
          <h1>{tr('Proteger com um código')}</h1>
          <p className="muted">{tr('Recomendado se outras pessoas usam o teu telemóvel.')}</p>
          <label className="field">{tr('Código (4 a 8 algarismos)')}<input className="input" inputMode="numeric" type="password" value={pin} onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
          <label className="field">{tr('Repetir código')}<input className="input" inputMode="numeric" type="password" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
          {error && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{error}</p>}
          <p className="xs muted">{tr('A seguir recebes um código de recuperação, para o caso de te esqueceres deste. Guarda-o fora do telemóvel.')}</p>
          <label className="card flat row" style={{ gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={disguise} onChange={e => setDisguise(e.target.checked)} style={{ marginTop: 4 }} />
            <span className="stack" style={{ gap: 2 }}>
              <b className="small">{tr('Modo privado')}</b>
              <span className="xs muted">{tr('Para quem precisa de mais privacidade: um ícone discreto (ou Esc 3 vezes) sai logo para o site do tempo e bloqueia a app. Podes mudar isto nas Definições.')}</span>
            </span>
          </label>
        </div>
      )}

      <div className="stack">
        {step < 3 ? (
          <button className="btn block" onClick={() => setStep(step + 1)}>{step === 2 ? tr('Continuar') : tr('Seguinte')}</button>
        ) : (
          <>
            <button className="btn block" onClick={() => finish(true)} disabled={pin.length < 4}>{tr('Ativar código e começar')}</button>
            <button className="btn secondary block" onClick={() => finish(false)}>{tr('Agora não')}</button>
          </>
        )}
        <button className="btn ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>{tr('Voltar')}</button>
      </div>
    </div>
  )
}
