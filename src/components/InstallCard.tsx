import { useState } from 'react'
import { Icon } from './Icon'
import { useToast } from './ui'
import { appName, discreetName, promptInstall, setDiscreetName, useInstall } from '../lib/install'
import { tr } from '../i18n'

const APP_URL = 'https://casulo.space'

// Passos para instalar, adaptados ao aparelho e ao browser.
export function InstallSteps() {
  const p = useInstall()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const install = async () => {
    setBusy(true)
    const ok = await promptInstall().catch(() => false)
    setBusy(false)
    if (ok) toast(tr('Instalada. Procura "{0}" no ecrã principal.', appName()))
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(APP_URL); toast(tr('Endereço copiado')) } catch { toast(APP_URL) }
  }

  if (p === 'installed') return <p className="small">{tr('A app já está instalada neste aparelho. Abre-a sempre pelo ícone "{0}".', appName())}</p>

  if (p === 'prompt') return (
    <button className="btn" style={{ justifySelf: 'start' }} onClick={install} disabled={busy}><Icon name="plus" size={18} /> {tr('Instalar a app')}</button>
  )

  if (p === 'in-app') return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="small">{tr('Estás a ver o Casulo dentro de outra app (Instagram, TikTok…), e aí não é possível instalar. Abre-o no browser do telemóvel:')}</p>
      <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        <li>{tr('Toca nos três pontos (⋯) no canto da página.')}</li>
        <li>{tr('Escolhe "Abrir no browser" (ou "Abrir no Safari" / "Abrir no Chrome").')}</li>
        <li>{tr('Se não aparecer, copia o endereço e cola-o no browser.')}</li>
      </ol>
      <button className="btn sm secondary" style={{ justifySelf: 'start' }} onClick={copy}><Icon name="copy" size={16} /> {tr('Copiar endereço')}</button>
      <p className="xs muted">{tr('Os dados que criares aqui ficam neste browser interno e não passam para a app instalada. Instala primeiro e começa a usar depois.')}</p>
    </div>
  )

  if (p === 'ios') return (
    <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
      <li>{tr('No Safari, toca no botão Partilhar (o quadrado com uma seta para cima). Nas versões mais recentes do iOS está no menu ⋯ junto ao endereço.')}</li>
      <li>{tr('Desliza para baixo e escolhe "Adicionar ao ecrã principal".')}</li>
      <li>{tr('Deixa ligado "Abrir como app web", se aparecer, e toca em "Adicionar".')}</li>
      <li>{tr('A partir daí abre sempre pelo ícone "{0}", não pelo Safari.', appName())}</li>
    </ol>
  )

  if (p === 'android') return (
    <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
      <li>{tr('Abre o menu do browser (os três pontos ⋮).')}</li>
      <li>{tr('Escolhe "Instalar app" ou "Adicionar ao ecrã principal".')}</li>
      <li>{tr('Confirma. A partir daí abre sempre pelo ícone "{0}".', appName())}</li>
    </ol>
  )

  return (
    <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
      <li>{tr('No Chrome ou no Edge, carrega no ícone de instalar no fim da barra do endereço, ou no menu escolhe "Instalar {0}".', appName())}</li>
      <li>{tr('No Safari do Mac, escolhe Ficheiro › Adicionar à Dock.')}</li>
      <li>{tr('No telemóvel, abre casulo.space e instala por lá: é onde a app dá mais jeito.')}</li>
    </ol>
  )
}

/** Escolher, antes de instalar, entre "Casulo" e o nome discreto "Notas". */
export function DiscreetNameToggle({ onChange }: { onChange?: () => void }) {
  const [on, setOn] = useState(discreetName)
  const installed = useInstall() === 'installed'
  return (
    <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
      <input type="checkbox" checked={on} onChange={e => { setDiscreetName(e.target.checked); setOn(e.target.checked); onChange?.() }} style={{ marginTop: 4 }} />
      <span className="stack" style={{ gap: 2 }}>
        <b className="small">{tr('Nome discreto no ecrã principal')}</b>
        <span className="xs muted">{installed
          ? tr('Instala com o nome "Notas" e um ícone neutro, em vez de "Casulo". Como a app já está instalada, para mudar faz primeiro uma cópia de segurança, depois remove o ícone e instala de novo.')
          : tr('Instala com o nome "Notas" e um ícone neutro, em vez de "Casulo". Útil se alguém pode ver o teu telemóvel.')}</span>
      </span>
    </label>
  )
}

export function InstallCard({ onClose }: { onClose?: () => void }) {
  const [name, setName] = useState(appName)
  return (
    <section className="card tint-sky">
      <div className="row between">
        <div className="row"><Icon name="plus" /><h3>{tr('Instala a app no telemóvel')}</h3></div>
        {onClose && <button className="icon-btn" aria-label={tr('Fechar')} onClick={onClose}><Icon name="x" size={18} /></button>}
      </div>
      <p className="small">{tr('Abre num toque, funciona sem internet e protege melhor os teus registos. Não passa por nenhuma loja, por isso não fica no histórico de apps.')}</p>
      <DiscreetNameToggle onChange={() => setName(appName())} />
      <InstallSteps key={name} />
    </section>
  )
}
