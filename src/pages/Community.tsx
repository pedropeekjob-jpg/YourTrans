import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Seg, Sheet, fmtDate, useToast } from '../components/ui'
import { communityAllowed } from '../data/countries'
import { useCountry } from '../lib/useCountry'
import { CountryNotice } from '../components/CountryPicker'
import { annualEvents, nextOccurrence } from '../data/events'
import { api, apiEnabled } from '../lib/api'
import { downloadIcs, icsEvent } from '../lib/ics'
import { uid } from '../lib/types'
import { Stories } from './Stories'
import { Places } from './Safety'
import { ShareNote } from './Privacy'
import { locale, tr } from '../i18n'

type Tab = 'apoio' | 'testemunhos' | 'agenda' | 'locais' | 'mentoria'

export function Community() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'apoio'
  const pack = useCountry()
  // Em países hostis, partilhas, agenda, locais e mentoria podem expor a pessoa: fica só o apoio.
  if (!communityAllowed(pack)) return (
    <>
      <TopBar title={tr('Comunidade')} />
      <div className="page">
        <section className="card tint-amber" role="note">
          <h3>{tr('Comunidade desligada em {0}', pack.name)}</h3>
          <p className="small">{tr('Para tua segurança, a comunidade, os locais e a mentoria não estão disponíveis neste país. Os contactos de apoio continuam aqui.')}</p>
        </section>
        <Support />
      </div>
    </>
  )
  return (
    <>
      <TopBar title={tr('Comunidade')} />
      <div className="page">
        <Seg value={tab} onChange={t => setParams({ tab: t }, { replace: true })} options={[{ id: 'apoio', label: tr('Apoio') }, { id: 'testemunhos', label: tr('Partilhas') }, { id: 'agenda', label: tr('Agenda') }, { id: 'locais', label: tr('Locais seguros') }, { id: 'mentoria', label: tr('Mentoria') }]} />
        {tab === 'apoio' && <Support />}
        {tab === 'testemunhos' && <Stories initialTopic={params.get('tema') ?? undefined} />}
        {tab === 'agenda' && <Agenda />}
        {tab === 'locais' && <Places />}
        {tab === 'mentoria' && <Mentoring />}
      </div>
    </>
  )
}

