import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Seg, copyText, useToast } from '../components/ui'
import { api, apiEnabled } from '../lib/api'
import { useCountry } from '../lib/useCountry'
import { PRIVACY_CONTACT } from './Privacy'
import { tr } from '../i18n'

type Kind = 'procurei' | 'gostava'

/** Zonas da app (iguais a WISH_AREAS em server/index.mjs). */
const areas = [
  { id: 'percurso', label: tr('Percurso') },
  { id: 'documentos', label: tr('Documentos') },
  { id: 'saude', label: tr('Saúde') },
  { id: 'direitos', label: tr('Direitos') },
  { id: 'comunidade', label: tr('Comunidade') },
  { id: 'seguranca', label: tr('Segurança') },
  { id: 'trabalho', label: tr('Trabalho') },
  { id: 'outro', label: tr('Outro') },
]

/** "Procurei e não encontrei / gostava que existisse": vai só para a equipa, nunca é publicado. */
export function Suggest() {
  const toast = useToast()
  const country = useCountry().code
  const [kind, setKind] = useState<Kind>('procurei')
  const [area, setArea] = useState<string | undefined>()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const ok = text.trim().length >= 5

  const submit = async () => {
    if (apiEnabled) {
      setSending(true)
      try { await api.wish({ kind, text: text.trim(), area, country: /^[A-Z]{2}$/.test(country) ? country : undefined }); setSent(true); return }
      catch (e) { toast((e as Error).message) }
      finally { setSending(false) }
    } else if (await copyText(text.trim())) toast(tr('Copiado. Podes enviar para {0}.', PRIVACY_CONTACT))
  }

  if (sent) return (
    <>
      <TopBar title={tr('Procurei e não encontrei')} back />
      <div className="page">
        <section className="card tint-mint">
          <h3>{tr('Obrigado, recebemos a tua sugestão')}</h3>
          <p className="small">{tr('Lemos todas. É assim que decidimos o que fazer a seguir no Casulo.')}</p>
          <div className="row wrap">
            <button className="btn secondary sm" onClick={() => { setSent(false); setText(''); setArea(undefined) }}>{tr('Enviar outra')}</button>
            <Link to="/" className="btn ghost sm">{tr('Voltar ao início')}</Link>
          </div>
        </section>
      </div>
    </>
  )

  return (
    <>
      <TopBar title={tr('Procurei e não encontrei')} back />
      <div className="page">
        <section className="card tint-accent">
          <h3>{tr('Falta alguma coisa no Casulo?')}</h3>
          <p className="small">{tr('Conta-nos o que procuraste e não encontraste, ou o que gostavas que existisse. Ajuda-nos a decidir o que fazer a seguir.')}</p>
        </section>
        <Seg<Kind> value={kind} onChange={setKind} options={[{ id: 'procurei', label: tr('Procurei e não encontrei') }, { id: 'gostava', label: tr('Gostava que existisse') }]} />
        <label className="field">{kind === 'procurei' ? tr('O que procuraste?') : tr('O que gostavas que existisse?')}
          <textarea className="input" rows={4} maxLength={1000} value={text} onChange={e => setText(e.target.value)}
            placeholder={kind === 'procurei' ? tr('Ex.: como mudar o nome na carta de condução') : tr('Ex.: uma lista de cabeleireiros seguros')} />
        </label>
        <div className="stack">
          <b className="small">{tr('Onde estavas a procurar?')} <span className="xs muted">(opcional)</span></b>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {areas.map(a => <button key={a.id} className={'chip' + (area === a.id ? ' on' : '')} onClick={() => setArea(area === a.id ? undefined : a.id)}>{a.label}</button>)}
          </div>
        </div>
        <p className="xs muted">{tr('Vai sem nome, contacto nem IP e só a equipa do Casulo a lê: não é publicada. Não escrevas dados que te identifiquem. É apagada ao fim de 12 meses.')} <Link to="/privacidade">{tr('Como tratamos o que partilhas')}</Link></p>
        <button className="btn block" disabled={!ok || sending} onClick={submit}><Icon name="share" size={18} />{apiEnabled ? tr('Enviar sugestão') : tr('Copiar sugestão')}</button>
      </div>
    </>
  )
}
