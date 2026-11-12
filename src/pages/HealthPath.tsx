import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Check, Progress, Seg, Sheet, fmtDate } from '../components/ui'
import { chosenSteps, monthsSince, trackGroupLabels, tracks, travelSupport, waitingList, type HealthStep, type Source, type Track, type TrackGroup } from '../data/healthPath'
import { TrackCommunity } from '../components/TrackCommunity'
import { HormonePhases } from './HormonePhases'
import { SurgeryCompare } from './SurgeryCompare'
import { tr } from '../i18n'

type Tab = 'meu' | 'comparar' | 'fases' | 'espera' | 'apoios'

/** Percurso de saúde pessoal: a pessoa escolhe as partes que quer e marca os passos. */
export function HealthPath() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'meu'
  return (
    <>
      <TopBar title={tr('Percurso de saúde')} back />
      <div className="page">
        <Seg<Tab> value={tab} onChange={t => setParams({ tab: t }, { replace: true })} options={[
          { id: 'meu', label: tr('O meu percurso') },
          { id: 'comparar', label: tr('SNS ou privado') },
          { id: 'fases', label: tr('O que esperar') },
          { id: 'espera', label: tr('Lista de espera') },
          { id: 'apoios', label: tr('Deslocações') },
        ]} />
        {tab === 'meu' && <MyPath />}
        {tab === 'comparar' && <SurgeryCompare />}
        {tab === 'fases' && <HormonePhases />}
        {tab === 'espera' && <InfoSections sections={waitingList.sections} sources={waitingList.sources} reviewed={waitingList.reviewedAt} />}
        {tab === 'apoios' && <InfoSections sections={travelSupport.sections} sources={travelSupport.sources} reviewed={waitingList.reviewedAt} />}
      </div>
    </>
  )
}

function waitLabel(since: string): string {
  const m = monthsSince(since)
  return m === 0 ? tr('à espera há menos de um mês') : m === 1 ? tr('à espera há 1 mês') : tr('à espera há {0} meses', m)
}

function MyPath() {
  const { vault } = useVault()
  const state = vault.healthPath
  const [choosing, setChoosing] = useState(false)
  const items = chosenSteps(state)
  const done = items.filter(i => state.steps[i.step.id]?.done).length
  const waiting = items.filter(i => i.step.waits && state.steps[i.step.id]?.since && !state.steps[i.step.id]?.done)
  const chosen = tracks.filter(t => state.tracks.includes(t.id))

  return (
    <>
      <section className="card tint-sky">
        <h3>{tr('O teu percurso, ao teu ritmo')}</h3>
        <p className="small">{tr('Cada pessoa decide até onde quer ir. Nem todas querem hormonas ou cirurgias, e está tudo bem. Escolhe só o que faz sentido para ti: podes mudar quando quiseres. Fica guardado só neste aparelho.')}</p>
        {chosen.length > 0 && (
          <div className="row"><div className="grow"><Progress value={items.length ? done / items.length : 0} /></div><span className="xs muted">{done}/{items.length}</span></div>
        )}
        <button className={'btn sm' + (chosen.length ? ' secondary' : '')} style={{ justifySelf: 'start' }} onClick={() => setChoosing(true)}>
          <Icon name="plus" size={16} />{chosen.length ? tr('Mudar o que quero incluir') : tr('Escolher o que quero incluir')}
        </button>
      </section>

      {waiting.length > 0 && (
        <section className="card tint-amber">
          <h3>{tr('À espera')}</h3>
          {waiting.map(w => (
            <p key={w.step.id} className="small"><b>{w.track.title}:</b> {w.step.title} · {waitLabel(state.steps[w.step.id]!.since!)}</p>
          ))}
          <Link to="/percurso/saude?tab=espera" className="small">{tr('Como funciona a lista de espera e o vale-cirurgia')}</Link>
        </section>
      )}

      {chosen.map(t => <TrackCard key={t.id} track={t} />)}

      <p className="xs muted">{tr('Informação geral, revista em {0}. O percurso varia entre hospitais e o que a tua equipa clínica disser prevalece sempre.', waitingList.reviewedAt)}</p>
      <TrackChooser open={choosing} onClose={() => setChoosing(false)} />
    </>
  )
}

