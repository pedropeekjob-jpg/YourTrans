import { tr } from '../i18n'
import type { CountryGuide } from './guides'
// Guias legais da Alemanha e das Américas. Informação geral, ainda sem revisão
// de associações locais: cada passo remete para a fonte oficial.

export const guidesWorld: CountryGuide[] = [
  {
    country: 'DE', name: 'Deutschland',
    law: tr('Lei da Autodeterminação (Selbstbestimmungsgesetz, SBGG), em vigor desde 1 de novembro de 2024'),
    summary: tr('A mudança do registo de género e do nome faz-se por declaração no registo civil (Standesamt), sem relatórios médicos nem decisão de tribunal.'),
    eligibility: [
      tr('Pessoas com nacionalidade alemã, e pessoas estrangeiras com residência permanente ou autorização de residência renovável.'),
      tr('A partir dos 14 anos: declaração da própria pessoa, com o consentimento dos representantes legais.'),
      tr('Menores de 14 anos: declaração feita pelos representantes legais.'),
    ],
    steps: [
      { id: 'de-notice', title: tr('Avisar o Standesamt com antecedência'), body: tr('A lei exige que avises o registo civil pelo menos três meses antes da declaração. Muitos Standesämter aceitam o aviso por escrito ou online.'), where: tr('Standesamt (registo civil)'), time: tr('Pelo menos 3 meses antes') },
      { id: 'de-declare', title: tr('Fazer a declaração'), body: tr('Declaras o novo registo de género (feminino, masculino, diverso ou sem registo) e os novos nomes próprios. Depois, uma nova mudança só é possível passado um ano.'), docs: [tr('Documento de identificação'), tr('Certidão de nascimento')], link: { label: tr('Informação oficial (BMFSFJ)'), url: 'https://www.bmfsfj.de' } },
      { id: 'de-docs', title: tr('Pedir os novos documentos'), body: tr('Com o registo atualizado, pede o novo cartão de identidade (Personalausweis) e o passaporte no Bürgeramt. Depois atualiza o seguro de saúde, o banco, o trabalho e a escola.'), where: tr('Bürgeramt') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'AR', name: 'Argentina',
    law: tr('Lei 26.743 de Identidade de Género (2012)'),
    summary: tr('Uma das primeiras leis de autodeterminação do mundo: a mudança do nome e do sexo faz-se no registo civil, sem relatórios médicos, sem cirurgia e de forma gratuita. Desde 2021 existe também o marcador X no DNI.'),
    eligibility: [tr('A partir dos 18 anos: pedido feito pela própria pessoa.'), tr('Menores de 18 anos: através dos representantes legais, com o acordo da pessoa.'), tr('Pessoas estrangeiras com residência permanente podem pedir a mudança no DNI de estrangeiro.')],
    steps: [
      { id: 'ar-request', title: tr('Pedir a retificação no registo civil'), body: tr('Vais ao Registro Civil da tua área e pedes a retificação do sexo e do nome. Não tens de apresentar provas médicas.'), where: tr('Registro Civil'), cost: tr('Gratuito'), link: { label: tr('Lei 26.743 (Argentina.gob.ar)'), url: 'https://www.argentina.gob.ar/normativa/nacional/ley-26743-197860' } },
      { id: 'ar-dni', title: tr('Receber o novo DNI'), body: tr('O registo comunica a mudança ao RENAPER, que emite o novo DNI e a nova certidão de nascimento.'), where: tr('RENAPER') },
      { id: 'ar-after', title: tr('Atualizar tudo o resto'), body: tr('Atualiza a ANSES, a AFIP/ARCA, o banco, a obra social, a escola e o trabalho.') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'UY', name: 'Uruguay',
    law: tr('Lei 19.684, Lei Integral para Pessoas Trans (2018)'),
    summary: tr('A mudança do nome e do sexo é um procedimento administrativo, sem exigência de cirurgia nem de tratamentos.'),
    eligibility: [tr('Pessoas maiores de 18 anos, por pedido próprio.'), tr('Menores de 18 anos: com os representantes legais.')],
    steps: [
      { id: 'uy-request', title: tr('Fazer o pedido'), body: tr('O pedido é feito na Dirección General del Registro de Estado Civil. Confirma no site oficial a documentação e as marcações.'), where: tr('Dirección General del Registro de Estado Civil'), link: { label: tr('Lei 19.684 (IMPO)'), url: 'https://www.impo.com.uy/bases/leyes/19684-2018' } },
      { id: 'uy-ci', title: tr('Pedir a nova cédula de identidade'), body: tr('Com a certidão atualizada, pedes a nova cédula na Dirección Nacional de Identificación Civil.'), where: tr('Dirección Nacional de Identificación Civil') },
      { id: 'uy-after', title: tr('Atualizar tudo o resto'), body: tr('Atualiza o BPS, o prestador de saúde, o banco, a escola e o trabalho.') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'CL', name: 'Chile',
    law: tr('Lei 21.120 de Identidade de Género (2018)'),
    summary: tr('Pessoas adultas mudam o nome e o sexo no Registro Civil, sem exigência de cirurgia nem de tratamentos.'),
    eligibility: [tr('A partir dos 18 anos: pedido no Registro Civil.'), tr('Entre os 14 e os 18 anos: pedido no tribunal de família, através dos representantes legais.')],
    steps: [
      { id: 'cl-book', title: tr('Marcar o atendimento'), body: tr('Marcas a hora no Registro Civil. Na primeira ida apresentas o pedido; numa segunda audiência confirmas a tua vontade, com duas testemunhas.'), where: tr('Servicio de Registro Civil e Identificación'), docs: [tr('Cédula de identidade'), tr('Duas testemunhas maiores de idade')], link: { label: tr('Registro Civil de Chile'), url: 'https://www.registrocivil.cl' } },
      { id: 'cl-ci', title: tr('Pedir a nova cédula'), body: tr('Depois da resolução, pedes a nova cédula de identidade e o passaporte.') },
      { id: 'cl-after', title: tr('Atualizar tudo o resto'), body: tr('Atualiza o Fonasa ou a Isapre, o banco, a AFP, a escola e o trabalho.') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'CO', name: 'Colombia',
    law: tr('Decreto 1227 de 2015'),
    summary: tr('A mudança do sexo no registo faz-se num notário, por escritura pública, sem provas médicas. A mudança do nome faz-se pelo mesmo procedimento.'),
    eligibility: [tr('Pessoas maiores de 18 anos.'), tr('Menores: a jurisprudência do Tribunal Constitucional abriu caminhos, mas exigem apoio jurídico.')],
    steps: [
      { id: 'co-notary', title: tr('Fazer a escritura pública num notário'), body: tr('Apresentas uma declaração sob juramento com a tua vontade de corrigir o sexo e o nome. O notário faz a escritura pública.'), where: tr('Notaría'), docs: [tr('Cédula de cidadania'), tr('Cópia do registo civil de nascimento'), tr('Declaração sob juramento')] },
      { id: 'co-cedula', title: tr('Pedir a nova cédula'), body: tr('Com o registo corrigido, pedes a nova cédula na Registraduría Nacional.'), where: tr('Registraduría Nacional del Estado Civil'), link: { label: tr('Registraduría Nacional'), url: 'https://www.registraduria.gov.co' } },
      { id: 'co-after', title: tr('Atualizar tudo o resto'), body: tr('Atualiza a EPS, o banco, o fundo de pensões, a escola e o trabalho.') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'MX', name: 'México',
    law: tr('Leis de cada estado (não há lei federal)'),
    summary: tr('A mudança faz-se no registo civil do estado onde nasceste. A Cidade do México e a maioria dos estados já têm um procedimento administrativo sem exigências médicas, mas alguns ainda não.'),
    eligibility: [tr('Depende do estado onde o nascimento está registado.'), tr('Na Cidade do México: a partir dos 18 anos, no Registro Civil.')],
    steps: [
      { id: 'mx-state', title: tr('Confirmar a regra do teu estado'), body: tr('Vê se o estado onde nasceste já tem procedimento administrativo. Se não tiver, pode ser preciso um processo judicial (amparo).') },
      { id: 'mx-request', title: tr('Pedir a nova certidão de nascimento'), body: tr('No Registro Civil pedes o reconhecimento da identidade de género. É emitida uma nova certidão e a anterior fica reservada.'), where: tr('Registro Civil do estado'), link: { label: tr('Registro Civil da Cidade do México'), url: 'https://www.registrocivil.cdmx.gob.mx' } },
      { id: 'mx-after', title: tr('Atualizar a CURP, o INE e o resto'), body: tr('Atualiza a CURP, a credencial do INE, o passaporte, o SAT, o IMSS ou ISSSTE, o banco, a escola e o trabalho.') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'CA', name: 'Canada',
    law: tr('Regras de cada província e território, e do governo federal'),
    summary: tr('A certidão de nascimento é da província onde nasceste e a maioria já permite a mudança sem cirurgia. Os documentos federais, como o passaporte, aceitam autodeclaração e o marcador X.'),
    eligibility: [tr('Depende da província ou território. Menores precisam normalmente do consentimento dos pais.')],
    steps: [
      { id: 'ca-birth', title: tr('Mudar a certidão de nascimento'), body: tr('Faz o pedido ao serviço de estatísticas vitais da província onde nasceste. As regras sobre testemunhos e idade variam.') },
      { id: 'ca-federal', title: tr('Atualizar o passaporte e os documentos federais'), body: tr('Pedes a mudança do marcador (F, M ou X) com um formulário de autodeclaração.'), link: { label: tr('Governo do Canadá: mudar o marcador'), url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/change-sex.html' } },
      { id: 'ca-after', title: tr('Atualizar tudo o resto'), body: tr('Atualiza a carta de condução e o cartão de saúde da província, o SIN, o banco, a escola e o trabalho.') },
    ],
    reviewedAt: '2026-11',
  },
  {
    country: 'US', name: 'United States',
    law: tr('Leis de cada estado; política federal restritiva desde 2025'),
    summary: tr('A certidão de nascimento e a carta de condução dependem do estado, e muitos permitem a mudança. Desde 2025 o governo federal só emite passaportes com o sexo atribuído à nascença; o Supremo Tribunal deixou aplicar esta regra enquanto os processos decorrem.'),
    eligibility: [tr('Depende do estado. Alguns estados proíbem mudar a certidão de nascimento.')],
    steps: [
      { id: 'us-court', title: tr('Mudar o nome (tribunal do estado)'), body: tr('Na maioria dos estados a mudança de nome é pedida ao tribunal do condado. Organizações locais costumam ajudar com as custas.') },
      { id: 'us-state', title: tr('Mudar a certidão de nascimento e a carta de condução'), body: tr('Segue as regras do estado onde nasceste (certidão) e do estado onde vives (carta de condução).') },
      { id: 'us-federal', title: tr('Documentos federais'), body: tr('Confirma a situação atual do passaporte e da Social Security antes de fazer pedidos: a política federal mudou em 2025 e há processos em curso.'), link: { label: tr('Departamento de Estado: passaportes'), url: 'https://travel.state.gov' } },
    ],
    reviewedAt: '2026-11',
  },
]
