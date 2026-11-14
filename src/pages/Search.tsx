import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { useCountry } from '../lib/useCountry'
import { buildIndex, search } from '../lib/search'
import { tr } from '../i18n'

/** Procurar em toda a app: ecrãs, direitos, saúde, passo a passo e apoios do país escolhido. Tudo local. */
export function Search() {
  const pack = useCountry()
  const index = useMemo(() => buildIndex(pack), [pack])
  const [q, setQ] = useState('')
  const results = useMemo(() => search(index, q), [index, q])
  return (
    <>
      <TopBar title={tr('Procurar')} back />
      <div className="page">
        <input className="input" type="search" autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder={tr('Ex.: conservatória, hormonas, queixa')} aria-label={tr('Procurar na app')} />
        <p className="xs muted">{tr('A pesquisa é feita neste aparelho. Nada do que escreves sai daqui.')}</p>
        {q.trim().length > 1 && results.length === 0 && (
          <section className="card flat">
            <p className="small">{tr('Não encontrámos nada para "{0}".', q.trim())}</p>
            <Link to="/sugerir" className="small">{tr('Diz-nos o que procuravas')}</Link>
          </section>
        )}
        {results.length > 0 && (
          <div className="list">
            {results.map((r, i) => (
              <Link key={r.to + r.title + i} to={r.to} className="item">
                <div className="grow"><h3>{r.title}</h3><p className="xs muted">{r.kind}</p></div>
                <Icon name="chevron" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
