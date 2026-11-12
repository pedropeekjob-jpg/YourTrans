import { tr } from '../i18n'
import type { ChecklistItem } from './guides'
// Direitos, saúde e entidades a atualizar, por país (Portugal tem módulos próprios).
// Informação geral, sem números inventados: listas de espera e custos variam por região
// e cada secção remete para a fonte oficial. Revista pela tarefa mensal (docs/revisao-mensal.md).

export interface Source { label: string; url: string }
export interface Contact { name: string; desc: string; url?: string; phone?: string }

export interface CountryInfo {
  country: string
  health: {
    /** Como funciona o acesso no sistema público */
    intro: string
    /** Percurso típico, por ordem */
    steps: { title: string; body: string }[]
    /** Listas de espera, custos, idades e cuidados a ter */
    notes: string[]
    sources: Source[]
  }
  rights: {
    intro: string
    protections: string[]
    /** Onde fazer queixa e onde pedir apoio jurídico */
    help: Contact[]
    sources: Source[]
  }
  entities: ChecklistItem[]
}

type E = [ChecklistItem['group'], string, string]
const ent = (cc: string, list: E[]): ChecklistItem[] =>
  list.map(([group, label, how], i) => ({ id: `${cc.toLowerCase()}-e${i}`, group, label, how }))

