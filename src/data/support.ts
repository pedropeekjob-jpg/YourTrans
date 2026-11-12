import { tr } from '../i18n'
// Associações e linhas de apoio. Contactos públicos: confirmar nos sites oficiais.
export interface SupportOrg {
  id: string
  name: string
  kind: 'associação' | 'linha' | 'emergência' | 'serviço público'
  description: string
  phone?: string
  url?: string
  area: string
}

export const supportOrgs: SupportOrg[] = [
  { id: '112', name: '112', kind: 'emergência', area: tr('Nacional'), phone: '112', description: tr('Número Europeu de Emergência. Perigo imediato para ti ou para outra pessoa.') },
  { id: 'sns24', name: tr('SNS 24'), kind: 'serviço público', area: tr('Nacional'), phone: '808242424', url: 'https://www.sns24.gov.pt', description: tr('Triagem de saúde e aconselhamento psicológico, 24 horas.') },
  { id: 'vozamiga', name: tr('SOS Voz Amiga'), kind: 'linha', area: tr('Nacional'), phone: '213544545', url: 'https://www.sosvozamiga.org', description: tr('Linha de apoio emocional e prevenção do suicídio.') },
  { id: 'apav', name: tr('APAV – Linha de Apoio à Vítima'), kind: 'linha', area: tr('Nacional'), phone: '116006', url: 'https://apav.pt', description: tr('Apoio gratuito e confidencial a vítimas de crime, incluindo crimes de ódio.') },
  { id: 'ilga', name: tr('ILGA Portugal'), kind: 'associação', area: tr('Lisboa e nacional'), url: 'https://ilga-portugal.pt', description: tr('Apoio psicológico, jurídico e social, grupos de partilha e o Observatório da Discriminação.') },
  { id: 'opus', name: tr('Opus Diversidades'), kind: 'associação', area: tr('Lisboa e nacional'), url: 'https://opusdiversidades.org', description: tr('Associação LGBTI+ com apoio comunitário, psicológico e projetos de inclusão.') },
  { id: 'rea', name: tr('rede ex aequo'), kind: 'associação', area: tr('Nacional (jovens)'), url: 'https://www.rea.pt', description: tr('Associação de jovens LGBTI+ e apoiantes, com grupos locais em várias cidades.') },
  { id: 'amplos', name: tr('AMPLOS'), kind: 'associação', area: tr('Nacional (famílias)'), url: 'https://www.amplos.pt', description: tr('Associação de mães e pais pela liberdade de orientação sexual e identidade de género.') },
  { id: 'casaqui', name: tr('Casa Qui'), kind: 'associação', area: tr('Lisboa'), url: 'https://casa-qui.pt', description: tr('Apoio a pessoas LGBTI+ em situação de vulnerabilidade, incluindo acolhimento.') },
  { id: 'planoi', name: tr('Associação Plano i'), kind: 'associação', area: tr('Porto e Norte'), url: 'https://associacaoplanoi.org', description: tr('Centro de apoio e respostas para pessoas LGBTI+ e vítimas de violência.') },
]

// Brasil: só contactos nacionais, gratuitos e públicos. Rever antes de alargar o pacote do Brasil.
export const supportOrgsBR: SupportOrg[] = [
  { id: 'br-190', name: '190', kind: 'emergência', area: tr('Nacional'), phone: '190', description: tr('Polícia Militar. Perigo imediato para ti ou para outra pessoa.') },
  { id: 'br-192', name: tr('SAMU 192'), kind: 'emergência', area: tr('Nacional'), phone: '192', description: tr('Emergência médica.') },
  { id: 'br-cvv', name: tr('CVV – Centro de Valorização da Vida'), kind: 'linha', area: tr('Nacional'), phone: '188', url: 'https://cvv.org.br', description: tr('Apoio emocional e prevenção do suicídio, gratuito e 24 horas.') },
  { id: 'br-disque100', name: tr('Disque 100'), kind: 'serviço público', area: tr('Nacional'), phone: '100', url: 'https://www.gov.br/mdh/pt-br/ondh', description: tr('Denúncia de violações de direitos humanos, incluindo LGBTfobia. Pode ser anónima.') },
  { id: 'br-antra', name: tr('ANTRA – Associação Nacional de Travestis e Transexuais'), kind: 'associação', area: tr('Nacional'), url: 'https://antrabrasil.org', description: tr('Rede nacional de pessoas trans e travestis, com informação sobre direitos e organizações locais.') },
]
