// Área de quem apoia: família, amigues, colegas, chefias e professores.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { PayloadView } from '../components/CardView'
import { Empty, Progress, Ring, Seg, Sheet, copyText, fmtDate, useToast } from '../components/ui'
import { allyRoles, feelingPrompts, lessonsFor, makeQuestion, practiceTemplates, pronounLabels, pronounSetOf, scenarios, type Lesson, type PracticeQ, type PronounSet } from '../data/allies'
import { useCountry } from '../lib/useCountry'
import { codeFromText, decodeShare, isEncrypted } from '../lib/share'
import { todayKey, uid, type ReceivedCard, type SharedPayload } from '../lib/types'
import { streak } from './Home'
import { locale, tr } from '../i18n'

function useAlly() {
  const { vault, update } = useVault()
  const role = vault.settings.allyRole ?? 'amigue'
  const roleInfo = allyRoles.find(r => r.id === role)!
  const lessons = lessonsFor(role, useCountry().code === 'PT')
  const person = vault.received.find(r => r.payload.card)?.payload.card
  return { vault, update, role, roleInfo, lessons, person }
}

const settingsLink = <Link to="/definicoes" className="icon-btn" aria-label={tr('Definições')}><Icon name="gear" /></Link>

/* ---------- Início ---------- */

