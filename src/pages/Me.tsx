import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { ThemePicker } from '../components/ThemePicker'
import { LangPicker } from '../components/LangPicker'
import { CountryPicker } from '../components/CountryPicker'
import { CasuloLogo } from '../components/CasuloLogo'
import { daysSinceBackup } from './DataCare'
import { tr } from '../i18n'

/** Separador "Eu": o diário pessoal, a aparência e as definições. */
export function Me() {
  const { vault } = useVault()
  const s = vault.settings
  const month = new Date().toISOString().slice(0, 7)
  const heardDays = vault.checkins.filter(d => d.startsWith(month)).length
  const entries = vault.journal.filter(j => j.text || j.photoIds.length).length
  const euphoria = vault.journal.filter(j => j.euphoria).length
  const photos = vault.journal.reduce((n, j) => n + j.photoIds.length, 0)
  const days = daysSinceBackup(vault)
  const backupOk = days !== null && days <= 30

  return (
    <>
      <TopBar title={tr('Eu')} />
      <div className="page">
        <section className="hero">
          <div className="row" style={{ position: 'relative', zIndex: 1 }}>
            <CasuloLogo size={52} />
            <div className="stack grow" style={{ gap: 2 }}>
              <h1>{s.displayName || tr('Olá')}</h1>
              {s.pronouns && <span className="small muted">{s.pronouns}</span>}
            </div>
          </div>
          <div className="me-stats" style={{ position: 'relative', zIndex: 1 }}>
            <div><b>{heardDays}</b><span className="xs muted">{tr('dias em que te ouviste este mês')}</span></div>
            <div><b>{euphoria}</b><span className="xs muted">{tr('momentos de euforia')}</span></div>
            <div><b>{photos}</b><span className="xs muted">{tr('fotos')}</span></div>
          </div>
        </section>

        <div className="list">
          <Link to="/diario" className="item">
            <div className="lead" style={{ background: 'var(--mint-soft)', color: 'var(--mint)' }}><Icon name="camera" /></div>
            <div className="grow"><h3>{tr('Diário e fotos')}</h3><p className="small muted">{tr('{0} registos', entries)}</p></div>
            <Icon name="chevron" />
          </Link>
          <Link to="/diario" className="item">
            <div className="lead" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name="sparkle" /></div>
            <div className="grow"><h3>{tr('Momentos de euforia')}</h3><p className="small muted">{tr('Guarda-os para os dias difíceis')}</p></div>
            <Icon name="chevron" />
          </Link>
          <Link to="/servicos" className="item">
            <div className="lead" style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}><Icon name="star" /></div>
            <div className="grow"><h3>{tr('Serviços especializados')}</h3><p className="small muted">{tr('Jurídico, voz, psicologia e imagem. Opcional, com sessões solidárias')}</p></div>
            <Icon name="chevron" />
          </Link>
        </div>

        <section className="card">
          <h3>{tr('Aparência')}</h3>
          <ThemePicker />
        </section>

        <section className="card">
          <h3>{tr('Idioma')}</h3>
          <LangPicker />
        </section>

        <section className="card">
          <h3>{tr('País')}</h3>
          <CountryPicker />
        </section>

        <div className="list">
          <Link to="/dados" className="item">
            <div className="lead" style={{ background: backupOk ? 'var(--mint-soft)' : 'var(--amber-soft)', color: backupOk ? 'var(--mint)' : 'var(--amber)' }}><Icon name="shield" /></div>
            <div className="grow"><h3>{tr('Os teus dados')}</h3><p className="small muted">{days === null ? tr('Ainda sem cópia de segurança') : tr('Última cópia de segurança há {0} dias', days)}</p></div>
            <Icon name="chevron" />
          </Link>
          <Link to="/definicoes" className="item">
            <div className="lead" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="lock" /></div>
            <div className="grow"><h3>{tr('Privacidade e definições')}</h3><p className="small muted">{tr('Código, modo privado, cópia de segurança e perfil')}</p></div>
            <Icon name="chevron" />
          </Link>
          <Link to="/sugerir" className="item">
            <div className="lead" style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}><Icon name="chat" /></div>
            <div className="grow"><h3>{tr('Procurei e não encontrei')}</h3><p className="small muted">{tr('Diz-nos o que falta ou o que gostavas que existisse')}</p></div>
            <Icon name="chevron" />
          </Link>
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}>{tr('O Casulo é gratuito e sem anúncios.')}{' '}<Link to="/transparencia">{tr('Como se sustenta')}</Link>{' · '}<Link to="/entidades">{tr('Para entidades')}</Link></p>
      </div>
    </>
  )
}
