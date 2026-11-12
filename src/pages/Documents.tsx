import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Check, Progress, Seg, copyText, useToast } from '../components/ui'
import { checklistPT, type ChecklistItem } from '../data/guides'
import { countries } from '../data/countries'
import { useCountry } from '../lib/useCountry'
import { CountryNotice, CountryPicker, StaleNotice } from '../components/CountryPicker'
import { NoCountryInfo, useCountryInfo } from '../components/CountryInfoViews'
import { buildLetter, letterKinds, type LetterFields, type LetterKind } from '../lib/letters'
import { tr } from '../i18n'

type Tab = 'passos' | 'checklist' | 'pedidos'

export function Documents() {
  const [params] = useSearchParams()
  const pack = useCountry()
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
      <TopBar title={tr('Documentos')} />
      <div className="page">
        <Seg value={tab} onChange={setTab} options={[
          { id: 'passos', label: tr('Passo a passo') },
          { id: 'checklist', label: tr('Checklist') },
          { id: 'pedidos', label: tr('Pedidos') },
        ]} />
        {tab === 'passos' && <><CountryPicker />{pack.guide ? <Steps /> : <NoCountryInfo what={tr('O passo a passo da mudança de nome e género')}><Steps /></NoCountryInfo>}</>}
        {tab === 'checklist' && <Checklist onLetter={openLetter} />}
        {tab === 'pedidos' && <Letters key={letterPreset?.kind + (letterPreset?.entity ?? '')} preset={letterPreset} />}
      </div>
    </>
  )
}

