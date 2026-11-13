// Selo Casulo: o que é, entidades registadas, registo e avaliação de cada entidade.
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, Seg, useToast } from '../components/ui'
import { SafeMap } from '../components/SafeMap'
import { PortugalOnly } from '../components/CountryInfoViews'
import { FacilityBadges } from './Safety'
import { districts } from '../data/health'
import { api, apiEnabled } from '../lib/api'
import { useEntities } from '../lib/useEntities'
import { SealBadge, TransparenteBadge } from '../components/SealBadges'
import { inPortugal, round4, type LatLng } from '../lib/geo'
import type { Facilities } from '../lib/types'
import {
  SEAL_MIN_REVIEWS, SEAL_THRESHOLD, TRANSPARENTE_EQI_URL, entityKinds, sealCommitments, sealQuestions,
  type SealCommitment, type SealQuestion,
} from '../data/seal'
import { tr } from '../i18n'

type Tab = 'sobre' | 'entidades' | 'registar'

export function Seal() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'sobre'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  return (
    <>
      <TopBar title={tr('Selo Casulo')} back />
      <div className="page">
        <PortugalOnly what={tr('O Selo Casulo')}>
          <Seg value={tab} onChange={setTab} options={[{ id: 'sobre', label: tr('O que é') }, { id: 'entidades', label: tr('Entidades') }, { id: 'registar', label: tr('Registar') }]} />
          {tab === 'sobre' && <About onTab={setTab} />}
          {tab === 'entidades' && <Entities />}
          {tab === 'registar' && <Register />}
        </PortugalOnly>
      </div>
    </>
  )
}

function About({ onTab }: { onTab: (t: Tab) => void }) {
  return (
    <>
      <section className="card tint-mint">
        <h3>{tr('Um selo dado pela comunidade')}</h3>
        <p className="small">{tr('O Selo Casulo marca locais, serviços e empresas onde pessoas trans e não binárias se sentiram respeitadas e seguras. Não se compra: a entidade compromete-se e são as pessoas que lá vão que decidem se o merece.')}</p>
      </section>
      <section className="card">
        <h3>{tr('Como funciona')}</h3>
        <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>{tr('A entidade regista-se e aceita os seis compromissos. Uma pessoa da moderação confirma que existe.')}</li>
          <li>{tr('Fica no mapa como "Em avaliação". Quem lá vai responde a quatro perguntas, de forma anónima.')}</li>
          <li>{tr('Com {0} ou mais avaliações dos últimos 2 anos e pelo menos {1}% de respostas positivas em cada pergunta, recebe o selo.', SEAL_MIN_REVIEWS, Math.round(SEAL_THRESHOLD * 100))}</li>
          <li>{tr('Se as avaliações descerem abaixo disso, o selo sai sozinho até a experiência voltar a melhorar.')}</li>
        </ol>
      </section>
      <section className="card">
        <h3>{tr('Os compromissos')}</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          {sealCommitments.map(c => <li key={c.id}>{c.label}</li>)}
        </ul>
      </section>
      <section className="card tint-accent">
        <h3>{tr('Já têm o selo TransParente?')}</h3>
        <p className="small">{tr('A plataforma TransParente certifica Entidades Queer Inclusivas (EQI). Quem tem esse selo pode indicá-lo no registo: depois de confirmado na lista da TransParente, aparece também no Casulo.')}</p>
        <a className="btn sm secondary" style={{ justifySelf: 'start' }} href={TRANSPARENTE_EQI_URL} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} />{tr('Ver as entidades da TransParente')}</a>
      </section>
      <div className="grid2">
        <button className="btn" onClick={() => onTab('entidades')}><Icon name="map" size={18} />{tr('Ver entidades')}</button>
        <button className="btn secondary" onClick={() => onTab('registar')}><Icon name="plus" size={18} />{tr('Registar entidade')}</button>
      </div>
    </>
  )
}

