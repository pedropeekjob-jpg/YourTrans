import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, useToast } from '../components/ui'
import { reviewQuestionLabels, reviewQuestions, type ReviewQuestion } from '../data/health'
import { useProviders } from '../lib/useProviders'
import { api, apiEnabled } from '../lib/api'

export function ProviderPage() {
  const { id } = useParams()
  const { providers } = useProviders()
  const toast = useToast()
  const p = providers.find(x => x.id === id)
  const [answers, setAnswers] = useState<Partial<Record<ReviewQuestion, boolean>>>({})
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)

  if (!p) return (<><TopBar back title="Saúde" /><div className="page"><Empty icon="heart" title="Não encontrado" /></div></>)

  const complete = reviewQuestions.every(q => answers[q] !== undefined)
  const submit = async () => {
    if (!apiEnabled) { toast('As avaliações ficam disponíveis quando o servidor estiver ligado'); return }
    try {
      await api.review(p.id, answers as Record<ReviewQuestion, boolean>, comment)
      setSent(true)
    } catch (e) { toast((e as Error).message) }
  }

  return (
    <>
      <TopBar back title="" />
      <div className="page">
        <section className="stack">
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="badge">{p.kind}</span><span className="badge">{p.district}</span><span className="badge accent">{p.sector}</span>
            {p.source === 'pública' && <span className="badge mint">Informação pública</span>}
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{p.name}</h1>
          {p.notes && <p className="muted">{p.notes}</p>}
        </section>

        <div className="grid2">
          {p.phone && <a className="btn" href={`tel:${p.phone}`}><Icon name="phone" size={18} />Ligar</a>}
          {p.url && <a className="btn secondary" href={p.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={18} />Site</a>}
          {p.address && <a className="btn secondary" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(p.address)}`} target="_blank" rel="noreferrer noopener"><Icon name="map" size={18} />Mapa</a>}
        </div>

        {p.scores && p.reviewCount ? (
          <section className="card">
            <h3>O que diz a comunidade <span className="muted small">({p.reviewCount})</span></h3>
            {reviewQuestions.map(q => {
              const v = p.scores?.[q]
              if (v === undefined) return null
              return (
                <div key={q} className="stack" style={{ gap: 4 }}>
                  <div className="row between small"><span>{reviewQuestionLabels[q]}</span><b>{Math.round(v * 100)}%</b></div>
                  <div className="progress"><div style={{ width: `${v * 100}%` }} /></div>
                </div>
              )
            })}
          </section>
        ) : (
          <p className="small muted">Ainda sem avaliações publicadas. Sê a primeira pessoa.</p>
        )}

        <section className="card">
          <h3>Já foste? Conta como correu</h3>
          {sent ? (
            <p className="small">Obrigado! A tua avaliação vai ser revista pela moderação e publicada de forma anónima.</p>
          ) : (
            <>
              {reviewQuestions.map(q => (
                <div key={q} className="stack" style={{ gap: 6 }}>
                  <span className="small" style={{ fontWeight: 600 }}>{reviewQuestionLabels[q]}</span>
                  <div className="grid2">
                    <button className={'chip' + (answers[q] === true ? ' on' : '')} onClick={() => setAnswers({ ...answers, [q]: true })}>Sim</button>
                    <button className={'chip' + (answers[q] === false ? ' on' : '')} onClick={() => setAnswers({ ...answers, [q]: false })}>Não</button>
                  </div>
                </div>
              ))}
              <label className="field">Comentário (opcional)
                <textarea className="input" value={comment} maxLength={600} onChange={e => setComment(e.target.value)} placeholder="Sem nomes de pessoas nem dados que te identifiquem" />
              </label>
              <button className="btn" disabled={!complete} onClick={submit}>Enviar avaliação</button>
              <p className="xs muted">Anónima. Comentários com ofensas, dados pessoais ou ataques a profissionais identificáveis são rejeitados.</p>
            </>
          )}
        </section>
      </div>
    </>
  )
}
