import { lang, languages, setLang, type Lang } from '../i18n'

/** Seletor de idioma. Mudar recarrega a app (os dados ficam guardados). */
export function LangPicker({ compact }: { compact?: boolean }) {
  return (
    <select className={'input' + (compact ? ' lang-compact' : '')} value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Idioma / Language">
      {languages.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  )
}
