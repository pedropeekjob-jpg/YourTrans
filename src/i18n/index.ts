// Traduções. O texto original em português de Portugal é a própria chave:
// tr('Olá') procura a tradução no dicionário do idioma ativo e, se não houver, mostra o original.
// Mudar de idioma recarrega a app, para que também os conteúdos fixos sejam traduzidos.
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import br from './br.json'

export type Lang = 'pt' | 'br' | 'en' | 'es' | 'fr'

export const languages: { id: Lang; label: string; locale: string }[] = [
  { id: 'pt', label: 'Português (Portugal)', locale: 'pt-PT' },
  { id: 'br', label: 'Português (Brasil)', locale: 'pt-BR' },
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
  { id: 'fr', label: 'Français', locale: 'fr-FR' },
]

const dicts: Record<Lang, Record<string, string>> = { pt: {}, en, es, fr, br }
const KEY = 'lang'

function detect(): Lang {
  if (import.meta.env?.MODE === 'test') return 'pt'
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && saved in dicts) return saved
  } catch { /* sem armazenamento */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'pt-PT').toLowerCase()
  if (nav === 'pt-br') return 'br'
  const base = nav.slice(0, 2)
  return base === 'en' || base === 'es' || base === 'fr' ? base : 'pt'
}

export const lang: Lang = detect()
export const locale = languages.find(l => l.id === lang)!.locale
const dict = dicts[lang]

if (typeof document !== 'undefined') document.documentElement.lang = locale

/** Traduz um texto. Marcadores {0}, {1}… são substituídos pelos argumentos. */
export function tr(s: string, ...args: unknown[]): string {
  const out = dict[s] ?? s
  return args.length ? out.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < args.length ? String(args[Number(i)]) : m)) : out
}

export function setLang(l: Lang) {
  try { localStorage.setItem(KEY, l) } catch { /* sem armazenamento */ }
  location.reload()
}
