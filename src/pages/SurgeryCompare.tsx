import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { Icon } from '../components/Icon'
import { ExperienceSheet, eur, materialLabels, months, useTrackCommunity } from '../components/TrackCommunity'
import { monthsSince, tracks, type Track } from '../data/healthPath'
import { compareRow, waitGap } from '../lib/compare'
import type { ExperienceStat } from '../lib/api'
import { tr } from '../i18n'

/* Comparador SNS vs privado, cirurgia a cirurgia: espera e custo a partir dos
   relatos anónimos da comunidade (intervalos só com 3+ relatos). Não há preços
   oficiais do privado nem esperas públicas por especialidade: não se inventam. */

const surgeries = tracks.filter(t => t.group === 'cirurgia')

function Range({ s, fmt }: { s?: ExperienceStat; fmt: (n: number) => string }) {
  if (!s) return <span className="xs muted">{tr('Ainda sem relatos suficientes')}</span>
  return (
    <span className="stack" style={{ gap: 2 }}>
      <span><b>{fmt(s.median)}</b> <span className="xs muted">{tr('(mediana)')}</span></span>
      <span className="xs muted">{tr('{0} a {1}', fmt(s.min), fmt(s.max))}</span>
      <span className="xs muted">{tr('{0} relatos · {1}', s.n, s.fromYear === s.toYear ? s.fromYear : `${s.fromYear}–${s.toYear}`)}</span>
    </span>
  )
}

export function SurgeryCompare() {
  const { vault } = useVault()
  const { data, failed, refresh } = useTrackCommunity()
  const [sheet, setSheet] = useState<Track | null>(null)
  const chosen = vault.healthPath.tracks
  // As cirurgias que a pessoa escolheu no percurso aparecem primeiro.
  const list = [...surgeries.filter(t => chosen.includes(t.id)), ...surgeries.filter(t => !chosen.includes(t.id))]

  return (
    <>
      <section className="card tint-sky">
        <h3>{tr('SNS ou privado?')}</h3>
        <p className="small">{tr('Quanto tempo se espera e quanto se paga, cirurgia a cirurgia, segundo quem já passou por isso. Mostramos a mediana e o intervalo, só a partir de 3 relatos, para ninguém ser identificado.')}</p>
        <p className="xs muted">{tr('No SNS a cirurgia não tem custo. Não há preços oficiais do privado nem dados públicos de espera por especialidade, por isso estes números vêm só da comunidade.')}</p>
      </section>

      {failed && <p className="small muted">{tr('Os relatos da comunidade aparecem quando houver ligação ao servidor.')}</p>}
      {!failed && !data && <p className="small muted">{tr('A carregar…')}</p>}

      {list.map(t => {
        const row = compareRow(data?.exp ?? [], t.id)
        const gap = waitGap(row)
        const since = vault.healthPath.steps[`${t.id}-lista`]?.since
        const done = vault.healthPath.steps[`${t.id}-lista`]?.done
        return (
          <section key={t.id} className="card">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <h3>{t.title}</h3>
              {chosen.includes(t.id) && <span className="badge accent">{tr('No teu percurso')}</span>}
            </div>
            <div className="grid2" style={{ gap: 8 }}>
              <div className="card flat stack" style={{ padding: 10, gap: 8 }}>
                <b className="small">{tr('SNS')}</b>
                <div className="stack" style={{ gap: 2 }}><span className="xs muted">{tr('Espera')}</span><Range s={row.snsWait} fmt={months} /></div>
                <div className="stack" style={{ gap: 2 }}><span className="xs muted">{tr('Custo')}</span><b>{tr('Sem custo')}</b></div>
              </div>
              <div className="card flat stack" style={{ padding: 10, gap: 8 }}>
                <b className="small">{tr('Privado')}</b>
                <div className="stack" style={{ gap: 2 }}><span className="xs muted">{tr('Espera')}</span><Range s={row.privWait} fmt={months} /></div>
                <div className="stack" style={{ gap: 2 }}><span className="xs muted">{tr('Custo total')}</span><Range s={row.privCost} fmt={eur} /></div>
              </div>
            </div>
            {gap !== undefined && gap > 0 && <p className="small">{tr('No privado, quem contou esperou em mediana menos {0} do que no SNS.', months(gap))}</p>}
            {since && !done && <p className="small"><span className="badge amber">{tr('Tu: à espera há {0}', months(monthsSince(since)))}</span></p>}
            {row.material.length > 0 && (
              <p className="xs muted">{tr('Material para a recuperação (em qualquer dos casos):')} {row.material.map(m => `${materialLabels[m.item ?? 'outro'] ?? m.item}: ${eur(m.median)}`).join(' · ')}</p>
            )}
            <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => setSheet(t)}><Icon name="plus" size={16} />{tr('Contar a minha experiência')}</button>
          </section>
        )
      })}

      <section className="card flat">
        <h3>{tr('Esperar no SNS sem pagar')}</h3>
        <p className="small">{tr('Se o hospital não conseguir operar dentro do tempo máximo garantido, recebes um vale-cirurgia: podes fazer a cirurgia noutro hospital, incluindo privado ou social com acordo, e o SNS paga.')}</p>
        <Link to="/percurso/saude?tab=espera" className="small row"><Icon name="doc" size={16} />{tr('Lista de espera e vale-cirurgia')}</Link>
      </section>
      <p className="xs muted">{tr('Os valores são o que cada pessoa contou (do pedido à cirurgia, custo total pago) e variam muito entre equipas. Pede sempre orçamento por escrito.')}</p>

      {sheet && <ExperienceSheet track={sheet} open onClose={() => setSheet(null)} onSent={refresh} />}
    </>
  )
}
