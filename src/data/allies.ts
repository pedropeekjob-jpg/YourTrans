// Conteúdos para família, amigues, colegas e escola.
// Linguagem de apoio, sem patologizar, revista com base em guias de
// associações (AMPLOS, ILGA, TransHub, Mermaids). Validar com a comunidade.

export type AllyRole = 'pais' | 'irmaos' | 'avos' | 'parceire' | 'amigue' | 'colega' | 'chefia' | 'professor'

export const allyRoles: { id: AllyRole; label: string; emoji: string }[] = [
  { id: 'pais', label: 'Mãe ou pai', emoji: '🏡' },
  { id: 'irmaos', label: 'Irmão ou irmã', emoji: '🤝' },
  { id: 'avos', label: 'Avó ou avô', emoji: '🌿' },
  { id: 'parceire', label: 'Companheiro/a', emoji: '💞' },
  { id: 'amigue', label: 'Amigo/a', emoji: '✨' },
  { id: 'colega', label: 'Colega de trabalho', emoji: '💼' },
  { id: 'chefia', label: 'Chefia ou RH', emoji: '🗂️' },
  { id: 'professor', label: 'Professor/a ou direção', emoji: '🎓' },
]

export interface Lesson { id: string; title: string; minutes: number; body: string[]; tryThis?: string }

/** Base comum a todas as pessoas. */
const core: Lesson[] = [
  {
    id: 'c-nome', title: 'O nome e os pronomes são o primeiro gesto', minutes: 2,
    body: [
      'Usar o nome e os pronomes certos é a forma mais simples e mais poderosa de mostrar apoio. A investigação mostra que jovens trans a quem respeitam o nome têm muito menos sintomas de depressão.',
      'Vais errar. Toda a gente erra no início. O que conta é o que fazes a seguir: corrige-te depressa ("ele… desculpa, ela"), sem grandes pedidos de desculpa, e continua a conversa.',
    ],
    tryThis: 'Faz hoje uma ronda de treino de 2 minutos no separador Praticar.',
  },
  {
    id: 'c-ouvir', title: 'Ouvir antes de perguntar', minutes: 2,
    body: [
      'Não precisas de perceber tudo para apoiar. Pergunta "como te posso ajudar?" em vez de "tens a certeza?".',
      'Evita perguntas sobre o corpo, cirurgias ou o nome antigo. Se a pessoa quiser falar disso, ela própria traz o assunto.',
    ],
  },
  {
    id: 'c-privacidade', title: 'A história é dela, não é tua', minutes: 2,
    body: [
      'Contar a outras pessoas que alguém é trans, sem autorização, pode pôr essa pessoa em risco no trabalho, na escola ou em casa.',
      'Antes de falares com alguém, confirma no cartão "Como me podes apoiar" quem já sabe. Se não tiveres cartão, pergunta.',
    ],
    tryThis: 'Pede à pessoa que te apoias para te enviar o cartão dela pela app.',
  },
  {
    id: 'c-sentir', title: 'O que sentes também importa', minutes: 3,
    body: [
      'É normal sentir confusão, medo ou até um luto pela imagem que tinhas. Chama-se luto ambíguo: a pessoa está aqui, mas algo mudou.',
      'Esses sentimentos merecem espaço, mas não devem ser despejados sobre a pessoa trans. Fala com alguém de confiança, com um/a psicólogo/a ou num grupo de famílias. Tens um diário só teu no separador Apoio.',
      'Muitas famílias contam que, com o tempo, a perda dá lugar à curiosidade: conhecer melhor quem a pessoa sempre foi.',
    ],
  },
  {
    id: 'c-defender', title: 'Quando alguém erra à tua frente', minutes: 2,
    body: [
      'Se alguém usar o nome ou os pronomes errados, corrige com naturalidade: "É a Rita, e ela já disse que vem."',
      'Não precisas de fazer um discurso. Uma correção calma e repetida ensina mais do que um confronto.',
    ],
  },
]

