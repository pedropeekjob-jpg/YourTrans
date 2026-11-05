import { lang, languages, setLang, type Lang } from '../i18n'

/** Seletor de idioma. Mudar recarrega a app (os dados ficam guardados).
 *  `subtle`: só texto pequeno com o idioma atual; o select nativo fica invisível por cima. */
export function LangPicker({ subtle }: { subtle?: boolean }) {
  const select = (
    <select className={subtle ? 'lang-subtle-select' : 'input'} value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Idioma / Language">
      {languages.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  )
  if (!subtle) return select
  const current = languages.find(l => l.id === lang)?.label
  return <span className="lang-subtle xs muted">{current} ▾{select}</span>
}
