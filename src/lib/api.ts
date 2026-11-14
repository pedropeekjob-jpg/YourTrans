// Cliente do servidor comunitário (opcional). Sem VITE_API_URL a app funciona
// toda em modo local e as funcionalidades comunitárias ficam só de leitura.
import type { Provider, ReviewQuestion } from '../data/health'
import type { Place } from './types'
import type { Story } from '../data/stories'
import type { EntityProfile, SealCommitment, SealEntity, SealQuestion, SealStatus } from '../data/seal'
import type { OrgSize, PlanId, ServiceKind } from '../data/plans'
import { tr } from '../i18n'

/** Servidor da comunidade (Render, Frankfurt). VITE_API_URL sobrepõe-se; "off" desliga. */
const RAW = (import.meta.env.VITE_API_URL as string | undefined) || 'https://casulo-comunidade.onrender.com'
const BASE = RAW === 'off' ? undefined : RAW.replace(/\/$/, '')

export const apiEnabled = Boolean(BASE)

/** Resposta a um envio: published diz se passou o filtro e já está visível. */
export type Sent = { ok: true; published?: boolean }

/** Leituras recentes (1 minuto): mudar de separador não volta a gastar dados nem a esperar pelo servidor. */
const CACHE_MS = 60_000
const cache = new Map<string, { at: number; data: Promise<unknown> }>()
/** O servidor gratuito pode demorar a acordar; mais do que isto e desistimos com uma mensagem. */
const TIMEOUT_MS = 25_000

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error('offline')
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json' },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout?.(TIMEOUT_MS),
  }).catch(e => {
    throw new Error(tr(e instanceof DOMException && e.name === 'TimeoutError' ? 'O servidor está a demorar. Tenta daqui a pouco.' : 'Sem ligação ao servidor. Tenta daqui a pouco.'))
  })
  // As mensagens de erro do servidor vêm em português: traduzidas aqui quando há tradução.
  if (!res.ok) throw new Error(tr((await res.json().catch(() => ({}))).error ?? `Erro ${res.status}`))
  return res.json() as Promise<T>
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method && init.method !== 'GET') {
    // Um envio pode mudar o que se lê (publicado logo, apoio, denúncia): esquecer as leituras guardadas.
    cache.clear()
    return send<T>(path, init)
  }
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as Promise<T>
  const data = send<T>(path, init)
  cache.set(path, { at: Date.now(), data })
  data.catch(() => cache.delete(path))
  return data
}

/** Intervalo agregado de relatos anónimos (só existe com 3 ou mais). */
export interface ExperienceStat { track: string; kind: 'custo' | 'espera' | 'material'; sector: 'SNS' | 'Privado'; item?: string; n: number; min: number; max: number; median: number; fromYear: number; toYear: number }
export type StageQuestion = 'respeito' | 'informacao' | 'tempoRazoavel' | 'recomendaria'
export interface StageReviewStat { track: string; n: number; scores?: Record<StageQuestion, number>; comments: { id: string; month: string; comment: string }[] }

/** Acesso de uma entidade ao seu painel: o código e a chave dados no registo. */
export interface EntityLogin { id: string; key: string }
export interface Job { id: string; entityId: string; entityName?: string; seal?: SealStatus; title: string; district: string; remote: boolean; url: string; description?: string; month: string; status?: string }
export interface EntityMe {
  entity: { id: string; name: string; kind: string; district: string; status: string; seal?: SealStatus; reviewCount?: number }
  plan: { plan: PlanId; until: string; district?: string } | null
  profile: EntityProfile | null
  profileWaiting: boolean
  jobs: Job[]
  jobsLeft: number
}
export interface EntityReport {
  enough: boolean; min: number; reviews?: number
  scores?: Partial<Record<SealQuestion, number>>
  byQuarter?: Record<string, number>
  incidents?: { district: string; total?: number; byKind: Record<string, number>; bySetting: Record<string, number>; byQuarter: Record<string, number> }
}
export interface ServiceOffer { entityId: string; name: string; kind: string; district: string; seal: SealStatus; services: NonNullable<EntityProfile['services']>; bookingUrl?: string; vouchers: boolean; languages?: string }
const asEntity = (login: EntityLogin, extra: object = {}) => ({ method: 'POST', body: JSON.stringify({ ...login, ...extra }) })

