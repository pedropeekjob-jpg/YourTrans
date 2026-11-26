import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { Icon } from './Icon'
import {
  ALLY_TILES, TRANS_TILES, allyFeatures, featureFor, featureHref, rankShortcuts, recordVisit, toneStyle, transFeatures,
} from '../lib/shortcuts'
import { tr } from '../i18n'

/** Lista de funcionalidades do perfil atual. */
export function useFeatures() {
  const { vault } = useVault()
  const ally = vault.settings.profile === 'ally'
  return { ally, list: ally ? allyFeatures() : transFeatures() }
}

/**
 * Conta, só neste aparelho, que funcionalidade se abriu. Com a adaptação desligada não regista nada.
 * Ajuda, Hoje e a pesquisa não contam (não estão na lista).
 */
export function useUsageTracking() {
  const { vault, update } = useVault()
  const loc = useLocation()
  const { list } = useFeatures()
  const adaptive = vault.settings.adaptive !== false
  useEffect(() => {
    if (!adaptive) return
    const f = featureFor(list, loc.pathname, loc.search)
    if (!f || f.noTrack) return
    const now = Date.now()
    update(v => {
      const usage = recordVisit(v.usage, f.id, now)
      if (usage === v.usage && v.lastScreen?.id === f.id) return v
      return { ...v, usage, lastScreen: { id: f.id, at: now } }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, loc.search, adaptive])
}

/** "Os teus atalhos" no ecrã Hoje (ou no Início de quem apoia). */
export function ShortcutsSection() {
  const { vault, update } = useVault()
  const { ally, list } = useFeatures()
  const s = vault.settings
  const adaptive = s.adaptive !== false
  const now = Date.now()
  const pins = s.pins ?? []
  const tiles = rankShortcuts({ list, pins, usage: vault.usage, interests: s.interests, adaptive, ally, now, count: ally ? ALLY_TILES : TRANS_TILES })
  const last = adaptive && vault.lastScreen && now - vault.lastScreen.at < 7 * 86_400_000 ? list.find(f => f.id === vault.lastScreen!.id) : undefined
  const seen = () => update(v => ({ ...v, settings: { ...v.settings, shortcutsNoticeSeen: true } }))

  return (
    <section className="stack">
      <div className="row between">
        <h2>{tr('Os teus atalhos')}</h2>
        <Link to="/atalhos" className="small">{tr('Editar')}</Link>
      </div>
      <div className="shortcuts">
        {tiles.map(f => (
          <Link key={f.id} to={featureHref(f)} className="shortcut">
            {pins.includes(f.id) && <span className="shortcut-pin" aria-label={tr('Fixado')}>📌</span>}
            <span className="shortcut-ico" style={toneStyle(f.tone)}><Icon name={f.icon} size={20} /></span>
            <span className="shortcut-label">{f.title}</span>
          </Link>
        ))}
      </div>
      {last && (
        <Link to={featureHref(last)} className="card flat row" style={{ textDecoration: 'none', color: 'inherit', padding: '10px 14px' }}>
          <span className="shortcut-ico" style={toneStyle(last.tone)}><Icon name={last.icon} size={18} /></span>
          <div className="grow"><b className="small">{tr('Continuar')}</b> <span className="small">· {last.title}</span><p className="xs muted">{tr('Onde ficaste da última vez')}</p></div>
          <Icon name="chevron" />
        </Link>
      )}
      <Link to="/atalhos" className="small" style={{ justifySelf: 'start' }}>{tr('Ver tudo o que o Casulo tem')}</Link>
      {adaptive && !s.shortcutsNoticeSeen && (
        <div className="card tint-sky stack" style={{ gap: 8 }}>
          <p className="small">{tr('Estes atalhos aprendem com o que usas mais. Isso fica só neste aparelho, cifrado, e nunca é enviado. Podes fixar os teus, desligar ou apagar o histórico.')}</p>
          <div className="row wrap">
            <button className="btn sm secondary" onClick={seen}>{tr('Percebi')}</button>
            <Link to="/definicoes" className="btn sm ghost" onClick={seen}>{tr('Definições')}</Link>
          </div>
        </div>
      )}
    </section>
  )
}
