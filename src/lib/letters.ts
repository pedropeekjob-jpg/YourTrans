// Gerador de pedidos de atualização de dados.
// Base legal comum: direito de retificação (art. 16.º do RGPD) e Lei n.º 38/2018.

export interface LetterFields {
  oldName: string
  newName: string
  entity: string
  reference: string
  city: string
  email: string
}

export type LetterKind = 'generic' | 'school' | 'employer' | 'referral'

export const letterKinds: { id: LetterKind; label: string }[] = [
  { id: 'generic', label: 'Entidade (banco, operadora, serviço)' },
  { id: 'school', label: 'Escola ou universidade' },
  { id: 'employer', label: 'Empregador' },
  { id: 'referral', label: 'Pedido de referenciação ao/à médico/a de família' },
]

function today(): string {
  return new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function buildLetter(kind: LetterKind, f: LetterFields): { subject: string; body: string } {
  if (kind === 'referral') return buildReferral(f)
  const name = f.newName.trim() || '[novo nome]'
  const old = f.oldName.trim() || '[nome anterior]'
  const entity = f.entity.trim() || '[entidade]'
  const ref = f.reference.trim()
  const refLine = ref ? ` (n.º de cliente/processo: ${ref})` : ''
  const subject = 'Pedido de retificação de dados pessoais'

  const intro =
    `Exmos. Senhores,\n\n` +
    `Eu, ${name}, anteriormente registado/a como ${old}${refLine}, venho por este meio solicitar a retificação ` +
    `dos meus dados pessoais junto de ${entity}.`

  const legal =
    `Na sequência de averbamento no registo civil ao abrigo da Lei n.º 38/2018, de 7 de agosto, o meu nome próprio ` +
    `e a menção do sexo foram alterados, conforme Cartão de Cidadão atualizado que junto em anexo. ` +
    `Nos termos do artigo 16.º do Regulamento Geral sobre a Proteção de Dados (RGPD), tenho o direito de obter, ` +
    `sem demora injustificada, a retificação dos dados pessoais inexatos que me digam respeito.`

  const specific: Record<Exclude<LetterKind, 'referral'>, string> = {
    generic:
      `Solicito que o nome e, se aplicável, o género/sexo e a forma de tratamento sejam atualizados em todos os vossos ` +
      `sistemas, contratos, faturas e cartões, e que me sejam emitidos novos documentos ou cartões quando necessário.`,
    school:
      `Solicito a atualização do meu processo individual, das pautas, do cartão de estudante, do endereço de e-mail ` +
      `institucional e a reemissão dos certificados e diplomas com o nome atual.`,
    employer:
      `Solicito a atualização do meu nome e género no processo individual, no contrato, nos recibos de vencimento, ` +
      `no endereço de e-mail, no cartão de identificação e nos restantes sistemas internos. Peço que este pedido seja ` +
      `tratado com confidencialidade e que a informação não seja partilhada para além do estritamente necessário.`,
  }

  const close =
    `Peço ainda que os dados anteriores não sejam utilizados em comunicações futuras e que me confirmem por escrito ` +
    `a conclusão da retificação, no prazo de um mês previsto no artigo 12.º, n.º 3, do RGPD.\n\n` +
    `Com os melhores cumprimentos,\n\n${name}` +
    (f.email.trim() ? `\n${f.email.trim()}` : '') +
    `\n${f.city.trim() ? f.city.trim() + ', ' : ''}${today()}\n\n` +
    `Anexo: cópia do Cartão de Cidadão (pode ocultar a fotografia e os números que não sejam necessários).`

  return { subject, body: [intro, legal, specific[kind], close].join('\n\n') }
}

function buildReferral(f: LetterFields): { subject: string; body: string } {
  const name = f.newName.trim() || '[o teu nome]'
  const body =
    `Exmo./Exma. Dr./Dra. ${f.entity.trim() || '[nome do/a médico/a de família]'},\n\n` +
    `Chamo-me ${name}${f.reference.trim() ? ` (n.º de utente ${f.reference.trim()})` : ''} e venho pedir a sua ajuda no ` +
    `acompanhamento da minha identidade de género.\n\n` +
    `Gostaria de ser referenciado/a para uma consulta num dos centros especializados do SNS em cuidados de saúde ` +
    `de afirmação de género (ULS Coimbra, ULS São José ou ULS Santo António), para avaliação e eventual início de ` +
    `terapia hormonal.\n\n` +
    `Gostaria também de:\n` +
    `• fazer análises de base antes de qualquer tratamento;\n` +
    `• saber se posso preservar a fertilidade antes de iniciar hormonas;\n` +
    `• ser tratado/a pelo nome ${name} e garantir que os rastreios de que preciso continuam a ser agendados, independentemente do sexo no registo.\n\n` +
    `Agradeço desde já a sua atenção.\n\n${name}` +
    (f.email.trim() ? `\n${f.email.trim()}` : '') +
    `\n${f.city.trim() ? f.city.trim() + ', ' : ''}${today()}`
  return { subject: 'Pedido de referenciação: consulta de identidade de género', body }
}