const byRole: Record<AllyRole, Lesson[]> = {
  pais: [
    { id: 'p-medo', title: 'Ter medo é normal, mas o maior risco é a rejeição', minutes: 3, body: [
      'Muitos pais temem pela segurança ou pelo futuro dos filhos. O que mais protege jovens trans é sentirem-se aceites em casa: jovens com pouca aceitação familiar têm mais de três vezes mais tentativas de suicídio.',
      'Não tens de ter respostas. Diz "gosto de ti e estou aqui" e deixa o resto vir com o tempo.',
    ] },
    { id: 'p-16', title: 'Filhos com 16 ou 17 anos: o vosso papel no registo civil', minutes: 3, body: [
      'Em Portugal, entre os 16 e os 18 anos, a mudança do nome e da menção do sexo é pedida através dos representantes legais, com um relatório de médico/a ou psicólogo/a que ateste apenas a vontade livre e esclarecida, sem diagnósticos.',
      'Acompanhar o vosso filho ou filha à conservatória é um gesto que fica para a vida. Os passos estão em Documentos, no perfil da pessoa trans.',
    ] },
    { id: 'p-escola', title: 'Falar com a escola', minutes: 2, body: [
      'A lei prevê que as escolas respeitem o nome e a identidade dos alunos, incluindo nos registos internos, casas de banho e balneários. As regras concretas têm sido debatidas: confirmem com a direção e com a ILGA.',
      'Peçam uma reunião com o/a diretor/a de turma e levem o plano que o vosso filho ou filha pode criar na app.',
    ] },
    { id: 'p-familia', title: 'Contar ao resto da família', minutes: 2, body: [
      'Combinem juntos quem conta, a quem e quando. O cartão "quem sabe" ajuda a não haver surpresas.',
      'Uma frase simples resolve muito: "A nossa filha chama-se agora Inês. Contamos convosco para a tratar assim."',
    ] },
  ],
  irmaos: [
    { id: 'i-aliado', title: 'Ser a primeira pessoa aliada em casa', minutes: 2, body: [
      'Irmãos e irmãs são muitas vezes as primeiras pessoas a saber. Podes ajudar a preparar o momento de contar aos pais.',
      'Corrige o nome nas conversas de família, mesmo quando a pessoa não está presente.',
    ] },
    { id: 'i-memorias', title: 'As memórias continuam a ser vossas', minutes: 2, body: [
      'Podes continuar a falar da infância juntos. Pergunta como prefere que contes essas histórias, por exemplo usando o nome atual.',
    ] },
  ],
  avos: [
    { id: 'a-tempo', title: 'Nunca é tarde para aprender', minutes: 2, body: [
      'Para muitas pessoas mais velhas, estas palavras são novas. Não faz mal. O carinho de sempre é o que conta e o resto aprende-se aos poucos.',
      'Se te custar o nome novo, treina na app: um minuto por dia faz diferença.',
    ] },
    { id: 'a-palavras', title: 'Palavras que ajudam', minutes: 2, body: [
      'Diz "a minha neta" ou "o meu neto" conforme a pessoa te pediu. Se não souberes, pergunta: "Como queres que te apresente?"',
    ] },
  ],
  parceire: [
    { id: 'pa-relacao', title: 'A relação também muda, e isso pode ser bom', minutes: 3, body: [
      'Uma transição mexe com o casal: a forma como se apresentam, a intimidade, como os outros vos veem. Falem com honestidade sobre o que cada pessoa sente.',
      'A terapia de casal com profissionais informados pode ajudar. As associações têm contactos.',
    ] },
    { id: 'pa-saude', title: 'Apoiar nas consultas e cirurgias', minutes: 2, body: [
      'Acompanhar às consultas, ajudar a preparar perguntas e estar presente no pós-operatório são formas concretas de apoio.',
      'Vê os testemunhos sobre o pós-cirurgia para saberes o que esperar.',
    ] },
  ],
  amigue: [
    { id: 'am-normal', title: 'Continuar a ser o/a mesmo/a amigo/a', minutes: 2, body: [
      'Mais do que conversas sérias, a pessoa precisa de normalidade: os mesmos planos, as mesmas piadas, os mesmos jantares.',
      'Oferece-te para acompanhar a sítios novos que podem ser difíceis: a conservatória, uma loja de roupa, um balneário.',
    ] },
    { id: 'am-grupo', title: 'No grupo de amigos', minutes: 2, body: [
      'Se fores a primeira pessoa a saber, pergunta se quer ajuda para contar ao grupo, ou se prefere fazê-lo sozinho/a.',
    ] },
  ],
  colega: [
    { id: 'co-reunioes', title: 'No dia a dia da equipa', minutes: 2, body: [
      'Usa o nome novo a partir da data combinada, também em e-mails, chats e atas.',
      'Não perguntes pelo nome antigo nem comentes a aparência. Trata a pessoa como sempre trataste o trabalho dela.',
    ] },
    { id: 'co-defender', title: 'Quando há piadas ou comentários', minutes: 2, body: [
      'Um "não tem graça" calmo muda a cultura de uma equipa. Se o comportamento se repetir, fala com a chefia ou com o RH.',
    ] },
  ],
  chefia: [
    { id: 'ch-lei', title: 'O que diz a lei', minutes: 3, body: [
      'O Código do Trabalho proíbe a discriminação com base na identidade de género, no acesso ao emprego e durante o contrato. A pessoa pode pedir a correção dos dados ao abrigo do RGPD.',
      'Os dados sobre a transição são dados pessoais sensíveis: partilha-os apenas com quem precisa de os conhecer para atualizar sistemas.',
    ] },
    { id: 'ch-plano', title: 'Seguir o plano de transição', minutes: 3, body: [
      'Pede à pessoa que crie o plano na app e te envie a ligação. Lá está a data a partir da qual usa o novo nome, quem comunica à equipa, que sistemas atualizar e o que é confidencial.',
      'O plano é dela. O teu papel é garantir que acontece como combinado, e verificar uma semana depois como correu.',
    ] },
    { id: 'ch-instalacoes', title: 'Casas de banho, balneários e fardas', minutes: 2, body: [
      'A pessoa usa as instalações que correspondem à sua identidade. Se houver casas de banho individuais ou neutras, informa, mas não as imponhas como única opção.',
      'Ajusta fardas, crachás e cartões de acesso antes da data combinada.',
    ] },
  ],
  professor: [
    { id: 'pr-sala', title: 'Na sala de aula', minutes: 2, body: [
      'Usa o nome escolhido na chamada, nos testes e nas plataformas digitais, mesmo que os registos oficiais ainda não estejam atualizados.',
      'Se um/a aluno/a errar, corrige com naturalidade e continua a aula. Intervém sempre em casos de gozo ou bullying.',
    ] },
    { id: 'pr-confidencial', title: 'Confidencialidade com colegas e encarregados de educação', minutes: 3, body: [
      'Não reveles a identidade de um/a aluno/a a colegas, outros pais ou à própria família sem confirmar com o/a aluno/a, sobretudo se ainda não for conhecida em casa.',
      'O cartão "quem sabe" do/a aluno/a diz-te com quem podes falar.',
    ] },
    { id: 'pr-escola', title: 'O que a escola pode fazer', minutes: 2, body: [
      'Ter uma pessoa de referência para estes temas, atualizar pautas e plataformas, garantir acesso seguro a casas de banho e balneários e formar o pessoal docente e não docente.',
      'As regras concretas para as escolas têm sido alvo de debate legislativo: confirma o que está em vigor com a direção e com a ILGA.',
    ] },
  ],
}

