import { lang, tr, type Lang } from '../i18n'
// Conteúdos para família, amigues, colegas e escola.
// Linguagem de apoio, sem patologizar, revista com base em guias de
// associações (AMPLOS, ILGA, TransHub, Mermaids). Validar com a comunidade.

export type AllyRole = 'pais' | 'irmaos' | 'avos' | 'parceire' | 'amigue' | 'colega' | 'chefia' | 'professor'

export const allyRoles: { id: AllyRole; label: string; emoji: string }[] = [
  { id: 'pais', label: tr('Mãe ou pai'), emoji: '🏡' },
  { id: 'irmaos', label: tr('Irmão ou irmã'), emoji: '🤝' },
  { id: 'avos', label: tr('Avó ou avô'), emoji: '🌿' },
  { id: 'parceire', label: tr('Companheiro/a'), emoji: '💞' },
  { id: 'amigue', label: tr('Amigo/a'), emoji: '✨' },
  { id: 'colega', label: tr('Colega de trabalho'), emoji: '💼' },
  { id: 'chefia', label: tr('Chefia ou RH'), emoji: '🗂️' },
  { id: 'professor', label: tr('Professor/a ou direção'), emoji: '🎓' },
]

export interface Lesson { id: string; title: string; minutes: number; body: string[]; tryThis?: string }

/** Base comum a todas as pessoas. */
const core: Lesson[] = [
  {
    id: 'c-nome', title: tr('O nome e os pronomes são o primeiro gesto'), minutes: 2,
    body: [
      tr('Usar o nome e os pronomes certos é a forma mais simples e mais poderosa de mostrar apoio. A investigação mostra que jovens trans a quem respeitam o nome têm muito menos sintomas de depressão.'),
      tr('Vais errar. Toda a gente erra no início. O que conta é o que fazes a seguir: corrige-te depressa ("ele… desculpa, ela"), sem grandes pedidos de desculpa, e continua a conversa.'),
    ],
    tryThis: tr('Faz hoje uma ronda de treino de 2 minutos no separador Praticar.'),
  },
  {
    id: 'c-ouvir', title: tr('Ouvir antes de perguntar'), minutes: 2,
    body: [
      tr('Não precisas de perceber tudo para apoiar. Pergunta "como te posso ajudar?" em vez de "tens a certeza?".'),
      tr('Evita perguntas sobre o corpo, cirurgias ou o nome antigo. Se a pessoa quiser falar disso, ela própria traz o assunto.'),
    ],
  },
  {
    id: 'c-privacidade', title: tr('A história é dela, não é tua'), minutes: 2,
    body: [
      tr('Contar a outras pessoas que alguém é trans, sem autorização, pode pôr essa pessoa em risco no trabalho, na escola ou em casa.'),
      tr('Antes de falares com alguém, confirma no cartão "Como me podes apoiar" quem já sabe. Se não tiveres cartão, pergunta.'),
    ],
    tryThis: tr('Pede à pessoa que te apoias para te enviar o cartão dela pela app.'),
  },
  {
    id: 'c-sentir', title: tr('O que sentes também importa'), minutes: 3,
    body: [
      tr('É normal sentir confusão, medo ou até um luto pela imagem que tinhas. Chama-se luto ambíguo: a pessoa está aqui, mas algo mudou.'),
      tr('Esses sentimentos merecem espaço, mas não devem ser despejados sobre a pessoa trans. Fala com alguém de confiança, com um/a psicólogo/a ou num grupo de famílias. Tens um diário só teu no separador Apoio.'),
      tr('Muitas famílias contam que, com o tempo, a perda dá lugar à curiosidade: conhecer melhor quem a pessoa sempre foi.'),
    ],
  },
  {
    id: 'c-defender', title: tr('Quando alguém erra à tua frente'), minutes: 2,
    body: [
      tr('Se alguém usar o nome ou os pronomes errados, corrige com naturalidade: "É a Rita, e ela já disse que vem."'),
      tr('Não precisas de fazer um discurso. Uma correção calma e repetida ensina mais do que um confronto.'),
    ],
  },
]

