// Traduções. O texto original em português de Portugal é a própria chave:
// tr('Olá') procura a tradução no dicionário do idioma ativo e, se não houver, mostra o original.
// Mudar de idioma recarrega a app, para que também os conteúdos fixos sejam traduzidos.
// Para poupar dados, só se descarrega o dicionário do idioma ativo (loadDict, antes de a app arrancar).
import enUrl from './en.json?url'
import esUrl from './es.json?url'
import frUrl from './fr.json?url'
import brUrl from './br.json?url'
import deUrl from './de.json?url'

export type Lang = 'pt' | 'br' | 'en' | 'es' | 'fr' | 'de'

export const languages: { id: Lang; label: string; locale: string }[] = [
  { id: 'pt', label: 'Português (Portugal)', locale: 'pt-PT' },
  { id: 'br', label: 'Português (Brasil)', locale: 'pt-BR' },
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
  { id: 'fr', label: 'Français', locale: 'fr-FR' },
  { id: 'de', label: 'Deutsch', locale: 'de-DE' },
]

const urls: Record<Lang, string | null> = { pt: null, en: enUrl, es: esUrl, fr: frUrl, br: brUrl, de: deUrl }
const KEY = 'lang'

function detect(): Lang {
  if (import.meta.env?.MODE === 'test') return 'pt'
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && saved in urls) return saved
  } catch { /* sem armazenamento */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'pt-PT').toLowerCase()
  if (nav === 'pt-br') return 'br'
  const base = nav.slice(0, 2)
  if (base === 'pt') return 'pt'
  // Línguas que a app ainda não tem ficam em inglês.
  return base === 'es' || base === 'fr' || base === 'de' ? base : 'en'
}

export const lang: Lang = detect()
export const locale = languages.find(l => l.id === lang)!.locale
let dict: Record<string, string> = {}

/** Descarrega o dicionário do idioma ativo. Sem rede e sem cópia guardada, fica em português. */
export async function loadDict(): Promise<void> {
  const url = urls[lang]
  if (!url) return
  try { dict = await (await fetch(url)).json() } catch { /* mostra o original */ }
}

/** Endereço do dicionário ativo (o service worker guarda-o para funcionar sem rede). */
export const dictUrl = urls[lang]

if (typeof document !== 'undefined') document.documentElement.lang = locale

/** Traduz um texto. Marcadores {0}, {1}… são substituídos pelos argumentos. */
export function tr(s: string, ...args: unknown[]): string {
  const out = dict[s] ?? s
  return args.length ? out.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < args.length ? String(args[Number(i)]) : m)) : out
}

const MANUAL = 'lang-manual'

/** Muda a língua. `manual`: a pessoa escolheu-a no seletor, e a escolha do país deixa de a mudar. */
export function setLang(l: Lang, manual = true) {
  try {
    localStorage.setItem(KEY, l)
    if (manual) localStorage.setItem(MANUAL, '1')
  } catch { /* sem armazenamento */ }
  location.reload()
}

/** Ao escolher um país, passa para a língua dele, a não ser que a pessoa já tenha escolhido uma à mão. */
export function followCountryLang(l: Lang) {
  let manual = false
  try { manual = localStorage.getItem(MANUAL) === '1' } catch { /* sem armazenamento */ }
  if (!manual && l !== lang) setLang(l, false)
}
