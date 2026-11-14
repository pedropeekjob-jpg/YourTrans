// Validação e limpeza dos envios: o que cada tipo aceita e o que se guarda (tudo o resto é descartado).
// As listas fixas têm de ser iguais às da app; src/lib/shared.test.ts confirma-o.


const str = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
const opt = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max)
const bool = v => typeof v === 'boolean'
/** Coordenadas opcionais, só em Portugal (continente, Açores e Madeira). */
const coord = (lat, lng) => (lat === undefined && lng === undefined) ||
  (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 29.5 && lat <= 42.5 && lng >= -31.8 && lng <= -6)
const r4 = n => (Number.isFinite(n) ? Math.round(n * 1e4) / 1e4 : undefined)
export const PROVIDER_KINDS = ['Medicina geral', 'Endocrinologia', 'Psicologia', 'Psiquiatria', 'Cirurgia', 'Terapia da fala', 'Sexologia', 'Clínica']
export const SHOWERS = ['individuais', 'comuns', 'ambos', 'sem']
export const STORY_TOPICS = ['hormonas-e', 'hormonas-t', 'mastectomia', 'mamoplastia', 'vaginoplastia', 'faloplastia', 'histerectomia', 'ffs', 'voz', 'emocional', 'outro']
export const STORY_PHASES = ['antes', 'primeiros-dias', 'semanas', 'meses', 'ano']
/** Partes do percurso de saúde (iguais a src/data/healthPath.ts). */
export const TRACKS = ['inicio', 'psicologia', 'psiquiatria', 'sexologia', 'hormonas', 'fertilidade', 'voz', 'depilacao', 'mastectomia', 'mamoplastia', 'histerectomia', 'orquiectomia', 'vaginoplastia', 'faloplastia']
export const MATERIAL = ['colete', 'dilatadores', 'almofada', 'pensos', 'outro']
/** Relatos de custos e esperas: mínimo para mostrar um intervalo (decisão do Pedro, 11/11/2026). */
export const K_EXPERIENCE = 3
export const STAGE_QUESTIONS = ['respeito', 'informacao', 'tempoRazoavel', 'recomendaria']
/** Selo Casulo: compromissos que uma entidade aceita ao registar-se (iguais a src/data/seal.ts). */
export const SEAL_COMMITMENTS = ['nome', 'wc', 'formacao', 'regras', 'contacto', 'formularios']
export const SEAL_QUESTIONS = ['nomeCerto', 'seguro', 'wc', 'recomendaria']
export const ENTITY_KINDS = ['Café/Restaurante', 'Bar/Discoteca', 'Ginásio', 'Piscina', 'Loja', 'Serviço público', 'Associação', 'Alojamento', 'Empresa', 'Saúde', 'Ensino', 'Cultura', 'Outro']
/** O selo exige pelo menos 3 avaliações dos últimos 24 meses, com 80% ou mais em cada pergunta. */
export const SEAL_MIN_REVIEWS = 3
export const SEAL_THRESHOLD = 0.8
export const SEAL_MONTHS = 24
const email = v => typeof v === 'string' && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const httpsUrl = v => v === undefined || v === null || v === '' || (typeof v === 'string' && v.length <= 300 && /^https:\/\/[^\s]+$/.test(v))
/** Zonas da app para as sugestões (iguais a src/pages/Suggest.tsx). */
export const WISH_AREAS = ['percurso', 'documentos', 'saude', 'direitos', 'comunidade', 'seguranca', 'trabalho', 'outro']
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
const thisYear = () => new Date().getUTCFullYear()