const byRole: Record<AllyRole, Lesson[]> = {
  pais: [
    { id: 'p-medo', title: tr('Ter medo é normal, mas o maior risco é a rejeição'), minutes: 3, body: [
      tr('Muitos pais temem pela segurança ou pelo futuro dos filhos. O que mais protege jovens trans é sentirem-se aceites em casa: jovens com pouca aceitação familiar têm mais de três vezes mais tentativas de suicídio.'),
      tr('Não tens de ter respostas. Diz "gosto de ti e estou aqui" e deixa o resto vir com o tempo.'),
    ] },
    { id: 'p-16', title: tr('Filhos com 16 ou 17 anos: o vosso papel no registo civil'), minutes: 3, body: [
      tr('Em Portugal, entre os 16 e os 18 anos, a mudança do nome e da menção do sexo é pedida através dos representantes legais, com um relatório de médico/a ou psicólogo/a que ateste apenas a vontade livre e esclarecida, sem diagnósticos.'),
      tr('Acompanhar o vosso filho ou filha à conservatória é um gesto que fica para a vida. Os passos estão em Documentos, no perfil da pessoa trans.'),
    ] },
    { id: 'p-escola', title: tr('Falar com a escola'), minutes: 2, body: [
      tr('A lei prevê que as escolas respeitem o nome e a identidade dos alunos, incluindo nos registos internos, casas de banho e balneários. As regras concretas têm sido debatidas: confirmem com a direção e com a ILGA.'),
      tr('Peçam uma reunião com o/a diretor/a de turma e levem o plano que o vosso filho ou filha pode criar na app.'),
    ] },
    { id: 'p-familia', title: tr('Contar ao resto da família'), minutes: 2, body: [
      tr('Combinem juntos quem conta, a quem e quando. O cartão "quem sabe" ajuda a não haver surpresas.'),
      tr('Uma frase simples resolve muito: "A nossa filha chama-se agora Inês. Contamos convosco para a tratar assim."'),
    ] },
  ],
  irmaos: [
    { id: 'i-aliado', title: tr('Ser a primeira pessoa aliada em casa'), minutes: 2, body: [
      tr('Irmãos e irmãs são muitas vezes as primeiras pessoas a saber. Podes ajudar a preparar o momento de contar aos pais.'),
      tr('Corrige o nome nas conversas de família, mesmo quando a pessoa não está presente.'),
    ] },
    { id: 'i-memorias', title: tr('As memórias continuam a ser vossas'), minutes: 2, body: [
      tr('Podes continuar a falar da infância juntos. Pergunta como prefere que contes essas histórias, por exemplo usando o nome atual.'),
    ] },
  ],
  avos: [
    { id: 'a-tempo', title: tr('Nunca é tarde para aprender'), minutes: 2, body: [
      tr('Para muitas pessoas mais velhas, estas palavras são novas. Não faz mal. O carinho de sempre é o que conta e o resto aprende-se aos poucos.'),
      tr('Se te custar o nome novo, treina na app: um minuto por dia faz diferença.'),
    ] },
    { id: 'a-palavras', title: tr('Palavras que ajudam'), minutes: 2, body: [
      tr('Diz "a minha neta" ou "o meu neto" conforme a pessoa te pediu. Se não souberes, pergunta: "Como queres que te apresente?"'),
    ] },
  ],
  parceire: [
    { id: 'pa-relacao', title: tr('A relação também muda, e isso pode ser bom'), minutes: 3, body: [
      tr('Uma transição mexe com o casal: a forma como se apresentam, a intimidade, como os outros vos veem. Falem com honestidade sobre o que cada pessoa sente.'),
      tr('A terapia de casal com profissionais informados pode ajudar. As associações têm contactos.'),
    ] },
    { id: 'pa-saude', title: tr('Apoiar nas consultas e cirurgias'), minutes: 2, body: [
      tr('Acompanhar às consultas, ajudar a preparar perguntas e estar presente no pós-operatório são formas concretas de apoio.'),
      tr('Vê os testemunhos sobre o pós-cirurgia para saberes o que esperar.'),
    ] },
  ],
  amigue: [
    { id: 'am-normal', title: tr('Continuar a ser o/a mesmo/a amigo/a'), minutes: 2, body: [
      tr('Mais do que conversas sérias, a pessoa precisa de normalidade: os mesmos planos, as mesmas piadas, os mesmos jantares.'),
      tr('Oferece-te para acompanhar a sítios novos que podem ser difíceis: a conservatória, uma loja de roupa, um balneário.'),
    ] },
    { id: 'am-grupo', title: tr('No grupo de amigos'), minutes: 2, body: [
      tr('Se fores a primeira pessoa a saber, pergunta se quer ajuda para contar ao grupo, ou se prefere fazê-lo sozinho/a.'),
    ] },
  ],
  colega: [
    { id: 'co-reunioes', title: tr('No dia a dia da equipa'), minutes: 2, body: [
      tr('Usa o nome novo a partir da data combinada, também em e-mails, chats e atas.'),
      tr('Não perguntes pelo nome antigo nem comentes a aparência. Trata a pessoa como sempre trataste o trabalho dela.'),
    ] },
    { id: 'co-defender', title: tr('Quando há piadas ou comentários'), minutes: 2, body: [
      tr('Um "não tem graça" calmo muda a cultura de uma equipa. Se o comportamento se repetir, fala com a chefia ou com o RH.'),
    ] },
  ],
  chefia: [
    { id: 'ch-lei', title: tr('O que diz a lei'), minutes: 3, body: [
      tr('O Código do Trabalho proíbe a discriminação com base na identidade de género, no acesso ao emprego e durante o contrato. A pessoa pode pedir a correção dos dados ao abrigo do RGPD.'),
      tr('Os dados sobre a transição são dados pessoais sensíveis: partilha-os apenas com quem precisa de os conhecer para atualizar sistemas.'),
    ] },
    { id: 'ch-plano', title: tr('Seguir o plano de transição'), minutes: 3, body: [
      tr('Pede à pessoa que crie o plano na app e te envie a ligação. Lá está a data a partir da qual usa o novo nome, quem comunica à equipa, que sistemas atualizar e o que é confidencial.'),
      tr('O plano é dela. O teu papel é garantir que acontece como combinado, e verificar uma semana depois como correu.'),
    ] },
    { id: 'ch-instalacoes', title: tr('Casas de banho, balneários e fardas'), minutes: 2, body: [
      tr('A pessoa usa as instalações que correspondem à sua identidade. Se houver casas de banho individuais ou neutras, informa, mas não as imponhas como única opção.'),
      tr('Ajusta fardas, crachás e cartões de acesso antes da data combinada.'),
    ] },
  ],
  professor: [
    { id: 'pr-sala', title: tr('Na sala de aula'), minutes: 2, body: [
      tr('Usa o nome escolhido na chamada, nos testes e nas plataformas digitais, mesmo que os registos oficiais ainda não estejam atualizados.'),
      tr('Se um/a aluno/a errar, corrige com naturalidade e continua a aula. Intervém sempre em casos de gozo ou bullying.'),
    ] },
    { id: 'pr-confidencial', title: tr('Confidencialidade com colegas e encarregados de educação'), minutes: 3, body: [
      tr('Não reveles a identidade de um/a aluno/a a colegas, outros pais ou à própria família sem confirmar com o/a aluno/a, sobretudo se ainda não for conhecida em casa.'),
      tr('O cartão "quem sabe" do/a aluno/a diz-te com quem podes falar.'),
    ] },
    { id: 'pr-escola', title: tr('O que a escola pode fazer'), minutes: 2, body: [
      tr('Ter uma pessoa de referência para estes temas, atualizar pautas e plataformas, garantir acesso seguro a casas de banho e balneários e formar o pessoal docente e não docente.'),
      tr('As regras concretas para as escolas têm sido alvo de debate legislativo: confirma o que está em vigor com a direção e com a ILGA.'),
    ] },
  ],
}

