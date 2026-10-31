import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Seg, Sheet, fmtDate, useToast } from '../components/ui'
import { supportOrgs } from '../data/support'
import { annualEvents, nextOccurrence } from '../data/events'
import { api, apiEnabled } from '../lib/api'
import { downloadIcs, icsEvent } from '../lib/ics'
import { uid } from '../lib/types'

type Tab = 'apoio' | 'agenda' | 'mentoria'

export function Community() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'apoio'
  return (
    <>
      <TopBar title="Apoio e comunidade" />
      <div className="page">
        <Seg value={tab} onChange={t => setParams({ tab: t }, { replace: true })} options={[{ id: 'apoio', label: 'Apoio' }, { id: 'agenda', label: 'Agenda' }, { id: 'mentoria', label: 'Mentoria' }]} />
        {tab === 'apoio' && <Support />}
        {tab === 'agenda' && <Agenda />}
        {tab === 'mentoria' && <Mentoring />}
      </div>
    </>
  )
}

function Support() {
  const urgent = supportOrgs.filter(o => o.phone)
  const orgs = supportOrgs.filter(o => o.kind === 'associação')
  return (
    <>
      <section className="card tint-danger">
        <h3>Se estiveres em perigo ou a pensar em fazer-te mal</h3>
        <p className="small">Não estás sozinhe. Liga agora, é gratuito ou de baixo custo e confidencial.</p>
        <div className="stack">
          {urgent.map(o => (
            <a key={o.id} className="item card" href={`tel:${o.phone}`} style={{ padding: 12 }}>
              <div className="lead" style={{ background: 'var(--surface-2)' }}><Icon name="phone" /></div>
              <div className="grow"><h3>{o.name}</h3><p className="xs muted">{o.description}</p></div>
              <b className="small">{o.phone!.replace(/(\d{3})(?=\d)/g, '$1 ')}</b>
            </a>
          ))}
        </div>
      </section>
      <section className="stack">
        <h2>Associações</h2>
        <p className="small muted">Apoio psicológico, jurídico e grupos de partilha moderados por pessoas da comunidade.</p>
        <div className="list">
          {orgs.map(o => (
            <a key={o.id} className="item" href={o.url} target="_blank" rel="noreferrer noopener">
              <div className="lead" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="people" /></div>
              <div className="grow"><h3>{o.name}</h3><p className="small muted">{o.description}</p><span className="xs muted">{o.area}</span></div>
              <Icon name="external" size={18} />
            </a>
          ))}
        </div>
      </section>
      <p className="xs muted">Contactos públicos verificados em outubro de 2026. Confirma horários nos sites oficiais.</p>
    </>
  )
}

interface AgendaItem { id: string; title: string; date: Date; description?: string; where?: string; url?: string; approx: boolean; source: 'anual' | 'comunidade' | 'meu' }