export const countryInfo: CountryInfo[] = [
  {
    country: 'BR',
    health: {
      intro: tr('O SUS tem o Processo Transexualizador (Portaria 2.803/2013), com ambulatórios e hospitais habilitados para acompanhamento, hormonização e algumas cirurgias. A oferta varia muito entre estados e municípios.'),
      steps: [
        { title: tr('Começar na Unidade Básica de Saúde'), body: tr('Pede na UBS o encaminhamento para o ambulatório trans da tua região. A vaga é distribuída pela regulação do estado.') },
        { title: tr('Acompanhamento no ambulatório'), body: tr('A equipa (medicina, psicologia, serviço social) faz o acompanhamento e a hormonização.') },
        { title: tr('Cirurgias'), body: tr('São feitas em hospitais habilitados e com filas longas. Nem todas as cirurgias previstas na portaria são oferecidas em todos os estados.') },
      ],
      notes: [
        tr('Desde abril de 2025, a resolução 2.427/2025 do Conselho Federal de Medicina só permite iniciar hormonização a partir dos 18 anos, e cirurgias com potencial esterilizador a partir dos 21. Não se aplica a quem já estava em tratamento. A resolução está a ser contestada no STF.'),
        tr('Se o SUS recusar ou demorar demasiado, a Defensoria Pública pode ajudar gratuitamente.'),
      ],
      sources: [{ label: tr('Ministério da Saúde: Processo Transexualizador'), url: 'https://www.gov.br/saude' }, { label: tr('Conselho Federal de Medicina'), url: 'https://portal.cfm.org.br' }],
    },
    rights: {
      intro: tr('Desde 2019 o Supremo Tribunal Federal equipara a LGBTfobia ao crime de racismo (Lei 7.716/1989). O nome social pode ser usado em serviços públicos, escolas e no SUS.'),
      protections: [tr('Discriminação, ofensas e violência por identidade de género são crime.'), tr('Tens direito ao nome social em documentos e registos de serviços públicos.'), tr('O nome e o género podem ser corrigidos em cartório, sem processo judicial.')],
      help: [
        { name: tr('Disque 100'), phone: '100', desc: tr('Denúncia de violações de direitos humanos, incluindo LGBTfobia. Pode ser anónima.') },
        { name: tr('Delegacia de polícia'), desc: tr('Para registar um boletim de ocorrência por crime de LGBTfobia.') },
        { name: tr('Defensoria Pública'), url: 'https://www.anadep.org.br', desc: tr('Apoio jurídico gratuito para quem não pode pagar advogado.') },
      ],
      sources: [{ label: tr('STF: ADO 26'), url: 'https://portal.stf.jus.br' }],
    },
    entities: ent('BR', [
      ['Estado', tr('RG e CPF'), tr('Depois da certidão retificada, atualiza o RG no instituto de identificação e o CPF na Receita Federal.')],
      ['Estado', tr('Título de eleitor'), tr('No cartório eleitoral ou no site do TSE.')],
      ['Estado', tr('Passaporte e CNH'), tr('Na Polícia Federal e no Detran.')],
      ['Saúde', tr('Cartão SUS'), tr('Na UBS ou no aplicativo Meu SUS Digital.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização do cadastro e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização do registo, carteira de trabalho digital e eSocial.')],
      ['Serviços', tr('Operadora, energia e contratos'), tr('Titularidade dos contratos e faturas.')],
    ]),
  },
  {
    country: 'ES',
    health: {
      intro: tr('A saúde é gerida por cada comunidade autónoma. A Lei 4/2023 incluiu os tratamentos hormonais e cirúrgicos na carteira de serviços do Sistema Nacional de Saúde e afasta a exigência de diagnósticos psiquiátricos.'),
      steps: [
        { title: tr('Falar com o médico de família'), body: tr('O centro de saúde encaminha para a unidade de atenção a pessoas trans da tua comunidade autónoma (os nomes variam).') },
        { title: tr('Acompanhamento e hormonas'), body: tr('Em várias comunidades a hormonização pode ser iniciada e seguida nos cuidados primários ou na endocrinologia.') },
        { title: tr('Cirurgias'), body: tr('São feitas em hospitais de referência da comunidade, com listas de espera próprias.') },
      ],
      notes: [tr('A oferta e as esperas variam muito entre comunidades autónomas. Pergunta no teu centro de saúde qual é a unidade de referência.')],
      sources: [{ label: tr('Lei 4/2023 (BOE)'), url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-5366' }, { label: tr('Ministério da Saúde de Espanha'), url: 'https://www.sanidad.gob.es' }],
    },
    rights: {
      intro: tr('A Lei 4/2023 e a Lei 15/2022 de igualdade de tratamento proíbem a discriminação por identidade de género no trabalho, na saúde, na educação e no acesso a bens e serviços, com sanções.'),
      protections: [tr('Discriminação no trabalho, na escola ou em serviços é infração com multas.'), tr('Os crimes de ódio por identidade de género são agravados no Código Penal.'), tr('As empresas com mais de 50 pessoas têm de ter medidas de igualdade LGTBI.')],
      help: [
        { name: tr('Inspeção do Trabalho'), url: 'https://www.mites.gob.es/itss', desc: tr('Queixas por discriminação no trabalho.') },
        { name: tr('Ministério Público: crimes de ódio'), url: 'https://www.fiscal.es', desc: tr('Cada procuradoria provincial tem uma secção de crimes de ódio e discriminação.') },
        { name: tr('Justiça gratuita'), url: 'https://www.mjusticia.gob.es', desc: tr('Advogado de ofício gratuito se não tiveres rendimentos suficientes.') },
        { name: tr('FELGTBI+'), url: 'https://felgtbi.org', desc: tr('Informação e encaminhamento para associações locais.') },
      ],
      sources: [{ label: tr('Lei 15/2022 (BOE)'), url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-11589' }],
    },
    entities: ent('ES', [
      ['Estado', tr('DNI e passaporte'), tr('Na Polícia Nacional, depois de o Registo Civil averbar a mudança.')],
      ['Estado', tr('Segurança Social'), tr('Atualiza os dados na Tesorería General de la Seguridad Social.')],
      ['Finanças', tr('Agência Tributária'), tr('Os dados vêm do DNI; confirma no Cl@ve ou na sede eletrónica.')],
      ['Saúde', tr('Cartão de saúde'), tr('No centro de saúde da tua comunidade autónoma.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização do processo, contrato e folhas de vencimento.')],
      ['Serviços', tr('Operadora, energia e contratos'), tr('Titularidade dos contratos e faturas.')],
    ]),
  },
  {
    country: 'FR',
    health: {
      intro: tr('Os cuidados de transição são comparticipados pela Assurance Maladie. O médico assistente pode pedir a comparticipação a 100% através de uma afeção de longa duração (ALD).'),
      steps: [
        { title: tr('Médico assistente'), body: tr('O médico de família (médecin traitant) pode iniciar o acompanhamento e encaminhar para endocrinologia.') },
        { title: tr('Hormonas'), body: tr('Prescritas por médico, com análises regulares. A prática varia: alguns pedem avaliação psiquiátrica, outros não.') },
        { title: tr('Cirurgias'), body: tr('Em hospitais públicos com equipas especializadas, com esperas longas. Algumas cirurgias precisam de pedido prévio de comparticipação.') },
      ],
      notes: [tr('Associações como a OUTrans mantêm listas de profissionais de confiança.'), tr('Confirma a comparticipação com a tua caixa de seguro antes de cada cirurgia.')],
      sources: [{ label: tr('Ameli: afeção de longa duração'), url: 'https://www.ameli.fr' }, { label: tr('Haute Autorité de Santé'), url: 'https://www.has-sante.fr' }],
    },
    rights: {
      intro: tr('O Código Penal e o Código do Trabalho proíbem a discriminação por identidade de género desde 2016. Os crimes cometidos por causa da identidade de género são agravados.'),
      protections: [tr('Discriminação no emprego, na habitação e em serviços é crime.'), tr('Insultos e violência transfóbicos têm penas agravadas.')],
      help: [
        { name: tr('Défenseur des droits'), url: 'https://www.defenseurdesdroits.fr', desc: tr('Queixas gratuitas por discriminação, online ou com delegados locais.') },
        { name: tr('Polícia e gendarmerie'), url: 'https://www.masecurite.interieur.gouv.fr', desc: tr('Queixa por crime de ódio; podes fazer uma pré-queixa online.') },
        { name: tr('Point-Justice'), url: 'https://www.justice.fr', desc: tr('Informação jurídica gratuita e apoio judiciário (aide juridictionnelle).') },
        { name: tr('SOS homophobie'), url: 'https://www.sos-homophobie.org', desc: tr('Escuta anónima e apoio a vítimas de LGBTIfobia, incluindo transfobia.') },
      ],
      sources: [{ label: tr('Service-public.fr: discriminação'), url: 'https://www.service-public.fr' }],
    },
    entities: ent('FR', [
      ['Estado', tr('Cartão de identidade e passaporte'), tr('Pré-pedido na ANTS e marcação numa mairie.')],
      ['Saúde', tr('Assurance Maladie e Carte Vitale'), tr('Pede a atualização na tua conta Ameli; o número de segurança social pode mudar.')],
      ['Estado', tr('CAF e France Travail'), tr('Atualiza os dados na tua conta online.')],
      ['Finanças', tr('Impostos'), tr('Os dados vêm do estado civil; confirma em impots.gouv.fr.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('O nome de uso pode ser pedido na escola e na universidade mesmo antes da mudança legal.')],
      ['Serviços', tr('Operadora, energia e contratos'), tr('Titularidade dos contratos e faturas.')],
    ]),
  },
  {
    country: 'DE',
    health: {
      intro: tr('O seguro de saúde público (gesetzliche Krankenversicherung) comparticipa hormonas e cirurgias quando são consideradas necessárias. Para cirurgias é preciso pedir autorização prévia à tua Krankenkasse.'),
      steps: [
        { title: tr('Indicação e acompanhamento'), body: tr('Normalmente é pedida uma avaliação por psicoterapeuta ou psiquiatra antes das hormonas e um acompanhamento psicoterapêutico antes das cirurgias.') },
        { title: tr('Hormonas'), body: tr('Prescritas por endocrinologia ou medicina geral, com a comparticipação normal dos medicamentos.') },
        { title: tr('Pedido de cirurgia'), body: tr('Envias à Krankenkasse o pedido de comparticipação (Kostenübernahme) com os relatórios. O Medizinischer Dienst avalia antes da decisão.') },
      ],
      notes: [tr('As regras de avaliação do Medizinischer Dienst estão a ser revistas e há propostas no Bundestag para mudar o sistema. Confirma sempre com a tua Krankenkasse.'), tr('Não marques a cirurgia antes de teres a autorização por escrito.')],
      sources: [{ label: tr('Medizinischer Dienst'), url: 'https://md-bund.de' }, { label: tr('Bundesverband Trans*'), url: 'https://www.bundesverband-trans.de' }],
    },
    rights: {
      intro: tr('A lei geral de igualdade de tratamento (AGG) protege contra a discriminação por sexo e identidade sexual no trabalho e no acesso a bens e serviços.'),
      protections: [tr('Discriminação no emprego, na habitação e em serviços pode dar direito a indemnização (prazo curto: normalmente 2 meses).'), tr('Revelar o nome ou género anterior sem consentimento é proibido pela SBGG e pode dar multa.')],
      help: [
        { name: tr('Antidiskriminierungsstelle des Bundes'), url: 'https://www.antidiskriminierungsstelle.de', desc: tr('Aconselhamento gratuito sobre discriminação e encaminhamento para apoio local.') },
        { name: tr('Polícia'), phone: '110', desc: tr('Queixa por crime de ódio.') },
        { name: tr('Beratungshilfe'), url: 'https://www.bmj.de', desc: tr('Apoio jurídico com custo reduzido para quem tem poucos rendimentos, pedido no tribunal local.') },
      ],
      sources: [{ label: tr('AGG (Gesetze im Internet)'), url: 'https://www.gesetze-im-internet.de/agg/' }],
    },
    entities: ent('DE', [
      ['Estado', tr('Personalausweis e passaporte'), tr('No Bürgeramt, depois da declaração no Standesamt.')],
      ['Saúde', tr('Krankenkasse e cartão de saúde'), tr('Pede um novo cartão (eGK) com os novos dados.')],
      ['Finanças', tr('Finanzamt e Rentenversicherung'), tr('Atualiza os dados; o número da Rentenversicherung pode mudar.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Podes pedir a reemissão de certificados e diplomas com o novo nome.')],
      ['Serviços', tr('Operadora, energia e contratos'), tr('Titularidade dos contratos e faturas.')],
    ]),
  },
  {
    country: 'AR',
    health: {
      intro: tr('A Lei 26.743 garante, a partir dos 18 anos, acesso a hormonas e cirurgias sem autorização judicial nem administrativa. Estão incluídas no plano médico obrigatório: o sistema público, as obras sociais e os seguros privados têm de as cobrir.'),
      steps: [
        { title: tr('Consultório amigável'), body: tr('Muitos hospitais e centros de saúde públicos têm consultórios para a diversidade. Pede-os no centro de saúde da tua área.') },
        { title: tr('Hormonas'), body: tr('Com consentimento informado, sem diagnóstico psiquiátrico.') },
        { title: tr('Cirurgias'), body: tr('Cobertas pelo sistema público e pelas obras sociais, com listas de espera nos hospitais de referência.') },
      ],
      notes: [tr('Se a obra social ou o seguro recusar, podes reclamar na Superintendencia de Servicios de Salud.')],
      sources: [{ label: tr('Lei 26.743 (Argentina.gob.ar)'), url: 'https://www.argentina.gob.ar/normativa/nacional/ley-26743-197860' }, { label: tr('Ministério da Saúde da Argentina'), url: 'https://www.argentina.gob.ar/salud' }],
    },
    rights: {
      intro: tr('A Lei 26.743 garante o trato digno e o uso do nome escolhido. A Lei 23.592 proíbe atos discriminatórios e a Lei 27.636 criou uma quota de emprego público para pessoas trans e travestis.'),
      protections: [tr('Tens direito a ser tratade pelo nome e género escolhidos, mesmo sem mudança registal.'), tr('Atos discriminatórios podem ser anulados e dar indemnização.')],
      help: [
        { name: tr('Defensoría del Pueblo'), url: 'https://www.dpn.gob.ar', desc: tr('Queixas contra organismos públicos e discriminação.') },
        { name: tr('Ministério Público Fiscal'), url: 'https://www.mpf.gob.ar', desc: tr('Denúncias de crimes de ódio e violência.') },
      ],
      sources: [{ label: tr('Lei 27.636 (quota laboral trans)'), url: 'https://www.argentina.gob.ar/normativa' }],
    },
    entities: ent('AR', [
      ['Estado', tr('DNI e passaporte'), tr('Emitidos pelo RENAPER depois da retificação.')],
      ['Estado', tr('ANSES e CUIL'), tr('Atualiza os dados com o novo DNI.')],
      ['Finanças', tr('ARCA (antiga AFIP)'), tr('Atualiza os dados fiscais.')],
      ['Saúde', tr('Obra social ou seguro de saúde'), tr('Pede a atualização do cartão de afiliação.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Reemissão de diplomas e atualização de recibos de vencimento.')],
    ]),
  },
  {
    country: 'UY',
    health: {
      intro: tr('A Lei 19.684 garante acesso a tratamentos hormonais e cirúrgicos no Sistema Nacional Integrado de Saúde, para maiores de 18 anos sem autorização judicial.'),
      steps: [
        { title: tr('Prestador de saúde'), body: tr('Pede no teu prestador (ASSE ou mutualista) o encaminhamento para os serviços de saúde trans.') },
        { title: tr('Hormonas'), body: tr('Com acompanhamento médico e consentimento informado.') },
        { title: tr('Cirurgias'), body: tr('Disponíveis em hospitais de referência, com esperas.') },
      ],
      notes: [tr('Menores de 18 anos precisam do consentimento dos representantes legais para tratamentos hormonais.')],
      sources: [{ label: tr('Lei 19.684 (IMPO)'), url: 'https://www.impo.com.uy/bases/leyes/19684-2018' }, { label: tr('Ministério da Saúde Pública'), url: 'https://www.gub.uy/ministerio-salud-publica' }],
    },
    rights: {
      intro: tr('A Lei 19.684 protege contra a discriminação e criou quotas de emprego público e bolsas de estudo para pessoas trans.'),
      protections: [tr('Discriminação por identidade de género é proibida no trabalho, na educação e na saúde.')],
      help: [{ name: tr('Instituição Nacional de Direitos Humanos'), url: 'https://www.gub.uy/institucion-nacional-derechos-humanos-uruguay', desc: tr('Queixas gratuitas por discriminação.') }],
      sources: [{ label: tr('Lei 19.684 (IMPO)'), url: 'https://www.impo.com.uy/bases/leyes/19684-2018' }],
    },
    entities: ent('UY', [
      ['Estado', tr('Cédula e passaporte'), tr('Na Dirección Nacional de Identificación Civil.')],
      ['Estado', tr('BPS'), tr('Atualiza os dados de segurança social.')],
      ['Saúde', tr('Prestador de saúde'), tr('Atualização do registo de utente.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização de registos e diplomas.')],
    ]),
  },
  {
    country: 'CL',
    health: {
      intro: tr('No sistema público (Fonasa) há policlínicas de identidade de género em vários hospitais. Os seguros privados (Isapres) cobrem de forma variável.'),
      steps: [
        { title: tr('Centro de saúde (CESFAM)'), body: tr('Pede o encaminhamento para a policlínica de identidade de género do teu serviço de saúde.') },
        { title: tr('Hormonas e acompanhamento'), body: tr('Com endocrinologia e saúde mental, conforme a policlínica.') },
        { title: tr('Cirurgias'), body: tr('Oferta limitada no sistema público, com esperas longas.') },
      ],
      notes: [tr('Para menores existe o Programa de Acompanhamento de Identidade de Género (PAIG), com apoio psicossocial.')],
      sources: [{ label: tr('Ministério da Saúde do Chile'), url: 'https://www.minsal.cl' }],
    },
    rights: {
      intro: tr('A Lei 20.609 (Lei Zamudio) permite pedir em tribunal a reparação de discriminação arbitrária, incluindo por identidade de género.'),
      protections: [tr('Discriminação no trabalho pode ser denunciada à Direção do Trabalho.'), tr('A Lei 21.120 protege o direito à identidade de género.')],
      help: [
        { name: tr('Direção do Trabalho'), url: 'https://www.dt.gob.cl', desc: tr('Denúncias de discriminação no emprego.') },
        { name: tr('Instituto Nacional de Direitos Humanos'), url: 'https://www.indh.cl', desc: tr('Orientação e queixas sobre direitos humanos.') },
        { name: tr('Corporación de Asistencia Judicial'), url: 'https://www.cajmetro.cl', desc: tr('Apoio jurídico gratuito.') },
      ],
      sources: [{ label: tr('Lei 20.609 (BCN)'), url: 'https://www.bcn.cl/leychile' }],
    },
    entities: ent('CL', [
      ['Estado', tr('Cédula e passaporte'), tr('No Registro Civil, depois da resolução.')],
      ['Saúde', tr('Fonasa ou Isapre'), tr('Atualização dos dados de beneficiário.')],
      ['Finanças', tr('AFP e Serviço de Impostos Internos'), tr('Os dados vêm do Registro Civil; confirma online.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização de registos e diplomas.')],
    ]),
  },
  {
    country: 'CO',
    health: {
      intro: tr('As EPS (entidades de saúde) têm de garantir os cuidados de afirmação de género quando são medicamente indicados. O Tribunal Constitucional tem ordenado essa cobertura em vários casos.'),
      steps: [
        { title: tr('Pedir consulta na EPS'), body: tr('Pede medicina geral e o encaminhamento para endocrinologia e outras especialidades.') },
        { title: tr('Hormonas e cirurgias'), body: tr('Autorizadas pela EPS conforme a indicação médica.') },
        { title: tr('Se recusarem'), body: tr('Podes apresentar uma ação de tutela, rápida e sem advogado, para exigir o tratamento.') },
      ],
      notes: [tr('Guarda por escrito todas as recusas da EPS: são a base da tutela.')],
      sources: [{ label: tr('Tribunal Constitucional da Colômbia'), url: 'https://www.corteconstitucional.gov.co' }, { label: tr('Superintendência Nacional de Saúde'), url: 'https://www.supersalud.gov.co' }],
    },
    rights: {
      intro: tr('A Lei 1482 de 2011 pune atos de discriminação, incluindo por identidade de género. A ação de tutela protege direitos fundamentais de forma rápida.'),
      protections: [tr('Discriminação e assédio podem ser denunciados penalmente.'), tr('A tutela pode ser apresentada sem advogado e tem de ser decidida em 10 dias.')],
      help: [
        { name: tr('Defensoría del Pueblo'), url: 'https://www.defensoria.gov.co', desc: tr('Orientação gratuita e apoio com tutelas.') },
        { name: tr('Fiscalía General'), url: 'https://www.fiscalia.gov.co', desc: tr('Denúncias de discriminação e violência.') },
      ],
      sources: [{ label: tr('Tribunal Constitucional da Colômbia'), url: 'https://www.corteconstitucional.gov.co' }],
    },
    entities: ent('CO', [
      ['Estado', tr('Cédula e passaporte'), tr('Na Registraduría e na Cancillería.')],
      ['Saúde', tr('EPS'), tr('Atualização dos dados de afiliado.')],
      ['Finanças', tr('DIAN e fundo de pensões'), tr('Atualiza o RUT e os dados de pensões.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização de registos e diplomas.')],
    ]),
  },
  {
    country: 'MX',
    health: {
      intro: tr('O acesso depende da instituição e do estado. Na Cidade do México existe a Unidade de Saúde Integral para Pessoas Trans, pública e gratuita. O IMSS e o ISSSTE têm oferta limitada.'),
      steps: [
        { title: tr('Procurar um serviço público especializado'), body: tr('Na Cidade do México, a Unidade de Saúde Integral para Pessoas Trans oferece hormonização e acompanhamento. Noutros estados, pergunta nos serviços de saúde estaduais.') },
        { title: tr('Hormonas'), body: tr('Com acompanhamento médico e análises regulares.') },
        { title: tr('Cirurgias'), body: tr('Oferta pública muito limitada; a maioria é feita no privado.') },
      ],
      notes: [tr('Desconfia de hormonas sem receita e sem análises.')],
      sources: [{ label: tr('Secretaria de Saúde da Cidade do México'), url: 'https://www.salud.cdmx.gob.mx' }],
    },
    rights: {
      intro: tr('O artigo 1.º da Constituição proíbe a discriminação, incluindo por identidade de género. Há órgãos federais e estaduais para queixas.'),
      protections: [tr('Discriminação em serviços, escola e trabalho pode ser denunciada sem custos.')],
      help: [
        { name: tr('CONAPRED'), url: 'https://www.conapred.org.mx', desc: tr('Queixas por discriminação a nível federal.') },
        { name: tr('COPRED (Cidade do México)'), url: 'https://copred.cdmx.gob.mx', desc: tr('Queixas por discriminação na Cidade do México.') },
        { name: tr('Defensoria pública'), url: 'https://www.ifdp.cjf.gob.mx', desc: tr('Apoio jurídico gratuito.') },
      ],
      sources: [{ label: tr('CONAPRED'), url: 'https://www.conapred.org.mx' }],
    },
    entities: ent('MX', [
      ['Estado', tr('CURP e credencial do INE'), tr('Atualiza a CURP no RENAPO e a credencial num módulo do INE.')],
      ['Estado', tr('Passaporte'), tr('Na Secretaria de Relações Exteriores.')],
      ['Finanças', tr('SAT'), tr('Atualiza o RFC com a nova CURP.')],
      ['Saúde', tr('IMSS ou ISSSTE'), tr('Atualização dos dados de afiliado.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização de registos e diplomas.')],
    ]),
  },
  {
    country: 'CA',
    health: {
      intro: tr('Cada província tem o seu seguro de saúde. As hormonas são prescritas por médico de família ou enfermeiro especialista, muitas vezes por consentimento informado. Muitas cirurgias são cobertas pelo plano provincial.'),
      steps: [
        { title: tr('Médico de família ou clínica'), body: tr('Pede hormonas por consentimento informado; algumas províncias têm clínicas especializadas.') },
        { title: tr('Avaliação para cirurgia'), body: tr('As cirurgias cobertas precisam de avaliação por profissionais qualificados e de autorização do plano provincial.') },
        { title: tr('Cirurgia'), body: tr('Em centros especializados, com esperas longas.') },
      ],
      notes: [tr('A cobertura de medicamentos e de algumas cirurgias varia por província e pode depender de seguro privado.')],
      sources: [{ label: tr('Governo do Canadá: saúde'), url: 'https://www.canada.ca/en/health-canada.html' }, { label: tr('Rainbow Health Ontario'), url: 'https://www.rainbowhealthontario.ca' }],
    },
    rights: {
      intro: tr('Desde 2017 a lei federal de direitos humanos e o Código Penal protegem a identidade e expressão de género. Todas as províncias têm proteção semelhante.'),
      protections: [tr('Discriminação no emprego, habitação e serviços pode ser levada às comissões de direitos humanos.'), tr('Crimes motivados por ódio têm penas agravadas.')],
      help: [
        { name: tr('Comissão Canadiana de Direitos Humanos'), url: 'https://www.chrc-ccdp.gc.ca', desc: tr('Queixas contra entidades federais (bancos, telecomunicações, governo federal).') },
        { name: tr('Comissão de direitos humanos da tua província'), desc: tr('Queixas contra empregadores, senhorios e serviços locais.') },
        { name: tr('Legal Aid da província'), desc: tr('Apoio jurídico gratuito ou de baixo custo.') },
      ],
      sources: [{ label: tr('Lei C-16 (2017)'), url: 'https://www.justice.gc.ca' }],
    },
    entities: ent('CA', [
      ['Estado', tr('Certidão de nascimento e carta de condução'), tr('Na tua província.')],
      ['Estado', tr('Passaporte e cartão de residente'), tr('No governo federal (IRCC), por autodeclaração.')],
      ['Estado', tr('Social Insurance Number (SIN)'), tr('Atualiza os dados na Service Canada.')],
      ['Saúde', tr('Cartão de saúde provincial'), tr('Atualização no serviço da tua província.')],
      ['Finanças', tr('Agência de Receita (CRA)'), tr('Atualiza os dados na tua conta.')],
      ['Finanças', tr('Bancos e cartões'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização de registos e diplomas.')],
    ]),
  },
  {
    country: 'US',
    health: {
      intro: tr('Depende do seguro e do estado. Muitos seguros privados e o Medicaid de vários estados cobrem hormonas e cirurgias; outros estados excluem esta cobertura. Em 2025 o Supremo Tribunal aceitou que os estados proíbam cuidados de transição a menores (Estados Unidos contra Skrmetti).'),
      steps: [
        { title: tr('Clínica de consentimento informado'), body: tr('Centros de saúde comunitários e clínicas como a Planned Parenthood prescrevem hormonas por consentimento informado em muitos estados.') },
        { title: tr('Confirmar a cobertura'), body: tr('Pede ao teu seguro ou ao Medicaid a política escrita sobre cuidados de afirmação de género.') },
        { title: tr('Cirurgias'), body: tr('Normalmente precisam de autorização prévia do seguro e de cartas de profissionais de saúde.') },
      ],
      notes: [tr('As leis estaduais mudam com frequência e a política federal tornou-se restritiva em 2025. Confirma antes de viajar ou mudar de estado.'), tr('Hospitais com financiamento federal deixaram de oferecer alguns cuidados a menores.')],
      sources: [{ label: tr('Supremo Tribunal dos EUA'), url: 'https://www.supremecourt.gov' }],
    },
    rights: {
      intro: tr('O Supremo Tribunal decidiu em 2020 (Bostock) que a lei federal de emprego protege contra a discriminação por identidade de género. Desde 2025, a agência federal (EEOC) processa estas queixas de forma muito limitada.'),
      protections: [tr('Ainda podes pedir à EEOC a carta de "direito a processar" e avançar em tribunal.'), tr('Vários estados, como a Califórnia, Nova Iorque e o Illinois, têm leis próprias de proteção.')],
      help: [
        { name: tr('Agência de direitos civis do teu estado'), desc: tr('Em muitos estados, a queixa estadual é hoje o caminho mais eficaz.') },
        { name: tr('Lambda Legal'), url: 'https://lambdalegal.org', desc: tr('Linha de apoio jurídico para pessoas LGBTQ+.') },
        { name: tr('ACLU'), url: 'https://www.aclu.org', desc: tr('Informação sobre direitos e processos em curso.') },
      ],
      sources: [{ label: tr('EEOC'), url: 'https://www.eeoc.gov' }],
    },
    entities: ent('US', [
      ['Estado', tr('Ordem judicial de mudança de nome'), tr('Guarda várias cópias certificadas: vão ser pedidas por quase todas as entidades.')],
      ['Estado', tr('Social Security'), tr('Atualiza o nome no cartão; a mudança do marcador de sexo depende da política federal atual.')],
      ['Estado', tr('Carta de condução e ID estadual'), tr('No DMV do teu estado.')],
      ['Estado', tr('Passaporte'), tr('Confirma a política atual do Departamento de Estado antes de pedir.')],
      ['Saúde', tr('Seguro de saúde'), tr('Atualiza os dados e confirma a cobertura.')],
      ['Finanças', tr('Bancos, cartões e crédito'), tr('Pede a atualização de dados e novos cartões.')],
      ['Estudos e trabalho', tr('Escola, universidade e empregador'), tr('Atualização de registos, folha de pagamentos e diplomas.')],
    ]),
  },
]

export const infoFor = (cc: string) => countryInfo.find(i => i.country === cc)
