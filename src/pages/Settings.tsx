import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { LangPicker } from '../components/LangPicker'
import { CountryPicker } from '../components/CountryPicker'
import { ThemePicker } from '../components/ThemePicker'
import { CasuloLogo } from '../components/CasuloLogo'
import { Seg, useToast } from '../components/ui'
import { BackupCard } from './DataCare'
import { pronounOptions } from './Onboarding'
import { allyRoles } from '../data/allies'
import { tr } from '../i18n'
import { DiscreetNameToggle } from '../components/InstallCard'
import { newAuthorId } from '../lib/types'

export function Settings() {
  const { vault, update, mode, setPin, removePin, lock, wipe, hasRecovery } = useVault()
  const [changing, setChanging] = useState(false)
  const toast = useToast()
  const s = vault.settings
  const [pin, setPinV] = useState('')
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => update(x => ({ ...x, settings: { ...x.settings, [k]: v } }))

  return (
    <>
      <TopBar title={tr('Definições')} back />
      <div className="page">
        <section className="card">
          <h3>{tr('Sobre ti')}</h3>
          <label className="field">{tr('Nome')}<input className="input" value={s.displayName} onChange={e => set('displayName', e.target.value)} /></label>
          {s.profile === 'ally' ? (
            <div className="row wrap">{allyRoles.map(r => <button key={r.id} className={'chip' + (s.allyRole === r.id ? ' on' : '')} onClick={() => set('allyRole', r.id)}>{r.emoji} {r.label}</button>)}</div>
          ) : (
            <div className="row wrap">{pronounOptions.map(p => <button key={p} className={'chip' + (s.pronouns === p ? ' on' : '')} onClick={() => set('pronouns', p)}>{p}</button>)}</div>
          )}
        </section>

        <section className="card">
          <h3>{tr('Perfil')}</h3>
          <Seg<'trans' | 'ally'> value={s.profile} onChange={v => { set('profile', v); if (v === 'ally' && !s.allyRole) set('allyRole', 'amigue'); location.hash = '#/' }} options={[{ id: 'trans', label: tr('Sou pessoa trans') }, { id: 'ally', label: tr('Apoio alguém') }]} />
          <p className="xs muted">{tr('Os teus dados dos dois perfis ficam guardados. Mudar de perfil só muda o que vês.')}</p>
        </section>

        <section className="card">
          <h3>{tr('Privacidade')}</h3>
          <div className="stack">
            <b className="small">{tr('Código de acesso')}</b>
            {mode === 'pin' ? (
              <div className="row wrap">
                <span className="badge mint">{tr('Ativo')}</span>
                <button className="btn sm secondary" onClick={lock}><Icon name="lock" size={16} />{tr('Bloquear agora')}</button>
                <button className="btn sm ghost" onClick={() => setChanging(c => !c)}>{tr('Mudar código')}</button>
                <button className="btn sm ghost" onClick={async () => { if (confirm(tr('Remover o código? Os dados continuam cifrados neste dispositivo.'))) { await removePin(); toast(tr('Código removido')) } }}>{tr('Remover')}</button>
              </div>
            ) : null}
            {mode === 'pin' && !hasRecovery && !changing && (
              <p className="xs" style={{ color: 'var(--amber)' }}>{tr('Ainda não tens código de recuperação. Muda o código (podes repetir o mesmo) para receberes um.')}</p>
            )}
            {mode === 'pin' && changing && (
              <div className="row">
                <input className="input grow" type="password" inputMode="numeric" autoFocus placeholder={tr('Código novo')} value={pin} onChange={e => setPinV(e.target.value.replace(/\D/g, '').slice(0, 8))} />
                <button className="btn" disabled={pin.length < 4} onClick={async () => { await setPin(pin); setPinV(''); setChanging(false) }}>{tr('Guardar')}</button>
              </div>
            )}
            {mode === 'pin' ? null : (
              <div className="row">
                <input className="input grow" type="password" inputMode="numeric" placeholder={tr('4 a 8 algarismos')} value={pin} onChange={e => setPinV(e.target.value.replace(/\D/g, '').slice(0, 8))} />
                <button className="btn" disabled={pin.length < 4} onClick={async () => { await setPin(pin); setPinV(''); toast(tr('Código ativo')) }}>{tr('Ativar')}</button>
              </div>
            )}
          </div>
          <label className="field">{tr('Bloquear ao sair da app')}<select className="input" value={s.autoLockMinutes} onChange={e => set('autoLockMinutes', Number(e.target.value))} disabled={mode !== 'pin'}>
              <option value={0}>{tr('Imediatamente')}</option><option value={1}>{tr('Após 1 minuto')}</option><option value={5}>{tr('Após 5 minutos')}</option><option value={30}>{tr('Após 30 minutos')}</option>
            </select>
          </label>
          <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={s.disguise} onChange={e => set('disguise', e.target.checked)} style={{ marginTop: 4 }} />
            <span className="stack" style={{ gap: 2 }}>
              <b className="small">{tr('Modo privado')}</b>
              <span className="xs muted">{(s.country ?? 'PT') === 'PT' ? tr('Para quem precisa de mais privacidade. Mostra um ícone discreto (olho riscado): num toque, ou com Esc 3 vezes, sai para o site do IPMA e, se tiveres código, a app fica bloqueada.') : tr('Para quem precisa de mais privacidade. Mostra um ícone discreto (olho riscado): num toque, ou com Esc 3 vezes, sai para um site do tempo e, se tiveres código, a app fica bloqueada.')}</span>
            </span>
          </label>
          <DiscreetNameToggle />
          <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={s.discreetNotifications} onChange={e => set('discreetNotifications', e.target.checked)} /> {tr('Notificações e calendário com texto neutro')}</label>
        </section>

        <section className="card">
          <h3>{tr('Idioma')}</h3>
          <LangPicker />
          <p className="xs muted">{tr('A app volta a abrir no idioma escolhido. Os teus dados ficam iguais.')}</p>
        </section>

        <section className="card">
          <h3>{tr('País')}</h3>
          <CountryPicker />
        </section>

        <section className="card">
          <h3>{tr('Aparência')}</h3>
          <ThemePicker />
        </section>

        <CommunityIdentity />

        <BackupCard />
        <Link to="/dados" className="item card flat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="grow"><h3>{tr('Como não perder os teus registos')}</h3><p className="small muted">{tr('Onde ficam, quando se podem perder e como passá-los para outro aparelho')}</p></div>
          <Icon name="chevron" />
        </Link>

        <section className="card tint-danger">
          <h3>{tr('Apagar tudo')}</h3>
          <p className="small">{tr('Remove todos os dados, fotos e o código deste dispositivo. Não há forma de recuperar.')}</p>
          <button className="btn danger" onClick={() => { if (confirm(tr('Apagar todos os dados deste dispositivo?'))) void wipe() }}><Icon name="trash" size={18} />{tr('Apagar tudo')}</button>
        </section>

        <section className="card flat">
          <h3>{tr('Como protegemos os teus dados')}</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>{tr('Sem conta, sem e-mail, sem rastreadores nem publicidade.')}</li>
            <li>{tr('Tudo é cifrado (AES-256) neste dispositivo. Com código, a chave deriva do código e nunca é guardada.')}</li>
            <li>{tr('Avaliações, locais e relatos que decidires partilhar são anónimos e moderados; não guardamos endereços IP.')}</li>
            <li>{tr('Dados de saúde e de identidade de género são categorias especiais no RGPD: tratamo-los com o mínimo possível.')}</li>
          </ul>
          <Link to="/privacidade" className="small">{tr('Ler a política de privacidade')}</Link>
        </section>
        <Link to="/sugerir" className="item card flat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="grow"><h3>{tr('Procurei e não encontrei')}</h3><p className="small muted">{tr('Diz-nos o que falta ou o que gostavas que existisse')}</p></div>
          <Icon name="chevron" />
        </Link>
        <div className="stack" style={{ justifyItems: 'center', gap: 4, marginTop: 8 }}>
          <CasuloLogo size={36} />
          <p className="xs muted" style={{ textAlign: 'center' }}><b>Casulo</b> · {tr('Versão 0.1 · feito com a comunidade')}</p>
        </div>
      </div>
    </>
  )
}