function Agenda() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [remote, setRemote] = useState<{ id: string; title: string; date: string; place?: string; url?: string }[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', place: '', share: false })

  useEffect(() => { if (apiEnabled) api.events().then(setRemote).catch(() => {}) }, [])

  const items: AgendaItem[] = useMemo(() => {
    const now = new Date()
    const list: AgendaItem[] = [
      ...annualEvents.map(e => ({ id: e.id, title: e.title, date: nextOccurrence(e, now), description: e.description, where: e.where, url: e.url, approx: !e.day, source: 'anual' as const })),
      ...remote.map(e => ({ id: e.id, title: e.title, date: new Date(e.date), where: e.place, url: e.url, approx: false, source: 'comunidade' as const })),
      ...vault.events.map(e => ({ id: e.id, title: e.title, date: new Date(e.date), where: e.place, url: e.url, approx: false, source: 'meu' as const })),
    ]
    return list.filter(i => i.date.getTime() >= now.getTime() - 86_400_000).sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [remote, vault.events])

  const remind = (i: AgendaItem) => {
    const at = new Date(i.date.getTime() - 86_400_000); at.setHours(18, 0, 0, 0)
    update(v => ({ ...v, reminders: [...v.reminders, { id: uid(), kind: 'outro', label: i.title, next: at.toISOString(), everyDays: 0, notes: i.where }] }))
    toast(i.approx ? 'Lembrete criado. Confirma a data exata mais perto do dia.' : 'Vamos lembrar-te na véspera')
  }
  const addMine = async () => {
    const ev = { id: uid(), title: form.title.trim(), date: new Date(form.date).toISOString(), place: form.place.trim() || undefined }
    update(v => ({ ...v, events: [...v.events, ev] }))
    if (form.share && apiEnabled) { try { await api.suggestEvent(ev); toast('Enviado para moderação') } catch { /* fica local */ } }
    setOpen(false); setForm({ title: '', date: '', place: '', share: false })
  }

  return (
    <>
      <section className="card tint-accent">
        <h3>Eventos e manifestações</h3>
        <p className="small">Datas da comunidade trans, marchas e vigílias. Toca em "Lembrar-me" e avisamos na véspera.</p>
      </section>
      <div className="stack">
        {items.map(i => {
          const isPast = i.date.getTime() < Date.now()
          return (
            <article key={i.source + i.id} className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 56, flexShrink: 0, textAlign: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 14, padding: '6px 0' }}>
                  <div className="xs" style={{ fontWeight: 700, textTransform: 'uppercase' }}>{i.date.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{i.approx ? '—' : i.date.getDate()}</div>
                </div>
                <div className="grow stack" style={{ gap: 4 }}>
                  <h3>{i.title}</h3>
                  {i.where && <span className="small muted">📍 {i.where}</span>}
                  {i.description && <p className="small muted">{i.description}</p>}
                  <div className="row wrap" style={{ gap: 6 }}>
                    {i.approx && <span className="badge amber">Data a confirmar</span>}
                    {i.source === 'comunidade' && <span className="badge accent">Comunidade</span>}
                    {i.source === 'meu' && <span className="badge">O meu evento</span>}
                  </div>
                  {!isPast && (
                    <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                      <button className="btn sm" onClick={() => remind(i)}><Icon name="bell" size={16} />Lembrar-me</button>
                      {!i.approx && <button className="btn sm secondary" onClick={() => downloadIcs('evento', icsEvent({ title: i.title, start: i.date, allDay: i.source === 'anual', description: i.where }))}><Icon name="calendar" size={16} />Calendário</button>}
                      {i.url && <a className="btn sm ghost" href={i.url} target="_blank" rel="noreferrer noopener">Mais info</a>}
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      <button className="btn secondary block" onClick={() => setOpen(true)}><Icon name="plus" size={18} />Adicionar evento</button>
      <p className="xs muted">Hoje: {fmtDate(new Date().toISOString(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <Sheet open={open} onClose={() => setOpen(false)} title="Novo evento">
        <label className="field">Nome<input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Vigília TDoR Coimbra" /></label>
        <label className="field">Data e hora<input className="input" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label className="field">Local<input className="input" value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} /></label>
        {apiEnabled && <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={form.share} onChange={e => setForm({ ...form, share: e.target.checked })} /> Partilhar com a comunidade (moderado)</label>}
        <button className="btn block" disabled={!form.title.trim() || !form.date} onClick={addMine}>Guardar</button>
      </Sheet>
    </>
  )
}

const stages = ['A pensar no assunto', 'Início da transição social', 'Em processo médico', 'Documentos tratados', 'Vários anos de caminho']
const topics = ['Contar à família', 'Documentos', 'Hormonas', 'Trabalho', 'Escola', 'Relações', 'Saúde mental', 'Voz', 'Roupa e estilo']

function Mentoring() {
  const toast = useToast()
  const [role, setRole] = useState<'mentee' | 'mentor' | null>(null)
  const [form, setForm] = useState({ nickname: '', stage: '', topics: [] as string[], contact: '' })
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!role) return
    if (!apiEnabled) { toast('A mentoria fica disponível quando o servidor estiver ligado'); return }
    try { await api.mentorship({ role, ...form }); setSent(true) } catch (e) { toast((e as Error).message) }
  }

  return (
    <>
      <section className="card tint-rose">
        <h3>Mentoria entre pares</h3>
        <p className="small">Alguém mais à frente no caminho ajuda quem está a começar. As ligações são feitas por pessoas da equipa de moderação, nunca automaticamente, e podes sair a qualquer momento.</p>
      </section>
      {sent ? (
        <section className="card tint-mint"><h3>Pedido recebido 💜</h3><p className="small">A equipa entra em contacto pelo meio que indicaste quando houver uma boa correspondência.</p></section>
      ) : (
        <>
          <div className="grid2">
            <button className={'tile card ' + (role === 'mentee' ? 'tint-accent' : 'flat')} onClick={() => setRole('mentee')}>
              <div className="ico"><Icon name="sparkle" /></div><div><h3>Quero apoio</h3><p className="xs muted">Falar com alguém que já passou por isto</p></div>
            </button>
            <button className={'tile card ' + (role === 'mentor' ? 'tint-accent' : 'flat')} onClick={() => setRole('mentor')}>
              <div className="ico"><Icon name="heart" /></div><div><h3>Quero ajudar</h3><p className="xs muted">Partilhar a minha experiência</p></div>
            </button>
          </div>
          {role && (
            <section className="stack-lg">
              <label className="field">Como queres ser chamade (alcunha)<input className="input" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} /></label>
              <div className="stack"><b className="small">Em que fase estás?</b><div className="chips" style={{ flexWrap: 'wrap' }}>{stages.map(s => <button key={s} className={'chip' + (form.stage === s ? ' on' : '')} onClick={() => setForm({ ...form, stage: s })}>{s}</button>)}</div></div>
              <div className="stack"><b className="small">Temas</b><div className="chips" style={{ flexWrap: 'wrap' }}>{topics.map(t => { const on = form.topics.includes(t); return <button key={t} className={'chip' + (on ? ' on' : '')} onClick={() => setForm({ ...form, topics: on ? form.topics.filter(x => x !== t) : [...form.topics, t] })}>{t}</button> })}</div></div>
              <label className="field">Contacto (e-mail ou Signal)<input className="input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Usado só pela equipa de moderação" /></label>
              <button className="btn" disabled={!form.nickname.trim() || !form.stage || form.contact.trim().length < 5} onClick={submit}>Enviar pedido</button>
            </section>
          )}
        </>
      )}
      <section className="card flat">
        <h3>Regras da comunidade</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Respeito por todas as identidades, incluindo não-binárias.</li>
          <li>Sem conselhos médicos sobre doses: isso é com profissionais.</li>
          <li>Nada de partilhar dados de terceiros, fotos ou capturas sem consentimento.</li>
          <li>Assédio, transfobia ou tentativas de "outing" levam a expulsão imediata.</li>
          <li>Tudo o que é publicado passa por moderação humana.</li>
        </ul>
      </section>
    </>
  )
}
