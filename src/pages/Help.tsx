import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { SosPanel } from '../components/Sos'
import { tr } from '../i18n'

/** Ajuda: tudo o que serve num momento difícil, num só sítio. */
export function Help() {
  const { panic } = useVault()
  const links = [
    { to: '/comunidade?tab=apoio', icon: 'phone', title: tr('Linhas de apoio 24 horas'), sub: tr('SNS 24, SOS Voz Amiga, APAV e associações'), color: 'var(--danger)', bg: 'var(--danger-soft)' },
    { to: '/direitos', icon: 'book', title: tr('Os meus direitos'), sub: tr('O que diz a lei e o que fazer'), color: 'var(--amber)', bg: 'var(--amber-soft)' },
    { to: '/direitos?tab=registo', icon: 'doc', title: tr('Registar o que aconteceu'), sub: tr('Fica cifrado, para uma queixa'), color: 'var(--rose)', bg: 'var(--rose-soft)' },
    { to: '/seguranca?tab=reportar', icon: 'shield', title: tr('Reportar discriminação'), sub: tr('De forma anónima'), color: 'var(--accent)', bg: 'var(--accent-soft)' },
  ]
  return (
    <>
      <TopBar title={tr('Ajuda')} back />
      <div className="page">
        <SosPanel compact />
        <div className="list">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="item">
              <div className="lead" style={{ background: l.bg, color: l.color }}><Icon name={l.icon} /></div>
              <div className="grow"><h3>{l.title}</h3><p className="small muted">{l.sub}</p></div>
              <Icon name="chevron" />
            </Link>
          ))}
          <button className="item" onClick={panic}>
            <div className="lead" style={{ background: 'var(--surface-2)' }}><Icon name="eyeOff" /></div>
            <div className="grow"><h3>{tr('Esconder a app agora')}</h3><p className="small muted">{tr('Mostra o disfarce de imediato')}</p></div>
          </button>
        </div>
      </div>
    </>
  )
}
