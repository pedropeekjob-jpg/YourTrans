import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiEnabled, type ExperienceStat, type StageQuestion, type StageReviewStat } from '../lib/api'
import { useProviders } from '../lib/useProviders'
import { Icon } from './Icon'
import { Seg, Sheet, fmtDate, useToast } from './ui'
import { ShareNote } from '../pages/Privacy'
import { scoreBadge } from '../pages/Health'
import type { Track } from '../data/healthPath'
import { locale, tr } from '../i18n'

/* O que a comunidade conta sobre cada parte do percurso: intervalos de custos e
   esperas (só com 3+ relatos), avaliações da etapa e onde se opera. */

export const materialLabels: Record<string, string> = {
  colete: tr('Colete ou faixa de compressão'),
  dilatadores: tr('Dilatadores'),
  almofada: tr('Almofada'),
  pensos: tr('Pensos e material de penso'),
  outro: tr('Outro material'),
}

export const stageQuestionLabels: Record<StageQuestion, string> = {
  respeito: tr('Trataram-me com respeito (nome e pronomes certos)?'),
  informacao: tr('Explicaram-me bem os passos e as opções?'),
  tempoRazoavel: tr('O tempo de espera foi razoável?'),
  recomendaria: tr('Recomendaria este caminho a outras pessoas?'),
}

let cache: { exp: ExperienceStat[]; reviews: StageReviewStat[] } | null = null
let pending: Promise<void> | null = null

/** Carrega uma vez os dados agregados da comunidade (partilhados por todas as partes). */
export function useTrackCommunity() {
  const [data, setData] = useState(cache)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!apiEnabled || cache) return
    pending ??= Promise.all([api.experiences(), api.stageReviews()]).then(([exp, reviews]) => { cache = { exp, reviews } })
    pending.then(() => setData(cache)).catch(() => { pending = null; setFailed(true) })
  }, [])
  const refresh = () => { cache = null; pending = null; Promise.all([api.experiences(), api.stageReviews()]).then(([exp, reviews]) => { cache = { exp, reviews }; setData(cache) }).catch(() => {}) }
  return { data, failed: failed || !apiEnabled, refresh }
}

