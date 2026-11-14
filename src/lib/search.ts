import { rightTopics } from '../data/legal'
import { tracks } from '../data/healthPath'
import type { CountryPack } from '../data/countries'
import { tr } from '../i18n'

/** Uma entrada que a pesquisa pode mostrar: título, texto onde procurar e para onde leva. */
export interface SearchEntry { title: string; text: string; to: string; kind: string; external?: boolean }

/** Minúsculas e sem acentos, para "saude" encontrar "Saúde". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Ecrãs da app, com palavras que as pessoas costumam usar para os procurar. */
function screens(): SearchEntry[] {
  const k = tr('Ecrã')
  return [
    { title: tr('Hoje'), text: tr('início check-in lembretes'), to: '/', kind: k },
    { title: tr('Percurso'), text: tr('etapas caminho progresso'), to: '/percurso', kind: k },
    { title: tr('Percurso de saúde'), text: tr('hormonas cirurgia lista de espera consulta'), to: '/percurso/saude', kind: k },
    { title: tr('Documentos'), text: tr('nome género cartão de cidadão conservatória registo civil'), to: '/documentos', kind: k },
    { title: tr('Direitos'), text: tr('lei discriminação queixa'), to: '/direitos', kind: k },
    { title: tr('Registo de ocorrências'), text: tr('queixa prova discriminação'), to: '/direitos?tab=registo', kind: k },
    { title: tr('Saúde'), text: tr('médicos serviços consultas hormonas'), to: '/saude', kind: k },
    { title: tr('Diário e fotos'), text: tr('registos efeitos humor euforia'), to: '/diario', kind: k },
    { title: tr('Ensaiar o nome'), text: tr('nomes pronomes experimentar'), to: '/nome', kind: k },
    { title: tr('Segurança'), text: tr('plano contactos de confiança perigo'), to: '/seguranca', kind: k },
    { title: tr('Comunidade'), text: tr('testemunhos partilhas locais eventos mentoria'), to: '/comunidade', kind: k },
    { title: tr('Emprego'), text: tr('trabalho transição empresa escola'), to: '/emprego', kind: k },
    { title: tr('Partilhar com quem me apoia'), text: tr('cartão de apoio família amigues'), to: '/partilhar', kind: k },
    { title: tr('Selo Casulo'), text: tr('entidades inclusivas empresas'), to: '/selo', kind: k },
    { title: tr('Ajuda'), text: tr('SOS emergência linhas de apoio crise'), to: '/ajuda', kind: k },
    { title: tr('Cartão para balcões'), text: tr('rececionista atendimento chamar pelo nome'), to: '/cartao-nome', kind: k },
    { title: tr('Treino de voz'), text: tr('altura Hz ressonância exercícios'), to: '/voz', kind: k },
    { title: tr('Modo viagem'), text: tr('aeroporto fronteira scanner hormonas na bagagem'), to: '/viagem', kind: k },
    { title: tr('Definições'), text: tr('código PIN privacidade idioma país tema'), to: '/definicoes', kind: k },
    { title: tr('Os teus dados'), text: tr('cópia de segurança exportar outro aparelho'), to: '/dados', kind: k },
    { title: tr('Passar para outro aparelho'), text: tr('QR telemóvel novo'), to: '/passar', kind: k },
    { title: tr('Política de privacidade'), text: tr('RGPD dados'), to: '/privacidade', kind: k },
    { title: tr('Procurei e não encontrei'), text: tr('sugestão falta'), to: '/sugerir', kind: k },
  ]
}

/** Índice de tudo o que se pode procurar, para o país escolhido. */
export function buildIndex(pack: CountryPack): SearchEntry[] {
  const out = screens()
  if (pack.code === 'PT') {
    for (const t of rightTopics) out.push({ title: t.title, text: [t.summary, ...t.points].join(' '), to: '/direitos', kind: tr('Direitos') })
    for (const t of tracks) out.push({ title: t.title, text: [t.intro, ...t.steps.map(s => s.title + ' ' + (s.body ?? ''))].join(' '), to: '/percurso/saude', kind: tr('Percurso de saúde') })
  }
  for (const s of pack.guide?.steps ?? []) out.push({ title: s.title, text: [s.body, ...(s.detail ?? []), s.where ?? ''].join(' '), to: '/documentos', kind: tr('Documentos') })
  for (const o of pack.support) out.push({ title: o.name, text: [o.description, o.area, o.phone ?? ''].join(' '), to: '/ajuda', kind: tr('Apoio') })
  return out
}

/** Procura todas as palavras; o título pesa mais do que o texto. */
export function search(index: SearchEntry[], query: string, max = 30): SearchEntry[] {
  const words = fold(query).split(/\s+/).filter(w => w.length > 1)
  if (words.length === 0) return []
  const scored: { e: SearchEntry; score: number }[] = []
  for (const e of index) {
    const title = fold(e.title)
    const text = fold(e.text)
    let score = 0
    for (const w of words) {
      if (title.includes(w)) score += title.startsWith(w) ? 5 : 3
      else if (text.includes(w)) score += 1
      else { score = 0; break }
    }
    if (score > 0) scored.push({ e, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max).map(x => x.e)
}
