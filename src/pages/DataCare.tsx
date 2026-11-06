import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { useToast } from '../components/ui'
import { exportBackup, importBackup } from '../lib/storage'
import type { Vault } from '../lib/types'
import { locale, tr } from '../i18n'

// "Os teus dados": onde ficam os registos, quando se podem perder, como evitar e como passá-los para outro aparelho.

export function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Dias desde a última cópia de segurança (null se nunca foi feita). */
export function daysSinceBackup(v: Vault): number | null {
  const at = v.settings.lastBackup
  return at ? Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000) : null
}

/** Há registos que valia a pena proteger? */
export function hasRecords(v: Vault): boolean {
  return v.journal.length + v.checkins.length + v.reminders.length >= 3
}

export function BackupCard() {
  const { vault, update, replaceVault } = useVault()
  const toast = useToast()
  const [pass, setPass] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const last = vault.settings.lastBackup

  const doExport = async () => {
    if (pass.length < 6) { toast(tr('Escolhe uma palavra-passe com 6+ caracteres')); return }
    const text = await exportBackup(vault, pass)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    a.download = tr('notas-{0}.backup', new Date().toISOString().slice(0, 10))
    a.click(); URL.revokeObjectURL(a.href)
    update(x => ({ ...x, settings: { ...x.settings, lastBackup: new Date().toISOString() } }))
    toast(tr('Cópia cifrada criada (sem fotos)'))
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    if (hasRecords(vault) && !confirm(tr('Importar substitui os registos que estão neste aparelho pelos da cópia. Continuar?'))) return
    try {
      const v = await importBackup(await f.text(), pass)
      await replaceVault({ ...v, settings: { ...v.settings, lastBackup: v.settings.lastBackup ?? new Date().toISOString() } })
      toast(tr('Dados restaurados'))
    } catch { toast(tr('Palavra-passe errada ou ficheiro inválido')) }
  }

  return (
    <section className="card">
      <h3>{tr('Cópia de segurança')}</h3>
      <p className="small muted">{tr('Ficheiro cifrado com uma palavra-passe à tua escolha. As fotos não são incluídas.')}</p>
      <p className="xs">{last ? tr('Última cópia: {0}', new Date(last).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })) : tr('Ainda não fizeste nenhuma cópia neste aparelho.')}</p>
      <input className="input" type="password" placeholder={tr('Palavra-passe da cópia')} value={pass} onChange={e => setPass(e.target.value)} />
      <div className="grid2">
        <button className="btn secondary" onClick={doExport}>{tr('Exportar')}</button>
        <button className="btn secondary" onClick={() => fileRef.current?.click()} disabled={!pass}>{tr('Importar')}</button>
      </div>
      <input ref={fileRef} type="file" hidden accept=".backup,application/json" onChange={e => doImport(e.target.files?.[0])} />
    </section>
  )
}

function Status({ ok, label, fix }: { ok: boolean; label: string; fix?: string }) {
  return (
    <li className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
      <span className={'badge ' + (ok ? 'mint' : 'amber')} style={{ marginTop: 2 }}>{ok ? '✓' : '!'}</span>
      <span className="stack" style={{ gap: 2 }}><span className="small">{label}</span>{!ok && fix && <span className="xs muted">{fix}</span>}</span>
    </li>
  )
}