function Steps() {
  const { vault, update } = useVault()
  const pack = useCountry()
  // Países sem guia próprio mostram o de Portugal, com aviso.
  const guide = pack.guide ?? countries[0].guide!
  const [open, setOpen] = useState<string | null>(guide.steps.find(s => !vault.guideSteps[s.id])?.id ?? null)
  const done = guide.steps.filter(s => vault.guideSteps[s.id]).length

  return (
    <>
      <StaleNotice />

      <section className="card tint-sky">
        <span className="badge accent" style={{ width: 'fit-content' }}>{guide.law}</span>
        <p className="small">{guide.summary}</p>
        <div className="row"><div className="grow"><Progress value={done / guide.steps.length} /></div><span className="xs muted">{done}/{guide.steps.length}</span></div>
      </section>

      <details className="card flat">
        <summary style={{ fontWeight: 650, cursor: 'pointer' }}>{tr('Quem pode pedir?')}</summary>
        <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
          {guide.eligibility.map(e => <li key={e}>{e}</li>)}
        </ul>
      </details>

      <Link to="/nome" className="card tint-accent row" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Icon name="sparkle" />
        <div className="grow"><h3>{tr('Ainda a escolher o nome?')}</h3><p className="small muted">{tr('Experimenta-o antes de o oficializar.')}</p></div>
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
                    {s.where && <p className="small"><b>{tr('Onde:')}</b> {s.where}</p>}
                    {s.cost && <p className="small"><b>{tr('Custo:')}</b> {s.cost}</p>}
                    {s.time && <p className="small"><b>{tr('Prazo:')}</b> {s.time}</p>}
                    {s.docs && (
                      <div className="stack" style={{ gap: 4 }}>
                        <b className="small">{tr('Leva contigo:')}</b>
                        {s.docs.map(d => <span key={d} className="small">• {d}</span>)}
                      </div>
                    )}
                    {s.link && <a className="small row" href={s.link.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={16} />{s.link.label}</a>}
                    <button className={'btn sm ' + (isDone ? 'secondary' : '')}
                      onClick={() => {
                        update(v => ({ ...v, guideSteps: { ...v.guideSteps, [s.id]: !isDone } }))
                        if (!isDone) setOpen(guide.steps[i + 1]?.id ?? null)
                      }}>
                      {isDone ? tr('Marcar como por fazer') : tr('Feito ✓')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="xs muted">{tr('Informação revista em')}{' '}{guide.reviewedAt}{tr('. Não substitui aconselhamento jurídico: confirma valores e prazos nas fontes oficiais. A ILGA Portugal tem apoio jurídico gratuito.')}</p>
    </>
  )
}

function Checklist({ onLetter }: { onLetter: (i: ChecklistItem) => void }) {
  const { vault, update } = useVault()
  const pt = useCountry().code === 'PT'
  const info = useCountryInfo()
  const list = pt ? checklistPT : info?.entities ?? []
  const groups = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>()
    for (const c of list) m.set(c.group, [...(m.get(c.group) ?? []), c])
    return [...m.entries()]
  }, [list])
  const done = list.filter(c => vault.checklist[c.id]).length
  if (!list.length) return <NoCountryInfo what={tr('A lista de entidades a atualizar')} />

  return (
    <>
      <section className="card tint-mint">
        <h3>{pt ? tr('Depois do novo Cartão de Cidadão') : tr('Depois dos novos documentos')}</h3>
        <p className="small">{pt ? tr('Tudo o que costuma ser preciso atualizar. Em cada entidade podes gerar o pedido já escrito.') : tr('Tudo o que costuma ser preciso atualizar no teu país.')}</p>
        <div className="row"><div className="grow"><Progress value={done / list.length} /></div><span className="xs muted">{done}/{list.length}</span></div>
        {done === list.length && <p className="small" style={{ fontWeight: 650 }}>{tr('🎉 Tudo atualizado. Que conquista!')}</p>}
      </section>
      {groups.map(([group, items]) => (
        <section key={group} className="stack">
          <h3 className="muted small" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{tr(group)}</h3>
          <div className="list">
            {items.map(item => {
              const on = !!vault.checklist[item.id]
              return (
                <div key={item.id} className="item" style={{ alignItems: 'flex-start' }}>
                  <Check on={on} label={item.label} onToggle={() => update(v => ({ ...v, checklist: { ...v.checklist, [item.id]: !on } }))} />
                  <div className="grow stack" style={{ gap: 2 }}>
                    <h3 style={{ opacity: on ? .55 : 1 }}>{item.label}</h3>
                    <p className="small muted">{item.how}</p>
                    {pt && item.letter && !on && (
                      <button className="btn ghost sm" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => onLetter(item)}>
                        <Icon name="doc" size={16} /> {tr('Gerar pedido')}</button>
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
  const full = tr('Assunto: {0}\n\n{1}', letter.subject, letter.body)

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: letter.subject, text: letter.body }) } catch { /* cancelado */ } }
    else if (await copyText(full)) toast(tr('Copiado'))
  }
  const download = () => {
    const blob = new Blob([full], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = tr('pedido-{0}.txt', (entity || 'entidade').toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <CountryNotice part="letters" />
      <section className="card tint-accent">
        <h3>{tr('Pedidos já escritos')}</h3>
        <p className="small">{tr('Com base no direito de retificação do RGPD. Os teus dados ficam guardados só neste telemóvel para não teres de os escrever outra vez.')}</p>
      </section>
      <div className="chips">
        {letterKinds.map(k => <button key={k.id} className={'chip' + (kind === k.id ? ' on' : '')} onClick={() => setKind(k.id)}>{k.label}</button>)}
      </div>
      <div className="stack-lg">
        {kind !== 'referral' && (
          <label className="field">{tr('Nome anterior')}<input className="input" value={fields.oldName} onChange={e => setStored('oldName', e.target.value)} autoComplete="off" />
          </label>
        )}
        <label className="field">{kind === 'referral' ? tr('O teu nome') : tr('Nome atual')}
          <input className="input" value={fields.newName} onChange={e => setStored('newName', e.target.value)} autoComplete="off" />
        </label>
        <label className="field">{kind === 'referral' ? tr('Nome do/a médico/a') : tr('Entidade')}
          <input className="input" value={entity} onChange={e => setEntity(e.target.value)} placeholder={kind === 'referral' ? tr('Dr./Dra. …') : tr('Ex.: Banco X')} />
        </label>
        <label className="field">{kind === 'referral' ? tr('N.º de utente (opcional)') : tr('N.º de cliente, aluno/a ou processo (opcional)')}
          <input className="input" value={reference} onChange={e => setReference(e.target.value)} autoComplete="off" />
        </label>
        <div className="grid2">
          <label className="field">{tr('Localidade')}<input className="input" value={fields.city} onChange={e => setStored('city', e.target.value)} /></label>
          <label className="field">{tr('E-mail (opcional)')}<input className="input" type="email" value={fields.email} onChange={e => setStored('email', e.target.value)} /></label>
        </div>
      </div>
      <div className="letter" aria-label={tr('Pré-visualização do pedido')}><b>{tr('Assunto:')}{' '}{letter.subject}</b>{'\n\n'}{letter.body}</div>
      <div className="grid2">
        <button className="btn" onClick={async () => toast((await copyText(full)) ? tr('Copiado') : tr('Não foi possível copiar'))}><Icon name="copy" size={18} />{tr('Copiar')}</button>
        <button className="btn secondary" onClick={share}><Icon name="share" size={18} />{tr('Partilhar')}</button>
        <a className="btn secondary" href={`mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`}>{tr('E-mail')}</a>
        <button className="btn secondary" onClick={download}>{tr('Descarregar')}</button>
      </div>
    </>
  )
}
