import { tr } from '../i18n'
import type { CountryCode } from './countries'
// Conteúdo informativo. Não é aconselhamento jurídico: valores e prazos
// devem ser confirmados nas fontes oficiais indicadas em cada passo.

export interface GuideStep {
  id: string
  title: string
  body: string
  /** Só informação (ex.: custo), não é uma ação: aparece no guia mas não conta como etapa do caminho. */
  info?: boolean
  /** Pontos extra, mostrados em lista por baixo do texto. */
  detail?: string[]
  where?: string
  cost?: string
  time?: string
  docs?: string[]
  link?: { label: string; url: string }
  /** Ligações extra (por exemplo, o formulário oficial). */
  links?: { label: string; url: string }[]
  /** Leva para outro separador da página de Documentos (checklist ou pedidos). */
  goTo?: ('checklist' | 'pedidos')[]
}

/** Requerimento oficial do IRN (Lei 38/2018). Tem um quadrado para pedir um novo assento de nascimento. */
const IRN_FORM_ADULT = 'https://irn.justica.gov.pt/Portals/33/Impressos/Registo%20Civil/Requerimento%20mudan%C3%A7a%20sexo_maior_v2.pdf'
const IRN_FORM_MINOR = 'https://irn.justica.gov.pt/Portals/33/Impressos/Registo%20Civil/Requerimento%20mudan%C3%A7a%20sexo_menor%20-%2027-05-2021_v2.pdf'

export interface CountryGuide {
  country: CountryCode
  name: string
  law: string
  summary: string
  eligibility: string[]
  steps: GuideStep[]
  reviewedAt: string
}