export function DataCare() {
  const { vault, mode, hasRecovery } = useVault()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const installed = isInstalled()
  const days = daysSinceBackup(vault)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const askPersist = async () => {
    const ok = await navigator.storage?.persist?.().catch(() => false)
    setPersisted(!!ok)
  }

  return (
    <>
      <TopBar title={tr('Os teus dados')} back />
      <div className="page">
        <section className="card">
          <h3>{tr('Onde ficam os teus registos')}</h3>
          <p className="small">{tr('Só neste aparelho e neste browser, cifrados. Não há conta nem servidor com uma cópia: é isso que os mantém privados. Mas também quer dizer que, se este browser os apagar, só os recuperas com uma cópia de segurança.')}</p>
        </section>

        <section className="card">
          <h3>{tr('Estado neste aparelho')}</h3>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 10 }}>
            <Status ok={installed} label={installed ? tr('App instalada no ecrã principal') : tr('App aberta no browser, não instalada')}
              fix={isIOS() ? tr('No Safari, toca em Partilhar e depois em "Adicionar ao ecrã principal".') : tr('No menu do browser, escolhe "Instalar app" ou "Adicionar ao ecrã principal".')} />
            {persisted !== null && (
              <li className="stack" style={{ gap: 6 }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  <Status ok={persisted} label={persisted ? tr('Armazenamento protegido: o browser não apaga os dados sozinho') : tr('Armazenamento não protegido: o browser pode apagar os dados se faltar espaço')} />
                </ul>
                {!persisted && <button className="btn sm secondary" style={{ justifySelf: 'start' }} onClick={askPersist}>{tr('Pedir proteção ao browser')}</button>}
              </li>
            )}
            <Status ok={days !== null && days <= 30} label={days === null ? tr('Ainda sem cópia de segurança') : tr('Última cópia de segurança há {0} dias', days)} fix={tr('Faz uma cópia em baixo e guarda o ficheiro fora deste aparelho.')} />
            {mode === 'pin' && <Status ok={hasRecovery} label={hasRecovery ? tr('Código de recuperação criado') : tr('Sem código de recuperação')} fix={tr('Em Definições, muda o código para receberes um.')} />}
          </ul>
        </section>

        <section className="card tint-amber">
          <div className="row"><Icon name="alert" /><h3>{tr('Quando podes perder os registos')}</h3></div>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>{tr('Se limpares os "dados do site", "cookies e dados" ou o histórico completo do browser. Limpar só a cache não apaga nada.')}</li>
            <li>{tr('Se desinstalares a app ou apagares o browser.')}</li>
            <li>{tr('Se abrires a app noutro browser ou numa janela privada: cada um tem o seu espaço, vazio.')}</li>
            <li>{tr('Se a app for aberta noutro endereço: os dados ficam ligados ao endereço onde os criaste.')}</li>
            <li>{tr('No iPhone e iPad, se usares a app no Safari sem a instalar e ficares 7 dias sem a abrir.')}</li>
            <li>{tr('Se mudares de telemóvel, o perderes ou o repuseres de fábrica.')}</li>
            <li>{tr('Se te esqueceres do código e não tiveres o código de recuperação.')}</li>
          </ul>
        </section>

        <section className="card tint-mint">
          <div className="row"><Icon name="shield" /><h3>{tr('Como evitar')}</h3></div>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>{tr('Instala a app no ecrã principal.')}</li>
            <li>{tr('Faz uma cópia de segurança pelo menos uma vez por mês e guarda o ficheiro fora do telemóvel (e-mail para ti, nuvem ou computador).')}</li>
            <li>{tr('Se usas código, guarda o código de recuperação num sítio seguro.')}</li>
            <li>{tr('Antes de limpar o browser, mudar de telemóvel ou repô-lo, faz uma cópia.')}</li>
          </ol>
        </section>

        <section className="card">
          <h3>{tr('Usar noutro aparelho (telemóvel e computador)')}</h3>
          <p className="small muted">{tr('Por enquanto, os aparelhos não se sincronizam sozinhos. A forma mais simples de passar os registos é por código QR: um aparelho mostra, o outro lê com a câmara. Nada passa por servidores.')}</p>
          <Link to="/passar" className="btn" style={{ justifySelf: 'start' }}><Icon name="share" size={18} /> {tr('Passar por QR')}</Link>
          <p className="small muted">{tr('Sem câmara? Usa um ficheiro de cópia de segurança:')}</p>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>{tr('Neste aparelho, exporta uma cópia de segurança com uma palavra-passe.')}</li>
            <li>{tr('Envia o ficheiro para ti (e-mail, nuvem, cabo).')}</li>
            <li>{tr('No outro aparelho, abre a app no mesmo endereço, vai a Eu › Os teus dados e importa o ficheiro com a mesma palavra-passe.')}</li>
          </ol>
          <p className="xs muted">{tr('Receber dados substitui o que estiver no outro aparelho. Depois disso, os dois seguem separados: usa um como principal e repete a passagem quando precisares.')}</p>
        </section>

        <BackupCard />

        <p className="xs muted" style={{ textAlign: 'center' }}><Link to="/privacidade">{tr('Política de privacidade')}</Link> · <Link to="/definicoes">{tr('Privacidade e definições')}</Link></p>
      </div>
    </>
  )
}