export function AllyHome() {
  const { vault, roleInfo, lessons, person } = useAlly()
  const toast = useToast()
  const done = lessons.filter(l => vault.lessonsDone.includes(l.id)).length
  const next = lessons.find(l => !vault.lessonsDone.includes(l.id))
  const days = streak(vault.practiceDays)
  const practicedToday = vault.practiceDays.includes(todayKey())
  const appUrl = `${location.origin}${location.pathname}`
  const plans = vault.received.filter(r => r.payload.plan)

  return (
    <>
      <TopBar title="" right={settingsLink} />
      <div className="page">
        <section className="hero">
          <div className="row between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="small muted">{roleInfo.emoji} {roleInfo.label}</span>
              <h1>{vault.settings.displayName ? tr('Olá, {0}', vault.settings.displayName) : tr('Olá')} 👋</h1>
              <p className="small muted">{person ? tr('Estás a aprender a apoiar {0}.', person.name) : tr('Estás a aprender a apoiar alguém trans.')}</p>
              {days > 1 && <span className="badge" style={{ background: 'var(--hero-glass)', color: 'var(--hero-ink)', width: 'fit-content' }}>🔥 {days} {tr('dias de treino')}</span>}
            </div>
            <Ring value={done / lessons.length} color="var(--accent)" track="var(--hero-glass)" />
          </div>
        </section>

        {person ? (
          <Link to="/cartoes" className="card tint-sky" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row"><span className="badge accent">{tr('Cartão de')}{' '}{person.name}</span><span className="grow" /><Icon name="chevron" /></div>
            <p className="small"><b>{person.pronouns || tr('Pergunta os pronomes')}</b>{person.hurts[0] ? tr(' · Evita: {0}', person.hurts[0].toLowerCase()) : ''}</p>
            {person.whoKnows.some(w => w.state !== 'sim') && <p className="xs">{tr('⚠️ Há pessoas que ainda não sabem. Vê quem antes de falares.')}</p>}
          </Link>
        ) : (
          <section className="card tint-sky">
            <h3>{tr('Pede o cartão “Como me podes apoiar”')}</h3>
            <p className="small">{tr('A pessoa que apoias pode criar na app um cartão com o nome, os pronomes, o que ajuda, o que magoa e quem já sabe, e enviar-to por ligação ou QR.')}</p>
            <div className="row wrap">
              <button className="btn sm" onClick={async () => { if (await copyText(appUrl)) toast(tr('Ligação da app copiada')) }}><Icon name="copy" size={16} />{tr('Copiar ligação da app')}</button>
              <Link to="/cartoes?colar=1" className="btn sm secondary">{tr('Já tenho uma ligação')}</Link>
            </div>
          </section>
        )}

        <Link to="/praticar" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="row">
            <div className="lead-ico" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name="chat" /></div>
            <div className="grow"><h3>{practicedToday ? tr('Treino de hoje feito ✓') : tr('Treino de 2 minutos')}</h3><p className="small muted">{tr('Nome e pronomes')}{person ? ` de ${person.name}` : ''}{tr(', até sair sem pensar')}</p></div>
            <Icon name="chevron" />
          </div>
        </Link>

        {next && (
          <Link to={`/aprender?l=${next.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row"><span className="badge accent">{tr('Próxima lição')}</span><span className="xs muted grow" style={{ textAlign: 'right' }}>{next.minutes} min</span></div>
            <div className="row"><h3 className="grow">{next.title}</h3><Icon name="chevron" /></div>
            <Progress value={done / lessons.length} />
          </Link>
        )}

        {plans.length > 0 && (
          <Link to="/cartoes" className="card flat row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="lead-ico" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><Icon name={plans[0].payload.plan!.context === 'escola' ? 'book' : 'briefcase'} /></div>
            <div className="grow"><h3>{tr('Plano de transição')}</h3><p className="small muted">{plans[0].payload.plan!.systems.filter(s => plans[0].checks[s.id]).length}/{plans[0].payload.plan!.systems.length} {tr('passos feitos')}</p></div>
            <Icon name="chevron" />
          </Link>
        )}

        <section className="stack">
          <h2>{tr('Explorar')}</h2>
          <div className="grid2">
            <Link to="/aprender?tab=dizer" className="tile card tint-mint"><div className="ico"><Icon name="chat" /></div><div><h3>{tr('O que dizer')}</h3><p className="xs muted">{tr('Situações reais')}</p></div></Link>
            <Link to="/para-mim" className="tile card tint-rose"><div className="ico"><Icon name="heart" /></div><div><h3>{tr('Para mim')}</h3><p className="xs muted">{tr('O que eu sinto')}</p></div></Link>
            <Link to="/comunidade?tab=testemunhos" className="tile card tint-sky"><div className="ico"><Icon name="people" /></div><div><h3>{tr('Testemunhos')}</h3><p className="xs muted">{tr('Hormonas e cirurgias')}</p></div></Link>
            <Link to="/comunidade?tab=agenda" className="tile card tint-amber"><div className="ico"><Icon name="calendar" /></div><div><h3>{tr('Agenda')}</h3><p className="xs muted">{tr('Marchas e encontros')}</p></div></Link>
          </div>
        </section>
      </div>
    </>
  )
}

/* ---------- Aprender ---------- */

export function AllyLearn() {
  const { vault, update, role, lessons } = useAlly()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'dizer' ? 'dizer' : 'licoes'
  const open = lessons.find(l => l.id === params.get('l'))
  const list = scenarios.filter(s => !s.roles || s.roles.includes(role))
  const done = (l: Lesson) => vault.lessonsDone.includes(l.id)
  const finish = (l: Lesson) => {
    update(v => ({ ...v, lessonsDone: v.lessonsDone.includes(l.id) ? v.lessonsDone : [...v.lessonsDone, l.id] }))
    const next = lessons.find(x => x.id !== l.id && !done(x))
    setParams(next ? { l: next.id } : {}, { replace: true })
  }

  return (
    <>
      <TopBar title={tr('Aprender')} />
      <div className="page">
        <Seg value={tab} onChange={t => setParams(t === 'dizer' ? { tab: 'dizer' } : {}, { replace: true })} options={[{ id: 'licoes', label: tr('Lições') }, { id: 'dizer', label: tr('O que dizer') }]} />
        {tab === 'licoes' ? (
          <>
            <p className="small muted">{tr('Lições curtas, pensadas para o teu papel.')}{' '}{lessons.filter(done).length} de {lessons.length} feitas.</p>
            <div className="list">
              {lessons.map((l, i) => (
                <button key={l.id} className="item" onClick={() => setParams({ l: l.id })} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', background: 'none', border: 0 }}>
                  <div className="lead" style={{ background: done(l) ? 'var(--mint-soft)' : 'var(--accent-soft)', color: done(l) ? 'var(--mint)' : 'var(--accent)' }}>{done(l) ? <Icon name="check" /> : <b>{i + 1}</b>}</div>
                  <div className="grow"><h3>{l.title}</h3><p className="xs muted">{l.minutes} min</p></div>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="stack">
            {list.map(s => (
              <section key={s.id} className="card">
                <h3>{s.title}</h3>
                <p className="small muted">{s.context}</p>
                <div className="stack" style={{ gap: 6 }}>
                  {s.say.map(x => <p key={x} className="small row" style={{ alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--mint)' }}><Icon name="check" size={18} /></span><span>{x}</span></p>)}
                  {s.avoid.map(x => <p key={x} className="small row" style={{ alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--danger)' }}><Icon name="x" size={18} /></span><span>{x}</span></p>)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <Sheet open={!!open} onClose={() => setParams(tab === 'dizer' ? { tab } : {}, { replace: true })} title={open?.title ?? ''}>
        {open && (
          <div className="stack">
            {open.body.map((p, i) => <p key={i}>{p}</p>)}
            {open.tryThis && <p className="small card tint-amber" style={{ padding: 12 }}><b>{tr('Experimenta:')}</b> {open.tryThis}</p>}
            <button className="btn block" onClick={() => finish(open)}>{done(open) ? tr('Seguinte') : tr('Percebi ✓')}</button>
          </div>
        )}
      </Sheet>
    </>
  )
}

/* ---------- Praticar ---------- */

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

const say = (text: string) => {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = locale; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch { /* sem voz */ }
}

export function AllyPractice() {
  const { vault, update, person } = useAlly()
  const [name, setName] = useState(person?.name ?? '')
  const [set, setSet] = useState<PronounSet>(pronounSetOf(person?.pronouns ?? '') ?? 'ela')
  const [round, setRound] = useState<PracticeQ[] | null>(null)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const days = streak(vault.practiceDays)

  const start = () => { setRound(shuffle(practiceTemplates).slice(0, 10).map(t => makeQuestion(t, name.trim() || tr('Alex'), set))); setI(0); setScore(0); setPicked(null) }
  const q = round?.[i]
  const pick = (o: string) => {
    if (picked || !q) return
    setPicked(o)
    if (o === q.answer) { setScore(s => s + 1); say(q.full) }
  }
  const nextQ = () => {
    if (!round) return
    if (i + 1 < round.length) { setI(i + 1); setPicked(null); return }
    update(v => ({ ...v, practiceDays: v.practiceDays.includes(todayKey()) ? v.practiceDays : [...v.practiceDays, todayKey()], practiceBest: Math.max(v.practiceBest, score) }))
    setI(round.length)
  }
  const finished = round && i >= round.length

  return (
    <>
      <TopBar title={tr('Praticar')} />
      <div className="page">
        {!round && (
          <>
            <section className="card">
              <h3>{tr('Treino de nome e pronomes')}</h3>
              <p className="small muted">{tr('Dez frases do dia a dia. Escolhe a palavra certa e ouve a frase em voz alta: o cérebro aprende pela repetição, não pela culpa.')}</p>
              <label className="field">{tr('Nome')}<input className="input" value={name} placeholder={tr('Nome da pessoa')} onChange={e => setName(e.target.value)} /></label>
              <Seg<PronounSet> value={set} onChange={setSet} options={(['ela', 'ele', 'elu'] as const).map(id => ({ id, label: pronounLabels[id] }))} />
              <button className="btn block" onClick={start}>{tr('Começar')}</button>
            </section>
            <div className="grid2">
              <div className="card flat"><span className="xs muted">{tr('Dias seguidos')}</span><h2>🔥 {days}</h2></div>
              <div className="card flat"><span className="xs muted">{tr('Melhor ronda')}</span><h2>{vault.practiceBest}/10</h2></div>
            </div>
            {set === 'elu' && <p className="small card tint-sky" style={{ padding: 12 }}>{tr('A linguagem neutra usa “elu/delu” e terminações em “e” (obrigade, cansade). Pode soar estranho no início, e é por isso que treinar ajuda.')}</p>}
          </>
        )}

        {q && !finished && (
          <section className="card stack-lg pop" key={i}>
            <div className="row between"><span className="xs muted">{i + 1} de {round!.length}</span><span className="xs muted">✓ {score}</span></div>
            <Progress value={i / round!.length} />
            <p className="qbox">{q.before} <span className="gap">{picked ?? ' '}</span> {q.after}</p>
            <div className="opt-grid">
              {q.options.map(o => (
                <button key={o} className={'btn secondary' + (picked ? (o === q.answer ? ' right' : o === picked ? ' wrong' : '') : '')} onClick={() => pick(o)}>{o.replace(/[,.?!]+$/, '')}</button>
              ))}
            </div>
            {picked && (
              <div className="stack">
                {picked !== q.answer && <p className="small">{tr('Quase. A frase certa é:')}{' '}<b>{q.full}</b></p>}
                <div className="row">
                  <button className="btn ghost" onClick={() => say(q.full)} aria-label={tr('Ouvir a frase')}>{tr('🔊 Ouvir')}</button>
                  <button className="btn grow" onClick={nextQ}>{i + 1 < round!.length ? tr('Seguinte') : tr('Terminar')}</button>
                </div>
              </div>
            )}
          </section>
        )}

        {finished && (
          <section className="card stack-lg pop" style={{ textAlign: 'center' }}>
            <h1>{score >= 9 ? '🎉' : score >= 6 ? '💪' : '🌱'} {score}/10</h1>
            <p>{score >= 9 ? tr('Já te sai naturalmente. É isto que faz a diferença.') : tr('Cada ronda conta. Amanhã vai sair melhor.')}</p>
            <button className="btn block" onClick={start}>{tr('Outra ronda')}</button>
            <button className="btn ghost" onClick={() => setRound(null)}>{tr('Voltar')}</button>
          </section>
        )}
      </div>
    </>
  )
}

/* ---------- Cartões recebidos ---------- */

export function AllyCards() {
  const { vault, update } = useAlly()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  const [paste, setPaste] = useState(params.get('colar') === '1')
  const [text, setText] = useState('')

  const toggle = (card: ReceivedCard, id: string) =>
    update(v => ({ ...v, received: v.received.map(r => r.id === card.id ? { ...r, checks: { ...r.checks, [id]: !r.checks[id] } } : r) }))
  const remove = (card: ReceivedCard) => { if (confirm(tr('Apagar este cartão deste telemóvel?'))) update(v => ({ ...v, received: v.received.filter(r => r.id !== card.id) })) }
  const open = () => {
    const code = codeFromText(text)
    if (!code) { toast(tr('Não encontrei um cartão nessa ligação')); return }
    setParams({}, { replace: true })
    nav(`/receber/${code}`)
  }

  return (
    <>
      <TopBar title={tr('Cartões')} right={<button className="icon-btn" onClick={() => setPaste(true)} aria-label={tr('Colar ligação')}><Icon name="plus" /></button>} />
      <div className="page">
        {vault.received.length === 0 && (
          <Empty icon="heart" title={tr('Ainda não recebeste nenhum cartão')} text={tr('Quando a pessoa que apoias te enviar uma ligação ou mostrar um QR, abre-o com a câmara e o cartão aparece aqui.')}
            action={<button className="btn" onClick={() => setPaste(true)}>{tr('Colar uma ligação')}</button>} />
        )}
        {vault.received.map(r => (
          <div key={r.id} className="stack">
            <PayloadView payload={r.payload} checks={r.checks} onToggle={id => toggle(r, id)} />
            <div className="row between">
              <span className="xs muted">{tr('Recebido a')}{' '}{fmtDate(r.receivedAt, { day: 'numeric', month: 'long' })}</span>
              <button className="btn ghost sm" onClick={() => remove(r)}><Icon name="trash" size={16} />{tr('Apagar')}</button>
            </div>
          </div>
        ))}
      </div>
      <Sheet open={paste} onClose={() => { setPaste(false); setParams({}, { replace: true }) }} title={tr('Colar ligação')}>
        <div className="stack">
          <textarea className="input" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder={tr('Cola aqui a ligação que recebeste')} />
          <button className="btn block" onClick={open} disabled={!text.trim()}>{tr('Abrir cartão')}</button>
        </div>
      </Sheet>
    </>
  )
}

/* ---------- Receber por ligação ---------- */

export function Receive() {
  const { data = '' } = useParams()
  const { vault, update } = useVault()
  const nav = useNavigate()
  const toast = useToast()
  const [pass, setPass] = useState('')
  const [payload, setPayload] = useState<SharedPayload | null>(null)
  const [error, setError] = useState('')
  const needsPass = isEncrypted(data)

  const tryOpen = async (p?: string) => {
    try { setPayload(await decodeShare(data, p)); setError('') }
    catch { setError(needsPass && p ? tr('Palavra-passe errada.') : tr('Esta ligação está incompleta ou danificada.')) }
  }
  useEffect(() => { if (!needsPass) void tryOpen() }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!payload) return
    // Uma ligação nova da mesma pessoa substitui a anterior (e mantém o que já marcaste).
    const same = (r: ReceivedCard) => payload.card ? r.payload.card?.name === payload.card.name : !r.payload.card && r.payload.plan?.context === payload.plan?.context
    update(v => {
      const old = v.received.find(same)
      return { ...v, received: [{ id: uid(), receivedAt: new Date().toISOString(), payload, checks: old?.checks ?? {} }, ...v.received.filter(r => !same(r))] }
    })
    toast(tr('Cartão guardado'))
    nav('/cartoes', { replace: true })
  }

  const isTrans = vault.settings.profile !== 'ally'
  return (
    <>
      <TopBar title={tr('Cartão recebido')} />
      <div className="page">
        {!payload && needsPass && (
          <section className="card">
            <div className="row"><Icon name="lock" /><h3>{tr('Protegido com palavra-passe')}</h3></div>
            <p className="small muted">{tr('A pessoa que to enviou deve ter-te dito a palavra-passe pessoalmente.')}</p>
            <input className="input" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryOpen(pass)} autoComplete="off" />
            <button className="btn block" onClick={() => tryOpen(pass)} disabled={!pass}>{tr('Abrir')}</button>
          </section>
        )}
        {error && <p className="small" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        {payload && (
          <>
            {isTrans && <p className="small card tint-amber" style={{ padding: 12 }}>{tr('Este cartão é para quem te apoia. Para o guardares, a pessoa deve abrir a ligação na app dela, no perfil “Apoio alguém trans”.')}</p>}
            <PayloadView payload={payload} />
            {!isTrans && <button className="btn block" onClick={save}>{tr('Guardar no meu telemóvel')}</button>}
            <p className="xs muted">{tr('O cartão fica cifrado só neste telemóvel. Nada foi enviado para nenhum servidor.')}</p>
          </>
        )}
      </div>
    </>
  )
}

/* ---------- Para mim ---------- */

export function AllyForMe() {
  const { vault, update } = useAlly()
  const [prompt, setPrompt] = useState(() => feelingPrompts[Math.floor(Date.now() / 86_400_000) % feelingPrompts.length])
  const [text, setText] = useState('')
  const { support } = useCountry()
  const orgs = useMemo(() => support.filter(o => o.kind === 'associação' || o.kind === 'linha' || o.kind === 'serviço público'), [support])
  const add = () => {
    if (!text.trim()) return
    update(v => ({ ...v, feelings: [{ id: uid(), date: new Date().toISOString(), prompt, text: text.trim() }, ...v.feelings] }))
    setText('')
  }

  return (
    <>
      <TopBar title={tr('Para mim')} />
      <div className="page">
        <section className="card">
          <h3>{tr('O que eu sinto')}</h3>
          <p className="small muted">{tr('Um espaço só teu para pôr em palavras o que sentes, sem pesar na pessoa que apoias. Fica cifrado neste telemóvel.')}</p>
          <div className="row between"><b className="small grow">{prompt}</b>
            <button className="btn ghost sm" onClick={() => setPrompt(feelingPrompts[(feelingPrompts.indexOf(prompt) + 1) % feelingPrompts.length])}>{tr('Outra')}</button>
          </div>
          <textarea className="input" rows={4} value={text} onChange={e => setText(e.target.value)} />
          <button className="btn block" onClick={add} disabled={!text.trim()}>{tr('Guardar')}</button>
        </section>
        {vault.feelings.length > 0 && (
          <div className="list">
            {vault.feelings.map(f => (
              <div key={f.id} className="item" style={{ alignItems: 'flex-start' }}>
                <div className="grow stack" style={{ gap: 4 }}>
                  <span className="xs muted">{fmtDate(f.date, { day: 'numeric', month: 'short' })} · {f.prompt}</span>
                  <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{f.text}</p>
                </div>
                <button className="icon-btn" aria-label={tr('Apagar')} onClick={() => update(v => ({ ...v, feelings: v.feelings.filter(x => x.id !== f.id) }))}><Icon name="trash" size={18} /></button>
              </div>
            ))}
          </div>
        )}
        <section className="stack">
          <h2>{tr('Não tens de fazer isto sozinho/a')}</h2>
          <div className="list">
            {orgs.map(o => (
              <a key={o.id} className="item" href={o.phone ? `tel:${o.phone}` : o.url} target={o.phone ? undefined : '_blank'} rel="noreferrer noopener">
                <div className="lead" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name={o.phone ? 'phone' : 'people'} /></div>
                <div className="grow"><h3>{o.name}</h3><p className="small muted">{o.description}</p></div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