function TrackCard({ track }: { track: Track }) {
  const { vault } = useVault()
  const steps = vault.healthPath.steps
  const done = track.steps.filter(s => steps[s.id]?.done).length
  const [open, setOpen] = useState(done < track.steps.length)

  return (
    <section className="card">
      <button className="row" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
        onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="grow stack" style={{ gap: 2 }}>
          <h3>{track.title}</h3>
          <span className="xs muted">{tr('{0} de {1} passos', done, track.steps.length)}</span>
        </div>
        <Icon name="chevron" size={18} className={open ? 'rot' : ''} />
      </button>
      {open && (
        <>
          <p className="small muted">{track.intro}</p>
          <div className="list">
            {track.steps.map(s => <StepRow key={s.id} step={s} />)}
          </div>
          {track.recovery && (
            <details className="card flat">
              <summary style={{ fontWeight: 650, cursor: 'pointer' }}>{tr('Recuperação: tempos e o que vais precisar')}</summary>
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                {track.recovery.times.map(x => <span key={x} className="small">• {x}</span>)}
                <b className="small" style={{ marginTop: 6 }}>{tr('Ter em casa:')}</b>
                {track.recovery.need.map(x => <span key={x} className="small">• {x}</span>)}
                <p className="small">{tr('Onde comprar: em farmácias, ortopedias ou lojas de material médico. Pergunta antes à equipa: às vezes dão o primeiro no hospital. Os preços que a comunidade pagou estão em "O que a comunidade conta".')}</p>
                <p className="xs muted">{tr('Valores típicos de fontes clínicas. Cada equipa tem o seu plano: segue sempre o que te disserem.')}</p>
                <SourceList sources={track.recovery.sources} />
              </div>
            </details>
          )}
          <TrackCommunity track={track} />
          {track.group === 'cirurgia' && (
            <>
              <Link to="/percurso/saude?tab=comparar" className="small row"><Icon name="chart" size={16} />{tr('Comparar SNS e privado')}</Link>
              <Link to="/percurso/saude?tab=espera" className="small row"><Icon name="doc" size={16} />{tr('Lista de espera e vale-cirurgia')}</Link>
            </>
          )}
        </>
      )}
      {!open && done === track.steps.length && <p className="small">{tr('🎉 Concluído.')}</p>}
    </section>
  )
}

function StepRow({ step }: { step: HealthStep }) {
  const { vault, update } = useVault()
  const st = vault.healthPath.steps[step.id] ?? {}
  const set = (patch: { done?: boolean; since?: string }) => update(v => ({
    ...v, healthPath: { ...v.healthPath, steps: { ...v.healthPath.steps, [step.id]: { ...v.healthPath.steps[step.id], ...patch } } },
  }))
  const on = !!st.done
  return (
    <div className="item" style={{ alignItems: 'flex-start' }}>
      <Check on={on} label={step.title} onToggle={() => set({ done: !on })} />
      <div className="grow stack" style={{ gap: 4 }}>
        <h3 style={{ opacity: on ? .55 : 1 }}>{step.title}</h3>
        {step.body && !on && <p className="small muted">{step.body}</p>}
        {step.waits && (
          <label className="row small" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="muted">{tr('Pedido ou inscrição em')}</span>
            <input type="date" className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 8px' }} value={st.since ?? ''}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => set({ since: e.target.value || undefined })} aria-label={tr('Data do pedido')} />
            {st.since && <span className={'badge' + (on ? '' : ' amber')}>{on ? fmtDate(st.since + 'T00:00:00') : waitLabel(st.since)}</span>}
          </label>
        )}
        {step.to && !on && (
          <Link to={step.to.path} className="small row" style={{ gap: 6 }}><Icon name="external" size={14} />{step.to.label}</Link>
        )}
      </div>
    </div>
  )
}

function TrackChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault, update } = useVault()
  const chosen = vault.healthPath.tracks
  const toggle = (id: string) => update(v => {
    const has = v.healthPath.tracks.includes(id)
    return { ...v, healthPath: { ...v.healthPath, tracks: has ? v.healthPath.tracks.filter(x => x !== id) : [...v.healthPath.tracks, id] } }
  })
  const groups = (Object.keys(trackGroupLabels) as TrackGroup[]).map(g => [g, tracks.filter(t => t.group === g)] as const)
  return (
    <Sheet open={open} onClose={onClose} title={tr('O que queres incluir?')}>
      <p className="small muted">{tr('Nada está escolhido à partida. Tirar uma parte não apaga o que já marcaste nela.')}</p>
      {groups.map(([g, list]) => (
        <section key={g} className="stack">
          <h3 className="muted small" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{trackGroupLabels[g]}</h3>
          <div className="list">
            {list.map(t => (
              <button key={t.id} className="item" onClick={() => toggle(t.id)} aria-pressed={chosen.includes(t.id)}>
                <span className={'check' + (chosen.includes(t.id) ? ' on' : '')}><Icon name="check" size={18} /></span>
                <span className="grow stack" style={{ gap: 2, textAlign: 'left' }}>
                  <span style={{ fontWeight: 600 }}>{t.title}</span>
                  <span className="xs muted">{t.intro}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <button className="btn block" onClick={onClose}>{tr('Feito')}</button>
    </Sheet>
  )
}

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <b className="xs">{tr('Fontes:')}</b>
      {sources.map(s => (
        <a key={s.url} className="xs row" style={{ gap: 6 }} href={s.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{s.label}</a>
      ))}
    </div>
  )
}

function InfoSections({ sections, sources, reviewed }: { sections: { title: string; body: string[] }[]; sources: Source[]; reviewed: string }) {
  return (
    <>
      {sections.map(s => (
        <section key={s.title} className="card">
          <h3>{s.title}</h3>
          {s.body.map(p => <p key={p} className="small">{p}</p>)}
        </section>
      ))}
      <SourceList sources={sources} />
      <p className="xs muted">{tr('Informação revista em {0}. As regras mudam: confirma sempre no teu hospital, no SNS 24 ou na fonte oficial.', reviewed)}</p>
    </>
  )
}
