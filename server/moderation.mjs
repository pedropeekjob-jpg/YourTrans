// Pré-moderação automática do Casulo.
// Corre só neste servidor: nenhum texto sai para serviços externos (dados de
// saúde e identidade de género são categorias especiais no RGPD).
// O filtro nunca rejeita nada sozinho. Ou o envio está limpo e é publicado,
// ou leva sinais e fica à espera de uma pessoa da moderação.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Normaliza para comparar: minúsculas, sem acentos, "leet" (0→o, 4→a…),
 * letras repetidas reduzidas a uma ("traaaveco" → "traveco").
 */
export function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' }[c]))
    .replace(/([a-z])\1+/g, '$1')
    .replace(/[^a-z\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Termos por categoria. "*" no fim aceita qualquer terminação. Escritos sem acentos. */
const TERMS = {
  'ódio ou insulto': [
    // pt-PT e pt-BR
    'traveco*', 'travesti nojent*', 'aberracao', 'aberracoes', 'abominacao', 'doente mental', 'doentes mentais', 'doenca mental ser trans',
    'paneleiro*', 'maricas', 'viadinho*', 'fufa*', 'bicha nojent*', 'filho da puta', 'filhos da puta', 'puta', 'cabrao', 'cabroes', 'otario*',
    'atrasado mental', 'atrasados mentais', 'retardad*', 'mutilacao', 'mutilar criancas', 'ideologia de genero', 'homem de vestido', 'homem de saias',
    'homem de peruca', 'nunca seras mulher', 'nunca seras homem', 'nunca vais ser mulher', 'nunca vais ser homem', 'nao es mulher', 'nao es homem',
    'nao passas de um homem', 'nao passas de uma mulher', 'so ha dois generos', 'so existem dois generos', 'cura gay', 'terapia de conversao',
    // en
    'trany', 'tranies', 'shemale*', 'tron', 'trons', 'groomer*', 'fagot*', 'mentaly il', 'you wil never be a woman', 'ywnbaw',
    'you wil never be a man', 'gender ideology', 'conversion therapy',
    // es
    'travelo*', 'maricon*', 'marimacho*', 'enfermo mental', 'enfermos mentales', 'nunca seras mujer', 'ideologia de genero',
    // fr
    'tafiole*', 'sale trans', 'malade mental', 'malades mentaux', 'tu ne seras jamais une femme',
  ],
  'ameaça': [
    'vou te matar', 'vou matar te', 'vamos te matar', 'sei onde moras', 'sei onde vives', 'sei onde trabalhas', 'vais pagar',
    'devias morrer', 'deviam morrer', 'merecem morrer', 'mereces morrer', 'deviam ser mortos', 'deviam ser mortas', 'matem nos', 'matem os',
    'mata te', 'vai te matar', 'vai se matar', 'dar te uma tareia', 'levar um tiro', 'a tiro', 'queimar vos',
    'i wil kil you', 'kil yourself', 'kys', 'i know where you live', 'should die', 'deserve to die', 'go die',
    'te voy a matar', 'se donde vives', 'deberias morir', 'je vais te tuer', 'tu merites de mourir', 'va mourir',
  ],
  'risco de autolesão': [
    'suicid*', 'matar me', 'me matar', 'quero morrer', 'queria morrer', 'acabar com tudo', 'acabar com a minha vida', 'por fim a vida',
    'nao aguento mais', 'nao quero viver', 'cortar me', 'me cortar', 'automutila*', 'autolesao', 'auto lesao', 'tomar os comprimidos todos',
    'overdose', 'despedir me de todos',
    'kil myself', 'want to die', 'end it al', 'self harm', 'selfharm', 'cuting myself',
    'quiero morir', 'matarme', 'no quiero vivir', 'me tuer', 'envie de mourir', 'en finir',
  ],
  'venda ou doses de medicamentos': [
    'sem receita', 'vendo hormona*', 'vendo testosterona', 'vendo estradiol', 'vendo estrogenio*', 'vendo bloqueador*', 'compro hormona*',
    'compro testosterona', 'mg por dia', 'mg semana', 'mg por semana', 'sin receta', 'without prescription', 'sans ordonnance',
  ],
  'conteúdo sexual': ['nudes', 'porno*', 'porn', 'onlyfans', 'escort*', 'acompanhante de luxo', 'sexo pago', 'fotos intimas'],
  'publicidade ou spam': [
    'bitcoin', 'criptomoeda*', 'crypto', 'casino*', 'apostas', 'ganhar dinheiro', 'ganhe dinheiro', 'ganha dinheiro', 'clica aqui', 'clique aqui',
    'click here', 'viagra', 'forex', 'sugar dady', 'codigo de desconto', 'make money', 'free money', 'investimento garantido',
  ],
  'redes sociais ou contacto': ['whatsapp', 'telegram', 'snapchat', 'segue me', 'adiciona me', 'manda me mensagem', 'manda mensagem', 'chama me no', 'meu insta', 'o meu insta', 'dm me', 'follow me', 'add me', 'my insta', 'sigueme', 'agregame'],
}

/** Compila cada lista numa expressão com limites de palavra, já sobre texto normalizado. */
const compiled = Object.entries(TERMS).map(([label, terms]) => {
  const parts = terms.map(t => {
    const star = t.endsWith('*')
    const base = normalize(star ? t.slice(0, -1) : t).split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(' ')
    return base + (star ? '[a-z]*' : '')
  })
  return { label, re: new RegExp(`(?:^| )(?:${parts.join('|')})(?= |$)`) }
})

/** Lista extra, editável sem mexer no código (uma expressão por linha; "#" é comentário). */
let extra = []
try {
  extra = readFileSync(join(here, 'blocklist.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(normalize).filter(Boolean)
} catch { /* opcional */ }

/** Campos de texto livre que a moderação tem de ver (os outros são escolhas fixas). */
const FREE_TEXT = {
  story: ['title', 'body', 'nickname', 'warning'], reply: ['body', 'nickname'], review: ['comment'], provider: ['name', 'notes'],
  place: ['name', 'kind', 'notes'], event: ['title', 'place'], employer: ['company', 'comment'], incident: ['description'], mentorship: ['nickname', 'stage'],
  stageReview: ['comment'], experience: [], entity: ['name', 'address', 'notes'], sealReview: ['comment'],
}

/** Em locais, profissionais e eventos uma morada é normal; num testemunho expõe alguém. */
const ADDRESS_OK = new Set(['place', 'provider', 'event', 'entity'])

/** Tipos que nunca são publicados sem uma pessoa (precisam de verificação, não só de filtro). */
// Entidades que pedem o selo também: alguém confirma que existem (e, se o declaram, o selo TransParente).
export const ALWAYS_HUMAN = new Set(['provider', 'mentorship', 'incident', 'entity'])

const SHORTENERS = /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|shorturl\.at|t\.ly)$/i

/**
 * Devolve os sinais encontrados num envio. Lista vazia = publicar automaticamente.
 * @param {string} type
 * @param {Record<string, unknown>} payload
 */
export function screen(type, payload) {
  const raw = (FREE_TEXT[type] ?? Object.keys(payload)).map(k => payload[k]).filter(v => typeof v === 'string').join('\n')
  const norm = ` ${normalize(raw)} `
  const squashed = norm.replace(/ /g, '')
  const flags = new Set()

  for (const { label, re } of compiled) if (re.test(norm.trim())) flags.add(label)
  // "t r a v e c o", "t.r.a.v.e.c.o": insultos escritos às pedaços.
  if (/traveco|tranny|shemale|paneleiro|maricon|travelo|faggot/.test(squashed) && !flags.has('ódio ou insulto')) flags.add('ódio ou insulto')
  if (extra.some(w => norm.includes(` ${w} `) || (w.length >= 6 && squashed.includes(w.replace(/ /g, ''))))) flags.add('ódio ou insulto')

  // Dados pessoais (sobre o texto original).
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(raw)) flags.add('e-mail')
  if (/(?:\+|00)\d[\d\s-]{8,}|\b[29]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/.test(raw)) flags.add('telefone')
  if (/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){4,7}/i.test(raw)) flags.add('IBAN')
  if (/\b\d{8}\s?\d\s?[A-Z]{2}\d\b/i.test(raw)) flags.add('documento de identificação')
  if (/(?:^|[^\w@])@[A-Za-z0-9_.]{3,}/.test(raw)) flags.add('redes sociais ou contacto')
  if (!ADDRESS_OK.has(type) && /\b(?:[Rr]ua|[Aa]venida|[Aa]v\.|[Tt]ravessa|[Ll]argo|[Pp]raceta|[Ee]strada|[Cc]alle|[Ss]treet|[Rr]ue)\s+(?:d[aoe]s?\s+)?[A-ZÀ-Þ][\wÀ-ÿ' ]{1,40},?\s*(?:n\.?º\s*)?\d+/.test(raw)) flags.add('morada')
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|pt|net|org|io|ly|gg|xyz|link|site|shop)\b/i.test(raw)) flags.add('ligação')

  // Spam pela forma.
  if (/(.)\1{7,}/.test(raw)) flags.add('publicidade ou spam')
  const letters = raw.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length >= 30 && letters.replace(/[^A-ZÀ-Þ]/g, '').length / letters.length > 0.6) flags.add('tudo em maiúsculas')

  // Eventos: só ligações https de domínios normais.
  if (type === 'event' && typeof payload.url === 'string' && payload.url) {
    try {
      const u = new URL(payload.url)
      if (u.protocol !== 'https:' || SHORTENERS.test(u.hostname)) flags.add('ligação suspeita')
    } catch { flags.add('ligação suspeita') }
  }
  return [...flags]
}

/** Texto normalizado usado para detetar o mesmo envio repetido. */
export const fingerprint = (type, payload) => normalize((FREE_TEXT[type] ?? []).map(k => payload[k]).filter(v => typeof v === 'string').join(' '))
