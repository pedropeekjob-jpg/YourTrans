import { useEffect, useMemo, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from '../components/Icon'
import { Empty, Sheet, useToast } from '../components/ui'
import { api, apiEnabled } from '../lib/api'
import { phaseLabel, storyPhases, storyTopics, topicLabel, type Story, type StoryPhase, type StoryTopic } from '../data/stories'

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

// Testemunhos sobre como é viver as hormonas e as cirurgias, contados por
// quem passou por isso. Tudo anónimo e moderado antes de aparecer.
export function Stories({ initialTopic }: { initialTopic?: string }) {
  const { vault, update } = useVault()
  const toast = useToast()
  const [list, setList] = useState<Story[]>([])
  const [loading, setLoading] = useState(apiEnabled)
  const [topic, setTopic] = useState<StoryTopic | ''>((initialTopic as StoryTopic) ?? '')
  const [phase, setPhase] = useState<StoryPhase | ''>('')
  const [open, setOpen] = useState<Story | null>(null)
  const [writing, setWriting] = useState<'testemunho' | 'pergunta' | null>(null)
  const [revealed, setRevealed] = useState<string[]>([])

  useEffect(() => {
    if (!apiEnabled) return
    api.stories().then(setList).catch(() => toast('Não foi possível carregar os testemunhos')).finally(() => setLoading(false))
  }, [toast])

  const shown = useMemo(() => list.filter(s => (!topic || s.topic === topic) && (!phase || s.phase === phase)), [list, topic, phase])

  const support = async (s: Story) => {
    if (vault.supported.includes(s.id)) return
    update(v => ({ ...v, supported: [...v.supported, s.id] }))
    setList(l => l.map(x => (x.id === s.id ? { ...x, support: x.support + 1 } : x)))
    try { await api.support(s.id) } catch { /* fica registado localmente */ }
  }

  return (
    <>
      <section className="card tint-rose">
        <h3>Como é depois?</h3>
        <p className="small">Ninguém nos prepara para o que se sente depois das hormonas ou de uma cirurgia. Aqui, pessoas que já passaram por isso contam como foi, fase a fase. Podes ler, perguntar e deixar apoio.</p>
        <div className="grid2">
          <button className="btn" onClick={() => setWriting('testemunho')}><Icon name="book" size={18} />Partilhar</button>
          <button className="btn secondary" onClick={() => setWriting('pergunta')}><Icon name="chat" size={18} />Perguntar</button>
        </div>
      </section>

      <div className="chips">
        <button className={'chip' + (!topic ? ' on' : '')} onClick={() => setTopic('')}>Todos os temas</button>
        {storyTopics.map(t => <button key={t.id} className={'chip' + (topic === t.id ? ' on' : '')} onClick={() => setTopic(t.id)}>{t.label}</button>)}
      </div>
      <div className="chips">
        <button className={'chip' + (!phase ? ' on' : '')} onClick={() => setPhase('')}>Todas as fases</button>
        {storyPhases.map(p => <button key={p.id} className={'chip' + (phase === p.id ? ' on' : '')} onClick={() => setPhase(p.id)}>{p.label}</button>)}
      </div>

      {!apiEnabled ? (
        <Empty icon="people" title="Os testemunhos chegam em breve"
          text="Esta parte precisa do servidor da comunidade, onde cada testemunho é revisto por moderação humana antes de ser publicado." />
      ) : loading ? (
        <p className="small muted">A carregar…</p>
      ) : shown.length === 0 ? (
        <Empty icon="book" title="Ainda não há testemunhos aqui" text="A tua experiência pode ser exatamente o que outra pessoa precisa de ler." />
      ) : (
        <div className="stack">
          {shown.map(s => {
            const hidden = s.warning && !revealed.includes(s.id)
            return (
              <article key={s.id} className="card">
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className={'badge ' + (s.kind === 'pergunta' ? 'amber' : 'accent')}>{s.kind === 'pergunta' ? 'Pergunta' : 'Testemunho'}</span>
                  <span className="badge">{topicLabel(s.topic)}</span>
                  <span className="badge">{phaseLabel(s.phase)}</span>
                </div>
                <h3>{s.title}</h3>
                {hidden ? (
                  <button className="card tint-amber" style={{ border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => setRevealed([...revealed, s.id])}>
                    <span className="small"><b>Aviso:</b> {s.warning}. Toca para ler.</span>
                  </button>
                ) : (
                  <p className="small" style={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.body}</p>
                )}
                <div className="row between">
                  <span className="xs muted">{s.nickname || 'Anónimo'} · {monthLabel(s.month)}</span>
                  <div className="row" style={{ gap: 4 }}>
                    <button className={'btn sm ' + (vault.supported.includes(s.id) ? '' : 'secondary')} onClick={() => support(s)} aria-label="Dar apoio">💜 {s.support}</button>
                    <button className="btn sm secondary" onClick={() => { setRevealed(r => [...r, s.id]); setOpen(s) }}><Icon name="chat" size={16} />{s.replies.length}</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <section className="card flat">
        <h3>Para que este espaço seja seguro</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Partilha a tua experiência, não conselhos sobre doses ou medicamentos.</li>
          <li>Nada de nomes de pessoas, fotos ou contactos.</li>
          <li>Se descreveres dor, complicações ou momentos difíceis, adiciona um aviso.</li>
          <li>Se estiveres em crise, o separador Apoio tem linhas disponíveis 24 horas.</li>
        </ul>
      </section>

      <StorySheet story={open} onClose={() => setOpen(null)} onReplied={() => toast('Resposta enviada para moderação')} />
      <WriteSheet kind={writing} defaultTopic={topic || undefined} onClose={() => setWriting(null)} />
    </>
  )
}

function StorySheet({ story, onClose, onReplied }: { story: Story | null; onClose: () => void; onReplied: () => void }) {
  const [body, setBody] = useState('')
  const [nickname, setNickname] = useState('')
  const toast = useToast()
  if (!story) return null
  const send = async () => {
    try { await api.reply(story.id, body, nickname || undefined); setBody(''); onReplied() } catch (e) { toast((e as Error).message) }
  }
  return (
    <Sheet open onClose={onClose} title={story.kind === 'pergunta' ? 'Pergunta' : 'Testemunho'}>
      <div className="row wrap" style={{ gap: 6 }}><span className="badge">{topicLabel(story.topic)}</span><span className="badge">{phaseLabel(story.phase)}</span></div>
      <h2>{story.title}</h2>
      <p style={{ whiteSpace: 'pre-wrap' }}>{story.body}</p>
      <span className="xs muted">{story.nickname || 'Anónimo'} · {monthLabel(story.month)}</span>
      <h3>Respostas ({story.replies.length})</h3>
      {story.replies.length === 0 && <p className="small muted">Ainda sem respostas. Uma palavra de apoio faz diferença.</p>}
      {story.replies.map(r => (
        <div key={r.id} className="stack" style={{ gap: 2 }}>
          <div className="bubble">{r.body}</div>
          <span className="xs muted">{r.nickname || 'Anónimo'} · {monthLabel(r.month)}</span>
        </div>
      ))}
      <textarea className="input" style={{ minHeight: 80 }} value={body} maxLength={1500} onChange={e => setBody(e.target.value)} placeholder={story.kind === 'pergunta' ? 'Partilha o que viveste' : 'Deixa uma palavra de apoio ou conta a tua experiência'} />
      <div className="row">
        <input className="input grow" value={nickname} maxLength={40} onChange={e => setNickname(e.target.value)} placeholder="Alcunha (opcional)" />
        <button className="btn" disabled={body.trim().length < 2} onClick={send}>Responder</button>
      </div>
      <p className="xs muted">As respostas são revistas antes de aparecerem.</p>
    </Sheet>
  )
}

function WriteSheet({ kind, defaultTopic, onClose }: { kind: 'testemunho' | 'pergunta' | null; defaultTopic?: StoryTopic; onClose: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ topic: (defaultTopic ?? 'hormonas-t') as StoryTopic, phase: 'semanas' as StoryPhase, title: '', body: '', nickname: '', warning: '' })
  const [warn, setWarn] = useState(false)
  if (!kind) return null
  const isQ = kind === 'pergunta'
  const submit = async () => {
    if (!apiEnabled) { toast('Disponível quando o servidor da comunidade estiver ligado'); return }
    try {
      await api.postStory({ kind, topic: form.topic, phase: form.phase, title: form.title, body: form.body, nickname: form.nickname || undefined, warning: warn ? form.warning || 'Conteúdo sensível' : undefined })
      toast('Obrigado! Vai ser revisto pela moderação e publicado em breve.')
      setForm({ ...form, title: '', body: '', warning: '' }); onClose()
    } catch (e) { toast((e as Error).message) }
  }
  return (
    <Sheet open onClose={onClose} title={isQ ? 'Fazer uma pergunta' : 'Partilhar a minha experiência'}>
      <label className="field">Tema
        <select className="input" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value as StoryTopic })}>{storyTopics.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      </label>
      <div className="stack"><b className="small">{isQ ? 'Em que fase estás?' : 'Em que fase foi?'}</b>
        <div className="chips" style={{ flexWrap: 'wrap' }}>{storyPhases.map(p => <button key={p.id} className={'chip' + (form.phase === p.id ? ' on' : '')} onClick={() => setForm({ ...form, phase: p.id })}>{p.label}</button>)}</div>
      </div>
      <label className="field">Título<input className="input" maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={isQ ? 'Ex.: Como dormiram depois da mastectomia?' : 'Ex.: Seis meses de testosterona'} /></label>
      <label className="field">{isQ ? 'A tua pergunta' : 'Como foi? O que sentiste? O que gostavas de ter sabido?'}
        <textarea className="input" style={{ minHeight: 160 }} maxLength={4000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
      </label>
      <span className="xs muted" style={{ textAlign: 'right' }}>{form.body.length}/4000</span>
      <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={warn} onChange={e => setWarn(e.target.checked)} /> Tem conteúdo sensível (dor, complicações, momentos difíceis)</label>
      {warn && <input className="input" maxLength={120} value={form.warning} onChange={e => setForm({ ...form, warning: e.target.value })} placeholder="Ex.: descreve dor no pós-operatório" />}
      <label className="field">Alcunha (opcional)<input className="input" maxLength={40} value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} /></label>
      <button className="btn block" disabled={form.title.trim().length < 3 || form.body.trim().length < 20} onClick={submit}>Enviar para moderação</button>
      <p className="xs muted">Anónimo: não guardamos quem publica. Lê tudo antes de enviar e não incluas dados que te identifiquem.</p>
    </Sheet>
  )
}
