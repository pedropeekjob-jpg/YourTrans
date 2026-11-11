import { tr } from '../i18n'
// Percurso de saúde pessoal. A pessoa escolhe as partes que quer (nada vem
// escolhido por omissão) e vai marcando os passos. Tudo fica só no aparelho.
// Conteúdo informativo: o que a equipa clínica disser prevalece sempre.

export interface Source { label: string; url: string }

export interface HealthStep {
  id: string
  title: string
  body?: string
  /** Mostra "à espera desde" (data) para contar o tempo de espera */
  waits?: boolean
  /** Ligação interna da app */
  to?: { label: string; path: string }
}

export interface Recovery {
  /** Linhas curtas: internamento, tempo sem trabalhar, desporto… */
  times: string[]
  /** O que costuma ser preciso ter em casa */
  need: string[]
  sources: Source[]
}

export type TrackGroup = 'acompanhamento' | 'corpo' | 'cirurgia'

export interface Track {
  id: string
  group: TrackGroup
  title: string
  intro: string
  steps: HealthStep[]
  recovery?: Recovery
}

export const trackGroupLabels: Record<TrackGroup, string> = {
  acompanhamento: tr('Consultas e acompanhamento'),
  corpo: tr('Hormonas e outros cuidados'),
  cirurgia: tr('Cirurgias'),
}

const src = {
  acta: { label: tr('Acta Médica Portuguesa (percurso no SNS)'), url: 'https://www.actamedicaportuguesa.com/revista/index.php/amp/article/download/23663/15879/131950' },
  stgeorges: { label: 'St George’s NHS (mastectomia)', url: 'https://www.stgeorges.nhs.uk/wp-content/uploads/2022/02/PLS_NCBM.pdf' },
  harley: { label: 'Harley Medical (mastectomia)', url: 'https://www.harleymedical.co.uk/?p=201469' },
  uwTop: { label: 'UW Medicine (mastectomia, 2025)', url: 'https://honline.s.uw.edu/sites/default/files/record_pdfs/Gender-Affirming-Top-Surgery_05-2025.pdf' },
  ucsf: { label: 'UCSF Transgender Care (cirurgias genitais)', url: 'https://transcare.ucsf.edu/genital-surgical-procedures-vaginoplasty-orchietcomy-and-phalloplasty' },
  brigham: { label: 'Brigham and Women’s (vaginoplastia)', url: 'https://www.brighamandwomens.org/assets/BWH/surgery/urology/pdfs/vaginoplasty-brochure.pdf' },
  umich: { label: 'Michigan Medicine (faloplastia)', url: 'https://www.med.umich.edu/1libr/Surgery/PlasticSurgery/GenderConfirmationSurgery/Phalloplasty.pdf' },
  webmd: { label: 'WebMD (faloplastia)', url: 'https://www.webmd.com/a-to-z-guides/what-is-phalloplasty' },
  mghHyst: { label: 'Mass General (histerectomia)', url: 'https://massgeneral.org/assets/mgh/pdf/surgery/plastic-surgery/hysterectomy-welcome-packet.pdf' },
  bch: { label: 'Boston Children’s (histerectomia)', url: 'https://childrenshospital.org/sites/default/files/media_migration/f9a94dd5-cba9-4a58-b355-b012cb6e4e13.pdf' },
  mghOrch: { label: 'Mass General (orquiectomia)', url: 'https://www.massgeneral.org/assets/MGH/pdf/surgery/plastic-surgery/Orchiectomy-Welcome-Packet.pdf' },
  queerdoc: { label: 'QueerDoc (tempo sem trabalhar)', url: 'https://queerdoc.com/time-off-after-surgery' },
} satisfies Record<string, Source>

