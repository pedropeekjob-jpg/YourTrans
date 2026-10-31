import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Check, Progress, Seg, copyText, useToast } from '../components/ui'
import { checklistPT, guides, type ChecklistItem } from '../data/guides'
import { buildLetter, letterKinds, type LetterFields, type LetterKind } from '../lib/letters'

type Tab = 'passos' | 'checklist' | 'pedidos'

export function Documents() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'passos')
  const [letterPreset, setLetterPreset] = useState<{ kind: LetterKind; entity: string } | null>(
    params.get('kind') ? { kind: params.get('kind') as LetterKind, entity: '' } : null)

  const openLetter = (item: ChecklistItem) => {
    setLetterPreset({ kind: (item.letter as LetterKind) ?? 'generic', entity: item.label })
    setTab('pedidos')
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <TopBar title="Documentos" />
      <div className="page">
        <Seg value={tab} onChange={setTab} options={[
          { id: 'passos', label: 'Passo a passo' },
          { id: 'checklist', label: 'Checklist' },
          { id: 'pedidos', label: 'Pedidos' },
        ]} />
        {tab === 'passos' && <Steps />}
        {tab === 'checklist' && <Checklist onLetter={openLetter} />}
        {tab === 'pedidos' && <Letters key={letterPreset?.kind + (letterPreset?.entity ?? '')} preset={letterPreset} />}
      </div>
    </>
  )
}

