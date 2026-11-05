import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, Seg, Sheet, copyText, fmtDate, useToast } from '../components/ui'
import { LEGAL_REVIEWED, buildTemplate, freeLegalHelp, rightTopics, routes, templateLabels, type RightTopic, type TemplateFields, type TemplateId } from '../data/legal'
import { uid, type Incident } from '../lib/types'

type Tab = 'direitos' | 'agir' | 'registo'

export function Rights() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'direitos'
  return (
    <>
      <TopBar title="Direitos e lei" back />
      <div className="page">
        <Seg<Tab> value={tab} onChange={t => setParams({ tab: t }, { replace: true })} options={[{ id: 'direitos', label: 'Direitos' }, { id: 'agir', label: 'O que fazer' }, { id: 'registo', label: 'Registo' }]} />
        {tab === 'direitos' && <Topics />}
        {tab === 'agir' && <Act initialTemplate={params.get('modelo') as TemplateId | null} />}
        {tab === 'registo' && <Incidents />}
        <p className="xs muted" style={{ textAlign: 'center' }}>Informação geral, não é aconselhamento jurídico. Revisto em {LEGAL_REVIEWED}. Para o teu caso concreto, fala com um/a advogado/a ou com o apoio jurídico da ILGA.</p>
      </div>
    </>
  )
}

