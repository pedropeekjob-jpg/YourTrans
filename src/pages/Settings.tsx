import { useRef, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Seg, useToast } from '../components/ui'
import { exportBackup, importBackup } from '../lib/storage'
import type { PanicTarget, Theme } from '../lib/types'
import { pronounOptions } from './Onboarding'
import { allyRoles } from '../data/allies'

export function Settings() {
  const { vault, update, mode, setPin, removePin, lock, wipe, replaceVault } = useVault()
  const toast = useToast()
  const s = vault.settings
  const [pin, setPinV] = useState('')
  const [backupPass, setBackupPass] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => update(x => ({ ...x, settings: { ...x.settings, [k]: v } }))

  const doExport = async () => {
    if (backupPass.length < 6) { toast('Escolhe uma palavra-passe com 6+ caracteres'); return }
    const text = await exportBackup(vault, backupPass)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    a.download = `notas-${new Date().toISOString().slice(0, 10)}.backup`
    a.click(); URL.revokeObjectURL(a.href)
    toast('Cópia cifrada criada (sem fotos)')
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try { await replaceVault(await importBackup(await f.text(), backupPass)); toast('Dados restaurados') }
    catch { toast('Palavra-passe errada ou ficheiro inválido') }
  }

  return (
    <>
      <TopBar title="Definições" back />
      <div className="page">
        <section className="card">
          <h3>Sobre ti</h3>
          <label className="field">Nome<input className="input" value={s.displayName} onChange={e => set('displayName', e.target.value)} /></label>
          {s.profile === 'ally' ? (
            <div className="row wrap">{allyRoles.map(r => <button key={r.id} className={'chip' + (s.allyRole === r.id ? ' on' : '')} onClick={() => set('allyRole', r.id)}>{r.emoji} {r.label}</button>)}</div>
          ) : (
            <div className="row wrap">{pronounOptions.map(p => <button key={p} className={'chip' + (s.pronouns === p ? ' on' : '')} onClick={() => set('pronouns', p)}>{p}</button>)}</div>
          )}
        </section>

        <section className="card">
          <h3>Perfil</h3>
          <Seg<'trans' | 'ally'> value={s.profile} onChange={v => { set('profile', v); if (v === 'ally' && !s.allyRole) set('allyRole', 'amigue'); location.hash = '#/' }} options={[{ id: 'trans', label: 'Sou pessoa trans' }, { id: 'ally', label: 'Apoio alguém' }]} />
          <p className="xs muted">Os teus dados dos dois perfis ficam guardados. Mudar de perfil só muda o que vês.</p>
        </section>

        <section className="card">
          <h3>Privacidade</h3>
          <div className="stack">
            <b className="small">Código de acesso</b>
            {mode === 'pin' ? (
              <div className="row wrap">
                <span className="badge mint">Ativo</span>
                <button className="btn sm secondary" onClick={lock}><Icon name="lock" size={16} />Bloquear agora</button>
                <button className="btn sm ghost" onClick={async () => { if (confirm('Remover o código? Os dados continuam cifrados neste dispositivo.')) { await removePin(); toast('Código removido') } }}>Remover</button>
              </div>
            ) : (
              <div className="row">
                <input className="input grow" type="password" inputMode="numeric" placeholder="4 a 8 algarismos" value={pin} onChange={e => setPinV(e.target.value.replace(/\D/g, '').slice(0, 8))} />
                <button className="btn" disabled={pin.length < 4} onClick={async () => { await setPin(pin); setPinV(''); toast('Código ativo') }}>Ativar</button>
              </div>
            )}
          </div>
          <label className="field">Bloquear ao sair da app
            <select className="input" value={s.autoLockMinutes} onChange={e => set('autoLockMinutes', Number(e.target.value))} disabled={mode !== 'pin'}>
              <option value={0}>Imediatamente</option><option value={1}>Após 1 minuto</option><option value={5}>Após 5 minutos</option><option value={30}>Após 30 minutos</option>
            </select>
          </label>
          <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={s.disguise} onChange={e => set('disguise', e.target.checked)} style={{ marginTop: 4 }} />
            <span className="stack" style={{ gap: 2 }}>
              <b className="small">Modo privado</b>
              <span className="xs muted">Para quem ainda não pode estar à vontade em casa. Mostra um ícone discreto (olho riscado) que transforma a app numa calculadora num toque.</span>
            </span>
          </label>
          {s.disguise && (
            <div className="stack">
              <b className="small">O ícone de modo privado abre</b>
              <Seg<PanicTarget> value={s.panicTarget} onChange={v => set('panicTarget', v)} options={[{ id: 'calculator', label: 'Calculadora' }, { id: 'weather', label: 'Site do tempo' }]} />
              <p className="xs muted">{s.panicTarget === 'calculator' ? (mode === 'pin' ? 'Para voltar, escreve o teu código e carrega em "=".' : 'Para voltar, mantém "=" carregado 2 segundos. Com código ativo é mais seguro.') : 'Abre o site do IPMA. Voltas a entrar pelo ícone da app.'}</p>
            </div>
          )}
          <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={s.discreetNotifications} onChange={e => set('discreetNotifications', e.target.checked)} /> Notificações e calendário com texto neutro</label>
        </section>

        <section className="card">
          <h3>Aparência</h3>
          <Seg<Theme> value={s.theme} onChange={v => set('theme', v)} options={[{ id: 'system', label: 'Automático' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Escuro' }]} />
        </section>

        <section className="card">
          <h3>Cópia de segurança</h3>
          <p className="small muted">Ficheiro cifrado com uma palavra-passe à tua escolha. As fotos não são incluídas.</p>
          <input className="input" type="password" placeholder="Palavra-passe da cópia" value={backupPass} onChange={e => setBackupPass(e.target.value)} />
          <div className="grid2">
            <button className="btn secondary" onClick={doExport}>Exportar</button>
            <button className="btn secondary" onClick={() => fileRef.current?.click()} disabled={!backupPass}>Importar</button>
          </div>
          <input ref={fileRef} type="file" hidden accept=".backup,application/json" onChange={e => doImport(e.target.files?.[0])} />
        </section>

        <section className="card tint-danger">
          <h3>Apagar tudo</h3>
          <p className="small">Remove todos os dados, fotos e o código deste dispositivo. Não há forma de recuperar.</p>
          <button className="btn danger" onClick={() => { if (confirm('Apagar todos os dados deste dispositivo?')) void wipe() }}><Icon name="trash" size={18} />Apagar tudo</button>
        </section>

        <section className="card flat">
          <h3>Como protegemos os teus dados</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Sem conta, sem e-mail, sem rastreadores nem publicidade.</li>
            <li>Tudo é cifrado (AES-256) neste dispositivo. Com código, a chave deriva do código e nunca é guardada.</li>
            <li>Avaliações, locais e relatos que decidires partilhar são anónimos e moderados; não guardamos endereços IP.</li>
            <li>Dados de saúde e de identidade de género são categorias especiais no RGPD: tratamo-los com o mínimo possível.</li>
          </ul>
        </section>
        <p className="xs muted" style={{ textAlign: 'center' }}>Versão 0.1 · feito com a comunidade</p>
      </div>
    </>
  )
}
