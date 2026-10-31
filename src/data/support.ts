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
  { id: '112', name: '112', kind: 'emergência', area: 'Nacional', phone: '112', description: 'Número Europeu de Emergência. Perigo imediato para ti ou para outra pessoa.' },
  { id: 'sns24', name: 'SNS 24', kind: 'serviço público', area: 'Nacional', phone: '808242424', url: 'https://www.sns24.gov.pt', description: 'Triagem de saúde e aconselhamento psicológico, 24 horas.' },
  { id: 'vozamiga', name: 'SOS Voz Amiga', kind: 'linha', area: 'Nacional', phone: '213544545', url: 'https://www.sosvozamiga.org', description: 'Linha de apoio emocional e prevenção do suicídio.' },
  { id: 'apav', name: 'APAV – Linha de Apoio à Vítima', kind: 'linha', area: 'Nacional', phone: '116006', url: 'https://apav.pt', description: 'Apoio gratuito e confidencial a vítimas de crime, incluindo crimes de ódio.' },
  { id: 'ilga', name: 'ILGA Portugal', kind: 'associação', area: 'Lisboa e nacional', url: 'https://ilga-portugal.pt', description: 'Apoio psicológico, jurídico e social, grupos de partilha e o Observatório da Discriminação.' },
  { id: 'opus', name: 'Opus Diversidades', kind: 'associação', area: 'Lisboa e nacional', url: 'https://opusdiversidades.org', description: 'Associação LGBTI+ com apoio comunitário, psicológico e projetos de inclusão.' },
  { id: 'rea', name: 'rede ex aequo', kind: 'associação', area: 'Nacional (jovens)', url: 'https://www.rea.pt', description: 'Associação de jovens LGBTI+ e apoiantes, com grupos locais em várias cidades.' },
  { id: 'amplos', name: 'AMPLOS', kind: 'associação', area: 'Nacional (famílias)', url: 'https://www.amplos.pt', description: 'Associação de mães e pais pela liberdade de orientação sexual e identidade de género.' },
  { id: 'casaqui', name: 'Casa Qui', kind: 'associação', area: 'Lisboa', url: 'https://casa-qui.pt', description: 'Apoio a pessoas LGBTI+ em situação de vulnerabilidade, incluindo acolhimento.' },
  { id: 'planoi', name: 'Associação Plano i', kind: 'associação', area: 'Porto e Norte', url: 'https://associacaoplanoi.org', description: 'Centro de apoio e respostas para pessoas LGBTI+ e vítimas de violência.' },
]