export function lessonsFor(role: AllyRole): Lesson[] {
  return [...core.slice(0, 3), ...byRole[role], ...core.slice(3)]
}

export interface Scenario { id: string; title: string; context: string; say: string[]; avoid: string[]; roles?: AllyRole[] }

export const scenarios: Scenario[] = [
  { id: 's-erro', title: tr('Erraste o nome à frente da pessoa'), context: tr('Saiu-te o nome antigo ou o pronome errado.'),
    say: [tr('"Ele… desculpa, ela disse que…" e continuas.')], avoid: [tr('Pedidos de desculpa longos que põem a pessoa a consolar-te.'), tr('"É difícil para mim."')] },
  { id: 's-jantar', title: tr('Jantar de família'), context: tr('Um familiar insiste no nome antigo.'), roles: ['pais', 'irmaos', 'avos', 'parceire'],
    say: [tr('"Chama-se Inês. Para nós é importante que a trates assim."'), tr('Se continuar: "Vamos falar disto depois, a dois."')], avoid: [tr('Discutir o tema à frente da pessoa trans.'), tr('Ignorar e mudar de assunto.')] },
  { id: 's-pergunta', title: tr('"Mas já fez a operação?"'), context: tr('Alguém faz perguntas sobre o corpo.'),
    say: [tr('"Isso é uma conversa privada dela. O que importa é que a trates pelo nome."')], avoid: [tr('Responder em nome da pessoa.')] },
  { id: 's-reuniao', title: tr('Reunião de equipa'), context: tr('Um colega usa o nome antigo numa reunião.'), roles: ['colega', 'chefia'],
    say: [tr('"Só para corrigir: é a Inês." e retomar o ponto.')], avoid: [tr('Pedir à pessoa trans que explique a situação à equipa.')] },
  { id: 's-anuncio', title: tr('Comunicar à equipa'), context: tr('A pessoa pediu-te para anunciar a mudança.'), roles: ['chefia'],
    say: [tr('"A partir de segunda, a nossa colega chama-se Inês e usa os pronomes ela/dela. Contamos com todos para a tratar assim. Dúvidas, falem comigo."')], avoid: [tr('Detalhes médicos ou pessoais.'), tr('Abrir debate sobre o tema.')] },
  { id: 's-turma', title: tr('Na turma'), context: tr('Alunos fazem piadas ou insistem no nome antigo.'), roles: ['professor'],
    say: [tr('"Nesta sala tratamos toda a gente pelo nome que escolheu. Vamos continuar."'), tr('Falar depois, à parte, com quem fez o comentário.')], avoid: [tr('Pôr o/a aluno/a trans a explicar-se à turma.')] },
  { id: 's-fotos', title: tr('Fotos antigas'), context: tr('Queres partilhar uma fotografia de infância.'), roles: ['pais', 'irmaos', 'avos', 'amigue'],
    say: [tr('Pergunta primeiro: "Importas-te que mostre esta foto?"')], avoid: [tr('Publicar fotos antigas nas redes sem autorização.')] },
]

