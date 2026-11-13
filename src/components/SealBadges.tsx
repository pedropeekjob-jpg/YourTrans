import { TRANSPARENTE_EQI_URL, sealStatusLabel, type SealStatus } from '../data/seal'
import { tr } from '../i18n'

export function SealBadge({ status }: { status: SealStatus }) {
  return <span className={'badge ' + (status === 'selo' ? 'seal' : status === 'sem-selo' ? 'amber' : '')}>{sealStatusLabel[status]}</span>
}

/** Selo da TransParente declarado no registo e confirmado pela moderação; liga à lista original. */
export function TransparenteBadge({ link = true }: { link?: boolean }) {
  return link
    ? <a className="badge accent" href={TRANSPARENTE_EQI_URL} target="_blank" rel="noopener noreferrer">{tr('Selo TransParente (EQI)')} ↗</a>
    : <span className="badge accent">{tr('Selo TransParente (EQI)')}</span>
}
