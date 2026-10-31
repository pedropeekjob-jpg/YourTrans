import { useState } from 'react'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, useToast } from '../components/ui'
import { uid } from '../lib/types'

const pronounSets = [
  { id: 'ela', label: 'ela', art: 'A', subj: 'Ela', adj: 'incrível', obj: 'dela', ready: 'pronta' },
  { id: 'ele', label: 'ele', art: 'O', subj: 'Ele', adj: 'incrível', obj: 'dele', ready: 'pronto' },
  { id: 'elu', label: 'elu', art: '', subj: 'Elu', adj: 'incrível', obj: 'delu', ready: 'prontu' },
]

function speak(text: string) {
  if (!('speechSynthesis' in window)) return false
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'pt-PT'
  const voice = speechSynthesis.getVoices().find(v => v.lang === 'pt-PT') ?? speechSynthesis.getVoices().find(v => v.lang.startsWith('pt'))
  if (voice) u.voice = voice
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
  return true
}

// Ensaio de nome: ver e ouvir um nome em situações do dia a dia,
// antes de o usar ou oficializar. Fica só neste dispositivo.
export function NameRehearsal() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [pron, setPron] = useState('ela')
  const [current, setCurrent] = useState<string | null>(vault.names[0]?.id ?? null)
  const entry = vault.names.find(n => n.id === current)
  const p = pronounSets.find(s => s.id === (entry?.pronouns ?? pron)) ?? pronounSets[0]
  const name = entry?.name ?? draft.trim()

  const add = () => {
    const n = draft.trim()
    if (!n) return
    const id = uid()
    update(v => ({ ...v, names: [{ id, name: n, pronouns: pron }, ...v.names] }))
    setCurrent(id); setDraft('')
  }

  const lines = name ? [
    { who: 'Mãe', text: `${name}, estás ${p.ready}? O jantar está na mesa!` },
    { who: 'Colega', text: `${p.subj} já chegou? ${p.art ? p.art + ' ' : ''}${name} tem sempre ótimas ideias.` },
    { who: 'Amigue', text: `Hoje a festa é toda ${p.obj}. Parabéns, ${name}! 🎉` },
  ] : []

  return (
    <>
      <TopBar title="Ensaiar nome" back />
      <div className="page">
        <section className="card tint-accent">
          <h3>Experimenta antes de decidir</h3>
          <p className="small">Escreve um nome, escolhe os pronomes e vê como soa no dia a dia. Podes guardar vários e comparar.</p>
        </section>

        <div className="stack">
          <div className="row">
            <input className="input grow" placeholder="Escreve um nome" value={draft} onChange={e => { setDraft(e.target.value); setCurrent(null) }}
              onKeyDown={e => e.key === 'Enter' && add()} autoComplete="off" aria-label="Nome para ensaiar" />
            <button className="btn" onClick={add} disabled={!draft.trim()} aria-label="Guardar nome"><Icon name="plus" /></button>
          </div>
          <div className="row wrap">
            {pronounSets.map(s => (
              <button key={s.id} className={'chip' + ((entry?.pronouns ?? pron) === s.id ? ' on' : '')}
                onClick={() => entry ? update(v => ({ ...v, names: v.names.map(n => n.id === entry.id ? { ...n, pronouns: s.id } : n) })) : setPron(s.id)}>
                {s.label}/{s.obj}
              </button>
            ))}
          </div>
        </div>

        {vault.names.length > 0 && (
          <div className="chips">
            {vault.names.map(n => (
              <button key={n.id} className={'chip' + (n.id === current ? ' on' : '')} onClick={() => setCurrent(n.id)}>
                {n.liked ? '♥ ' : ''}{n.name}
              </button>
            ))}
          </div>
        )}

        {!name ? (
          <Empty icon="sparkle" title="Que nome queres experimentar?" text="Nada do que escreves aqui sai deste telemóvel." />
        ) : (
          <>
            <div className="name-preview pop" key={name + p.id}>
              <div className="row between">
                <h1 style={{ fontSize: '2.2rem' }}>{name}</h1>
                <button className="icon-btn" aria-label="Ouvir o nome" onClick={() => { if (!speak(`Olá, ${name}.`)) toast('A voz não está disponível neste dispositivo') }}>🔊</button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="stack" style={{ gap: 2 }}>
                  <span className="xs muted">{l.who}</span>
                  <div className="bubble">{l.text}</div>
                </div>
              ))}
              <div className="bubble me">Obrigad{p.id === 'ela' ? 'a' : p.id === 'ele' ? 'o' : 'e'}! 💜</div>
            </div>

            <div className="grid2">
              <div className="card tint-amber" style={{ gap: 4 }}>
                <span className="xs muted">Copo de café</span>
                <span style={{ fontFamily: 'cursive', fontSize: '1.5rem' }}>{name} ☕</span>
              </div>
              <div className="idcard">
                <span className="xs" style={{ opacity: .7 }}>Crachá</span>
                <b style={{ fontSize: '1.05rem' }}>{name}</b>
                <span className="xs">{p.subj.toLowerCase()}/{p.obj}</span>
              </div>
            </div>

            <div className="card flat" style={{ gap: 2 }}>
              <span className="xs muted">Assinatura de e-mail</span>
              <span>Com os melhores cumprimentos,</span>
              <b>{name}</b>
              <span className="small muted">({p.subj.toLowerCase()}/{p.obj})</span>
            </div>

            {entry && (
              <div className="grid2">
                <button className="btn secondary" onClick={() => update(v => ({ ...v, names: v.names.map(n => n.id === entry.id ? { ...n, liked: !n.liked } : n) }))}>
                  {entry.liked ? '♥ Favorito' : '♡ Gosto'}
                </button>
                <button className="btn" onClick={() => {
                  update(v => ({ ...v, settings: { ...v.settings, displayName: entry.name, pronouns: `${p.subj.toLowerCase()}/${p.obj}` }, letterFields: { ...v.letterFields, newName: entry.name } }))
                  toast(`A partir de agora tratamos-te por ${entry.name}`)
                }}>Usar este nome</button>
                <button className="btn ghost" style={{ gridColumn: 'span 2' }} onClick={() => {
                  update(v => ({ ...v, names: v.names.filter(n => n.id !== entry.id) })); setCurrent(null)
                }}>Remover</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