function Topics() {
  const [open, setOpen] = useState<RightTopic | null>(null)
  return (
    <>
      <section className="card tint-sky">
        <h3>Em Portugal, a lei está do teu lado</h3>
        <p className="small">Desde 2018 tens direito à autodeterminação da identidade de género. Conhecer os teus direitos é o primeiro passo para os fazeres valer.</p>
      </section>
      <div className="list">
        {rightTopics.map(t => (
          <button key={t.id} className="item" onClick={() => setOpen(t)} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', background: 'none', border: 0 }}>
            <div className="lead" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name={t.icon} /></div>
            <div className="grow"><h3>{t.title}</h3><p className="small muted">{t.summary}</p></div>
            <Icon name="chevron" />
          </button>
        ))}
      </div>
      <FreeHelp />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && (
          <div className="stack">
            <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{open.points.map(p => <li key={p}>{p}</li>)}</ul>
            <div className="stack" style={{ gap: 6 }}>
              <b className="small">Fontes</b>
              {open.sources.map(s => <a key={s.url} className="small" href={s.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} /> {s.label}</a>)}
              <span className="xs muted">Revisto em {LEGAL_REVIEWED}.</span>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}

function FreeHelp() {
  return (
    <section className="stack">
      <h2>Apoio jurídico gratuito</h2>
      <div className="list">
        {freeLegalHelp.map(h => (
          <a key={h.name} className="item" href={h.phone ? `tel:${h.phone}` : h.url} target={h.phone ? undefined : '_blank'} rel="noreferrer noopener">
            <div className="lead" style={{ background: 'var(--mint-soft)', color: 'var(--mint)' }}><Icon name={h.phone ? 'phone' : 'people'} /></div>
            <div className="grow"><h3>{h.name}</h3><p className="small muted">{h.desc}</p></div>
          </a>
        ))}
      </div>
    </section>
  )
}

function Act({ initialTemplate }: { initialTemplate: TemplateId | null }) {
  const { vault } = useVault()
  const toast = useToast()
  const [route, setRoute] = useState(routes[0].id)
  const [tpl, setTpl] = useState<TemplateId | null>(initialTemplate)
  const [f, setF] = useState<TemplateFields>({ name: vault.settings.displayName, entity: '', date: '', place: '', what: '', witnesses: '' })
  const r = routes.find(x => x.id === route)!
  const text = tpl ? buildTemplate(tpl, f) : ''
  const fromIncident = (i: Incident) => setF({ ...f, entity: i.who, date: i.date, place: i.where, what: i.what, witnesses: i.witnesses })

  return (
    <>
      <section className="stack">
        <h2>Onde aconteceu?</h2>
        <div className="chips">{routes.map(x => <button key={x.id} className={'chip' + (route === x.id ? ' on' : '')} onClick={() => setRoute(x.id)}>{x.label}</button>)}</div>
      </section>
      <section className="card">
        <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>{r.steps.map(s => <li key={s} className="small">{s}</li>)}</ol>
        <div className="row wrap">
          {r.who.map(w => <a key={w.url} className="btn sm secondary" href={w.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{w.label.split(':')[0]}</a>)}
        </div>
        {r.template && <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => setTpl(r.template!)}><Icon name="doc" size={16} />Preparar o texto</button>}
        {r.id === 'dados' && <Link to="/documentos?tab=pedidos" className="btn sm ghost" style={{ justifySelf: 'start' }}>Pedido de retificação</Link>}
      </section>
      <section className="stack">
        <h2>Modelos prontos</h2>
        <div className="list">
          {(Object.keys(templateLabels) as TemplateId[]).map(id => (
            <button key={id} className="item" onClick={() => setTpl(id)} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', background: 'none', border: 0 }}>
              <div className="lead" style={{ background: 'var(--sky-soft)', color: 'var(--accent)' }}><Icon name="copy" /></div>
              <div className="grow"><h3>{templateLabels[id]}</h3></div><Icon name="chevron" />
            </button>
          ))}
        </div>
      </section>
      <Sheet open={!!tpl} onClose={() => setTpl(null)} title={tpl ? templateLabels[tpl] : ''}>
        {tpl && (
          <div className="stack">
            {vault.incidents.length > 0 && (
              <select className="input" defaultValue="" onChange={e => { const i = vault.incidents.find(x => x.id === e.target.value); if (i) fromIncident(i) }} aria-label="Usar uma ocorrência registada">
                <option value="" disabled>Preencher com uma ocorrência registada…</option>
                {vault.incidents.map(i => <option key={i.id} value={i.id}>{fmtDate(i.date)} · {i.who || i.where}</option>)}
              </select>
            )}
            <div className="grid2">
              <label className="field">O teu nome<input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
              <label className="field">Entidade<input className="input" value={f.entity} onChange={e => setF({ ...f, entity: e.target.value })} /></label>
              <label className="field">Data<input className="input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
              <label className="field">Local<input className="input" value={f.place} onChange={e => setF({ ...f, place: e.target.value })} /></label>
            </div>
            <label className="field">O que aconteceu<textarea className="input" rows={3} value={f.what} placeholder="Factos: o que foi dito ou feito, por quem." onChange={e => setF({ ...f, what: e.target.value })} /></label>
            {tpl !== 'cnpd' && <label className="field">Testemunhas<input className="input" value={f.witnesses} onChange={e => setF({ ...f, witnesses: e.target.value })} /></label>}
            <pre className="letter">{text}</pre>
            <button className="btn block" onClick={async () => { if (await copyText(text)) toast('Texto copiado') }}><Icon name="copy" size={18} />Copiar texto</button>
            <p className="xs muted">Revê o texto antes de enviar. Não é aconselhamento jurídico.</p>
          </div>
        )}
      </Sheet>
    </>
  )
}

const blank = (): Incident => ({ id: uid(), date: new Date().toISOString().slice(0, 10), where: '', who: '', what: '', witnesses: '', evidence: '', reportedTo: '' })

function Incidents() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [edit, setEdit] = useState<Incident | null>(null)
  const save = () => {
    if (!edit) return
    update(v => ({ ...v, incidents: [edit, ...v.incidents.filter(i => i.id !== edit.id)].sort((a, b) => b.date.localeCompare(a.date)) }))
    setEdit(null)
  }
  const exportAll = async () => {
    const txt = vault.incidents.map(i => `${fmtDate(i.date, { day: 'numeric', month: 'long', year: 'numeric' })}${i.where ? ` · ${i.where}` : ''}\nQuem: ${i.who || '-'}\nO que aconteceu: ${i.what}\nTestemunhas: ${i.witnesses || '-'}\nProvas: ${i.evidence || '-'}\nComunicado a: ${i.reportedTo || '-'}`).join('\n\n---\n\n')
    if (await copyText(txt)) toast('Registo copiado para enviares a quem te apoia juridicamente')
  }
  const set = (k: keyof Incident, v: string) => edit && setEdit({ ...edit, [k]: v })

  return (
    <>
      <section className="card tint-amber">
        <h3>Registar enquanto está fresco</h3>
        <p className="small">Um registo com datas e testemunhas, feito no momento, dá muita força a uma queixa. Fica cifrado só neste telemóvel.</p>
        <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => setEdit(blank())}><Icon name="plus" size={16} />Nova ocorrência</button>
      </section>
      {vault.incidents.length === 0 ? (
        <Empty icon="doc" title="Ainda não há ocorrências" text="Esperamos que nunca precises. Se acontecer, regista aqui." />
      ) : (
        <>
          <div className="list">
            {vault.incidents.map(i => (
              <button key={i.id} className="item" onClick={() => setEdit(i)} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', background: 'none', border: 0 }}>
                <div className="lead" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><Icon name="calendar" /></div>
                <div className="grow"><h3>{i.who || i.where || 'Ocorrência'}</h3><p className="small muted">{fmtDate(i.date, { day: 'numeric', month: 'short', year: 'numeric' })}{i.reportedTo ? ` · comunicado a ${i.reportedTo}` : ''}</p></div>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
          <button className="btn secondary block" onClick={exportAll}><Icon name="copy" size={18} />Copiar tudo para advogado/a ou associação</button>
        </>
      )}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Ocorrência">
        {edit && (
          <div className="stack">
            <div className="grid2">
              <label className="field">Data<input className="input" type="date" value={edit.date} onChange={e => set('date', e.target.value)} /></label>
              <label className="field">Onde<input className="input" value={edit.where} onChange={e => set('where', e.target.value)} /></label>
            </div>
            <label className="field">Quem (pessoa ou entidade)<input className="input" value={edit.who} onChange={e => set('who', e.target.value)} /></label>
            <label className="field">O que aconteceu<textarea className="input" rows={4} value={edit.what} placeholder="Escreve as palavras exatas, se te lembrares." onChange={e => set('what', e.target.value)} /></label>
            <label className="field">Testemunhas<input className="input" value={edit.witnesses} onChange={e => set('witnesses', e.target.value)} /></label>
            <label className="field">Provas que tens<input className="input" value={edit.evidence} placeholder="Capturas de ecrã, e-mails, relatório médico…" onChange={e => set('evidence', e.target.value)} /></label>
            <label className="field">Já comunicaste a alguém?<input className="input" value={edit.reportedTo} placeholder="RH, PSP, ACT, CIG…" onChange={e => set('reportedTo', e.target.value)} /></label>
            <button className="btn block" onClick={save}>Guardar</button>
            {vault.incidents.some(i => i.id === edit.id) && (
              <button className="btn ghost" onClick={() => { if (confirm('Apagar esta ocorrência?')) { update(v => ({ ...v, incidents: v.incidents.filter(i => i.id !== edit.id) })); setEdit(null) } }}><Icon name="trash" size={16} />Apagar</button>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}
