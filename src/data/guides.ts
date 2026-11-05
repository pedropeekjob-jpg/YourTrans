import { tr } from '../i18n'
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
          tr('Indicas a mudança da menção do sexo e o novo nome próprio. Quem vive no estrangeiro pode tratar num posto consular. ') +
          tr('Algumas conservatórias funcionam por marcação: liga ou marca online antes.'),
        where: tr('Conservatória do Registo Civil (ou consulado)'),
        docs: [tr('Cartão de Cidadão válido'), tr('Requerimento (preenchido no local)'), tr('Se 16-17 anos: relatório e presença dos representantes legais')],
        link: { label: tr('Marcar atendimento (IRN)'), url: 'https://agendamento.irn.mj.pt' },
      },
      {
        id: 'pt-cost',
        title: tr('Pagar o emolumento'),
        body:
          tr('O procedimento tem um custo fixado na tabela de emolumentos dos registos. ') +
          tr('Confirma o valor atual antes de ires, porque pode ser atualizado.'),
        cost: tr('Valor de referência: cerca de 200 € (confirmar no IRN)'),
      },
      {
        id: 'pt-decision',
        title: tr('Aguardar a decisão'),
        body:
          tr('O/a conservador/a decide e, sendo deferido, faz o averbamento no assento de nascimento. ') +
          tr('A lei prevê um prazo curto para a decisão.'),
        time: tr('Até 8 dias úteis'),
      },
      {
        id: 'pt-cc',
        title: tr('Pedir o novo Cartão de Cidadão'),
        body:
          tr('Com o registo atualizado, pede um novo Cartão de Cidadão com o nome e sexo corretos. ') +
          tr('Podes fazê-lo logo na conservatória ou num balcão do Cartão de Cidadão / Loja do Cidadão.'),
        where: tr('Conservatória, Loja do Cidadão ou Espaço Cidadão'),
        cost: tr('Taxa normal do Cartão de Cidadão (confirmar valores e prazos de urgência)'),
        link: { label: tr('Cartão de Cidadão (ePortugal)'), url: 'https://eportugal.gov.pt' },
      },
      {
        id: 'pt-after',
        title: tr('Atualizar tudo o resto'),
        body:
          tr('O novo CC não atualiza automaticamente todas as entidades. Usa a checklist e o gerador de pedidos para tratar ') +
          tr('de bancos, Segurança Social, Finanças, escola, trabalho e contratos.'),
      },
    ],
    reviewedAt: '2026-10',
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
