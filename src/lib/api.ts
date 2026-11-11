// Cliente do servidor comunitário (opcional). Sem VITE_API_URL a app funciona
// toda em modo local e as funcionalidades comunitárias ficam só de leitura.
import type { Provider, ReviewQuestion } from '../data/health'
import type { Place } from './types'
import type { Story } from '../data/stories'

/** Servidor da comunidade (Render, Frankfurt). VITE_API_URL sobrepõe-se; "off" desliga. */
const RAW = (import.meta.env.VITE_API_URL as string | undefined) || 'https://casulo-comunidade.onrender.com'
const BASE = RAW === 'off' ? undefined : RAW.replace(/\/$/, '')

export const apiEnabled = Boolean(BASE)

/** Resposta a um envio: published diz se passou o filtro e já está visível. */
export type Sent = { ok: true; published?: boolean }

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error('offline')
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json' },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Erro ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  providers: () => req<Provider[]>('/api/providers'),
  suggestProvider: (p: Omit<Provider, 'id' | 'source'>) =>
    req<Sent>('/api/providers', { method: 'POST', body: JSON.stringify(p) }),
  review: (providerId: string, answers: Record<ReviewQuestion, boolean>, comment: string) =>
    req<Sent>('/api/reviews', { method: 'POST', body: JSON.stringify({ providerId, answers, comment }) }),
  incident: (data: { district: string; kind: string; setting: string; description: string; reported: boolean }) =>
    req<Sent>('/api/incidents', { method: 'POST', body: JSON.stringify(data) }),
  safePlaces: () => req<Place[]>('/api/places'),
  events: () => req<{ id: string; title: string; date: string; place?: string; url?: string; district?: string }[]>('/api/events'),
  suggestEvent: (e: { title: string; date: string; place?: string; url?: string; district?: string }) =>
    req<Sent>('/api/events', { method: 'POST', body: JSON.stringify(e) }),
  mentorship: (m: { role: 'mentee' | 'mentor'; nickname: string; stage: string; topics: string[]; contact: string }) =>
    req<Sent>('/api/mentorship', { method: 'POST', body: JSON.stringify(m) }),
  employerReview: (r: { company: string; answers: Record<string, boolean>; comment: string }) =>
    req<Sent>('/api/employers', { method: 'POST', body: JSON.stringify(r) }),
  employers: () => req<{ company: string; score: number; reviews: number }[]>('/api/employers'),
  stories: () => req<Story[]>('/api/stories'),
  postStory: (s: Pick<Story, 'kind' | 'topic' | 'phase' | 'title' | 'body' | 'nickname' | 'warning'>) =>
    req<Sent>('/api/stories', { method: 'POST', body: JSON.stringify(s) }),
  reply: (storyId: string, body: string, nickname?: string) =>
    req<Sent>('/api/replies', { method: 'POST', body: JSON.stringify({ storyId, body, nickname }) }),
  support: (storyId: string) => req<{ ok: true; support: number }>(`/api/stories/${encodeURIComponent(storyId)}/support`, { method: 'POST', body: '{}' }),
  /** Denuncia algo publicado: sai do ar até a moderação o rever. */
  report: (id: string) => req<{ ok: true }>(`/api/report/${encodeURIComponent(id)}`, { method: 'POST', body: '{}' }),
  suggestPlace: (p: Omit<Place, 'id' | 'source'>) =>
    req<Sent>('/api/places', { method: 'POST', body: JSON.stringify(p) }),
}
