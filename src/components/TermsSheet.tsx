import { useEffect, useState } from 'react'
import { tr } from '../i18n'
import { answerTerms, onTermsRequest } from '../lib/terms'
import { PUBLIC_URL } from '../lib/native'
import { Sheet } from './ui'

/** Regras da comunidade, pedidas antes da primeira publicação (ver lib/terms.ts). */
export function TermsSheet() {
  const [open, setOpen] = useState(false)
  useEffect(() => onTermsRequest(setOpen), [])
  return (
    <Sheet open={open} onClose={() => answerTerms(false)} title={tr('Antes de publicares')}>
      <p className="small">{tr('A comunidade do Casulo é um espaço seguro. Ao publicar, aceitas estas regras:')}</p>
      <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        <li>{tr('Tolerância zero para assédio, ódio, transfobia, ameaças, conteúdo sexual ou violento e tentativas de "outing".')}</li>
        <li>{tr('Não partilhes dados que identifiquem outras pessoas, nem fotos ou capturas sem consentimento.')}</li>
        <li>{tr('Sem conselhos sobre doses ou medicação: isso é com profissionais de saúde.')}</li>
        <li>{tr('Podes denunciar e bloquear o que te incomoda. A moderação revê as denúncias em 24 horas e retira o conteúdo e quem o publicou.')}</li>
      </ul>
      <p className="xs muted">{tr('Termos completos em {0}', PUBLIC_URL + 'termos/')}</p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn secondary grow" onClick={() => answerTerms(false)}>{tr('Agora não')}</button>
        <button className="btn grow" onClick={() => answerTerms(true)}>{tr('Aceito')}</button>
      </div>
    </Sheet>
  )
}