function Entities() {
  const { entities, loaded } = useEntities()
  const [only, setOnly] = useState(false)
  const [district, setDistrict] = useState('')
  const list = entities.filter(e => (!only || e.seal === 'selo') && (!district || e.district === district))
    .sort((a, b) => Number(b.seal === 'selo') - Number(a.seal === 'selo') || b.reviewCount - a.reviewCount)
  if (!apiEnabled) return <Empty icon="star" title={tr('Sem ligação ao servidor')} text={tr('As entidades com selo aparecem quando houver ligação.')} />
  return (
    <>
      <div className="row between" style={{ gap: 8 }}>
        <button className={'chip' + (only ? ' on' : '')} onClick={() => setOnly(!only)}>{tr('🏅 Só com selo')}</button>
        <select className="input" style={{ maxWidth: 180 }} value={district} onChange={e => setDistrict(e.target.value)} aria-label={tr('Distrito')}><option value="">{tr('Todo o país')}</option>{districts.map(d => <option key={d}>{d}</option>)}</select>
      </div>
      {list.length === 0 ? (
        <Empty icon="star" title={loaded ? tr('Ainda não há entidades aqui') : tr('A carregar…')} text={tr('Conheces um sítio que devia ter o selo? Partilha esta página com quem lá trabalha.')} />
      ) : (
        <div className="stack">
          {list.map(e => (
            <Link key={e.id} to={`/selo/${e.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="stack" style={{ gap: 2 }}>
                  <h3>{e.name}</h3>
                  <span className="small muted">{tr(e.kind)} · {e.district} · {tr('{0} avaliações', e.reviewCount)}</span>
                </div>
                <Icon name="chevron" size={18} />
              </div>
              <div className="row wrap" style={{ gap: 6 }}><SealBadge status={e.seal} />{e.transparente && <TransparenteBadge link={false} />}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

const allCommitments = (c: Partial<Record<SealCommitment, boolean>>) => sealCommitments.every(x => c[x.id])

function Register() {
  const toast = useToast()
  const empty = { name: '', kind: 'Café/Restaurante', district: 'Lisboa', address: '', url: '', notes: '', contact: '', transparente: false, facilities: {} as Facilities, pos: null as LatLng | null }
  const [form, setForm] = useState(empty)
  const [commit, setCommit] = useState<Partial<Record<SealCommitment, boolean>>>({})
  const [sent, setSent] = useState(false)
  const urlOk = !form.url.trim() || /^https:\/\/\S+$/.test(form.url.trim())
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact.trim())
  const ok = form.name.trim().length >= 2 && emailOk && urlOk && allCommitments(commit)
  const setF = (k: keyof Facilities, v: Facilities[keyof Facilities]) => setForm({ ...form, facilities: { ...form.facilities, [k]: v } })

  const submit = async () => {
    if (!apiEnabled) { toast(tr('O registo fica disponível quando o servidor estiver ligado')); return }
    const { pos, ...rest } = form
    try {
      await api.registerEntity({
        ...rest, name: rest.name.trim(), contact: rest.contact.trim(), url: rest.url.trim() || undefined, address: rest.address.trim() || undefined, notes: rest.notes.trim() || undefined,
        transparente: rest.transparente || undefined, commitments: commit as Record<SealCommitment, boolean>,
        ...(pos ? { lat: round4(pos.lat), lng: round4(pos.lng) } : {}),
      })
      setSent(true)
    } catch (e) { toast((e as Error).message) }
  }

  if (sent) return (
    <section className="card tint-mint">
      <h3>{tr('Registo enviado')}</h3>
      <p className="small">{tr('Uma pessoa da moderação vai confirmar os dados e pode responder para o e-mail indicado. Depois disso, a entidade aparece no mapa como "Em avaliação".')}</p>
      <button className="btn secondary" onClick={() => { setSent(false); setForm(empty); setCommit({}) }}>{tr('Registar outra')}</button>
    </section>
  )

  return (
    <>
      <section className="card tint-accent">
        <h3>{tr('Para quem gere um espaço, serviço ou empresa')}</h3>
        <p className="small">{tr('O registo é gratuito. O selo só aparece depois de avaliações positivas de quem lá vai.')}</p>
      </section>
      <label className="field">{tr('Nome da entidade')}<input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <div className="grid2">
        <label className="field">{tr('Tipo')}<select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{entityKinds.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select></label>
        <label className="field">{tr('Distrito')}<select className="input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}>{districts.map(d => <option key={d}>{d}</option>)}</select></label>
      </div>
      <label className="field">{tr('Morada (opcional)')}<input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
      <label className="field">{tr('Site (opcional)')}<input className="input" inputMode="url" placeholder="https://" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />{!urlOk && <span className="xs" style={{ color: 'var(--rose)' }}>{tr('O endereço tem de começar por https://')}</span>}</label>
      <div className="stack" style={{ gap: 8 }}>
        <b className="small">{tr('Onde fica')}</b>
        <SafeMap pick={form.pos} onPick={p => setForm(f => ({ ...f, pos: { lat: round4(p.lat), lng: round4(p.lng) } }))} height={200} />
        <span className="small muted">{form.pos ? (inPortugal(form.pos) ? tr('Local marcado. Toca no mapa para corrigir.') : tr('Este ponto parece estar fora de Portugal.')) : tr('Toca no mapa para marcar o local (opcional).')}</span>
      </div>
      <div className="stack">
        <b className="small">{tr('Casas de banho e balneários')}</b>
        {([['wcNeutro', tr('Tem WC neutro ou individual')], ['vestiarioNeutro', tr('Tem vestiário neutro ou individual')], ['cabinesIndividuais', tr('Tem cabines individuais para trocar de roupa')]] as const).map(([k, label]) => (
          <label key={k} className="row small" style={{ gap: 10 }}><input type="checkbox" checked={!!form.facilities[k]} onChange={e => setF(k, e.target.checked)} /> {label}</label>
        ))}
      </div>
      <div className="stack">
        <b className="small">{tr('Compromissos (todos obrigatórios)')}</b>
        {sealCommitments.map(c => (
          <label key={c.id} className="row small" style={{ gap: 10, alignItems: 'flex-start' }}><input type="checkbox" checked={!!commit[c.id]} onChange={e => setCommit({ ...commit, [c.id]: e.target.checked })} /> {c.label}</label>
        ))}
      </div>
      <label className="row small" style={{ gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={form.transparente} onChange={e => setForm({ ...form, transparente: e.target.checked })} />
        <span>{tr('Temos o selo TransParente (Entidade Queer Inclusiva). A moderação confirma na lista da TransParente.')}</span>
      </label>
      <label className="field">{tr('Notas (opcional)')}<textarea className="input" style={{ minHeight: 70 }} maxLength={600} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={tr('Ex.: horário, acessibilidade, o que já fazem pela inclusão')} /></label>
      <label className="field">{tr('E-mail de contacto')}<input className="input" type="email" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
        <span className="xs muted">{tr('Só a moderação o vê, para confirmar o registo. Nunca é publicado.')}</span>
      </label>
      <button className="btn block" disabled={!ok} onClick={submit}>{tr('Enviar registo')}</button>
    </>
  )
}

/** Página de uma entidade: estado do selo, resultados e avaliação. */
export function SealEntityPage() {
  const { id } = useParams()
  const { entities, loaded } = useEntities()
  const toast = useToast()
  const e = entities.find(x => x.id === id)
  const [answers, setAnswers] = useState<Partial<Record<SealQuestion, boolean | null>>>({})
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState<'' | 'published' | 'pending'>('')

  if (!e) return (<><TopBar back title={tr('Selo Casulo')} /><div className="page"><Empty icon="star" title={loaded ? tr('Não encontrado') : tr('A carregar…')} /></div></>)

  const complete = sealQuestions.every(q => answers[q.id] !== undefined)
  const submit = async () => {
    try {
      const r = await api.sealReview(e.id, answers as Record<SealQuestion, boolean | null>, comment)
      setSent(r.published ? 'published' : 'pending')
    } catch (err) { toast((err as Error).message) }
  }
  const pos = typeof e.lat === 'number' && typeof e.lng === 'number' ? { lat: e.lat, lng: e.lng } : null
  const missing = Math.max(0, SEAL_MIN_REVIEWS - e.reviewCount)

  return (
    <>
      <TopBar back title="" />
      <div className="page">
        <section className="stack">
          <div className="row wrap" style={{ gap: 6 }}>
            <SealBadge status={e.seal} /><span className="badge">{tr(e.kind)}</span><span className="badge">{e.district}</span>
            {e.transparente && <TransparenteBadge />}
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{e.name}</h1>
          {e.address && <span className="small muted">{e.address}</span>}
          <FacilityBadges f={e.facilities ?? {}} />
          {e.notes && <p className="muted">{e.notes}</p>}
        </section>
        <div className="grid2">
          {e.url && <a className="btn secondary" href={e.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={18} />{tr('Site')}</a>}
          {pos && <Link className="btn secondary" to={`/seguranca?tab=locais&local=${encodeURIComponent('selo-' + e.id)}`}><Icon name="map" size={18} />{tr('Ver no mapa')}</Link>}
        </div>

        <section className="card">
          <h3>{tr('O que diz a comunidade')}{' '}<span className="muted small">({e.reviewCount})</span></h3>
          {e.scores ? sealQuestions.map(q => {
            const v = e.scores?.[q.id]
            if (v === undefined) return null
            return (
              <div key={q.id} className="stack" style={{ gap: 4 }}>
                <div className="row between small"><span>{q.label}</span><b>{Math.round(v * 100)}%</b></div>
                <div className="progress"><div style={{ width: `${v * 100}%` }} /></div>
              </div>
            )
          }) : <p className="small muted">{tr('Faltam {0} avaliações para se saber se recebe o selo.', missing)}</p>}
          {e.seal === 'sem-selo' && <p className="small">{tr('As avaliações recentes ficaram abaixo de {0}% numa ou mais perguntas, por isso o selo não está ativo.', Math.round(SEAL_THRESHOLD * 100))}</p>}
          {e.comments.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              {e.comments.map(c => <p key={c.id} className="small" style={{ margin: 0 }}>“{c.comment}” <span className="xs muted">{c.month}</span></p>)}
            </div>
          )}
        </section>

        <section className="card">
          <h3>{tr('Compromissos assumidos')}</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {sealCommitments.filter(c => e.commitments.includes(c.id)).map(c => <li key={c.id}>{c.label}</li>)}
          </ul>
          <span className="xs muted">{tr('Registada desde {0}. Se algum compromisso não for cumprido, diz-nos na avaliação.', e.since)}</span>
        </section>

        <section className="card">
          <h3>{tr('Já foste? Conta como correu')}</h3>
          {sent ? (
            <p className="small">{sent === 'published' ? tr('Obrigado! A tua avaliação foi publicada de forma anónima.') : tr('Obrigado! A tua avaliação vai ser revista pela moderação e publicada de forma anónima.')}</p>
          ) : (
            <>
              {sealQuestions.map(q => (
                <div key={q.id} className="stack" style={{ gap: 6 }}>
                  <span className="small" style={{ fontWeight: 600 }}>{q.label}</span>
                  <div className={q.optional ? 'grid3' : 'grid2'}>
                    <button className={'chip' + (answers[q.id] === true ? ' on' : '')} onClick={() => setAnswers({ ...answers, [q.id]: true })}>{tr('Sim')}</button>
                    <button className={'chip' + (answers[q.id] === false ? ' on' : '')} onClick={() => setAnswers({ ...answers, [q.id]: false })}>{tr('Não')}</button>
                    {q.optional && <button className={'chip' + (answers[q.id] === null ? ' on' : '')} onClick={() => setAnswers({ ...answers, [q.id]: null })}>{tr('Não usei')}</button>}
                  </div>
                </div>
              ))}
              <label className="field">{tr('Comentário (opcional)')}<textarea className="input" value={comment} maxLength={600} onChange={ev => setComment(ev.target.value)} placeholder={tr('Sem nomes de pessoas nem dados que te identifiquem')} /></label>
              <button className="btn" disabled={!complete || !apiEnabled} onClick={submit}>{tr('Enviar avaliação')}</button>
              <p className="xs muted">{tr('Anónima. Comentários com ofensas, dados pessoais ou ataques a pessoas identificáveis são rejeitados.')}</p>
            </>
          )}
        </section>
      </div>
    </>
  )
}