/** Passos comuns a qualquer cirurgia no SNS. */
function surgerySteps(id: string): HealthStep[] {
  return [
    { id: `${id}-falar`, title: tr('Falar com a equipa sobre esta cirurgia'), body: tr('Diz na consulta de acompanhamento que queres avançar. Podem pedir requisitos antes (por exemplo deixar de fumar, peso ou tempo de hormonas): pergunta quais se aplicam a ti.') },
    { id: `${id}-relatorios`, title: tr('Obter os relatórios'), body: tr('Para cirurgias costumam ser pedidos dois relatórios de profissionais diferentes. Pede uma cópia de cada um.') },
    { id: `${id}-refer`, title: tr('Referenciação para a consulta de cirurgia'), waits: true, body: tr('A equipa envia o pedido para a unidade que opera (no SNS, sobretudo a URGUS, em Coimbra). Guarda a data do pedido.') },
    { id: `${id}-consulta`, title: tr('Consulta com a equipa de cirurgia'), body: tr('Leva as tuas perguntas: técnica, riscos, resultado esperado, recuperação e o que precisas de comprar.'), to: { label: tr('Preparar a consulta'), path: '/diario?tab=consultas' } },
    { id: `${id}-lista`, title: tr('Entrar na lista de espera'), waits: true, body: tr('Pede por escrito a data de inscrição e a prioridade. É com isso que podes acompanhar os prazos e um eventual vale-cirurgia.') },
    { id: `${id}-preop`, title: tr('Exames e consulta pré-operatória') },
    { id: `${id}-cirurgia`, title: tr('Cirurgia') },
    { id: `${id}-pos`, title: tr('Recuperação e consultas de seguimento') },
  ]
}