export function Support() {
  const ally = useVault().vault.settings.profile === 'ally'
  const { support } = useCountry()
  const urgent = support.filter(o => o.phone)
  const orgs = support.filter(o => o.kind === 'associação')
  return (
    <>
      <CountryNotice part="support" />
      <section className="card tint-danger">
        <h3>{tr('Se estiveres em perigo ou a pensar em fazer-te mal')}</h3>
        <p className="small">{tr('Não estás sozinhe. Liga agora, é gratuito ou de baixo custo e confidencial.')}</p>
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
      {!ally && <Link to="/partilhar" className="card tint-sky" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="row"><Icon name="heart" /><h3 className="grow">{tr('Pessoas que me apoiam')}</h3><Icon name="chevron" /></div>
        <p className="small">{tr('Envia à família, amigues, colegas ou professores um cartão com o que te ajuda, ou um plano de transição para o trabalho ou a escola.')}</p>
      </Link>}
      <section className="stack">
        <h2>{tr('Associações')}</h2>
        <p className="small muted">{tr('Apoio psicológico, jurídico e grupos de partilha moderados por pessoas da comunidade.')}</p>
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
      <p className="xs muted">{tr('Contactos públicos verificados em outubro de 2026. Confirma horários nos sites oficiais.')}</p>
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
    toast(i.approx ? tr('Lembrete criado. Confirma a data exata mais perto do dia.') : tr('Vamos lembrar-te na véspera'))
  }
  const addMine = async () => {
    const ev = { id: uid(), title: form.title.trim(), date: new Date(form.date).toISOString(), place: form.place.trim() || undefined }
    update(v => ({ ...v, events: [...v.events, ev] }))
    if (form.share && apiEnabled) { try { const r = await api.suggestEvent(ev); toast(r.published ? tr('Publicado na agenda da comunidade') : tr('Enviado para moderação')) } catch { /* fica local */ } }
    setOpen(false); setForm({ title: '', date: '', place: '', share: false })
  }

  return (
    <>
      <section className="card tint-accent">
        <h3>{tr('Eventos e manifestações')}</h3>
        <p className="small">{tr('Datas da comunidade trans, marchas e vigílias. Toca em "Lembrar-me" e avisamos na véspera.')}</p>
      </section>
      <div className="stack">
        {items.map(i => {
          const isPast = i.date.getTime() < Date.now()
          return (
            <article key={i.source + i.id} className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 56, flexShrink: 0, textAlign: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 14, padding: '6px 0' }}>
                  <div className="xs" style={{ fontWeight: 700, textTransform: 'uppercase' }}>{i.date.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{i.approx ? '—' : i.date.getDate()}</div>
                </div>
                <div className="grow stack" style={{ gap: 4 }}>
                  <h3>{i.title}</h3>
                  {i.where && <span className="small muted">📍 {i.where}</span>}
                  {i.description && <p className="small muted">{i.description}</p>}
                  <div className="row wrap" style={{ gap: 6 }}>
                    {i.approx && <span className="badge amber">{tr('Data a confirmar')}</span>}
                    {i.source === 'comunidade' && <span className="badge accent">{tr('Comunidade')}</span>}
                    {i.source === 'meu' && <span className="badge">{tr('O meu evento')}</span>}
                  </div>
                  {!isPast && (
                    <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                      <button className="btn sm" onClick={() => remind(i)}><Icon name="bell" size={16} />{tr('Lembrar-me')}</button>
                      {!i.approx && <button className="btn sm secondary" onClick={() => downloadIcs('evento', icsEvent({ title: i.title, start: i.date, allDay: i.source === 'anual', description: i.where }))}><Icon name="calendar" size={16} />{tr('Calendário')}</button>}
                      {i.url && <a className="btn sm ghost" href={i.url} target="_blank" rel="noreferrer noopener">{tr('Mais info')}</a>}
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      <button className="btn secondary block" onClick={() => setOpen(true)}><Icon name="plus" size={18} />{tr('Adicionar evento')}</button>
      <p className="xs muted">{tr('Hoje:')}{' '}{fmtDate(new Date().toISOString(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Novo evento')}>
        <label className="field">{tr('Nome')}<input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={tr('Ex.: Vigília TDoR Coimbra')} /></label>
        <label className="field">{tr('Data e hora')}<input className="input" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label className="field">{tr('Local')}<input className="input" value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} /></label>
        {apiEnabled && <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={form.share} onChange={e => setForm({ ...form, share: e.target.checked })} /> {tr('Partilhar com a comunidade (moderado)')}</label>}
        {apiEnabled && form.share && <ShareNote />}
        <button className="btn block" disabled={!form.title.trim() || !form.date} onClick={addMine}>{tr('Guardar')}</button>
      </Sheet>
    </>
  )
}

const stages = [tr('A pensar no assunto'), tr('Início da transição social'), tr('Em processo médico'), tr('Documentos tratados'), tr('Vários anos de caminho')]
const topics = [tr('Contar à família'), tr('Documentos'), tr('Hormonas'), tr('Trabalho'), tr('Escola'), tr('Relações'), tr('Saúde mental'), tr('Voz'), tr('Roupa e estilo')]

function Mentoring() {
  const toast = useToast()
  const [role, setRole] = useState<'mentee' | 'mentor' | null>(null)
  const [form, setForm] = useState({ nickname: '', stage: '', topics: [] as string[], contact: '' })
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!role) return
    if (!apiEnabled) { toast(tr('A mentoria fica disponível quando o servidor estiver ligado')); return }
    try { await api.mentorship({ role, ...form }); setSent(true) } catch (e) { toast((e as Error).message) }
  }

  return (
    <>
      <section className="card tint-rose">
        <h3>{tr('Mentoria entre pares')}</h3>
        <p className="small">{tr('Alguém mais à frente no caminho ajuda quem está a começar. As ligações são feitas por pessoas da equipa de moderação, nunca automaticamente, e podes sair a qualquer momento.')}</p>
      </section>
      {sent ? (
        <section className="card tint-mint"><h3>{tr('Pedido recebido 💜')}</h3><p className="small">{tr('A equipa entra em contacto pelo meio que indicaste quando houver uma boa correspondência.')}</p></section>
      ) : (
        <>
          <div className="grid2">
            <button className={'tile card ' + (role === 'mentee' ? 'tint-accent' : 'flat')} onClick={() => setRole('mentee')}>
              <div className="ico"><Icon name="sparkle" /></div><div><h3>{tr('Quero apoio')}</h3><p className="xs muted">{tr('Falar com alguém que já passou por isto')}</p></div>
            </button>
            <button className={'tile card ' + (role === 'mentor' ? 'tint-accent' : 'flat')} onClick={() => setRole('mentor')}>
              <div className="ico"><Icon name="heart" /></div><div><h3>{tr('Quero ajudar')}</h3><p className="xs muted">{tr('Partilhar a minha experiência')}</p></div>
            </button>
          </div>
          {role && (
            <section className="stack-lg">
              <label className="field">{tr('Como queres ser chamade (alcunha)')}<input className="input" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} /></label>
              <div className="stack"><b className="small">{tr('Em que fase estás?')}</b><div className="chips" style={{ flexWrap: 'wrap' }}>{stages.map(s => <button key={s} className={'chip' + (form.stage === s ? ' on' : '')} onClick={() => setForm({ ...form, stage: s })}>{s}</button>)}</div></div>
              <div className="stack"><b className="small">{tr('Temas')}</b><div className="chips" style={{ flexWrap: 'wrap' }}>{topics.map(t => { const on = form.topics.includes(t); return <button key={t} className={'chip' + (on ? ' on' : '')} onClick={() => setForm({ ...form, topics: on ? form.topics.filter(x => x !== t) : [...form.topics, t] })}>{t}</button> })}</div></div>
              <label className="field">{tr('Contacto (e-mail ou Signal)')}<input className="input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder={tr('Usado só pela equipa de moderação')} /></label>
              <p className="xs muted">{tr('O contacto só é visto pela moderação e é apagado ao fim de 6 meses.')} <Link to="/privacidade">{tr('Política de privacidade')}</Link></p>
              <button className="btn" disabled={!form.nickname.trim() || !form.stage || form.contact.trim().length < 5} onClick={submit}>{tr('Enviar pedido')}</button>
            </section>
          )}
        </>
      )}
      <section className="card flat">
        <h3>{tr('Regras da comunidade')}</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>{tr('Respeito por todas as identidades, incluindo não-binárias.')}</li>
          <li>{tr('Sem conselhos médicos sobre doses: isso é com profissionais.')}</li>
          <li>{tr('Nada de partilhar dados de terceiros, fotos ou capturas sem consentimento.')}</li>
          <li>{tr('Assédio, transfobia ou tentativas de "outing" levam a expulsão imediata.')}</li>
          <li>{tr('Um filtro automático revê tudo antes de ser publicado, e a equipa de moderação vê o que levanta dúvidas ou é denunciado.')}</li>
        </ul>
      </section>
    </>
  )
}