export function lessonsFor(role: AllyRole): Lesson[] {
  return [...core.slice(0, 3), ...byRole[role], ...core.slice(3)]
}

export interface Scenario { id: string; title: string; context: string; say: string[]; avoid: string[]; roles?: AllyRole[] }

export const scenarios: Scenario[] = [
  { id: 's-erro', title: 'Erraste o nome à frente da pessoa', context: 'Saiu-te o nome antigo ou o pronome errado.',
    say: ['"Ele… desculpa, ela disse que…" e continuas.'], avoid: ['Pedidos de desculpa longos que põem a pessoa a consolar-te.', '"É difícil para mim."'] },
  { id: 's-jantar', title: 'Jantar de família', context: 'Um familiar insiste no nome antigo.', roles: ['pais', 'irmaos', 'avos', 'parceire'],
    say: ['"Chama-se Inês. Para nós é importante que a trates assim."', 'Se continuar: "Vamos falar disto depois, a dois."'], avoid: ['Discutir o tema à frente da pessoa trans.', 'Ignorar e mudar de assunto.'] },
  { id: 's-pergunta', title: '"Mas já fez a operação?"', context: 'Alguém faz perguntas sobre o corpo.',
    say: ['"Isso é uma conversa privada dela. O que importa é que a trates pelo nome."'], avoid: ['Responder em nome da pessoa.'] },
  { id: 's-reuniao', title: 'Reunião de equipa', context: 'Um colega usa o nome antigo numa reunião.', roles: ['colega', 'chefia'],
    say: ['"Só para corrigir: é a Inês." e retomar o ponto.'], avoid: ['Pedir à pessoa trans que explique a situação à equipa.'] },
  { id: 's-anuncio', title: 'Comunicar à equipa', context: 'A pessoa pediu-te para anunciar a mudança.', roles: ['chefia'],
    say: ['"A partir de segunda, a nossa colega chama-se Inês e usa os pronomes ela/dela. Contamos com todos para a tratar assim. Dúvidas, falem comigo."'], avoid: ['Detalhes médicos ou pessoais.', 'Abrir debate sobre o tema.'] },
  { id: 's-turma', title: 'Na turma', context: 'Alunos fazem piadas ou insistem no nome antigo.', roles: ['professor'],
    say: ['"Nesta sala tratamos toda a gente pelo nome que escolheu. Vamos continuar."', 'Falar depois, à parte, com quem fez o comentário.'], avoid: ['Pôr o/a aluno/a trans a explicar-se à turma.'] },
  { id: 's-fotos', title: 'Fotos antigas', context: 'Queres partilhar uma fotografia de infância.', roles: ['pais', 'irmaos', 'avos', 'amigue'],
    say: ['Pergunta primeiro: "Importas-te que mostre esta foto?"'], avoid: ['Publicar fotos antigas nas redes sem autorização.'] },
]