export const feelingPrompts = [
  tr('O que estou a sentir hoje, sem me julgar?'),
  tr('Do que tenho mais medo? Esse medo é sobre a pessoa ou sobre mim?'),
  tr('Uma coisa que descobri sobre esta pessoa e que não sabia.'),
  tr('Uma coisa que fiz bem esta semana para a apoiar.'),
  tr('O que posso perguntar, com curiosidade, da próxima vez que falarmos?'),
]

/* ---------- Treino de pronomes ---------- */

export type PronounSet = 'ela' | 'ele' | 'elu'
interface Forms { subj: string; obj: string; art: string; adj: string; to: string }
interface Drill { forms: Record<PronounSet, Forms>; labels: Record<PronounSet, string>; templates: string[] }

// Cada idioma tem as suas frases: a gramática do género muda de língua para língua.
// {N} nome, {S} sujeito, {O} possessivo, {A} artigo ou pronome de objeto, {a} "à/ao", {X} terminação.
const ptTemplates = [
  '{N} disse que {S} chega às oito.',
  'Já falaste com {N}? O casaco é {O}.',
  '{A} {N} está muito content{X} com o novo trabalho.',
  'Encontrei {N} no café e {S} mandou-te beijinhos.',
  'Diz {a} {N} que o jantar é às oito.',
  '{N} ficou cansad{X} depois do treino.',
  'O livro é {O}, devolve-o {a} {N}.',
  'Hoje {S} vem connosco ao cinema.',
  '{N} é {A} mais rápid{X} da equipa.',
  'Liga {a} {N} e diz-lhe que {S} tem razão.',
  'Vi {N} ontem e {S} estava ótim{X}.',
  'Esta mochila é {O}? Pergunta {a} {N}.',
]
const ptForms: Record<PronounSet, Forms> = {
  ela: { subj: 'ela', obj: 'dela', art: 'a', adj: 'a', to: 'à' },
  ele: { subj: 'ele', obj: 'dele', art: 'o', adj: 'o', to: 'ao' },
  elu: { subj: 'elu', obj: 'delu', art: 'e', adj: 'e', to: 'ae' },
}
const ptLabels = { ela: 'ela/dela', ele: 'ele/dele', elu: 'elu/delu' }

