import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screen } from './moderation.mjs'

const story = body => ({ kind: 'testemunho', topic: 'hormonas-t', phase: 'meses', title: 'Seis meses', body })

// Textos normais que têm de ser publicados sem passar por ninguém.
const limpos = [
  ['story', story('Seis meses de testosterona. A voz começou a mudar ao fim de dez semanas e a minha mãe finalmente usa o meu nome. Ainda choro às vezes, mas de alegria.')],
  ['story', story('A consulta no SNS demorou 8 meses. A endocrinologista foi impecável e explicou tudo sobre as análises de 3 em 3 meses.')],
  ['story', story('Na rua ainda olham, mas já não me importo tanto. O mais difícil foi a disforia nos primeiros dias depois da cirurgia.')],
  ['story', story('Fiz a mastectomia em Lisboa e a recuperação foi mais fácil do que esperava. Dormir de costas custou nas duas primeiras semanas.')],
  ['story', story('Comecei pelo médico de família, que me encaminhou para a consulta de sexologia. Levou tempo mas valeu a pena.')],
  ['story', story('Six months on estrogen and I finally recognise myself in the mirror. My skin is softer and I feel calmer.')],
  ['story', story('Después de la operación me sentí muy cansada, pero mi pareja me cuidó mucho. Ahora estoy feliz.')],
  ['story', story("Après six mois d'hormones, je me sens enfin moi-même. Ma famille commence à comprendre.")],
  ['story', story('Eu sou travesti e tenho orgulho. A minha transição começou aos 30 e hoje vivo bem com quem sou.')],
  ['reply', { storyId: 'x', body: 'Obrigade por partilhares, deu-me muita força!' }],
  ['reply', { storyId: 'x', body: 'Também senti isso. Força, não estás sozinhe 💜' }],
  ['review', { providerId: 'p', answers: {}, comment: 'Trataram-me sempre pelo nome certo e com respeito.' }],
  ['place', { name: 'Café da Esquina', kind: 'Café/Restaurante', district: 'Porto', notes: 'Rua de Cedofeita 120, WC individual e equipa simpática.' }],
  ['event', { title: 'Grupo de partilha trans', date: '2026-12-01', place: 'Lisboa', url: 'https://ilga-portugal.pt/eventos' }],
  ['provider', { name: 'Dra. X', kind: 'Psicologia', district: 'Porto', sector: 'SNS' }],
  ['employer', { company: 'Empresa Exemplo', answers: {}, comment: 'Mudaram o meu nome no e-mail no próprio dia. Tive uma promoção este ano.' }],
]

const suspeitos = [
  ['story', story('Vocês são todos uns travecos nojentos, deviam ter vergonha.'), 'ódio ou insulto'],
  ['reply', { storyId: 'x', body: 't r a v e c o' }, 'ódio ou insulto'],
  ['reply', { storyId: 'x', body: 'Nunca serás mulher, és só um homem de vestido.' }, 'ódio ou insulto'],
  ['reply', { storyId: 'x', body: 'You will never be a woman' }, 'ódio ou insulto'],
  ['reply', { storyId: 'x', body: 'sei onde moras, vais pagar' }, 'ameaça'],
  ['reply', { storyId: 'x', body: 'just kys' }, 'ameaça'],
  ['story', story('Não aguento mais, quero morrer e não sei o que fazer com a minha vida.'), 'risco de autolesão'],
  ['story', story('Vendo testosterona sem receita, entrega em todo o país.'), 'venda ou doses de medicamentos'],
  ['reply', { storyId: 'x', body: 'Fala comigo para o 912 345 678' }, 'telefone'],
  ['reply', { storyId: 'x', body: 'manda e-mail para ana@exemplo.pt' }, 'e-mail'],
  ['reply', { storyId: 'x', body: 'segue-me no @casulo_fake' }, 'redes sociais ou contacto'],
  ['story', story('O meu colega mora na Rua das Flores 23 e contou a toda a gente que eu sou trans.'), 'morada'],
  ['reply', { storyId: 'x', body: 'Ganha dinheiro rápido com bitcoin, clica aqui' }, 'publicidade ou spam'],
  ['reply', { storyId: 'x', body: 'vejam isto www.site-estranho.xyz' }, 'ligação'],
  ['event', { title: 'Festa', date: '2026-12-01', url: 'https://bit.ly/abc' }, 'ligação suspeita'],
  ['reply', { storyId: 'x', body: 'ODEIO ESTA APP E TODA A GENTE QUE A USA AQUI' }, 'tudo em maiúsculas'],
]

test('textos normais passam sem sinais', () => {
  for (const [type, p] of limpos) assert.deepEqual(screen(type, p), [], JSON.stringify(p))
})

test('conteúdo suspeito é apanhado com o sinal certo', () => {
  for (const [type, p, flag] of suspeitos) assert.ok(screen(type, p).includes(flag), `${flag}: ${JSON.stringify(p)} → ${screen(type, p)}`)
})