export const tracks: Track[] = [
  {
    id: 'inicio',
    group: 'acompanhamento',
    title: tr('Começar no SNS'),
    intro: tr('A porta de entrada costuma ser o centro de saúde. Daqui segues para um dos três centros especializados: ULS Coimbra, ULS São José (Lisboa) ou ULS Santo António (Porto).'),
    steps: [
      { id: 'ini-mf', title: tr('Marcar consulta com o/a médico/a de família'), body: tr('Se não tens médico/a de família, pede no centro de saúde uma consulta com quem esteja de serviço.') },
      { id: 'ini-carta', title: tr('Pedir a referenciação'), body: tr('O/a médico/a de família pede a consulta no centro especializado. Leva o pedido escrito.'), to: { label: tr('Abrir carta pronta'), path: '/documentos?tab=pedidos&kind=referral' } },
      { id: 'ini-espera', title: tr('À espera da primeira consulta'), waits: true, body: tr('Se passarem meses sem notícias, pergunta ao centro de saúde se o pedido seguiu e para onde.') },
      { id: 'ini-1a', title: tr('Primeira consulta no centro especializado') },
    ],
  },
  {
    id: 'psicologia',
    group: 'acompanhamento',
    title: tr('Psicologia'),
    intro: tr('Acompanhamento para ti, se quiseres. Não é preciso para mudar o nome nem o sexo no registo (Lei n.º 38/2018).'),
    steps: [
      { id: 'psi-pedido', title: tr('Pedir consulta (SNS, associação ou privado)'), waits: true, to: { label: tr('Ver profissionais'), path: '/saude?tab=diretorio&tipo=Psicologia' } },
      { id: 'psi-1a', title: tr('Primeira consulta'), to: { label: tr('Perguntas para a primeira sessão'), path: '/saude?tab=mente' } },
      { id: 'psi-acomp', title: tr('Acompanhamento regular') },
    ],
  },
  {
    id: 'psiquiatria',
    group: 'acompanhamento',
    title: tr('Psiquiatria'),
    intro: tr('Em muitos centros faz parte da avaliação que leva aos relatórios para hormonas ou cirurgias.'),
    steps: [
      { id: 'psq-refer', title: tr('Referenciação para psiquiatria'), waits: true },
      { id: 'psq-consultas', title: tr('Consultas de avaliação') },
      { id: 'psq-relatorio', title: tr('Relatório entregue (pede uma cópia)') },
    ],
  },
  {
    id: 'sexologia',
    group: 'acompanhamento',
    title: tr('Sexologia / consulta de identidade de género'),
    intro: tr('É muitas vezes a consulta que acompanha todo o processo e coordena os pedidos às outras especialidades.'),
    steps: [
      { id: 'sex-refer', title: tr('Referenciação para a consulta'), waits: true },
      { id: 'sex-consultas', title: tr('Consultas de acompanhamento') },
      { id: 'sex-relatorio', title: tr('Relatório entregue (pede uma cópia)') },
    ],
  },
  {
    id: 'hormonas',
    group: 'corpo',
    title: tr('Endocrinologia e hormonas'),
    intro: tr('Para iniciar hormonas no SNS costuma ser pedido um relatório da equipa que te acompanha.'),
    steps: [
      { id: 'hor-relatorio', title: tr('Relatório para iniciar hormonas') },
      { id: 'hor-fert', title: tr('Decidir sobre preservação de fertilidade (antes de começar)'), body: tr('Opcional, mas só faz sentido antes. Vê a parte de fertilidade.') },
      { id: 'hor-refer', title: tr('Referenciação para endocrinologia'), waits: true },
      { id: 'hor-analises', title: tr('Análises antes da primeira consulta') },
      { id: 'hor-1a', title: tr('Primeira consulta de endocrinologia') },
      { id: 'hor-inicio', title: tr('Começar as hormonas'), to: { label: tr('Criar lembretes de toma'), path: '/saude?tab=tratamento&sub=lembretes' } },
      { id: 'hor-seguimento', title: tr('Análises e consultas de seguimento'), to: { label: tr('Registar efeitos'), path: '/saude?tab=tratamento&sub=efeitos' } },
    ],
  },
  {
    id: 'fertilidade',
    group: 'corpo',
    title: tr('Preservação de fertilidade'),
    intro: tr('Guardar óvulos ou esperma antes de hormonas ou de cirurgias que afetem a fertilidade. Pergunta à tua equipa como pedir no SNS.'),
    steps: [
      { id: 'fer-falar', title: tr('Falar com a equipa sobre preservação') },
      { id: 'fer-refer', title: tr('Referenciação para o centro de fertilidade'), waits: true },
      { id: 'fer-recolha', title: tr('Recolha e criopreservação') },
    ],
  },
  {
    id: 'voz',
    group: 'corpo',
    title: tr('Voz e terapia da fala'),
    intro: tr('Treino de voz e comunicação com terapeuta da fala.'),
    steps: [
      { id: 'voz-pedido', title: tr('Pedir terapia da fala'), waits: true, to: { label: tr('Ver profissionais'), path: '/saude?tab=diretorio&tipo=Terapia da fala' } },
      { id: 'voz-sessoes', title: tr('Sessões de treino') },
    ],
  },
  {
    id: 'depilacao',
    group: 'corpo',
    title: tr('Depilação definitiva'),
    intro: tr('Laser ou eletrólise, no rosto ou antes de algumas cirurgias genitais. Pergunta à tua equipa se o teu centro tem resposta no SNS.'),
    steps: [
      { id: 'dep-falar', title: tr('Perguntar à equipa se é necessária e onde') },
      { id: 'dep-sessoes', title: tr('Sessões') },
    ],
  },
  {
    id: 'mastectomia',
    group: 'cirurgia',
    title: tr('Mastectomia'),
    intro: tr('Remoção do tecido mamário e reconstrução do peito.'),
    steps: surgerySteps('mas'),
    recovery: {
      times: [
        tr('Trabalho: pelo menos 2 semanas; 2 a 3 semanas num trabalho de secretária e 4 a 6 num trabalho físico.'),
        tr('Ajuda em casa: nas primeiras 2 semanas.'),
        tr('Pesos e condução: evitar ou reduzir durante 4 a 6 semanas.'),
        tr('Desporto: normalmente a partir das 6 a 8 semanas.'),
      ],
      need: [
        tr('Colete ou faixa de compressão, normalmente durante cerca de 6 semanas. Pergunta à equipa o tamanho, o modelo e se te dão um. Ter dois ajuda a lavar.'),
        tr('Camisas ou casacos com botões ou fecho à frente (custa levantar os braços).'),
        tr('Almofadas para dormir de costas, meio sentade.'),
        tr('Coisas de uso diário ao alcance da mão, à altura do peito.'),
      ],
      sources: [src.stgeorges, src.harley, src.uwTop],
    },
  },
  {
    id: 'mamoplastia',
    group: 'cirurgia',
    title: tr('Aumento mamário'),
    intro: tr('Implantes ou enxerto de gordura.'),
    steps: surgerySteps('mam'),
  },
  {
    id: 'histerectomia',
    group: 'cirurgia',
    title: tr('Histerectomia'),
    intro: tr('Remoção do útero (e por vezes dos ovários). Fala sobre fertilidade antes.'),
    steps: surgerySteps('his'),
    recovery: {
      times: [
        tr('Trabalho: de 2 a 8 semanas, conforme o tipo de cirurgia e de trabalho.'),
        tr('Repouso pélvico (sem sexo com penetração nem banhos de imersão): cerca de 8 semanas.'),
      ],
      need: [tr('Pensos higiénicos para as primeiras semanas.'), tr('Roupa larga, sem pressão na barriga.')],
      sources: [src.bch, src.mghHyst, src.queerdoc],
    },
  },
  {
    id: 'orquiectomia',
    group: 'cirurgia',
    title: tr('Orquiectomia'),
    intro: tr('Remoção dos testículos. Pode reduzir a dose de hormonas, mas pode afetar uma futura vaginoplastia: fala sobre isso com a equipa.'),
    steps: surgerySteps('orq'),
    recovery: {
      times: [tr('Trabalho: cerca de 2 a 3 semanas, conforme o esforço físico do trabalho.')],
      need: [tr('Roupa interior justa ou de suporte.'), tr('Gelo envolto num pano para o inchaço, se a equipa indicar.')],
      sources: [src.mghOrch, src.queerdoc],
    },
  },
  {
    id: 'vaginoplastia',
    group: 'cirurgia',
    title: tr('Vaginoplastia / vulvoplastia'),
    intro: tr('Construção da vulva e, na vaginoplastia, de um canal vaginal.'),
    steps: surgerySteps('vag'),
    recovery: {
      times: [
        tr('Internamento: cerca de 3 a 5 dias.'),
        tr('Trabalho ou estudos: 6 a 8 semanas.'),
        tr('Consultas: semanais nas primeiras 4 a 6 semanas.'),
        tr('Dilatação: para toda a vida quando há canal vaginal. Várias vezes por dia no início e menos ao longo do primeiro ano, conforme o plano da tua equipa.'),
      ],
      need: [
        tr('Dilatadores (pergunta se a equipa os fornece) e lubrificante à base de água.'),
        tr('Pensos e resguardos.'),
        tr('Almofada em forma de anel para te sentares.'),
        tr('Um espelho pequeno e um sítio calmo e privado para dilatar.'),
      ],
      sources: [src.ucsf, src.brigham],
    },
  },
  {
    id: 'faloplastia',
    group: 'cirurgia',
    title: tr('Faloplastia / metoidioplastia'),
    intro: tr('Construção de um pénis. A faloplastia costuma ser feita em várias fases.'),
    steps: surgerySteps('fal'),
    recovery: {
      times: [
        tr('Recuperação de cada fase: planeia pelo menos 8 semanas.'),
        tr('Atividade normal: muitas vezes por volta das 6 semanas.'),
        tr('Recuperação completa: 12 a 18 meses, entre todas as fases.'),
      ],
      need: [tr('Ajuda em casa nas primeiras semanas.'), tr('Roupa larga e material de penso indicado pela equipa.')],
      sources: [src.umich, src.webmd, src.queerdoc],
    },
  },
]