export const api = {
  // Pacotes para entidades.
  jobs: () => req<Job[]>('/api/jobs'),
  services: () => req<ServiceOffer[]>('/api/services'),
  vouchersAvailable: () => req<{ available: number }>('/api/vouchers/available'),
  /** Pede um código de sessão solidária: não envia nada sobre quem pede. */
  voucher: (kind: ServiceKind) => req<{ ok: true; code: string; months: number }>('/api/vouchers', { method: 'POST', body: JSON.stringify({ kind }) }),
  planRequest: (r: { org: string; plan: PlanId; size: OrgSize; contact: string; nif?: string; message?: string; entityId?: string }) =>
    req<Sent>('/api/plan-requests', { method: 'POST', body: JSON.stringify(r) }),
  entityMe: (l: EntityLogin) => req<EntityMe>('/api/entity/me', asEntity(l)),
  entityProfile: (l: EntityLogin, profile: EntityProfile) => req<Sent>('/api/entity/profile', asEntity(l, { profile })),
  entityJob: (l: EntityLogin, job: Pick<Job, 'title' | 'district' | 'remote' | 'url' | 'description'>) => req<Sent>('/api/entity/jobs', asEntity(l, { job })),
  entityDeleteJob: (l: EntityLogin, jobId: string) => req<{ ok: true }>('/api/entity/delete-job', asEntity(l, { jobId })),
  entityReport: (l: EntityLogin) => req<EntityReport>('/api/entity/report', asEntity(l)),
  redeemVoucher: (l: EntityLogin, code: string) => req<{ ok: true }>('/api/entity/redeem', asEntity(l, { code })),

  experiences: () => req<ExperienceStat[]>('/api/experiences'),
  sendExperience: (e: { track: string; kind: ExperienceStat['kind']; sector: ExperienceStat['sector']; year: number; value: number; item?: string }) =>
    req<Sent>('/api/experiences', { method: 'POST', body: JSON.stringify(e) }),
  stageReviews: () => req<StageReviewStat[]>('/api/stage-reviews'),
  sendStageReview: (track: string, answers: Record<StageQuestion, boolean>, comment: string) =>
    req<Sent>('/api/stage-reviews', { method: 'POST', body: JSON.stringify({ track, answers, comment }) }),
  providers: () => req<Provider[]>('/api/providers'),
  suggestProvider: (p: Omit<Provider, 'id' | 'source'>) =>
    req<Sent>('/api/providers', { method: 'POST', body: JSON.stringify(p) }),
  review: (providerId: string, answers: Record<ReviewQuestion, boolean>, comment: string) =>
    req<Sent>('/api/reviews', { method: 'POST', body: JSON.stringify({ providerId, answers, comment }) }),
  incident: (data: { district: string; kind: string; setting: string; description: string; reported: boolean }) =>
    req<Sent>('/api/incidents', { method: 'POST', body: JSON.stringify(data) }),
  /** "Procurei e não encontrei": só a equipa lê, nunca é publicado. */
  wish: (w: { kind: 'procurei' | 'gostava'; text: string; area?: string; country?: string }) =>
    req<Sent>('/api/wishes', { method: 'POST', body: JSON.stringify(w) }),
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
  entities: () => req<SealEntity[]>('/api/entities'),
  /** Pedido de selo: fica sempre à espera da moderação; o e-mail nunca é publicado. */
  registerEntity: (e: Pick<SealEntity, 'name' | 'kind' | 'district' | 'address' | 'url' | 'notes' | 'transparente' | 'facilities' | 'lat' | 'lng'> & { contact: string; commitments: Record<SealCommitment, boolean> }) =>
    req<Sent & { id: string; key: string }>('/api/entities', { method: 'POST', body: JSON.stringify(e) }),
  sealReview: (entityId: string, answers: Record<SealQuestion, boolean | null>, comment: string) =>
    req<Sent>('/api/seal-reviews', { method: 'POST', body: JSON.stringify({ entityId, answers, comment }) }),
  suggestPlace: (p: Omit<Place, 'id' | 'source'>) =>
    req<Sent>('/api/places', { method: 'POST', body: JSON.stringify(p) }),
}
