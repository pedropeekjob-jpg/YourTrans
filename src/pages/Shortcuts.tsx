import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { useFeatures } from '../components/Shortcuts'
import { featureHref, movePin, scoreAt, togglePin, toneStyle, type Feature } from '../lib/shortcuts'
import { tr } from '../i18n'

/** Editar os atalhos (fixar e ordenar) e ver tudo o que a app tem, por áreas. */
export function Shortcuts() {
  const { vault, update } = useVault()
  const { list } = useFeatures()
  const pins = (vault.settings.pins ?? []).filter(id => list.some(f => f.id === id))
  const setPins = (next: string[]) => update(v => ({ ...v, settings: { ...v.settings, pins: next } }))
  const groups = [...new Set(list.map(f => f.group))]
  const now = Date.now()
  const adaptive = vault.settings.adaptive !== false

  const row = (f: Feature, pinned: boolean, i = 0) => {
    const used = adaptive ? Math.round(scoreAt(vault.usage?.[f.id], now)) : 0
    return (
      <div key={f.id} className="item" style={{ cursor: 'default' }}>
        <Link to={featureHref(f)} className="row grow" style={{ textDecoration: 'none', color: 'inherit', gap: 12 }}>
          <div className="lead" style={toneStyle(f.tone)}><Icon name={f.icon} /></div>
          <div className="grow"><h3>{f.title}</h3>{!pinned && used > 0 && <p className="xs muted">{tr('Usas com frequência')}</p>}</div>
        </Link>
        {pinned && <>
          <button className="icon-btn" disabled={i === 0} aria-label={tr('Subir')} onClick={() => setPins(movePin(pins, f.id, -1))}>↑</button>
          <button className="icon-btn" disabled={i === pins.length - 1} aria-label={tr('Descer')} onClick={() => setPins(movePin(pins, f.id, 1))}>↓</button>
        </>}
        <button className={'icon-btn pin-btn' + (pinned ? ' on' : '')} aria-pressed={pinned} aria-label={pinned ? tr('Desafixar {0}', f.title) : tr('Fixar {0}', f.title)} onClick={() => setPins(togglePin(pins, f.id))}>📌</button>
      </div>
    )
  }

  return (
    <>
      <TopBar title={tr('Os teus atalhos')} back />
      <div className="page">
        <p className="small muted">{adaptive
          ? tr('Os fixados ficam sempre em primeiro lugar, pela ordem que escolheres. O resto dos atalhos segue o que usas mais.')
          : tr('A adaptação ao uso está desligada: os atalhos são os fixados e os das tuas escolhas iniciais.')}</p>

        <section className="stack">
          <h2>{tr('Fixados')}</h2>
          {pins.length
            ? <div className="list">{pins.map((id, i) => row(list.find(f => f.id === id)!, true, i))}</div>
            : <p className="small muted">{tr('Ainda não fixaste nada. Toca em 📌 numa funcionalidade abaixo.')}</p>}
        </section>

        <h2>{tr('Tudo o que o Casulo tem')}</h2>
        {groups.map(g => {
          const items = list.filter(f => f.group === g && !pins.includes(f.id))
          if (!items.length) return null
          return (
            <section key={g} className="stack">
              <h3 className="small muted">{g}</h3>
              <div className="list">{items.map(f => row(f, false))}</div>
            </section>
          )
        })}

        <Link to="/definicoes" className="item card flat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="grow"><h3>{tr('Adaptar ao meu uso')}</h3><p className="small muted">{tr('Ligar, desligar ou apagar o histórico de uso')}</p></div>
          <Icon name="chevron" />
        </Link>
      </div>
    </>
  )
}
