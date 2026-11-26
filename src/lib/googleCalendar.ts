// Ligação direta à conta Google (Google Calendar, só leitura), feita no aparelho.
//
// Usa o fluxo OAuth para apps só no navegador ("token" no endereço de regresso): a Google
// devolve um token de acesso de curta duração (1 hora) diretamente a esta página. O token
// fica só na memória da sessão, é usado para ler os eventos e é apagado logo a seguir.
// Não há servidor do Casulo pelo meio, nem segredo de cliente, nem scripts da Google na app.
//
// Nas apps nativas a Google não permite iniciar sessão dentro da app (WebView), por isso aí
// o caminho principal é o calendário do telemóvel, que já sincroniza com a conta Google.
import { isNative } from './native'
import type { ImportedEvent } from './calendarImport'

export const GOOGLE_CLIENT_ID = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim()
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const API = 'https://www.googleapis.com/calendar/v3'

const K_STATE = 'gcal-state'
const K_TOKEN = 'gcal-token'

/** Há ligação ao Google nesta versão (web, com o ID de cliente configurado)? */
export const googleAvailable = () => !!GOOGLE_CLIENT_ID && !isNative()

const redirectUri = () => `${location.origin}/`

const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch { /* sem armazenamento */ } },
  del: (k: string) => { try { sessionStorage.removeItem(k) } catch { /* sem armazenamento */ } },
}

/**
 * Vai à Google pedir autorização. Ao voltar, a app abre no ecrã `back` (rota do HashRouter).
 * `hint`: e-mail já usado antes, para a Google não perguntar outra vez qual a conta.
 */
export function startGoogleLink(back: string, hint?: string) {
  const state = crypto.randomUUID()
  ss.set(K_STATE, JSON.stringify({ state, back }))
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: GOOGLE_SCOPE,
    include_granted_scopes: 'false',
    state,
    ...(hint ? { login_hint: hint } : {}),
  })
  location.assign(`${AUTH_URL}?${q}`)
}

/**
 * Chamado no arranque, antes do router: se a página voltou da Google, guarda o token na
 * sessão, limpa o endereço e devolve a rota para onde a app deve ir.
 */
export function catchGoogleRedirect(hash = location.hash): string | null {
  if (!/(^|[#&])(access_token|error)=/.test(hash)) return null
  const p = new URLSearchParams(hash.replace(/^#/, ''))
  let saved: { state: string; back: string } | null = null
  try { saved = JSON.parse(ss.get(K_STATE) ?? 'null') } catch { /* nada */ }
  ss.del(K_STATE)
  const back = saved?.back ?? '/saude?tab=tratamento&sub=consultas'
  const token = p.get('access_token')
  if (saved && p.get('state') === saved.state && token && (p.get('scope') ?? '').includes('calendar')) {
    ss.set(K_TOKEN, JSON.stringify({ token, exp: Date.now() + (Number(p.get('expires_in')) || 3600) * 1000 }))
  } else {
    ss.set(K_TOKEN, JSON.stringify({ error: p.get('error') ?? 'state' }))
  }
  return back
}

/** Token que acabou de chegar (só pode ser usado uma vez; é apagado ao ler). */
export function takeGoogleToken(): { token: string } | { error: string } | null {
  const raw = ss.get(K_TOKEN)
  ss.del(K_TOKEN)
  if (!raw) return null
  try {
    const t = JSON.parse(raw) as { token?: string; exp?: number; error?: string }
    if (t.token && (t.exp ?? 0) > Date.now()) return { token: t.token }
    return { error: t.error ?? 'expired' }
  } catch { return null }
}

interface GEvent {
  id: string
  iCalUID?: string
  recurringEventId?: string
  status?: string
  summary?: string
  location?: string
  description?: string
  start?: { date?: string; dateTime?: string }
}

/** Converte a resposta da API nos eventos do Casulo (repetidos ficam com a próxima ocorrência). */
export function fromGoogleEvents(items: GEvent[]): ImportedEvent[] {
  const seen = new Map<string, ImportedEvent>()
  for (const e of items) {
    if (e.status === 'cancelled' || !e.start) continue
    // O iCalUID é o mesmo que aparece no .ics exportado: importar por ficheiro ou por ligação não duplica.
    const uid = e.iCalUID || e.recurringEventId || e.id
    if (seen.has(uid)) continue
    const allDay = !e.start.dateTime && !!e.start.date
    const start = allDay ? (() => { const [y, m, d] = e.start!.date!.split('-').map(Number); return new Date(y, m - 1, d) })() : new Date(e.start.dateTime!)
    if (Number.isNaN(start.getTime())) continue
    seen.set(uid, {
      uid,
      title: e.summary?.trim() || '(sem título)',
      start,
      allDay,
      location: e.location?.trim() || undefined,
      description: e.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || undefined,
      everyDays: 0,
    })
  }
  return [...seen.values()].sort((a, b) => a.start.getTime() - b.start.getTime())
}

/** Lê os próximos eventos do calendário principal da conta Google. */
export async function readGoogleEvents(token: string, days = 365, now = Date.now()): Promise<ImportedEvent[]> {
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const items: GEvent[] = []
  let page: string | undefined
  for (let i = 0; i < 8; i++) {
    const q = new URLSearchParams({
      timeMin: today.toISOString(),
      timeMax: new Date(now + days * 86_400_000).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      fields: 'nextPageToken,items(id,iCalUID,recurringEventId,status,summary,location,description,start)',
      ...(page ? { pageToken: page } : {}),
    })
    const r = await fetch(`${API}/calendars/primary/events?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', referrerPolicy: 'no-referrer' })
    if (!r.ok) throw new Error(`google ${r.status}`)
    const j = (await r.json()) as { items?: GEvent[]; nextPageToken?: string }
    items.push(...(j.items ?? []))
    page = j.nextPageToken
    if (!page) break
  }
  return fromGoogleEvents(items)
}
