import { tr } from '../i18n'
// Informação jurídica geral sobre direitos de pessoas trans em Portugal.
// Não é aconselhamento jurídico. Rever as fontes periodicamente.

export const LEGAL_REVIEWED = tr('novembro de 2026')

export interface Source { label: string; url: string }

export interface RightTopic {
  id: string
  icon: string
  title: string
  summary: string
  points: string[]
  sources: Source[]
}

const DR = {
  l38: { label: 'Lei n.º 38/2018, de 7 de agosto (autodeterminação)', url: 'https://diariodarepublica.pt/dr/detalhe/lei/38-2018-115933863' },
  l15: { label: 'Lei n.º 15/2024, de 29 de janeiro (práticas de conversão)', url: 'https://diariodarepublica.pt/dr/detalhe/lei/15-2024-839477377' },
  cig: { label: 'CIG: queixa por discriminação', url: 'https://www.cig.gov.pt/area-servicos/servicos/queixa-por-discriminacao/' },
  act: { label: 'ACT: Autoridade para as Condições do Trabalho', url: 'https://www.act.gov.pt' },
  ers: { label: 'ERS: reclamações na saúde', url: 'https://www.ers.pt' },
  lr: { label: 'Livro de Reclamações Eletrónico', url: 'https://www.livroreclamacoes.pt' },
  cnpd: { label: 'CNPD: proteção de dados', url: 'https://www.cnpd.pt' },
  rgpd: { label: 'RGPD, artigos 16.º e 17.º', url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679' },
  ss: { label: 'Segurança Social: proteção jurídica', url: 'https://www.seg-social.pt/protecao-juridica' },
  apav: { label: 'APAV', url: 'https://apav.pt' },
}

export const rightTopics: RightTopic[] = [
  {
    id: 'identidade', icon: 'doc', title: tr('Identidade e documentos'),
    summary: tr('O direito a seres reconhecide como és, sem diagnósticos.'),
    points: [
      tr('A Lei n.º 38/2018 reconhece o direito à autodeterminação da identidade e expressão de género e à proteção das características sexuais.'),
      tr('A partir dos 18 anos, a mudança do nome próprio e da menção do sexo no registo civil faz-se na conservatória, sem relatório médico nem cirurgias.'),
      tr('Entre os 16 e os 18 anos, o pedido é feito através dos representantes legais, com um relatório de médico/a ou psicólogo/a que ateste apenas a vontade livre e esclarecida.'),
      tr('Depois do averbamento, todas as entidades devem atualizar os teus dados. O RGPD dá-te o direito à retificação (art. 16.º).'),
    ],
    sources: [DR.l38, DR.rgpd],
  },
  {
    id: 'trabalho', icon: 'briefcase', title: tr('Trabalho'),
    summary: tr('Ninguém te pode recusar emprego ou tratar pior por seres trans.'),
    points: [
      tr('O Código do Trabalho proíbe a discriminação com base na identidade de género, no acesso ao emprego, na formação, no salário, na progressão e no despedimento.'),
      tr('Podes pedir que o teu nome seja atualizado em todos os sistemas internos. Os dados sobre a transição são sensíveis e só devem ser conhecidos por quem precisa.'),
      tr('Se fores discriminade, podes apresentar queixa à ACT. Em caso de discriminação, a lei inverte o ónus da prova: cabe à entidade empregadora provar que a diferença de tratamento não foi discriminatória.'),
      tr('Guarda provas: e-mails, mensagens, nomes de testemunhas e datas. O Registo de ocorrências desta app ajuda.'),
    ],
    sources: [DR.act, DR.cig],
  },
  {
    id: 'saude', icon: 'heart', title: tr('Saúde'),
    summary: tr('Respeito pelo teu nome e acesso a cuidados sem discriminação.'),
    points: [
      tr('Tens direito a ser tratade pelo teu nome e pronomes em qualquer serviço de saúde, público ou privado.'),
      tr('Podes reclamar no Livro de Reclamações (físico ou eletrónico) ou diretamente na Entidade Reguladora da Saúde (ERS). No SNS, também no Gabinete do Cidadão da unidade.'),
      tr('Ninguém te pode exigir cirurgias, esterilização ou diagnósticos para mudares os documentos.'),
    ],
    sources: [DR.ers, DR.lr, DR.l38],
  },
  {
    id: 'escola', icon: 'book', title: tr('Escola e universidade'),
    summary: tr('Usar o nome escolhido e estar em segurança na escola.'),
    points: [
      tr('A Lei n.º 38/2018 prevê medidas nas escolas para respeitar a identidade de género, como o uso do nome escolhido e o acesso a casas de banho e balneários.'),
      tr('As regras concretas para as escolas têm sido alvo de debate legislativo e de decisões do Tribunal Constitucional. Confirma o que está em vigor junto da direção e da ILGA.'),
      tr('Bullying e discriminação podem ser comunicados à direção, à Inspeção-Geral da Educação e Ciência e, se forem crime, às autoridades.'),
    ],
    sources: [DR.l38],
  },
  {
    id: 'odio', icon: 'shield', title: tr('Violência e crimes de ódio'),
    summary: tr('Agressões, ameaças ou incitamento ao ódio são crime.'),
    points: [
      tr('O Código Penal pune a discriminação e o incitamento ao ódio e à violência, incluindo em razão da identidade de género (art. 240.º).'),
      tr('A motivação pela identidade de género é uma circunstância que agrava crimes como ofensas à integridade física ou homicídio.'),
      tr('Desde 2024, as práticas de conversão (tentativas de alterar ou reprimir a identidade de género) são crime.'),
      tr('Podes apresentar queixa em qualquer esquadra da PSP, posto da GNR ou no Ministério Público. A APAV dá apoio gratuito e confidencial.'),
    ],
    sources: [DR.l15, DR.apav],
  },
  {
    id: 'dados', icon: 'lock', title: tr('Dados pessoais'),
    summary: tr('O teu nome antigo e a tua transição são dados protegidos.'),
    points: [
      tr('Informação sobre a tua identidade de género e saúde é uma categoria especial de dados no RGPD.'),
      tr('Tens direito à retificação (art. 16.º) e ao apagamento (art. 17.º). A entidade tem, em regra, um mês para responder.'),
      tr('Se não responderem ou recusarem sem razão, podes apresentar queixa à CNPD.'),
    ],
    sources: [DR.rgpd, DR.cnpd],
  },
]

/* ---------- A quem recorrer ---------- */

export interface Route { id: string; label: string; steps: string[]; who: Source[]; template?: TemplateId }

export const routes: Route[] = [
  {
    id: 'trabalho', label: tr('No trabalho'),
    steps: [tr('Regista o que aconteceu, com data, local e testemunhas.'), tr('Se te sentires em segurança, comunica por escrito à chefia ou ao RH.'), tr('Sem resposta ou se continuar, apresenta queixa à ACT e/ou à CIG.'), tr('Fala com o sindicato ou com o apoio jurídico da ILGA.')],
    who: [DR.act, DR.cig], template: 'empregador',
  },
  {
    id: 'saude', label: tr('Num serviço de saúde'),
    steps: [tr('Pede o Livro de Reclamações no local ou usa o eletrónico.'), tr('No SNS, podes também escrever ao Gabinete do Cidadão.'), tr('Podes reclamar diretamente na ERS.')],
    who: [DR.lr, DR.ers], template: 'reclamacao',
  },
  {
    id: 'servico', label: tr('Numa loja, banco ou serviço'),
    steps: [tr('Pede o Livro de Reclamações (é obrigatório existir).'), tr('Se o problema for o nome nos dados, envia um pedido de retificação (RGPD).'), tr('Discriminação pode ser comunicada à CIG.')],
    who: [DR.lr, DR.cig], template: 'reclamacao',
  },
  {
    id: 'escola', label: tr('Na escola'),
    steps: [tr('Fala com o/a diretor/a de turma ou com a direção, de preferência por escrito.'), tr('Pede uma reunião com alguém de confiança presente.'), tr('Se não houver resposta, contacta a Inspeção-Geral da Educação e Ciência e a ILGA.')],
    who: [DR.cig],
  },
  {
    id: 'rua', label: tr('Na rua ou online (agressão, ameaça, ódio)'),
    steps: [tr('Se houver perigo, liga 112.'), tr('Guarda provas: capturas de ecrã, fotos de ferimentos, relatório médico.'), tr('Apresenta queixa na PSP, GNR ou no Ministério Público.'), tr('Pede apoio à APAV (116 006).')],
    who: [DR.apav],
  },
  {
    id: 'dados', label: tr('Não atualizam o meu nome'),
    steps: [tr('Envia um pedido de retificação por escrito (o modelo está em Documentos).'), tr('Espera até um mês pela resposta.'), tr('Sem resposta, apresenta queixa à CNPD.')],
    who: [DR.cnpd, DR.rgpd], template: 'cnpd',
  },
]

export const freeLegalHelp: { name: string; desc: string; url?: string; phone?: string }[] = [
  { name: tr('ILGA Portugal: apoio jurídico'), desc: tr('Atendimento jurídico gratuito para pessoas LGBTI+.'), url: 'https://ilga-portugal.pt' },
  { name: tr('Proteção jurídica (Segurança Social)'), desc: tr('Se não puderes pagar, pedes advogado/a oficioso/a e isenção de custas.'), url: 'https://www.seg-social.pt/protecao-juridica' },
  { name: tr('APAV'), desc: tr('Apoio jurídico e emocional a vítimas de crime, gratuito.'), phone: '116006', url: 'https://apav.pt' },
  { name: tr('Opus Diversidades'), desc: tr('Apoio e encaminhamento para pessoas LGBTI+.'), url: 'https://opusdiversidades.org' },
  { name: tr('Sindicato'), desc: tr('Se fores sindicalizade, o sindicato tem apoio jurídico laboral.') },
]

/* ---------- Modelos ---------- */

export type TemplateId = 'reclamacao' | 'empregador' | 'cig' | 'cnpd'

export const templateLabels: Record<TemplateId, string> = {
  reclamacao: tr('Reclamação (loja, serviço ou saúde)'),
  empregador: tr('Exposição à entidade empregadora'),
  cig: tr('Queixa por discriminação à CIG'),
  cnpd: tr('Queixa à CNPD (dados não retificados)'),
}

export interface TemplateFields { name: string; entity: string; date: string; place: string; what: string; witnesses: string }

function fmt(d: string) {
  return d ? new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '[data]'
}

export function buildTemplate(id: TemplateId, f: TemplateFields): string {
  const name = f.name.trim() || '[o teu nome]'
  const entity = f.entity.trim() || '[entidade]'
  const what = f.what.trim() || '[descreve o que aconteceu, de forma factual]'
  const wit = f.witnesses.trim() ? `\n\nEstiveram presentes as seguintes testemunhas: ${f.witnesses.trim()}.` : ''
  const when = `no dia ${fmt(f.date)}${f.place.trim() ? `, em ${f.place.trim()}` : ''}`
  const today = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
  switch (id) {
    case 'reclamacao':
      return `Eu, ${name}, venho apresentar reclamação contra ${entity}.\n\n${cap(when)}, ${what}${wit}\n\nConsidero que este tratamento desrespeita a minha identidade de género, protegida pela Lei n.º 38/2018, de 7 de agosto, que proíbe a discriminação em razão da identidade e expressão de género.\n\nSolicito que a situação seja averiguada, que me seja dada resposta por escrito e que sejam tomadas medidas para que não se repita.\n\n${today}\n${name}`
    case 'empregador':
      return `Assunto: Exposição sobre tratamento discriminatório\n\nExmos. Senhores,\n\nEu, ${name}, trabalhador/a de ${entity}, venho expor a seguinte situação, ocorrida ${when}: ${what}${wit}\n\nO Código do Trabalho proíbe a discriminação em razão da identidade de género e impõe à entidade empregadora o dever de proporcionar um ambiente de trabalho respeitador. Solicito que a situação seja averiguada, que me informem por escrito das medidas tomadas e que esta exposição seja tratada com confidencialidade.\n\nCom os melhores cumprimentos,\n${name}\n${today}`
    case 'cig':
      return `Assunto: Queixa por discriminação em razão da identidade de género\n\nEu, ${name}, venho apresentar queixa contra ${entity}, ao abrigo da Lei n.º 38/2018, de 7 de agosto.\n\nFactos: ${cap(when)}, ${what}${wit}\n\nJunto os elementos de prova de que disponho. Solicito a abertura do respetivo processo e que me seja comunicado o seu seguimento.\n\n${today}\n${name}`
    case 'cnpd':
      return `Assunto: Queixa por falta de retificação de dados pessoais\n\nEu, ${name}, venho apresentar queixa contra ${entity}.\n\nNo dia ${fmt(f.date)} pedi, ao abrigo do artigo 16.º do RGPD, a retificação do meu nome e da menção do sexo, na sequência de averbamento no registo civil (Lei n.º 38/2018). ${f.what.trim() ? f.what.trim() + ' ' : ''}Até à data, os dados não foram corrigidos nem obtive resposta fundamentada dentro do prazo de um mês previsto no artigo 12.º do RGPD.\n\nJunto cópia do pedido enviado. Solicito a intervenção da CNPD.\n\n${today}\n${name}`
  }
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
