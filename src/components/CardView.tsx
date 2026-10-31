import type { KnowState, SharedPayload, SupportCard, TransitionPlan } from '../lib/types'
import { Check, fmtDate } from './ui'
import { Icon } from './Icon'

export const knowLabels: Record<KnowState, string> = { sim: 'Sabe', nao: 'Não sabe: não fales disto', ainda: 'Ainda não: eu conto' }

export function SupportCardView({ card }: { card: SupportCard }) {
  const secret = card.whoKnows.filter(w => w.state !== 'sim')
  return (
    <div className="stack">
      <section className="hero" style={{ padding: 18 }}>
        <div className="stack" style={{ gap: 4, position: 'relative', zIndex: 1 }}>
          <span className="small muted">Como me podes apoiar</span>
          <h1>{card.name}</h1>
          {card.pronouns && <span className="badge" style={{ background: 'var(--hero-glass)', color: 'var(--hero-ink)', width: 'fit-content' }}>{card.pronouns}</span>}
          {card.message && <p className="small" style={{ marginTop: 6 }}>“{card.message}”</p>}
        </div>
      </section>
      {card.helps.length > 0 && (
        <section className="card tint-mint">
          <h3>O que me ajuda</h3>
          <ul className="tag-list small">{card.helps.map(h => <li key={h}><Icon name="check" size={18} />{h}</li>)}</ul>
        </section>
      )}
      {card.hurts.length > 0 && (
        <section className="card tint-rose">
          <h3>O que me magoa</h3>
          <ul className="tag-list small">{card.hurts.map(h => <li key={h}><Icon name="x" size={18} />{h}</li>)}</ul>
        </section>
      )}
      {card.whoKnows.length > 0 && (
        <section className="card">
          <h3>Quem já sabe</h3>
          {secret.length > 0 && <p className="small"><b>Atenção:</b> não fales disto com {secret.map(s => s.who).join(', ')}.</p>}
          <div className="stack" style={{ gap: 8 }}>
            {card.whoKnows.map(w => (
              <div key={w.id} className="row between"><span className="small">{w.who}</span><span className={'know ' + w.state}>{knowLabels[w.state]}</span></div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

const tellLabels = { eu: 'Eu conto', outra: 'Contas tu, como combinado', juntos: 'Contamos juntos' }

export function PlanView({ plan, checks, onToggle }: { plan: TransitionPlan; checks?: Record<string, boolean>; onToggle?: (id: string) => void }) {
  const done = plan.systems.filter(s => checks?.[s.id]).length
  return (
    <section className="card">
      <div className="row between">
        <h3>Plano {plan.context === 'escola' ? 'na escola' : 'no trabalho'}{plan.org ? ` · ${plan.org}` : ''}</h3>
        <Icon name={plan.context === 'escola' ? 'book' : 'briefcase'} />
      </div>
      {plan.startDate && <p className="small"><b>A partir de {fmtDate(plan.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}</b> uso o novo nome.</p>}
      <p className="small"><b>Quem comunica:</b> {tellLabels[plan.whoTells]}{plan.howTell ? `. ${plan.howTell}` : ''}</p>
      {plan.systems.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="row between"><b className="small">O que atualizar</b>{checks && <span className="xs muted">{done}/{plan.systems.length}</span>}</div>
          {plan.systems.map(s => (
            <div key={s.id} className="row" style={{ gap: 10 }}>
              {onToggle ? <Check on={!!checks?.[s.id]} onToggle={() => onToggle(s.id)} label={s.label} /> : <Icon name="check" size={18} />}
              <span className="small">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      {plan.facilities && <p className="small"><b>Casas de banho e balneários:</b> {plan.facilities}</p>}
      {plan.contact && <p className="small"><b>Pessoa de referência:</b> {plan.contact}</p>}
      {plan.confidential && <p className="small tint-amber" style={{ padding: 10, borderRadius: 12 }}><b>Confidencial:</b> {plan.confidential}</p>}
    </section>
  )
}

export function PayloadView({ payload, checks, onToggle }: { payload: SharedPayload; checks?: Record<string, boolean>; onToggle?: (id: string) => void }) {
  return (
    <div className="stack">
      {payload.card && <SupportCardView card={payload.card} />}
      {payload.plan && <PlanView plan={payload.plan} checks={checks} onToggle={onToggle} />}
    </div>
  )
}