export const allSteps: HealthStep[] = tracks.flatMap(t => t.steps)

export interface HealthPathState { tracks: string[]; steps: Record<string, { done?: boolean; since?: string }> }

/** Meses (arredondados para baixo) desde uma data AAAA-MM-DD. */
export function monthsSince(since: string, now = new Date()): number {
  const d = new Date(since + 'T00:00:00')
  if (isNaN(d.getTime())) return 0
  let m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (now.getDate() < d.getDate()) m--
  return Math.max(0, m)
}

/** Passos das partes escolhidas, pela ordem do catálogo. */
export function chosenSteps(state: HealthPathState): { track: Track; step: HealthStep }[] {
  return tracks.filter(t => state.tracks.includes(t.id)).flatMap(t => t.steps.map(step => ({ track: t, step })))
}

/** Listas de espera e vale-cirurgia no SNS. */
export const waitingList = {
  reviewedAt: '11/11/2026',
  sections: [
    {
      title: tr('Como entras na lista'),
      body: [
        tr('Quando a equipa de cirurgia decide operar, és inscrite na Lista de Inscritos para Cirurgia (LIC) desse hospital, com uma prioridade. A inscrição tem de ficar registada eletronicamente.'),
        tr('Cada prioridade tem um Tempo Máximo de Resposta Garantido (TMRG). Pede por escrito a data de inscrição e a prioridade.'),
      ],
    },
    {
      title: tr('Vale-cirurgia e nota de transferência'),
      body: [
        tr('Se o hospital não conseguir operar a tempo, o sistema emite automaticamente uma nota de transferência ou um vale-cirurgia: aos 75% do TMRG na prioridade normal e aos 50% na prioritária.'),
        tr('Com ele escolhes, de uma lista, outra unidade pública, privada ou convencionada para fazer a mesma cirurgia, sem custos para ti.'),
        tr('A emissão não é garantida: depende de haver unidades que façam essa cirurgia. Para cirurgias de afirmação de género pode não haver alternativas na lista.'),
      ],
    },
    {
      title: tr('Como usar o vale'),
      body: [
        tr('Recebes o vale por carta ou e-mail. Contacta o hospital que escolheres dentro do prazo indicado, com o número do vale (no canto superior direito), ou vai lá entregá-lo.'),
        tr('Também podes reencaminhar o e-mail a dizer que aceitas o vale.'),
        tr('Se não quiseres usar, envia a justificação de recusa dentro do prazo: manténs o lugar na lista do teu hospital. Se não fizeres nada, a inscrição pode ser cancelada.'),
      ],
    },
    {
      title: tr('Que dados públicos existem'),
      body: [
        tr('O Portal da Transparência do SNS publica todos os meses quantas pessoas esperam por cirurgia, mas sem separar por especialidade. Não há forma pública de ver a tua posição nem o tempo de espera de uma cirurgia de afirmação de género.'),
        tr('Uma auditoria da IGAS concluiu que a URGUS não tinha uma lista de espera própria: os utentes ficavam nas listas das várias especialidades.'),
      ],
    },
  ],
  sources: [
    { label: tr('SNS 24: notas de transferência e vale-cirurgia'), url: 'https://www.sns24.gov.pt/servico/notas-de-transferencia-e-vale-cirurgia/' },
    { label: tr('ACSS: perguntas frequentes sobre o vale-cirurgia'), url: 'https://www.acss.min-saude.pt/wp-content/uploads/2022/12/Perguntas-Frequentes-Vale-Cirurgia-CSH.pdf' },
    { label: tr('gov.pt: receber vale-cirurgia e nota de transferência'), url: 'https://www.gov.pt/servicos/receber-vale-cirurgia-e-nota-de-transferencia' },
    { label: tr('Portal da Transparência do SNS'), url: 'https://transparencia.sns.gov.pt' },
    { label: tr('DN: auditoria da IGAS à URGUS'), url: 'https://www.dn.pt/arquivo/diario-de-noticias/unidade-publica-que-faz-mudancas-de-sexo-tem-de-criar-lista-de-espera-especifica-5274932.html' },
  ] as Source[],
}

