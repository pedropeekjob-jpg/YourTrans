// Conteúdo informativo. Não é aconselhamento jurídico: valores e prazos
// devem ser confirmados nas fontes oficiais indicadas em cada passo.

export interface GuideStep {
  id: string
  title: string
  body: string
  where?: string
  cost?: string
  time?: string
  docs?: string[]
  link?: { label: string; url: string }
}

export interface CountryGuide {
  country: 'PT' | 'BR'
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
    name: 'Portugal',
    law: 'Lei n.º 38/2018 (autodeterminação da identidade e expressão de género)',
    summary:
      'Desde 2018 a mudança da menção do sexo e do nome próprio no registo civil é um procedimento administrativo. ' +
      'Para maiores de 18 anos não é preciso relatório médico, diagnóstico, cirurgia nem tratamento hormonal.',
    eligibility: [
      'Ter nacionalidade portuguesa (pessoas estrangeiras dependem da lei do país de origem).',
      'A partir dos 18 anos: pedido feito pela própria pessoa, sem relatórios.',
      'Entre os 16 e os 18 anos: pedido através dos representantes legais, com um relatório de médico/a ou psicólogo/a que ateste apenas a vontade livre e esclarecida, sem referência a diagnósticos.',
    ],
    steps: [
      {
        id: 'pt-prep',
        title: 'Escolher o novo nome próprio',
        body:
          'Escolhe o nome (ou nomes) próprios que queres usar. Os apelidos mantêm-se. ' +
          'O nome tem de cumprir as regras gerais de composição do nome em Portugal.',
        link: { label: 'Regras do nome (IRN)', url: 'https://irn.justica.gov.pt' },
      },
      {
        id: 'pt-request',
        title: 'Fazer o pedido numa Conservatória do Registo Civil',
        body:
          'Podes dirigir-te a qualquer conservatória do registo civil, não tem de ser a da tua área. ' +
          'Indicas a mudança da menção do sexo e o novo nome próprio. Quem vive no estrangeiro pode tratar num posto consular. ' +
          'Algumas conservatórias funcionam por marcação: liga ou marca online antes.',
        where: 'Conservatória do Registo Civil (ou consulado)',
        docs: ['Cartão de Cidadão válido', 'Requerimento (preenchido no local)', 'Se 16-17 anos: relatório e presença dos representantes legais'],
        link: { label: 'Marcar atendimento (IRN)', url: 'https://agendamento.irn.mj.pt' },
      },
      {
        id: 'pt-cost',
        title: 'Pagar o emolumento',
        body:
          'O procedimento tem um custo fixado na tabela de emolumentos dos registos. ' +
          'Confirma o valor atual antes de ires, porque pode ser atualizado.',
        cost: 'Valor de referência: cerca de 200 € (confirmar no IRN)',
      },
      {
        id: 'pt-decision',
        title: 'Aguardar a decisão',
        body:
          'O/a conservador/a decide e, sendo deferido, faz o averbamento no assento de nascimento. ' +
          'A lei prevê um prazo curto para a decisão.',
        time: 'Até 8 dias úteis',
      },
      {
        id: 'pt-cc',
        title: 'Pedir o novo Cartão de Cidadão',
        body:
          'Com o registo atualizado, pede um novo Cartão de Cidadão com o nome e sexo corretos. ' +
          'Podes fazê-lo logo na conservatória ou num balcão do Cartão de Cidadão / Loja do Cidadão.',
        where: 'Conservatória, Loja do Cidadão ou Espaço Cidadão',
        cost: 'Taxa normal do Cartão de Cidadão (confirmar valores e prazos de urgência)',
        link: { label: 'Cartão de Cidadão (ePortugal)', url: 'https://eportugal.gov.pt' },
      },
      {
        id: 'pt-after',
        title: 'Atualizar tudo o resto',
        body:
          'O novo CC não atualiza automaticamente todas as entidades. Usa a checklist e o gerador de pedidos para tratar ' +
          'de bancos, Segurança Social, Finanças, escola, trabalho e contratos.',
      },
    ],
    reviewedAt: '2026-10',
  },
  {
    country: 'BR',
    name: 'Brasil',
    law: 'Provimento CNJ n.º 73/2018 e decisão do STF (ADI 4275)',
    summary:
      'A retificação de prenome e gênero pode ser feita diretamente em cartório de registro civil, sem processo judicial, ' +
      'sem laudo médico e sem cirurgia, para pessoas maiores de 18 anos.',
    eligibility: [
      'Ter 18 anos ou mais.',
      'Pedido feito pela própria pessoa em qualquer cartório de registro civil de pessoas naturais.',
    ],
    steps: [
      {
        id: 'br-docs',
        title: 'Reunir os documentos',
        body: 'O cartório pede um conjunto de certidões (por exemplo distribuidores cíveis e criminais, protesto, justiça eleitoral e do trabalho). A lista pode variar por estado.',
        docs: ['Certidão de nascimento atualizada', 'RG, CPF e título de eleitor', 'Comprovante de endereço', 'Certidões negativas exigidas pelo cartório'],
      },
      {
        id: 'br-request',
        title: 'Fazer o pedido no cartório',
        body: 'Preenches o requerimento de alteração de prenome e gênero. Não é preciso apresentar laudos.',
        where: 'Cartório de Registro Civil de Pessoas Naturais',
        cost: 'Varia por estado; existe gratuidade para quem comprovar insuficiência económica',
      },
      {
        id: 'br-after',
        title: 'Atualizar os restantes documentos',
        body: 'Com a certidão retificada, atualiza RG, CPF, título de eleitor, passaporte, CNH, banco e trabalho.',
      },
    ],
    reviewedAt: '2026-10',
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
  { id: 'cc', group: 'Estado', label: 'Cartão de Cidadão', how: 'Pedido logo após o averbamento no registo civil.' },
  { id: 'passaporte', group: 'Estado', label: 'Passaporte', how: 'O passaporte antigo deixa de corresponder ao registo; pede um novo.' },
  { id: 'carta', group: 'Estado', label: 'Carta de condução (IMT)', how: 'Pedido de substituição por alteração de dados, no IMT online ou balcão.' },
  { id: 'ss', group: 'Estado', label: 'Segurança Social', how: 'Confirma os dados na Segurança Social Direta e pede a correção se necessário.', letter: 'generic' },
  { id: 'at', group: 'Finanças', label: 'Finanças (AT)', how: 'O NIF mantém-se. Verifica o nome no Portal das Finanças e atualiza via e-balcão.' },
  { id: 'banco', group: 'Finanças', label: 'Banco(s) e cartões', how: 'Pede atualização de dados e novos cartões com o nome correto.', letter: 'generic' },
  { id: 'seguros', group: 'Finanças', label: 'Seguros', how: 'Saúde, vida, automóvel e habitação.', letter: 'generic' },
  { id: 'sns', group: 'Saúde', label: 'Centro de saúde / SNS', how: 'Pede no secretariado clínico a atualização do RNU para o nome e sexo corretos.', letter: 'generic' },
  { id: 'hospitais', group: 'Saúde', label: 'Hospitais e clínicas privadas', how: 'Cada entidade tem o seu ficheiro de utentes.', letter: 'generic' },
  { id: 'escola', group: 'Estudos e trabalho', label: 'Escola ou universidade', how: 'Atualização do processo de aluno/a. O nome escolhido pode ser usado nas escolas mesmo antes da mudança legal.', letter: 'school' },
  { id: 'diplomas', group: 'Estudos e trabalho', label: 'Diplomas e certificados', how: 'Pede a reemissão de certificados de habilitações com o nome atual.', letter: 'school' },
  { id: 'trabalho', group: 'Estudos e trabalho', label: 'Empregador (RH e processamento salarial)', how: 'Contrato, recibos, e-mail, crachá e sistemas internos.', letter: 'employer' },
  { id: 'ordem', group: 'Estudos e trabalho', label: 'Ordem ou associação profissional', how: 'Cédula profissional e registo público.', letter: 'generic' },
  { id: 'operadora', group: 'Serviços', label: 'Operadora de telemóvel e internet', how: 'Titularidade do contrato e faturas.', letter: 'generic' },
  { id: 'energia', group: 'Serviços', label: 'Eletricidade, gás e água', how: 'Titularidade dos contratos.', letter: 'generic' },
  { id: 'casa', group: 'Serviços', label: 'Arrendamento ou crédito habitação', how: 'Senhorio ou banco: aditamento ao contrato com os novos dados.', letter: 'generic' },
  { id: 'ginasio', group: 'Serviços', label: 'Ginásio e subscrições', how: 'Ficha de sócio/a, cartão de acesso.', letter: 'generic' },
  { id: 'online', group: 'Outros', label: 'Contas online (e-mail, redes, lojas, apps de pagamento)', how: 'Normalmente nas definições de perfil.' },
  { id: 'cartoes', group: 'Outros', label: 'Cartões de transporte e fidelização', how: 'Ex.: Navegante, Andante, cartões de supermercado.', letter: 'generic' },
]
