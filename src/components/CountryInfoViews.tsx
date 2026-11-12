import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { useCountry } from '../lib/useCountry'
import { infoFor, type CountryInfo, type Source } from '../data/countryInfo'
import { tr } from '../i18n'

export function useCountryInfo(): CountryInfo | undefined {
  return infoFor(useCountry().code)
}

function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null
  return (
    <section className="card flat">
      <h3 className="small">{tr('Fontes oficiais')}</h3>
      <div className="row wrap">
        {sources.map(s => <a key={s.url + s.label} className="btn sm secondary" href={s.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{s.label}</a>)}
      </div>
    </section>
  )
}

function Reviewed() {
  const c = useCountry()
  const [y, m] = c.reviewedAt.split('-')
  return <p className="xs muted" style={{ textAlign: 'center' }}>{tr('Informação geral, verificada em {0}/{1}. Não é aconselhamento médico nem jurídico: confirma sempre na fonte oficial.', m, y)}</p>
}

/** Percurso no sistema de saúde de um país que não é Portugal. */
export function CountryHealth({ info }: { info: CountryInfo }) {
  const c = useCountry()
  return (
    <>
      <section className="card tint-sky">
        <h3>{tr('Como funciona em {0}', `${c.flag} ${c.name}`)}</h3>
        <p className="small">{info.health.intro}</p>
      </section>
      <div className="timeline">
        {info.health.steps.map((s, i) => (
          <div key={s.title} className="tl">
            <div className="rail"><div className="dot">{i + 1}</div><div className="line" /></div>
            <div className="content"><h3>{s.title}</h3><p className="small">{s.body}</p></div>
          </div>
        ))}
      </div>
      {info.health.notes.map(n => <p key={n} className="small card tint-amber" style={{ padding: 12 }}>💡 {n}</p>)}
      <Sources sources={info.health.sources} />
      <Reviewed />
    </>
  )
}

/** Direitos, queixas e apoio jurídico de um país que não é Portugal. */
export function CountryRights({ info }: { info: CountryInfo }) {
  const c = useCountry()
  return (
    <>
      <section className="card tint-sky">
        <h3>{tr('Os teus direitos em {0}', `${c.flag} ${c.name}`)}</h3>
        <p className="small">{info.rights.intro}</p>
      </section>
      <section className="card">
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          {info.rights.protections.map(p => <li key={p}>{p}</li>)}
        </ul>
      </section>
      <section className="stack">
        <h2>{tr('Onde fazer queixa e pedir ajuda')}</h2>
        <div className="list">
          {info.rights.help.map(h => (
            <div key={h.name} className="item" style={{ alignItems: 'flex-start' }}>
              <div className="grow stack" style={{ gap: 4 }}>
                <h3>{h.name}</h3>
                <p className="small muted">{h.desc}</p>
                <div className="row wrap">
                  {h.phone && <a className="btn sm secondary" href={`tel:${h.phone}`}><Icon name="phone" size={14} />{h.phone}</a>}
                  {h.url && <a className="btn sm secondary" href={h.url} target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{tr('Abrir site')}</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Sources sources={info.rights.sources} />
      <Reviewed />
    </>
  )
}

/** Quando ainda não há informação para o país: diz isso, dá a emergência e esconde o conteúdo de Portugal atrás de um toque. */
/** Conteúdo que só existe para Portugal (dados da comunidade, entidades portuguesas).
 *  Noutros países fica escondido atrás de "Ver como funciona em Portugal". */
export function PortugalOnly({ what, children }: { what: string; children: ReactNode }) {
  return useCountry().code === 'PT' ? <>{children}</> : <NoCountryInfo what={what}>{children}</NoCountryInfo>
}

export function NoCountryInfo({ what, children }: { what: string; children?: ReactNode }) {
  const c = useCountry()
  return (
    <>
      <section className="card tint-amber" role="note">
        <h3>{tr('{0} Ainda não temos esta informação para {1}', c.flag, c.name)}</h3>
        <p className="small">{tr('{0} ainda não está disponível para o teu país. Estamos a reunir e a verificar fontes oficiais.', what)}</p>
        <div className="row wrap">
          <a className="btn sm danger" href={`tel:${c.emergency}`}><Icon name="phone" size={14} />{tr('Emergência {0}', c.emergency)}</a>
          <Link className="btn sm secondary" to="/comunidade?tab=apoio">{tr('Contactos de apoio')}</Link>
          <a className="btn sm secondary" href="https://findahelpline.com" target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{tr('Linhas de apoio no mundo')}</a>
          <a className="btn sm secondary" href="https://database.ilga.org" target="_blank" rel="noreferrer noopener"><Icon name="external" size={14} />{tr('Leis do teu país (ILGA World)')}</a>
        </div>
      </section>
      {children && (
        <details className="card flat">
          <summary style={{ fontWeight: 650, cursor: 'pointer' }}>{tr('Ver como funciona em Portugal')}</summary>
          <div className="stack" style={{ marginTop: 12 }}>{children}</div>
        </details>
      )}
    </>
  )
}
