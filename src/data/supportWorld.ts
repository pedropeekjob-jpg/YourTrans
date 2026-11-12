import { tr } from '../i18n'
import type { SupportOrg } from './support'
// Contactos da Alemanha e das Américas. Só linhas públicas e nacionais.
// Ainda sem revisão de associações locais.

export const emergencyOrg = (cc: string, phone: string): SupportOrg => ({
  id: `${cc.toLowerCase()}-emergencia`, name: phone, kind: 'emergência', area: tr('Nacional'), phone,
  description: tr('Número de emergência. Perigo imediato para ti ou para outra pessoa.'),
})

const transLifelineUS: SupportOrg = { id: 'translifeline', name: tr('Trans Lifeline'), kind: 'linha', area: tr('Nacional'), phone: '8775658860', url: 'https://translifeline.org', description: tr('Linha de apoio feita por e para pessoas trans.') }

export const supportWorld: Record<string, SupportOrg[]> = {
  DE: [
    { id: 'de-telefonseelsorge', name: tr('TelefonSeelsorge'), kind: 'linha', area: tr('Nacional'), phone: '08001110111', url: 'https://www.telefonseelsorge.de', description: tr('Apoio emocional gratuito, anónimo e 24 horas.') },
    { id: 'de-bvt', name: tr('Bundesverband Trans*'), kind: 'associação', area: tr('Nacional'), url: 'https://www.bundesverband-trans.de', description: tr('Federação de associações trans, com uma lista de grupos e aconselhamento por região.') },
  ],
  US: [
    { id: 'us-988', name: tr('988 Suicide & Crisis Lifeline'), kind: 'linha', area: tr('Nacional'), phone: '988', url: 'https://988lifeline.org', description: tr('Linha de crise gratuita e 24 horas, por chamada ou SMS.') },
    transLifelineUS,
  ],
  CA: [
    { id: 'ca-988', name: tr('9-8-8 Suicide Crisis Helpline'), kind: 'linha', area: tr('Nacional'), phone: '988', url: 'https://988.ca', description: tr('Linha de crise gratuita e 24 horas, em inglês e francês.') },
    { ...transLifelineUS, id: 'translifeline-ca', phone: '8773306366' },
  ],
  MX: [
    { id: 'mx-vida', name: tr('Línea de la Vida'), kind: 'serviço público', area: tr('Nacional'), phone: '8009112000', description: tr('Linha pública de apoio emocional e prevenção do suicídio, gratuita e 24 horas.') },
  ],
  CL: [
    { id: 'cl-4141', name: tr('*4141 Línea de Prevención del Suicidio'), kind: 'serviço público', area: tr('Nacional'), phone: '*4141', description: tr('Linha pública de prevenção do suicídio, gratuita e 24 horas.') },
  ],
  UY: [
    { id: 'uy-vida', name: tr('Línea Vida'), kind: 'serviço público', area: tr('Nacional'), phone: '08000767', description: tr('Linha pública de prevenção do suicídio, gratuita e 24 horas.') },
  ],
}
