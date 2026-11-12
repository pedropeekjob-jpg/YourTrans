import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { Icon } from '../components/Icon'
import { Seg } from '../components/ui'
import { monthsSince } from '../data/healthPath'
import { effectSources, effects, onsetLabel, phaseOf, phases, type Hormone } from '../data/hormoneEffects'
import { tr } from '../i18n'

const START = 'hor-inicio'

/** O que esperar das hormonas, fase a fase, com o mês em que a pessoa está (se indicar quando começou). */
export function HormonePhases() {
  const { vault, update } = useVault()
  const hp = vault.healthPath
  const hormone: Hormone = hp.hormone ?? 'estrogenio'
  const since = hp.steps[START]?.since
  const month = since ? monthsSince(since) : undefined
  const current = month === undefined ? undefined : phases.find(p => month >= p.from && month < p.to)?.id
  const setHormone = (h: Hormone) => update(v => ({ ...v, healthPath: { ...v.healthPath, hormone: h } }))
  const setStart = (d: string) => update(v => ({
    ...v, healthPath: { ...v.healthPath, steps: { ...v.healthPath.steps, [START]: { ...v.healthPath.steps[START], since: d || undefined, done: d ? true : v.healthPath.steps[START]?.done } } },
  }))
  const list = effects[hormone]

  return (
    <>
      <section className="card tint-sky">
        <h3>{tr('O que esperar das hormonas')}</h3>
        <p className="small">{tr('Tempos típicos das guidelines clínicas. Cada corpo tem o seu ritmo: idade, genética e dose mudam muito o que acontece e quando. Não é uma corrida.')}</p>
      </section>
      <Seg<Hormone> value={hormone} onChange={setHormone} options={[
        { id: 'estrogenio', label: tr('Estrogénio') },
        { id: 'testosterona', label: tr('Testosterona') },
      ]} />
      <label className="row small" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="muted">{tr('Comecei a tomar em')}</span>
        <input type="date" className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 8px' }} value={since ?? ''}
          max={new Date().toISOString().slice(0, 10)} onChange={e => setStart(e.target.value)} aria-label={tr('Data de início das hormonas')} />
        {month !== undefined && <span className="badge accent">{month === 0 ? tr('primeiro mês') : tr('mês {0}', month + 1)}</span>}
      </label>

      <div className="timeline">
        {phases.map((p, i) => {
          const items = list.filter(e => e.onset[1] > 0 && phaseOf(e) === p.id)
          const now = current === p.id
          return (
            <div key={p.id} className="tl">
              <div className="rail"><div className={'dot' + (now ? ' done' : '')}>{i + 1}</div><div className="line" /></div>
              <div className="content">
                <h3>{p.title}{now && <span className="badge accent" style={{ marginLeft: 8 }}>{tr('Estás aqui')}</span>}</h3>
                {items.length === 0 && <p className="small muted">{tr('Sem mudanças novas a começar: as que já começaram continuam a avançar.')}</p>}
                {items.map(e => (
                  <div key={e.id} className="card flat" style={{ padding: 12, gap: 4 }}>
                    <div className="row between" style={{ gap: 8 }}>
                      <b className="small">{e.title}</b>
                      {e.permanent && <span className="badge amber">{tr('Permanente')}</span>}
                    </div>
                    <span className="xs muted">{tr('Começa: {0} · Máximo: {1}', onsetLabel(e), e.max)}</span>
                    {e.note && <span className="small">{e.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {list.filter(e => e.onset[1] === 0).map(e => (
        <p key={e.id} className="small card flat" style={{ padding: 12 }}><b>{e.title}.</b> {e.note}</p>
      ))}

      <section className="card tint-amber">
        <h3>{tr('Bom saber')}</h3>
        <p className="small">{tr('"Permanente" quer dizer que normalmente se mantém mesmo que pares as hormonas. As outras mudanças tendem a reverter.')}</p>
        <p className="small">{tr('As hormonas podem reduzir a fertilidade. Se quiseres guardar óvulos ou esperma, fala com a equipa antes de começar.')}</p>
        <p className="small">{tr('Se só queres algumas mudanças, fala com a equipa: nem todas se conseguem separar umas das outras.')}</p>
      </section>

      <div className="grid2">
        <Link to="/saude?tab=tratamento&sub=efeitos" className="btn secondary sm"><Icon name="chart" size={16} />{tr('Registar efeitos')}</Link>
        <Link to={`/comunidade?tab=testemunhos&tema=${hormone === 'estrogenio' ? 'hormonas-e' : 'hormonas-t'}`} className="btn secondary sm"><Icon name="people" size={16} />{tr('Como foi para outras pessoas')}</Link>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <b className="xs">{tr('Fontes:')}</b>
        {effectSources.map(s => <a key={s.url} className="xs row" style={{ gap: 6 }} href={s.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{s.label}</a>)}
      </div>
      <p className="xs muted">{tr('Informação geral, não substitui a tua equipa clínica. Fala com ela sobre doses, riscos e análises.')}</p>
    </>
  )
}