/** Comunidade: pessoas bloqueadas e assinatura deste aparelho. */
function CommunityIdentity() {
  const { vault, update } = useVault()
  const toast = useToast()
  const blocked = vault.blockedAuthors?.length ?? 0
  return (
    <section className="card">
      <h3>{tr('Comunidade')}</h3>
      <div className="row between">
        <span className="small">{blocked === 0 ? tr('Não bloqueaste ninguém.') : tr('Pessoas bloqueadas: {0}', blocked)}</span>
        {blocked > 0 && <button className="btn sm secondary" onClick={() => { if (confirm(tr('Desbloquear todas as pessoas?'))) { update(v => ({ ...v, blockedAuthors: [] })); toast(tr('Desbloqueadas')) } }}>{tr('Desbloquear todas')}</button>}
      </div>
      <p className="xs muted">{tr('O que publicas na comunidade leva uma assinatura aleatória deste aparelho, sem nome nem contacto. Serve para outras pessoas te poderem bloquear e para a moderação travar abusos. As tuas publicações ficam ligadas entre si, como com uma alcunha.')}</p>
      <button className="btn sm ghost" style={{ justifySelf: 'start' }} onClick={() => {
        if (!confirm(tr('Trocar de assinatura? O que publicares a seguir deixa de estar ligado ao que já publicaste.'))) return
        update(v => ({ ...v, authorId: newAuthorId() })); toast(tr('Assinatura trocada'))
      }}>{tr('Trocar assinatura')}</button>
    </section>
  )
}
