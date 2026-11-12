import { useState } from 'react'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, useToast } from '../components/ui'
import { pronounLabels, type PronounSet } from '../data/allies'
import { uid } from '../lib/types'
import { lang, locale, tr, type Lang } from '../i18n'

type PSet = { id: string; art: string; subj: string; obj: string; ready: string; thanks: string }
const pt: PSet[] = [
  { id: 'ela', art: 'A', subj: 'Ela', obj: 'dela', ready: 'pronta', thanks: 'Obrigada' },
  { id: 'ele', art: 'O', subj: 'Ele', obj: 'dele', ready: 'pronto', thanks: 'Obrigado' },
  { id: 'elu', art: '', subj: 'Elu', obj: 'delu', ready: 'prontu', thanks: 'Obrigade' },
]
// Formas de cada idioma para as frases do dia a dia
const setsByLang: Record<Lang, PSet[]> = {
  pt, br: pt,
  en: [
    { id: 'ela', art: '', subj: 'she', obj: 'hers', ready: 'ready', thanks: 'Thank you' },
    { id: 'ele', art: '', subj: 'he', obj: 'his', ready: 'ready', thanks: 'Thank you' },
    { id: 'elu', art: '', subj: 'they', obj: 'theirs', ready: 'ready', thanks: 'Thank you' },
  ],
  es: [
    { id: 'ela', art: '', subj: 'ella', obj: 'suya', ready: 'lista', thanks: 'Gracias' },
    { id: 'ele', art: '', subj: 'él', obj: 'suya', ready: 'listo', thanks: 'Gracias' },
    { id: 'elu', art: '', subj: 'elle', obj: 'suya', ready: 'liste', thanks: 'Gracias' },
  ],
  fr: [
    { id: 'ela', art: '', subj: 'elle', obj: 'elle', ready: 'prête', thanks: 'Merci' },
    { id: 'ele', art: '', subj: 'il', obj: 'lui', ready: 'prêt', thanks: 'Merci' },
    { id: 'elu', art: '', subj: 'iel', obj: 'iel', ready: 'prêt·e', thanks: 'Merci' },
  ],
  de: [
    { id: 'ela', art: '', subj: 'sie', obj: 'ihr', ready: 'bereit', thanks: 'Danke' },
    { id: 'ele', art: '', subj: 'er', obj: 'ihm', ready: 'bereit', thanks: 'Danke' },
    { id: 'elu', art: '', subj: 'dey', obj: 'denen', ready: 'bereit', thanks: 'Danke' },
  ],
}
const pronounSets = setsByLang[lang]

function speak(text: string) {
  if (!('speechSynthesis' in window)) return false
  const u = new SpeechSynthesisUtterance(text)
  u.lang = locale
  const voice = speechSynthesis.getVoices().find(v => v.lang === locale) ?? speechSynthesis.getVoices().find(v => v.lang.startsWith(locale.slice(0, 2)))
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
    { who: tr('Mãe'), text: tr('{0}, estás {1}? O jantar está na mesa!', name, p.ready) },
    { who: tr('Colega'), text: tr('{0} já chegou? {1}{2} tem sempre ótimas ideias.', p.subj, p.art ? p.art + ' ' : '', name) },
    { who: tr('Amigue'), text: tr('Hoje a festa é toda {0}. Parabéns, {1}! 🎉', p.obj, name) },
  ] : []

  return (
    <>
      <TopBar title={tr('Ensaiar nome')} back />
      <div className="page">
        <section className="card tint-accent">
          <h3>{tr('Experimenta antes de decidir')}</h3>
          <p className="small">{tr('Escreve um nome, escolhe os pronomes e vê como soa no dia a dia. Podes guardar vários e comparar.')}</p>
        </section>

        <div className="stack">
          <div className="row">
            <input className="input grow" placeholder={tr('Escreve um nome')} value={draft} onChange={e => { setDraft(e.target.value); setCurrent(null) }}
              onKeyDown={e => e.key === 'Enter' && add()} autoComplete="off" aria-label={tr('Nome para ensaiar')} />
            <button className="btn" onClick={add} disabled={!draft.trim()} aria-label={tr('Guardar nome')}><Icon name="plus" /></button>
          </div>
          <div className="row wrap">
            {pronounSets.map(s => (
              <button key={s.id} className={'chip' + ((entry?.pronouns ?? pron) === s.id ? ' on' : '')}
                onClick={() => entry ? update(v => ({ ...v, names: v.names.map(n => n.id === entry.id ? { ...n, pronouns: s.id } : n) })) : setPron(s.id)}>
                {pronounLabels[s.id as PronounSet]}
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
          <Empty icon="sparkle" title={tr('Que nome queres experimentar?')} text={tr('Nada do que escreves aqui sai deste telemóvel.')} />
        ) : (
          <>
            <div className="name-preview pop" key={name + p.id}>
              <div className="row between">
                <h1 style={{ fontSize: '2.2rem' }}>{name}</h1>
                <button className="icon-btn" aria-label={tr('Ouvir o nome')} onClick={() => { if (!speak(tr('Olá, {0}.', name))) toast(tr('A voz não está disponível neste dispositivo')) }}>🔊</button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="stack" style={{ gap: 2 }}>
                  <span className="xs muted">{l.who}</span>
                  <div className="bubble">{l.text}</div>
                </div>
              ))}
              <div className="bubble me">{p.thanks}! 💜</div>
            </div>

            <div className="grid2">
              <div className="card tint-amber" style={{ gap: 4 }}>
                <span className="xs muted">{tr('Copo de café')}</span>
                <span style={{ fontFamily: 'cursive', fontSize: '1.5rem' }}>{name} ☕</span>
              </div>
              <div className="idcard">
                <span className="xs" style={{ opacity: .7 }}>{tr('Crachá')}</span>
                <b style={{ fontSize: '1.05rem' }}>{name}</b>
                <span className="xs">{p.subj.toLowerCase()}/{p.obj}</span>
              </div>
            </div>

            <div className="card flat" style={{ gap: 2 }}>
              <span className="xs muted">{tr('Assinatura de e-mail')}</span>
              <span>{tr('Com os melhores cumprimentos,')}</span>
              <b>{name}</b>
              <span className="small muted">({p.subj.toLowerCase()}/{p.obj})</span>
            </div>

            {entry && (
              <div className="grid2">
                <button className="btn secondary" onClick={() => update(v => ({ ...v, names: v.names.map(n => n.id === entry.id ? { ...n, liked: !n.liked } : n) }))}>
                  {entry.liked ? tr('♥ Favorito') : tr('♡ Gosto')}
                </button>
                <button className="btn" onClick={() => {
                  update(v => ({ ...v, settings: { ...v.settings, displayName: entry.name, pronouns: `${p.subj.toLowerCase()}/${p.obj}` }, letterFields: { ...v.letterFields, newName: entry.name } }))
                  toast(tr('A partir de agora tratamos-te por {0}', entry.name))
                }}>{tr('Usar este nome')}</button>
                <button className="btn ghost" style={{ gridColumn: 'span 2' }} onClick={() => {
                  update(v => ({ ...v, names: v.names.filter(n => n.id !== entry.id) })); setCurrent(null)
                }}>{tr('Remover')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