export const guides: CountryGuide[] = [
  {
    country: 'PT',
    name: tr('Portugal'),
    law: tr('Lei n.º 38/2018 (autodeterminação da identidade e expressão de género)'),
    summary:
      tr('Desde 2018 a mudança da menção do sexo e do nome próprio no registo civil é um procedimento administrativo. ') +
      tr('Para maiores de 18 anos não é preciso relatório médico, diagnóstico, cirurgia nem tratamento hormonal.'),
    eligibility: [
      tr('Ter nacionalidade portuguesa (pessoas estrangeiras dependem da lei do país de origem).'),
      tr('A partir dos 18 anos: pedido feito pela própria pessoa, sem relatórios.'),
      tr('Entre os 16 e os 18 anos: pedido através dos representantes legais, com um relatório de médico/a ou psicólogo/a que ateste apenas a vontade livre e esclarecida, sem referência a diagnósticos.'),
    ],
    steps: [
      {
        id: 'pt-prep',
        title: tr('Escolher o novo nome próprio'),
        body:
          tr('Escolhe o nome (ou nomes) próprios que queres usar. Os apelidos mantêm-se. ') +
          tr('O nome tem de cumprir as regras gerais de composição do nome em Portugal.'),
        link: { label: tr('Regras do nome (IRN)'), url: 'https://irn.justica.gov.pt' },
      },
      {
        id: 'pt-request',
        title: tr('Fazer o pedido numa Conservatória do Registo Civil'),
        body:
          tr('Podes dirigir-te a qualquer conservatória do registo civil, não tem de ser a da tua área. ') +
          tr('Indicas a mudança da menção do sexo e o novo nome próprio no requerimento oficial do IRN: podes descarregá-lo e levá-lo já preenchido, ou preenchê-lo no local. Quem vive no estrangeiro pode tratar num posto consular. ') +
          tr('Algumas conservatórias funcionam por marcação: liga ou marca online antes.'),
        where: tr('Conservatória do Registo Civil (ou consulado)'),
        docs: [tr('Cartão de Cidadão válido'), tr('Requerimento do IRN (preenchido antes ou no local)'), tr('Se 16-17 anos: relatório e presença dos representantes legais')],
        links: [
          { label: tr('Requerimento oficial, maiores de 18 anos (IRN, PDF)'), url: IRN_FORM_ADULT },
          { label: tr('Requerimento oficial, 16 e 17 anos (IRN, PDF)'), url: IRN_FORM_MINOR },
        ],
        link: { label: tr('Marcar atendimento (IRN)'), url: 'https://agendamento.irn.mj.pt' },
      },
      {
        id: 'pt-cost',
        info: true,
        title: tr('Custo do pedido: gratuito'),
        body:
          tr('A mudança da menção do sexo e do nome próprio no registo civil já não tem custo. Antes custava cerca de 200 €; se te pedirem esse valor, lembra que o procedimento é gratuito. ') +
          tr('O único custo do processo é o do novo Cartão de Cidadão (passo 5).'),
        cost: tr('Gratuito (antes eram cerca de 200 €)'),
      },
      {
        id: 'pt-decision',
        title: tr('Aguardar a decisão'),
        body:
          tr('O/a conservador/a decide e, sendo deferido, faz o averbamento (uma anotação) no teu assento de nascimento. ') +
          tr('A lei prevê um prazo curto para a decisão.'),
        detail: [
          tr('Tu decides se queres também uma nova certidão de nascimento. No requerimento há um quadrado para pedir um novo assento de nascimento.'),
          tr('Se o assinalares, é feito um assento novo, sem qualquer referência à mudança: as certidões passam a mostrar só o nome e o sexo atuais.'),
          tr('Se não o assinalares, a mudança fica apenas averbada no assento antigo.'),
        ],
        time: tr('Até 8 dias úteis'),
        links: [{ label: tr('Ver o quadrado no requerimento (IRN, PDF)'), url: IRN_FORM_ADULT }],
      },
      {
        id: 'pt-cc',
        title: tr('Pedir o novo Cartão de Cidadão'),
        body:
          tr('Com o registo atualizado, pede um novo Cartão de Cidadão com o nome e sexo corretos. ') +
          tr('Podes fazê-lo logo na conservatória ou num balcão do Cartão de Cidadão / Loja do Cidadão.'),
        where: tr('Conservatória, Loja do Cidadão ou Espaço Cidadão'),
        cost: tr('Taxa normal do Cartão de Cidadão: é o único custo do processo (confirma valores e prazos de urgência)'),
        link: { label: tr('Cartão de Cidadão (ePortugal)'), url: 'https://eportugal.gov.pt' },
      },
      {
        id: 'pt-after',
        title: tr('Atualizar tudo o resto'),
        body:
          tr('O novo CC não atualiza automaticamente todas as entidades. Usa a checklist e o gerador de pedidos para tratar ') +
          tr('de bancos, Segurança Social, Finanças, escola, trabalho e contratos.'),
        goTo: ['checklist', 'pedidos'],
      },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'BR',
    name: tr('Brasil'),
    law: tr('Provimento CNJ n.º 73/2018 e decisão do STF (ADI 4275)'),
    summary:
      tr('A retificação de prenome e gênero pode ser feita diretamente em cartório de registro civil, sem processo judicial, ') +
      tr('sem laudo médico e sem cirurgia, para pessoas maiores de 18 anos.'),
    eligibility: [
      tr('Ter 18 anos ou mais.'),
      tr('Pedido feito pela própria pessoa em qualquer cartório de registro civil de pessoas naturais.'),
    ],
    steps: [
      {
        id: 'br-docs',
        title: tr('Reunir os documentos'),
        body: tr('O cartório pede um conjunto de certidões (por exemplo distribuidores cíveis e criminais, protesto, justiça eleitoral e do trabalho). A lista pode variar por estado.'),
        docs: [tr('Certidão de nascimento atualizada'), tr('RG, CPF e título de eleitor'), tr('Comprovante de endereço'), tr('Certidões negativas exigidas pelo cartório')],
      },
      {
        id: 'br-request',
        title: tr('Fazer o pedido no cartório'),
        body: tr('Preenches o requerimento de alteração de prenome e gênero. Não é preciso apresentar laudos.'),
        where: tr('Cartório de Registro Civil de Pessoas Naturais'),
        cost: tr('Varia por estado; existe gratuidade para quem comprovar insuficiência económica'),
      },
      {
        id: 'br-after',
        title: tr('Atualizar os restantes documentos'),
        body: tr('Com a certidão retificada, atualiza RG, CPF, título de eleitor, passaporte, CNH, banco e trabalho.'),
        goTo: ['checklist'],
      },
    ],
    reviewedAt: '2026-10',
  },
  {
    country: 'ES',
    name: tr('Espanha'),
    law: tr('Lei 4/2023 (igualdade real e efetiva das pessoas trans)'),
    summary:
      tr('Desde 2023 a retificação da menção do sexo e do nome no Registo Civil faz-se por simples declaração, ') +
      tr('sem relatório médico ou psicológico e sem tratamentos.'),
    eligibility: [
      tr('Ter nacionalidade espanhola. Pessoas estrangeiras residentes podem pedir a mudança nos documentos de estrangeiro (TIE), se o país de origem não o permitir.'),
      tr('A partir dos 16 anos: pedido feito pela própria pessoa.'),
      tr('Entre os 14 e os 16 anos: com a assistência dos representantes legais.'),
      tr('Entre os 12 e os 14 anos: só com autorização judicial.'),
    ],
    steps: [
      {
        id: 'es-request',
        title: tr('Fazer o pedido no Registo Civil'),
        body: tr('Vais ao Registo Civil e declaras que queres retificar a menção do sexo e, se quiseres, o nome. Não tens de apresentar relatórios nem provas de tratamento.'),
        where: tr('Registro Civil (ou consulado de Espanha, se viveres fora)'),
        docs: [tr('DNI ou passaporte'), tr('Requerimento (preenchido no local)')],
        link: { label: tr('Lei 4/2023 (BOE)'), url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-5366' },
      },
      {
        id: 'es-ratify',
        title: tr('Confirmar o pedido'),
        body: tr('A lei pede que voltes a confirmar o pedido numa segunda comparência, no prazo máximo de três meses depois da primeira. Sem essa confirmação o pedido não avança.'),
        time: tr('Até 3 meses entre as duas comparências'),
      },
      {
        id: 'es-decision',
        title: tr('Aguardar a decisão'),
        body: tr('Depois da confirmação, o Registo Civil decide e averba a mudança. O procedimento é gratuito.'),
        time: tr('Até 1 mês depois da confirmação'),
        cost: tr('Gratuito'),
      },
      {
        id: 'es-dni',
        title: tr('Pedir o novo DNI'),
        body: tr('Com o registo atualizado, marca a renovação do DNI e do passaporte na Polícia Nacional.'),
        where: tr('Esquadra da Polícia Nacional com emissão de DNI'),
        cost: tr('Taxa normal do DNI (confirmar o valor atual)'),
        link: { label: tr('Marcar DNI (cita previa)'), url: 'https://www.citapreviadnie.es' },
      },
      {
        id: 'es-after',
        title: tr('Atualizar tudo o resto'),
        body: tr('Com o novo DNI, atualiza a Segurança Social, a Agência Tributária, o banco, a escola, o trabalho e os contratos.'),
        goTo: ['checklist'],
      },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'FR',
    name: tr('França'),
    law: tr('Lei de 18 de novembro de 2016 (artigos 60 e 61-5 a 61-8 do Código Civil)'),
    summary:
      tr('O nome próprio muda-se na câmara municipal. A menção do sexo muda-se no tribunal, mas sem exigência de tratamentos médicos, ') +
      tr('cirurgia ou esterilização: basta mostrar que vives e és conhecide no género pedido.'),
    eligibility: [
      tr('Ter o nascimento registado em França (nacionalidade francesa ou registo no serviço central de estado civil).'),
      tr('Mudança do nome próprio: qualquer idade (menores através dos representantes legais).'),
      tr('Mudança da menção do sexo: pessoas maiores de idade ou menores emancipadas.'),
    ],
    steps: [
      {
        id: 'fr-prenom',
        title: tr('Mudar o nome próprio na câmara municipal'),
        body: tr('Fazes o pedido ao serviço de estado civil da câmara onde vives ou onde nasceste. Juntas provas de que já usas o nome (cartas, cartões, testemunhos).'),
        where: tr('Mairie (serviço de état civil)'),
        cost: tr('Gratuito'),
        docs: [tr('Documento de identificação'), tr('Comprovativo de morada'), tr('Certidão de nascimento recente'), tr('Provas do uso do nome')],
        link: { label: tr('Mudar de nome próprio (service-public.fr)'), url: 'https://www.service-public.fr/particuliers/vosdroits/F885' },
      },
      {
        id: 'fr-sexe',
        title: tr('Pedir a mudança da menção do sexo ao tribunal'),
        body: tr('Envias um pedido ao tribunal judiciaire da tua área ou do local de nascimento. Mostras, com testemunhos e documentos, que te apresentas e és conhecide no género pedido. Não é obrigatório advogado.'),
        where: tr('Tribunal judiciaire'),
        cost: tr('Gratuito sem advogado'),
        docs: [tr('Requerimento ao tribunal'), tr('Testemunhos de pessoas próximas'), tr('Documentos já no nome usado')],
        link: { label: tr('Mudança da menção do sexo (service-public.fr)'), url: 'https://www.service-public.fr/particuliers/vosdroits/F34703' },
      },
      {
        id: 'fr-decision',
        title: tr('Aguardar a decisão'),
        body: tr('O tribunal pode ouvir-te numa audiência. Se o pedido for aceite, a decisão é averbada na certidão de nascimento.'),
        time: tr('Vários meses, varia por tribunal'),
      },
      {
        id: 'fr-cni',
        title: tr('Pedir o novo cartão de identidade'),
        body: tr('Com a certidão atualizada, pede o novo cartão de identidade e o passaporte numa câmara que os emita.'),
        where: tr('Mairie com emissão de documentos'),
        link: { label: tr('Pré-pedido (ANTS)'), url: 'https://ants.gouv.fr' },
      },
      {
        id: 'fr-after',
        title: tr('Atualizar tudo o resto'),
        body: tr('Atualiza a Segurança Social (Ameli), a CAF, as Finanças, o banco, a escola, o trabalho e os contratos.'),
        goTo: ['checklist'],
      },
    ],
    reviewedAt: '2026-11',
  },
]

export interface ChecklistItem {
  id: string
  label: string
  group: 'Estado' | 'Saúde' | 'Finanças' | 'Estudos e trabalho' | 'Serviços' | 'Outros'
  how: string
  letter?: string
}

export const checklistPT: ChecklistItem[] = [
  { id: 'cc', group: 'Estado', label: tr('Cartão de Cidadão'), how: tr('Pedido logo após o averbamento no registo civil.') },
  { id: 'passaporte', group: 'Estado', label: tr('Passaporte'), how: tr('O passaporte antigo deixa de corresponder ao registo; pede um novo.') },
  { id: 'carta', group: 'Estado', label: tr('Carta de condução (IMT)'), how: tr('Pedido de substituição por alteração de dados, no IMT online ou balcão.') },
  { id: 'ss', group: 'Estado', label: tr('Segurança Social'), how: tr('Confirma os dados na Segurança Social Direta e pede a correção se necessário.'), letter: 'generic' },
  { id: 'at', group: 'Finanças', label: tr('Finanças (AT)'), how: tr('O NIF mantém-se. Verifica o nome no Portal das Finanças e atualiza via e-balcão.') },
  { id: 'banco', group: 'Finanças', label: tr('Banco(s) e cartões'), how: tr('Pede atualização de dados e novos cartões com o nome correto.'), letter: 'generic' },
  { id: 'seguros', group: 'Finanças', label: tr('Seguros'), how: tr('Saúde, vida, automóvel e habitação.'), letter: 'generic' },
  { id: 'sns', group: 'Saúde', label: tr('Centro de saúde / SNS'), how: tr('Pede no secretariado clínico a atualização do RNU para o nome e sexo corretos.'), letter: 'generic' },
  { id: 'hospitais', group: 'Saúde', label: tr('Hospitais e clínicas privadas'), how: tr('Cada entidade tem o seu ficheiro de utentes.'), letter: 'generic' },
  { id: 'escola', group: 'Estudos e trabalho', label: tr('Escola ou universidade'), how: tr('Atualização do processo de aluno/a. O nome escolhido pode ser usado nas escolas mesmo antes da mudança legal.'), letter: 'school' },
  { id: 'diplomas', group: 'Estudos e trabalho', label: tr('Diplomas e certificados'), how: tr('Pede a reemissão de certificados de habilitações com o nome atual.'), letter: 'school' },
  { id: 'trabalho', group: 'Estudos e trabalho', label: tr('Empregador (RH e processamento salarial)'), how: tr('Contrato, recibos, e-mail, crachá e sistemas internos.'), letter: 'employer' },
  { id: 'ordem', group: 'Estudos e trabalho', label: tr('Ordem ou associação profissional'), how: tr('Cédula profissional e registo público.'), letter: 'generic' },
  { id: 'operadora', group: 'Serviços', label: tr('Operadora de telemóvel e internet'), how: tr('Titularidade do contrato e faturas.'), letter: 'generic' },
  { id: 'energia', group: 'Serviços', label: tr('Eletricidade, gás e água'), how: tr('Titularidade dos contratos.'), letter: 'generic' },
  { id: 'casa', group: 'Serviços', label: tr('Arrendamento ou crédito habitação'), how: tr('Senhorio ou banco: aditamento ao contrato com os novos dados.'), letter: 'generic' },
  { id: 'ginasio', group: 'Serviços', label: tr('Ginásio e subscrições'), how: tr('Ficha de sócio/a, cartão de acesso.'), letter: 'generic' },
  { id: 'online', group: 'Outros', label: tr('Contas online (e-mail, redes, lojas, apps de pagamento)'), how: tr('Normalmente nas definições de perfil.') },
  { id: 'cartoes', group: 'Outros', label: tr('Cartões de transporte e fidelização'), how: tr('Ex.: Navegante, Andante, cartões de supermercado.'), letter: 'generic' },
]