export const feelingPrompts = [
  'O que estou a sentir hoje, sem me julgar?',
  'Do que tenho mais medo? Esse medo é sobre a pessoa ou sobre mim?',
  'Uma coisa que descobri sobre esta pessoa e que não sabia.',
  'Uma coisa que fiz bem esta semana para a apoiar.',
  'O que posso perguntar, com curiosidade, da próxima vez que falarmos?',
]

/* ---------- Treino de pronomes ---------- */

export type PronounSet = 'ela' | 'ele' | 'elu'

export const pronounForms: Record<PronounSet, { subj: string; obj: string; art: string; adj: string; to: string }> = {
  ela: { subj: 'ela', obj: 'dela', art: 'a', adj: 'a', to: 'à' },
  ele: { subj: 'ele', obj: 'dele', art: 'o', adj: 'o', to: 'ao' },
  elu: { subj: 'elu', obj: 'delu', art: 'e', adj: 'e', to: 'ae' },
}

export function pronounSetOf(pronouns: string): PronounSet | undefined {
  const p = pronouns.trim().toLowerCase()
  if (p.startsWith('ela')) return 'ela'
  if (p.startsWith('ele')) return 'ele'
  if (p.startsWith('elu')) return 'elu'
  return undefined
}

function fillWords(t: string, name: string, set: PronounSet): string {
  const f = pronounForms[set]
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

/** Frases com lacuna: {N} nome, {S} sujeito, {O} possessivo, {A} artigo, {a} "à/ao", {X} terminação. */
export const practiceTemplates = [
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

/* ---------- Sugestões para o cartão e o plano ---------- */

export const helpSuggestions = [
  'Usar o meu nome e pronomes, também quando não estou',
  'Corrigir os outros com naturalidade',
  'Perguntar como estou',
  'Acompanhar-me a consultas ou à conservatória',
  'Tratar-me como sempre',
  'Ler um pouco sobre o tema por tua conta',
]

export const hurtSuggestions = [
  'Usar o meu nome antigo',
  'Perguntas sobre o meu corpo ou cirurgias',
  'Contar a outras pessoas sem eu autorizar',
  'Dizer que é uma fase',
  'Mostrar fotos antigas',
  'Fazer da conversa um debate',
]

export const whoKnowsSuggestions = ['Mãe', 'Pai', 'Irmãos', 'Avós', 'Amigos próximos', 'Colegas de equipa', 'Chefia', 'RH', 'Professores', 'Turma']

export const systemsWork = ['E-mail e assinatura', 'Chat interno (Teams, Slack…)', 'Crachá e cartão de acesso', 'Diretório e organograma', 'Processamento salarial', 'Seguro de saúde', 'Farda']
export const systemsSchool = ['Chamada e pautas', 'Plataforma digital (Moodle, Teams…)', 'Cartão de estudante', 'Testes e enunciados', 'Lista de turma', 'Educação Física e balneário']