export const eur = (n: number) => n.toLocaleString(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const months = (n: number) => (n === 1 ? tr('1 mês') : tr('{0} meses', n))

function statLine(s: ExperienceStat): { label: string; value: string } {
  const fmt = s.kind === 'espera' ? months : eur
  const label = s.kind === 'espera' ? (s.sector === 'SNS' ? tr('Espera no SNS') : tr('Espera no privado'))
    : s.kind === 'custo' ? tr('Custo no privado') : materialLabels[s.item ?? 'outro'] ?? tr('Outro material')
  return { label, value: tr('{0} a {1} (mediana {2})', fmt(s.min), fmt(s.max), fmt(s.median)) }
}

export function TrackCommunity({ track }: { track: Track }) {
  const { data, failed, refresh } = useTrackCommunity()
  const { providers } = useProviders()
  const toast = useToast()
  const [sheet, setSheet] = useState(false)
  const stats = (data?.exp ?? []).filter(s => s.track === track.id)
  const review = data?.reviews.find(r => r.track === track.id)
  const surgeons = track.group === 'cirurgia' ? providers.filter(p => p.kind === 'Cirurgia') : []

  const denounce = async (id: string) => {
    try { await api.report(id); toast(tr('Obrigado. Vai ser revisto pela moderação.')); refresh() } catch (e) { toast((e as Error).message) }
  }

  return (
    <details className="card flat">
      <summary style={{ fontWeight: 650, cursor: 'pointer' }}>{tr('O que a comunidade conta')}</summary>
      <div className="stack" style={{ gap: 10, marginTop: 8 }}>
        {failed ? (
          <p className="small muted">{tr('Os relatos da comunidade aparecem quando houver ligação ao servidor.')}</p>
        ) : !data ? (
          <p className="small muted">{tr('A carregar…')}</p>
        ) : (
          <>
            {stats.length === 0 ? (
              <p className="small muted">{tr('Ainda não há relatos suficientes de custos ou esperas. Mostramos intervalos a partir de 3 relatos, para ninguém ser identificado.')}</p>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {stats.map(s => {
                  const l = statLine(s)
                  return (
                    <div key={s.kind + s.sector + (s.item ?? '')} className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
                      <span className="small"><b>{l.label}:</b> {l.value}</span>
                      <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{tr('{0} relatos · {1}', s.n, s.fromYear === s.toYear ? s.fromYear : `${s.fromYear}–${s.toYear}`)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {review?.scores && (
              <div className="stack" style={{ gap: 4 }}>
                <b className="small">{tr('Como correu esta etapa ({0} avaliações)', review.n)}</b>
                {(Object.keys(stageQuestionLabels) as StageQuestion[]).map(q => (
                  <span key={q} className="small">{Math.round((review.scores![q] ?? 0) * 100)}% {tr('sim')} · {stageQuestionLabels[q]}</span>
                ))}
              </div>
            )}
            {review && review.comments.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                {review.comments.map(c => (
                  <div key={c.id} className="card flat" style={{ padding: 10, gap: 4 }}>
                    <p className="small">“{c.comment}”</p>
                    <div className="row between">
                      <span className="xs muted">{fmtDate(c.month + '-01T00:00:00', { month: 'short', year: 'numeric' })}</span>
                      <button className="btn ghost sm" style={{ padding: 0, minHeight: 0 }} onClick={() => denounce(c.id)}>{tr('Denunciar')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {surgeons.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            <b className="small">{tr('Onde se opera')}</b>
            {surgeons.map(p => (
              <Link key={p.id} to={`/saude/${p.id}`} className="small row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {p.name}{p.worksAt?.length ? <span className="xs muted">({p.worksAt.join(', ')})</span> : null} <span className="badge">{tr(p.sector)}</span>{scoreBadge(p)}
              </Link>
            ))}
            <Link to="/saude?tab=diretorio&tipo=Cirurgia" className="xs muted">{tr('Conheces outro hospital, clínica ou equipa? Sugere no diretório (revisto por uma pessoa).')}</Link>
          </div>
        )}
        <button className="btn secondary sm" style={{ justifySelf: 'start' }} onClick={() => setSheet(true)}>
          <Icon name="plus" size={16} />{tr('Contar a minha experiência')}
        </button>
      </div>
      <ExperienceSheet track={track} open={sheet} onClose={() => setSheet(false)} onSent={refresh} />
    </details>
  )
}

type Mode = 'avaliar' | 'espera' | 'custo' | 'material'

export function ExperienceSheet({ track, open, onClose, onSent }: { track: Track; open: boolean; onClose: () => void; onSent: () => void }) {
  const toast = useToast()
  const year = new Date().getFullYear()
  const surgery = track.group === 'cirurgia'
  const [mode, setMode] = useState<Mode>('avaliar')
  const [sector, setSector] = useState<'SNS' | 'Privado'>('SNS')
  const [value, setValue] = useState('')
  const [yr, setYr] = useState(year)
  const [item, setItem] = useState('colete')
  const [answers, setAnswers] = useState<Partial<Record<StageQuestion, boolean>>>({})
  const [comment, setComment] = useState('')
  const n = parseInt(value.replace(/\D/g, ''), 10)
  const allAnswered = (Object.keys(stageQuestionLabels) as StageQuestion[]).every(q => answers[q] !== undefined)
  const valid = mode === 'avaliar' ? allAnswered : Number.isFinite(n) && (mode === 'espera' ? n >= 0 && n <= 240 : n >= 1)

  const submit = async () => {
    if (!apiEnabled) { toast(tr('O envio fica disponível quando o servidor estiver ligado')); return }
    try {
      const r = mode === 'avaliar'
        ? await api.sendStageReview(track.id, answers as Record<StageQuestion, boolean>, comment)
        : await api.sendExperience({ track: track.id, kind: mode, sector: mode === 'espera' ? sector : 'Privado', year: yr, value: n, item: mode === 'material' ? item : undefined })
      toast(r.published ? tr('Obrigado! Já conta para a comunidade.') : tr('Obrigado! Vai ser revisto pela moderação.'))
      setValue(''); setComment(''); setAnswers({})
      onSent(); onClose()
    } catch (e) { toast((e as Error).message) }
  }

  const modes: { id: Mode; label: string }[] = [
    { id: 'avaliar', label: tr('Avaliar') },
    { id: 'espera', label: tr('Espera') },
    ...(surgery ? [{ id: 'custo' as Mode, label: tr('Custo') }, { id: 'material' as Mode, label: tr('Material') }] : []),
  ]

  return (
    <Sheet open={open} onClose={onClose} title={track.title}>
      <Seg<Mode> value={mode} onChange={setMode} options={modes} />
      {mode === 'avaliar' ? (
        <>
          {(Object.keys(stageQuestionLabels) as StageQuestion[]).map(q => (
            <div key={q} className="stack" style={{ gap: 6 }}>
              <span className="small">{stageQuestionLabels[q]}</span>
              <div className="chips">
                {[true, false].map(v => (
                  <button key={String(v)} className={'chip' + (answers[q] === v ? ' on' : '')} onClick={() => setAnswers({ ...answers, [q]: v })}>{v ? tr('Sim') : tr('Não')}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="field">{tr('Comentário (opcional)')}<textarea className="input" value={comment} maxLength={600} onChange={e => setComment(e.target.value)} placeholder={tr('Sem nomes de pessoas nem dados que te identifiquem')} /></label>
        </>
      ) : (
        <>
          {mode === 'espera' && (
            <div className="chips">{(['SNS', 'Privado'] as const).map(s => <button key={s} className={'chip' + (sector === s ? ' on' : '')} onClick={() => setSector(s)}>{tr(s)}</button>)}</div>
          )}
          {mode === 'material' && (
            <label className="field">{tr('O quê')}<select className="input" value={item} onChange={e => setItem(e.target.value)}>
              {Object.entries(materialLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          )}
          <label className="field">
            {mode === 'espera' ? tr('Quantos meses esperaste (do pedido à consulta ou cirurgia)?') : mode === 'custo' ? tr('Quanto pagaste no total, em euros?') : tr('Quanto custou, em euros?')}
            <input className="input" inputMode="numeric" value={value} onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
          <label className="field">{tr('Ano')}<select className="input" value={yr} onChange={e => setYr(Number(e.target.value))}>
            {Array.from({ length: 6 }, (_, i) => year - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select></label>
          <p className="xs muted">{tr('Só guardamos o número, o ano e a parte do percurso. Aparece apenas como intervalo, juntamente com pelo menos mais 2 relatos.')}</p>
        </>
      )}
      <ShareNote />
      <button className="btn block" disabled={!valid} onClick={submit}>{tr('Enviar')}</button>
    </Sheet>
  )
}