/** Apoios quando a cirurgia é longe de casa. */
export const travelSupport = {
  sections: [
    {
      title: tr('Transporte pago pelo SNS'),
      body: [
        tr('O SNS paga o transporte não urgente para consultas, internamento, cirurgia e exames, e o regresso a casa depois da alta, quando há ao mesmo tempo justificação clínica e insuficiência económica comprovada.'),
        tr('Tem de ser pedido por um/a médico/a do SNS, com a justificação clínica. A isenção por insuficiência económica pede-se no centro de saúde ou no Portal SNS 24 e dura pelo menos um ano.'),
        tr('Pessoas com incapacidade igual ou superior a 60% têm o transporte assegurado gratuitamente.'),
      ],
    },
    {
      title: tr('Alojamento e outras despesas'),
      body: [
        tr('No continente não encontrámos um apoio geral do Estado para alojamento ou refeições de quem é operade longe de casa. Fala com o serviço social do hospital antes da cirurgia: conhecem os apoios locais e as casas de acolhimento.'),
        tr('Nos Açores e na Madeira há serviços de apoio a doentes deslocados, com regras próprias para viagem e alojamento. Pede informação no teu centro de saúde antes de marcar a viagem.'),
        tr('Guarda as faturas com o teu NIF: as despesas de saúde entram no IRS.'),
      ],
    },
  ],
  sources: [
    { label: tr('ERS: transporte não urgente de doentes no SNS'), url: 'https://www.ers.pt/pt/utentes/perguntas-frequentes/faq/transporte-nao-urgente-de-doentes-no-sns/' },
    { label: tr('ACSS: transporte não urgente de doentes'), url: 'https://www.acss.min-saude.pt/2016/09/15/transporte-nao-urgente-de-doentes/' },
    { label: tr('Portaria n.º 142-B/2012 (versão consolidada)'), url: 'https://diariodarepublica.pt/dr/legislacao-consolidada/portaria/2012-66484805' },
    { label: tr('gov.pt: cuidados de saúde para pessoas com doenças incapacitantes'), url: 'https://www.gov.pt/guias/acesso-a-cuidados-de-saude-para-pessoas-com-doencas-incapacitantes' },
  ] as Source[],
}

export { src as healthSources }