const drills: Record<Lang, Drill> = {
  pt: { forms: ptForms, labels: ptLabels, templates: ptTemplates },
  br: {
    forms: ptForms, labels: ptLabels,
    templates: [
      '{N} disse que {S} chega às oito.',
      'Você já falou com {N}? O casaco é {O}.',
      '{A} {N} está muito content{X} com o novo trabalho.',
      'Encontrei {N} no café e {S} mandou um beijo pra você.',
      'Fala pra {N} que o jantar é às oito.',
      '{N} ficou cansad{X} depois do treino.',
      'O livro é {O}, devolve para {N}.',
      'Hoje {S} vai com a gente ao cinema.',
      '{N} é {A} mais rápid{X} do time.',
      'Liga para {N} e fala que {S} tem razão.',
      'Vi {N} ontem e {S} estava ótim{X}.',
      'Essa mochila é {O}? Pergunta para {N}.',
    ],
  },
  en: {
    forms: {
      ela: { subj: 'she', obj: 'hers', art: 'her', adj: '', to: 'her' },
      ele: { subj: 'he', obj: 'his', art: 'him', adj: '', to: 'him' },
      elu: { subj: 'they', obj: 'theirs', art: 'them', adj: '', to: 'them' },
    },
    labels: { ela: 'she/her', ele: 'he/him', elu: 'they/them' },
    templates: [
      '{N} said {S} would arrive at eight.',
      'Have you talked to {N}? The coat is {O}.',
      'I met {N} at the café and {S} said hello.',
      'Tell {N} that I called {A} yesterday.',
      '{N} was tired after training, so I drove {A} home.',
      'The book is {O}, please give it back to {N}.',
      'Today {S} will come with us to the cinema.',
      'I asked {N} if {S} could help.',
      'Call {N} and give {A} the news.',
      'I saw {N} yesterday and {S} looked great.',
      'Is this backpack {O}? Ask {N}.',
      '{N} won the race and we cheered for {A}.',
    ],
  },
  es: {
    forms: {
      ela: { subj: 'ella', obj: 'suya', art: 'la', adj: 'a', to: 'a' },
      ele: { subj: 'él', obj: 'suyo', art: 'el', adj: 'o', to: 'a' },
      elu: { subj: 'elle', obj: 'suye', art: 'le', adj: 'e', to: 'a' },
    },
    labels: { ela: 'ella', ele: 'él', elu: 'elle' },
    templates: [
      '{N} dijo que {S} llega a las ocho.',
      '{A} {N} está muy content{X} con el nuevo trabajo.',
      'Encontré a {N} en el café y {S} te manda saludos.',
      '{N} quedó cansad{X} después del entrenamiento.',
      'Hoy {S} viene con nosotros al cine.',
      '{N} es {A} más rápid{X} del equipo.',
      'Vi a {N} ayer y {S} estaba guap{X}.',
      'Llama a {N} y dile que {S} tiene razón.',
      '{N} está list{X} para salir.',
      'Creo que {S} está muy ocupad{X} hoy.',
    ],
  },
  fr: {
    forms: {
      ela: { subj: 'elle', obj: 'la sienne', art: 'la', adj: 'e', to: 'elle' },
      ele: { subj: 'il', obj: 'le sien', art: 'le', adj: '', to: 'lui' },
      elu: { subj: 'iel', obj: 'le sien', art: 'lae', adj: '·e', to: 'iel' },
    },
    labels: { ela: 'elle', ele: 'il', elu: 'iel' },
    templates: [
      "{N} a dit qu'{S} arrive à huit heures.",
      "J'ai croisé {N} au café et {S} t'embrasse.",
      "{N} est rentré{X} fatigué{X} après l'entraînement.",
      "Aujourd'hui {S} vient au cinéma avec nous.",
      "Appelle {N} et dis-lui qu'{S} a raison.",
      "J'ai vu {N} hier et {S} avait l'air content{X}.",
      '{N} est prêt{X} à partir.',
      "Je crois qu'{S} est très occupé{X} aujourd'hui.",
      'Ce matin, {S} est arrivé{X} en retard.',
      '{N} est vraiment doué{X} pour la musique.',
    ],
  },
}