export const validators = {
  provider: b => str(b.name, 3, 160) && PROVIDER_KINDS.includes(b.kind) && str(b.district, 2, 40) && ['SNS', 'Privado', 'Associação'].includes(b.sector) && opt(b.notes, 600) &&
    (b.person === undefined || bool(b.person)) && (b.worksAt === undefined || (Array.isArray(b.worksAt) && b.worksAt.length <= 8 && b.worksAt.every(w => str(w, 2, 120)))),
  review: b => str(b.providerId, 1, 80) && b.answers && ['nomeCerto', 'semJulgamento', 'conhecimento', 'recomendaria'].every(k => bool(b.answers[k])) && opt(b.comment, 600),
  place: b => str(b.name, 2, 160) && str(b.kind, 2, 40) && str(b.district, 2, 40) && opt(b.notes, 600) &&
    typeof b.facilities === 'object' && (b.facilities.duches === undefined || SHOWERS.includes(b.facilities.duches)) && coord(b.lat, b.lng),
  story: b => ['testemunho', 'pergunta'].includes(b.kind) && STORY_TOPICS.includes(b.topic) && STORY_PHASES.includes(b.phase) &&
    str(b.title, 3, 120) && str(b.body, 20, 4000) && opt(b.nickname, 40) && opt(b.warning, 120),
  reply: b => str(b.storyId, 1, 40) && str(b.body, 2, 1500) && opt(b.nickname, 40),
  event: b => str(b.title, 3, 160) && !isNaN(Date.parse(b.date)) && opt(b.place, 160) && httpsUrl(b.url),
  incident: b => str(b.kind, 2, 60) && str(b.setting, 2, 60) && str(b.district, 2, 40) && opt(b.description, 1000) && bool(b.reported),
  mentorship: b => ['mentee', 'mentor'].includes(b.role) && str(b.nickname, 1, 40) && str(b.stage, 2, 60) && Array.isArray(b.topics) && b.topics.length <= 12 && str(b.contact, 5, 120),
  // Relato anónimo: só números e escolhas fixas, sem texto livre.
  experience: b => TRACKS.includes(b.track) && ['custo', 'espera', 'material'].includes(b.kind) && ['SNS', 'Privado'].includes(b.sector) &&
    int(b.year, thisYear() - 5, thisYear()) &&
    (b.kind === 'espera' ? int(b.value, 0, 240) : b.kind === 'custo' ? int(b.value, 1, 200_000) && b.sector === 'Privado' : int(b.value, 1, 5_000) && MATERIAL.includes(b.item)),
  stageReview: b => TRACKS.includes(b.track) && b.answers && STAGE_QUESTIONS.every(k => bool(b.answers[k])) && opt(b.comment, 600),
  // "Procurei e não encontrei": só para a equipa, nunca é publicado.
  wish: b => ['procurei', 'gostava'].includes(b.kind) && str(b.text, 5, 1000) && (b.area === undefined || WISH_AREAS.includes(b.area)) &&
    (b.country === undefined || (typeof b.country === 'string' && /^[A-Z]{2}$/.test(b.country))),
  employer: b => str(b.company, 2, 120) && b.answers && typeof b.answers === 'object' && Object.keys(b.answers).length <= 12 && opt(b.comment, 600),
  // Registo para o selo: a entidade aceita todos os compromissos e deixa um e-mail (só para a moderação).
  entity: b => str(b.name, 2, 160) && ENTITY_KINDS.includes(b.kind) && str(b.district, 2, 40) && opt(b.address, 200) && httpsUrl(b.url) && opt(b.notes, 600) &&
    email(b.contact) && b.commitments && SEAL_COMMITMENTS.every(k => b.commitments[k] === true) && (b.transparente === undefined || bool(b.transparente)) &&
    (b.facilities === undefined || (typeof b.facilities === 'object' && (b.facilities.duches === undefined || SHOWERS.includes(b.facilities.duches)))) && coord(b.lat, b.lng),
  // Avaliação de quem lá foi: "wc" pode ser null (não se aplica).
  sealReview: b => str(b.entityId, 1, 40) && b.answers && SEAL_QUESTIONS.every(k => bool(b.answers[k]) || (k === 'wc' && b.answers[k] === null)) && opt(b.comment, 600),
}

/** Campos guardados por tipo: tudo o resto é descartado. */
export const pick = {
  provider: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, sector: b.sector, notes: b.notes?.trim() || undefined,
    person: b.person || undefined, worksAt: b.worksAt?.length ? b.worksAt.map(w => w.trim()) : undefined }),
  review: b => ({ providerId: b.providerId, answers: b.answers, comment: b.comment?.trim() || undefined }),
  place: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, notes: b.notes?.trim() || undefined,
    facilities: { wcNeutro: !!b.facilities.wcNeutro, vestiarioNeutro: !!b.facilities.vestiarioNeutro, cabinesIndividuais: !!b.facilities.cabinesIndividuais, duches: b.facilities.duches },
    lat: r4(b.lat), lng: r4(b.lng) }),
  story: b => ({ kind: b.kind, topic: b.topic, phase: b.phase, title: b.title.trim(), body: b.body.trim(), nickname: b.nickname?.trim() || undefined, warning: b.warning?.trim() || undefined }),
  reply: b => ({ storyId: b.storyId, body: b.body.trim(), nickname: b.nickname?.trim() || undefined }),
  event: b => ({ title: b.title.trim(), date: new Date(b.date).toISOString(), place: b.place?.trim() || undefined, url: b.url?.trim() || undefined }),
  incident: b => ({ kind: b.kind, setting: b.setting, district: b.district, description: b.description?.trim() || undefined, reported: b.reported }),
  mentorship: b => ({ role: b.role, nickname: b.nickname.trim(), stage: b.stage, topics: b.topics.map(String).slice(0, 12), contact: b.contact.trim() }),
  experience: b => ({ track: b.track, kind: b.kind, sector: b.sector, year: b.year, value: b.value, item: b.kind === 'material' ? b.item : undefined }),
  stageReview: b => ({ track: b.track, answers: Object.fromEntries(STAGE_QUESTIONS.map(k => [k, b.answers[k]])), comment: b.comment?.trim() || undefined }),
  wish: b => ({ kind: b.kind, text: b.text.trim(), area: b.area, country: b.country }),
  employer: b => ({ company: b.company.trim(), answers: Object.fromEntries(Object.entries(b.answers).map(([k, v]) => [k, !!v])), comment: b.comment?.trim() || undefined }),
  entity: b => ({ name: b.name.trim(), kind: b.kind, district: b.district, address: b.address?.trim() || undefined, url: b.url?.trim() || undefined,
    notes: b.notes?.trim() || undefined, contact: b.contact.trim(), transparente: b.transparente || undefined,
    commitments: Object.fromEntries(SEAL_COMMITMENTS.map(k => [k, true])),
    facilities: b.facilities ? { wcNeutro: !!b.facilities.wcNeutro, vestiarioNeutro: !!b.facilities.vestiarioNeutro, cabinesIndividuais: !!b.facilities.cabinesIndividuais, duches: b.facilities.duches } : {},
    lat: r4(b.lat), lng: r4(b.lng) }),
  sealReview: b => ({ entityId: b.entityId, answers: Object.fromEntries(SEAL_QUESTIONS.map(k => [k, b.answers[k]])), comment: b.comment?.trim() || undefined }),
}


/** Código aleatório do aparelho enviado com as publicações (ver authorTag em webcrypto.mjs). */
export const validAuthor = v => typeof v === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(v)
