import { Link } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { useVault } from '../lib/vault-context'
import { useToast } from '../components/ui'
import { countries } from '../data/countries'
import { useState } from 'react'
import { tr } from '../i18n'

const before = [
  tr('Confirma que o nome do bilhete é igual ao do documento que vais mostrar (mesmo que ainda seja o nome antigo).'),
  tr('Se os documentos ainda não estão atualizados, leva uma cópia do pedido ou da decisão da conservatória.'),
  tr('Hormonas e seringas vão na bagagem de mão, na embalagem original, com receita ou declaração médica (em inglês, se fores para fora).'),
  tr('Leva medicação para mais uns dias do que a viagem, para o caso de atrasos.'),
  tr('Vê a situação legal do país de destino abaixo e guarda o número de emergência local.'),
  tr('Combina com uma pessoa de confiança como e quando dás notícias.'),
]

const airport = [
  tr('Nos scanners corporais, o agente escolhe "homem" ou "mulher" no ecrã. Se der alarme, podes pedir revista manual por alguém do género que preferires e num espaço reservado.'),
  tr('Próteses, binders e enchimentos não têm de ser retirados à vista. Podes explicar com calma ou mostrar o cartão para balcões.'),
  tr('Se te tratarem mal, anota a hora, o local e o número do agente. Podes registar depois em Direitos > Registo.'),
]

/** Modo viagem: preparar a viagem e o telemóvel (mais privacidade enquanto estás fora). */
export function Travel() {
  const { vault, update, mode } = useVault()
  const toast = useToast()
  const s = vault.settings
  const [dest, setDest] = useState('')
  const pack = countries.find(c => c.code === dest)
  const active = !!s.travelPrev
  const toggle = () => {
    if (active) {
      const p = s.travelPrev!
      update(v => ({ ...v, settings: { ...v.settings, disguise: p.disguise, autoLockMinutes: p.autoLockMinutes, discreetNotifications: p.discreetNotifications, travelPrev: undefined } }))
      toast(tr('Definições de antes repostas'))
    } else {
      update(v => ({ ...v, settings: { ...v.settings, travelPrev: { disguise: v.settings.disguise, autoLockMinutes: v.settings.autoLockMinutes, discreetNotifications: v.settings.discreetNotifications }, disguise: true, autoLockMinutes: 0, discreetNotifications: true } }))
      toast(tr('Modo viagem ligado'))
    }
  }
  const risk = pack?.risk === 'hostil' ? tr('Neste país, relações entre pessoas do mesmo sexo ainda são crime. Pondera ocultar a app e apagar conversas sensíveis antes de passares a fronteira.')
    : pack?.risk === 'atencao' ? tr('A proteção legal é limitada ou desigual. Informa-te junto de uma associação local antes de ires.')
      : pack ? tr('Há proteção legal contra discriminação, mas a realidade pode variar de sítio para sítio.') : ''
  return (
    <>
      <TopBar title={tr('Modo viagem')} back />
      <div className="page">
        <section className="card">
          <h3>{tr('Preparar o telemóvel')}</h3>
          <p className="small">{tr('Liga o modo privado, notificações com texto neutro e bloqueio imediato ao sair da app. Ao desligar, voltam as tuas definições de antes.')}</p>
          {mode !== 'pin' && <p className="xs" style={{ color: 'var(--amber)' }}>{tr('Sem código, qualquer pessoa com o telemóvel desbloqueado pode abrir a app.')} <Link to="/definicoes">{tr('Ativar código')}</Link></p>}
          <button className={'btn block' + (active ? ' secondary' : '')} onClick={toggle}>{active ? tr('Desligar modo viagem') : tr('Ligar modo viagem')}</button>
        </section>

        <section className="card">
          <h3>{tr('Para onde vais?')}</h3>
          <select className="input" value={dest} onChange={e => setDest(e.target.value)} aria-label={tr('País de destino')}>
            <option value="">{tr('Escolhe um país')}</option>
            {[...countries].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
          {pack && <>
            <p className="small">{risk}</p>
            <p className="small">{tr('Emergência: {0}', pack.emergency)}</p>
            {pack.support.filter(o => o.kind !== 'emergência').slice(0, 3).map(o => (
              <p key={o.id} className="xs muted">{o.name}{o.phone ? ` · ${o.phone}` : ''}{o.url ? <> · <a href={o.url} target="_blank" rel="noreferrer">{tr('site')}</a></> : null}</p>
            ))}
          </>}
          <p className="xs muted">{tr('A escolha do destino fica só neste ecrã e não é guardada.')}</p>
        </section>

        <section className="card">
          <h3>{tr('Antes de ir')}</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>{before.map(t => <li key={t}>{t}</li>)}</ul>
        </section>

        <section className="card">
          <h3>{tr('No aeroporto')}</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>{airport.map(t => <li key={t}>{t}</li>)}</ul>
          <Link to="/cartao-nome" className="small">{tr('Abrir o cartão para balcões')}</Link>
        </section>
      </div>
    </>
  )
}