function Steps() {
  const { vault, update } = useVault()
  const country = vault.settings.country
  const guide = guides.find(g => g.country === country) ?? guides[0]
  const [open, setOpen] = useState<string | null>(guide.steps.find(s => !vault.guideSteps[s.id])?.id ?? null)
  const done = guide.steps.filter(s => vault.guideSteps[s.id]).length

  return (
    <>
      <div className="chips">
        {guides.map(g => (
          <button key={g.country} className={'chip' + (g.country === country ? ' on' : '')}
            onClick={() => update(v => ({ ...v, settings: { ...v.settings, country: g.country } }))}>
            {g.country === 'PT' ? '🇵🇹' : '🇧🇷'} {g.name}
          </button>
        ))}
      </div>

      <section className="card tint-sky">
        <span className="badge accent" style={{ width: 'fit-content' }}>{guide.law}</span>
        <p className="small">{guide.summary}</p>
        <div className="row"><div className="grow"><Progress value={done / guide.steps.length} /></div><span className="xs muted">{done}/{guide.steps.length}</span></div>
      </section>

      <details className="card flat">
        <summary style={{ fontWeight: 650, cursor: 'pointer' }}>Quem pode pedir?</summary>
        <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
          {guide.eligibility.map(e => <li key={e}>{e}</li>)}
        </ul>
      </details>

      <Link to="/nome" className="card tint-accent row" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Icon name="sparkle" />
        <div className="grow"><h3>Ainda a escolher o nome?</h3><p className="small muted">Experimenta-o antes de o oficializar.</p></div>
        <Icon name="chevron" />
      </Link>

      <div className="timeline">
        {guide.steps.map((s, i) => {
          const isDone = !!vault.guideSteps[s.id]
          const isOpen = open === s.id
          return (
            <div key={s.id} className="tl">
              <div className="rail">
                <div className={'dot' + (isDone ? ' done' : '')}>{isDone ? <Icon name="check" size={16} /> : i + 1}</div>
                <div className="line" />
              </div>
              <div className="content">
                <button className="row" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', minHeight: 32 }}
                  onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                  <h3 className="grow" style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? .6 : 1 }}>{s.title}</h3>
                  <Icon name="chevron" size={18} className={isOpen ? 'rot' : ''} />
                </button>
                {isOpen && (
                  <div className="card" style={{ gap: 10 }}>
                    <p className="small">{s.body}</p>
                    {s.where && <p className="small"><b>Onde:</b> {s.where}</p>}
                    {s.cost && <p className="small"><b>Custo:</b> {s.cost}</p>}
                    {s.time && <p className="small"><b>Prazo:</b> {s.time}</p>}
                    {s.docs && (
                      <div className="stack" style={{ gap: 4 }}>
                        <b className="small">Leva contigo:</b>
                        {s.docs.map(d => <span key={d} className="small">• {d}</span>)}
                      </div>
                    )}
                    {s.link && <a className="small row" href={s.link.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={16} />{s.link.label}</a>}
                    <button className={'btn sm ' + (isDone ? 'secondary' : '')}
                      onClick={() => {
                        update(v => ({ ...v, guideSteps: { ...v.guideSteps, [s.id]: !isDone } }))
                        if (!isDone) setOpen(guide.steps[i + 1]?.id ?? null)
                      }}>
                      {isDone ? 'Marcar como por fazer' : 'Feito ✓'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="xs muted">Informação revista em {guide.reviewedAt}. Não substitui aconselhamento jurídico: confirma valores e prazos nas fontes oficiais. A ILGA Portugal tem apoio jurídico gratuito.</p>
    </>
  )
}

function Checklist({ onLetter }: { onLetter: (i: ChecklistItem) => void }) {
  const { vault, update } = useVault()
  const groups = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>()
    for (const c of checklistPT) m.set(c.group, [...(m.get(c.group) ?? []), c])
    return [...m.entries()]
  }, [])
  const done = checklistPT.filter(c => vault.checklist[c.id]).length

  return (
    <>
      <section className="card tint-mint">
        <h3>Depois do novo Cartão de Cidadão</h3>
        <p className="small">Tudo o que costuma ser preciso atualizar. Em cada entidade podes gerar o pedido já escrito.</p>
        <div className="row"><div className="grow"><Progress value={done / checklistPT.length} /></div><span className="xs muted">{done}/{checklistPT.length}</span></div>
        {done === checklistPT.length && <p className="small" style={{ fontWeight: 650 }}>🎉 Tudo atualizado. Que conquista!</p>}
      </section>
      {groups.map(([group, items]) => (
        <section key={group} className="stack">
          <h3 className="muted small" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{group}</h3>
          <div className="list">
            {items.map(item => {
              const on = !!vault.checklist[item.id]
              return (
                <div key={item.id} className="item" style={{ alignItems: 'flex-start' }}>
                  <Check on={on} label={item.label} onToggle={() => update(v => ({ ...v, checklist: { ...v.checklist, [item.id]: !on } }))} />
                  <div className="grow stack" style={{ gap: 2 }}>
                    <h3 style={{ opacity: on ? .55 : 1 }}>{item.label}</h3>
                    <p className="small muted">{item.how}</p>
                    {item.letter && !on && (
                      <button className="btn ghost sm" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => onLetter(item)}>
                        <Icon name="doc" size={16} /> Gerar pedido
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

function Letters({ preset }: { preset: { kind: LetterKind; entity: string } | null }) {
  const { vault, update } = useVault()
  const toast = useToast()
  const [kind, setKind] = useState<LetterKind>(preset?.kind ?? 'generic')
  const stored = vault.letterFields
  const [entity, setEntity] = useState(preset?.entity ?? '')
  const [reference, setReference] = useState('')
  const fields: LetterFields = {
    oldName: stored.oldName ?? '',
    newName: stored.newName ?? vault.settings.displayName,
    city: stored.city ?? '',
    email: stored.email ?? '',
    entity, reference,
  }
  const setStored = (k: keyof LetterFields, val: string) => update(v => ({ ...v, letterFields: { ...v.letterFields, [k]: val } }))
  const letter = buildLetter(kind, fields)
  const full = `Assunto: ${letter.subject}\n\n${letter.body}`

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: letter.subject, text: letter.body }) } catch { /* cancelado */ } }
    else if (await copyText(full)) toast('Copiado')
  }
  const download = () => {
    const blob = new Blob([full], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pedido-${(entity || 'entidade').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <section className="card tint-accent">
        <h3>Pedidos já escritos</h3>
        <p className="small">Com base no direito de retificação do RGPD. Os teus dados ficam guardados só neste telemóvel para não teres de os escrever outra vez.</p>
      </section>
      <div className="chips">
        {letterKinds.map(k => <button key={k.id} className={'chip' + (kind === k.id ? ' on' : '')} onClick={() => setKind(k.id)}>{k.label}</button>)}
      </div>
      <div className="stack-lg">
        {kind !== 'referral' && (
          <label className="field">Nome anterior
            <input className="input" value={fields.oldName} onChange={e => setStored('oldName', e.target.value)} autoComplete="off" />
          </label>
        )}
        <label className="field">{kind === 'referral' ? 'O teu nome' : 'Nome atual'}
          <input className="input" value={fields.newName} onChange={e => setStored('newName', e.target.value)} autoComplete="off" />
        </label>
        <label className="field">{kind === 'referral' ? 'Nome do/a médico/a' : 'Entidade'}
          <input className="input" value={entity} onChange={e => setEntity(e.target.value)} placeholder={kind === 'referral' ? 'Dr./Dra. …' : 'Ex.: Banco X'} />
        </label>
        <label className="field">{kind === 'referral' ? 'N.º de utente (opcional)' : 'N.º de cliente, aluno/a ou processo (opcional)'}
          <input className="input" value={reference} onChange={e => setReference(e.target.value)} autoComplete="off" />
        </label>
        <div className="grid2">
          <label className="field">Localidade<input className="input" value={fields.city} onChange={e => setStored('city', e.target.value)} /></label>
          <label className="field">E-mail (opcional)<input className="input" type="email" value={fields.email} onChange={e => setStored('email', e.target.value)} /></label>
        </div>
      </div>
      <div className="letter" aria-label="Pré-visualização do pedido"><b>Assunto: {letter.subject}</b>{'\n\n'}{letter.body}</div>
      <div className="grid2">
        <button className="btn" onClick={async () => toast((await copyText(full)) ? 'Copiado' : 'Não foi possível copiar')}><Icon name="copy" size={18} />Copiar</button>
        <button className="btn secondary" onClick={share}><Icon name="share" size={18} />Partilhar</button>
        <a className="btn secondary" href={`mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`}>E-mail</a>
        <button className="btn secondary" onClick={download}>Descarregar</button>
      </div>
    </>
  )
}
