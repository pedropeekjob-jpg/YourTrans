// Serviços especializados: opcionais, prestados por profissionais com perfil no Casulo.
// Quem usa a app paga diretamente ao profissional (o Casulo não vê nem guarda pagamentos).
// Sessões solidárias: códigos pagos pelas entidades Aliadas e Parceiras, sem pedir nada a quem os usa.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, useToast } from '../components/ui'
import { SealBadge } from '../components/SealBadges'
import { PortugalOnly } from '../components/CountryInfoViews'
import { api, apiEnabled, type ServiceOffer } from '../lib/api'
import { serviceKinds, serviceLabel, euros, type ServiceKind } from '../data/plans'
import { tr } from '../i18n'

export function Services() {
  const toast = useToast()
  const [offers, setOffers] = useState<ServiceOffer[]>([])
  const [loaded, setLoaded] = useState(false)
  const [kind, setKind] = useState<ServiceKind | ''>('')
  const [available, setAvailable] = useState(0)
  const [code, setCode] = useState<{ code: string; months: number } | null>(null)

  useEffect(() => {
    if (!apiEnabled) return
    api.services().then(setOffers).catch(() => {}).finally(() => setLoaded(true))
    api.vouchersAvailable().then(r => setAvailable(r.available)).catch(() => {})
  }, [])

  const list = offers.filter(o => !kind || o.services.some(s => s.kind === kind))
  const ask = async () => {
    if (!kind) { toast(tr('Escolhe primeiro o tipo de serviço.')); return }
    try { setCode(await api.voucher(kind)) } catch (e) { toast((e as Error).message) }
  }

  return (
    <>
      <TopBar title={tr('Serviços especializados')} back />
      <div className="page">
        <PortugalOnly what={tr('Os serviços especializados')}>
        <section className="card tint-accent">
          <h3>{tr('Opcionais, com profissionais que conhecem o percurso')}</h3>
          <p className="small">{tr('Tudo o resto no Casulo é gratuito. Aqui encontras profissionais de apoio jurídico, voz, psicologia e imagem. Marcas e pagas diretamente a cada profissional: o Casulo não vê nem guarda o que marcas.')}</p>
        </section>

        <div className="row wrap" style={{ gap: 6 }}>
          <button className={'chip' + (kind === '' ? ' on' : '')} onClick={() => setKind('')}>{tr('Todos')}</button>
          {serviceKinds.map(k => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{serviceLabel[k]}</button>)}
        </div>

        <section className="card tint-mint">
          <h3>{tr('Sessões solidárias')}</h3>
          <p className="small">{tr('Se não podes pagar, pede um código. É gratuito, não precisas de provar nada e não pedimos nenhum dado. Mostra o código ao profissional quando marcares (só os que dizem "aceita sessões solidárias").')}</p>
          {code ? (
            <div className="stack" style={{ gap: 4 }}>
              <b style={{ fontSize: '1.3rem', letterSpacing: 1 }}>{code.code}</b>
              <span className="xs muted">{tr('Guarda-o agora: não fica guardado em lado nenhum. Vale {0} meses e serve para uma sessão.', code.months)}</span>
            </div>
          ) : available > 0 ? (
            <button className="btn sm" style={{ justifySelf: 'start' }} onClick={ask} disabled={!kind}>{kind ? tr('Pedir código para {0}', serviceLabel[kind]) : tr('Escolhe um serviço acima')}</button>
          ) : <p className="small muted" style={{ margin: 0 }}>{tr('Neste momento não há sessões solidárias disponíveis. Volta a ver daqui a umas semanas.')}</p>}
        </section>

        {!apiEnabled ? <p className="small muted">{tr('Os serviços aparecem quando houver ligação.')}</p> : list.length === 0 ? (
          <Empty icon="star" title={loaded ? tr('Ainda não há profissionais aqui') : tr('A carregar…')} text={tr('Conheces alguém que devia estar nesta lista? Mostra-lhe a página Para entidades.')} />
        ) : (
          <div className="stack">
            {list.map(o => (
              <section key={o.entityId} className="card">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="stack" style={{ gap: 2 }}>
                    <h3>{o.name}</h3>
                    <span className="small muted">{o.district}{o.languages ? ' · ' + o.languages : ''}</span>
                  </div>
                  <SealBadge status={o.seal} />
                </div>
                <div className="stack" style={{ gap: 4 }}>
                  {o.services.filter(s => !kind || s.kind === kind).map(s => (
                    <div key={s.kind} className="row between small"><span>{serviceLabel[s.kind]}{s.online ? ' · ' + tr('online') : ''}</span><b>{s.price ? tr('{0} por sessão', euros(s.price)) : tr('Gratuito')}</b></div>
                  ))}
                </div>
                <div className="row wrap" style={{ gap: 6 }}>
                  {o.vouchers && <span className="badge mint">{tr('Aceita sessões solidárias')}</span>}
                  <span className="badge">{tr('Perfil pago')}</span>
                </div>
                <div className="grid2">
                  {o.bookingUrl && <a className="btn sm" href={o.bookingUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} />{tr('Marcar')}</a>}
                  <Link className="btn sm secondary" to={`/selo/${o.entityId}`}>{tr('Avaliações')}</Link>
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="xs muted">{tr('Ordem alfabética: ninguém paga para aparecer primeiro.')}{' '}<Link to="/transparencia">{tr('Como o Casulo se sustenta')}</Link></p>
        </PortugalOnly>
      </div>
    </>
  )
}