const drill = drills[lang]
export const practiceTemplates = drill.templates
export const pronounLabels = drill.labels

/** Reconhece o conjunto de pronomes a partir do que a pessoa escreveu, em qualquer idioma. */
export function pronounSetOf(pronouns: string): PronounSet | undefined {
  const first = pronouns.trim().toLowerCase().split(/[\s/]/)[0]
  if (['ela', 'she', 'ella'].includes(first)) return 'ela'
  if (['ele', 'he', 'él', 'el', 'il'].includes(first)) return 'ele'
  if (first === 'elle') return lang === 'es' ? 'elu' : 'ela'
  if (['elu', 'they', 'iel'].includes(first)) return 'elu'
  return undefined
}

function fillWords(t: string, name: string, set: PronounSet): string {
  const f = drill.forms[set]
  return t.replace(/\{N\}/g, name).replace(/\{S\}/g, f.subj).replace(/\{O\}/g, f.obj)
    .replace(/\{A\}/g, f.art).replace(/\{a\}/g, f.to).replace(/\{X\}/g, f.adj)
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)

/** Preenche uma frase de treino. */
export function fillTemplate(t: string, name: string, set: PronounSet): string {
  return cap(fillWords(t, name, set))
}

export interface PracticeQ { before: string; after: string; options: string[]; answer: string; full: string }

/** Cria uma pergunta: a primeira palavra com pronome fica em branco e há até três opções. */
export function makeQuestion(t: string, name: string, set: PronounSet): PracticeQ {
  const words = t.split(' ')
  const gap = Math.max(0, words.findIndex(w => /\{[SOAaX]\}/.test(w)))
  const fix = (w: string, i: number) => (i === 0 ? cap(w) : w)
  const wordFor = (s: PronounSet) => fix(fillWords(words[gap], name, s), gap)
  const options = [...new Set((['ela', 'ele', 'elu'] as PronounSet[]).map(wordFor))]
  const filled = words.map((w, i) => fix(fillWords(w, name, set), i))
  return { before: filled.slice(0, gap).join(' '), after: filled.slice(gap + 1).join(' '), options, answer: wordFor(set), full: filled.join(' ') }
}

/* ---------- Sugestões para o cartão e o plano ---------- */

export const helpSuggestions = [
  tr('Usar o meu nome e pronomes, também quando não estou'),
  tr('Corrigir os outros com naturalidade'),
  tr('Perguntar como estou'),
  tr('Acompanhar-me a consultas ou à conservatória'),
  tr('Tratar-me como sempre'),
  tr('Ler um pouco sobre o tema por tua conta'),
]

export const hurtSuggestions = [
  tr('Usar o meu nome antigo'),
  tr('Perguntas sobre o meu corpo ou cirurgias'),
  tr('Contar a outras pessoas sem eu autorizar'),
  tr('Dizer que é uma fase'),
  tr('Mostrar fotos antigas'),
  tr('Fazer da conversa um debate'),
]

export const whoKnowsSuggestions = [tr('Mãe'), tr('Pai'), tr('Irmãos'), tr('Avós'), tr('Amigos próximos'), tr('Colegas de equipa'), tr('Chefia'), tr('RH'), tr('Professores'), tr('Turma')]

export const systemsWork = [tr('E-mail e assinatura'), tr('Chat interno (Teams, Slack…)'), tr('Crachá e cartão de acesso'), tr('Diretório e organograma'), tr('Processamento salarial'), tr('Seguro de saúde'), tr('Farda')]
export const systemsSchool = [tr('Chamada e pautas'), tr('Plataforma digital (Moodle, Teams…)'), tr('Cartão de estudante'), tr('Testes e enunciados'), tr('Lista de turma'), tr('Educação Física e balneário')]
