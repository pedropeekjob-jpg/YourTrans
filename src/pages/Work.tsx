import { useEffect, useState } from 'react'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Progress, useToast } from '../components/ui'
import { api, apiEnabled } from '../lib/api'
import { tr } from '../i18n'
import { Link } from 'react-router-dom'
import { PortugalOnly } from '../components/CountryInfoViews'
import { useCountry } from '../lib/useCountry'

export const employerCriteria = [
  { id: 'politica', label: tr('Tem uma política escrita de inclusão que inclui identidade de género') },
  { id: 'nome', label: tr('Atualiza nome e e-mail sem exigir a mudança legal') },
  { id: 'wc', label: tr('Há casas de banho e balneários neutros ou individuais') },
  { id: 'saude', label: tr('O seguro de saúde cobre cuidados de afirmação de género') },
  { id: 'licenca', label: tr('Dá dias de ausência para consultas e cirurgias sem perguntas') },
  { id: 'formacao', label: tr('Faz formação de chefias sobre inclusão trans') },
  { id: 'denuncia', label: tr('Tem um canal de denúncia confidencial que funciona') },
  { id: 'respeito', label: tr('No dia a dia, colegas e chefias usam o nome e pronomes certos') },
]

const rights = [
  tr('O Código do Trabalho proíbe a discriminação com base na identidade de género, no acesso ao emprego e no trabalho.'),
  tr('Não és obrigade a revelar que és trans numa entrevista nem a justificar o teu nome.'),
  tr('Podes pedir a atualização dos teus dados ao empregador ao abrigo do RGPD (tens a carta pronta em Documentos).'),
  tr('Em caso de discriminação, podes recorrer à ACT, à CITE ou ao apoio jurídico da ILGA.'),
]

export function Work() {
  // O ranking e os direitos laborais são de Portugal.
  const country = useCountry()
  const pt = country.code === 'PT'
  const toast = useToast()
  const [company, setCompany] = useState('')
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [comment, setComment] = useState('')
  const [ranking, setRanking] = useState<{ company: string; score: number; reviews: number }[]>([])
  const score = employerCriteria.filter(c => answers[c.id]).length / employerCriteria.length

  useEffect(() => { if (apiEnabled && pt) api.employers().then(setRanking).catch(() => {}) }, [pt])

  const submit = async () => {
    if (!apiEnabled) { toast(tr('A partilha fica disponível quando o servidor estiver ligado')); return }
    try { const r = await api.employerReview({ company: company.trim(), answers, comment }); toast(r.published ? tr('Obrigado! A tua avaliação já conta para o ranking.') : tr('Obrigado! Vai ser revisto pela moderação.')); setCompany(''); setAnswers({}); setComment('') }
    catch (e) { toast((e as Error).message) }
  }

  return (
    <>
      <TopBar title={tr('Trabalho')} back />
      <div className="page">
        <PortugalOnly what={tr('O ranking de empregadores')}>
        <section className="card tint-sky">
          <h3>{tr('Empresas com inclusão trans real')}</h3>
          <p className="small">{tr('Avaliações feitas por pessoas trans, com critérios concretos e não só declarações. As melhores recebem o selo')}{' '}<b>{tr('Inclusão Trans')}</b> {tr('no ranking de empregadores.')}</p>
        </section>

        {ranking.length > 0 && (
          <section className="stack">
            <h2>{tr('Mais bem avaliadas')}</h2>
            <div className="list">
              {ranking.slice(0, 10).map((r, i) => (
                <div key={r.company} className="item">
                  <div className="lead" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 800 }}>{i + 1}</div>
                  <div className="grow"><h3>{r.company}</h3><p className="xs muted">{r.reviews} {tr('avaliações')}</p></div>
                  {r.score >= 0.75 && <span className="badge mint">{tr('Selo Inclusão Trans')}</span>}
                  <b>{Math.round(r.score * 100)}%</b>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <h3>{tr('Avaliar o meu local de trabalho')}</h3>
          <input className="input" placeholder={tr('Nome da empresa')} value={company} onChange={e => setCompany(e.target.value)} />
          {employerCriteria.map(c => (
            <button key={c.id} className="item" style={{ padding: '8px 0' }} onClick={() => setAnswers({ ...answers, [c.id]: !answers[c.id] })}>
              <span className={'check' + (answers[c.id] ? ' on' : '')}><Icon name="check" size={18} /></span>
              <span className="small grow">{c.label}</span>
            </button>
          ))}
          <div className="row"><div className="grow"><Progress value={score} /></div><b className="small">{Math.round(score * 100)}%</b></div>
          <textarea className="input" style={{ minHeight: 70 }} placeholder={tr('Comentário (opcional, sem nomes de pessoas)')} value={comment} onChange={e => setComment(e.target.value)} />
          <button className="btn" disabled={company.trim().length < 2} onClick={submit}>{tr('Partilhar anonimamente')}</button>
        </section>

        </PortugalOnly>

        {pt ? (
          <section className="card tint-amber">
            <h3>{tr('Os teus direitos')}</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>{rights.map(r => <li key={r}>{r}</li>)}</ul>
          </section>
        ) : (
          <Link to="/direitos" className="btn secondary block">{tr('Os teus direitos em {0}', `${country.flag} ${country.name}`)}</Link>
        )}
      </div>
    </>
  )
}
