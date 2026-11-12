# Casulo por país

A língua e o país são coisas separadas. A língua (`src/i18n`) muda os textos. O país
(`src/data/countries.ts`) muda o conteúdo: leis, percurso de saúde, contactos de apoio,
número de emergência e o que a app mostra por razões de segurança.

A pessoa escolhe o país em **Eu › País** (ou em Definições). Por omissão a app sugere
um país a partir da língua (PT-BR sugere Brasil, as outras sugerem Portugal). Nunca usa
localização nem rede para isso, e a escolha fica só no cofre cifrado do aparelho.
Todos os pacotes vão dentro da app, por isso o servidor nunca sabe o país de ninguém.

## O que tem um pacote

| Campo | Para quê |
| --- | --- |
| `code`, `name`, `flag` | Identificação |
| `lang` | Língua sugerida para este país |
| `emergency` | Número do botão SOS |
| `healthSystem` | Nome do sistema público de saúde, usado nos avisos |
| `risk` | `protegido`, `atencao` ou `hostil` (ver abaixo) |
| `coverage` | Que partes têm conteúdo verificado para o país |
| `guide` | Passo a passo da mudança de nome e género (`src/data/guides.ts`) |
| `support` | Associações, linhas e emergência (`src/data/support.ts`) |
| `reviewedAt`, `reviewedBy` | Data da última revisão e associação parceira que reviu |

Quando uma parte não está coberta, a app diz que ainda não tem essa informação para o
país (`<NoCountryInfo>`), mostra a emergência, os contactos de apoio e ligações globais, e
só mostra o conteúdo de Portugal se a pessoa tocar em "Ver como funciona em Portugal".

A língua segue o país escolhido (inglês quando a app não tem a língua do país), a não
ser que a pessoa tenha escolhido uma língua à mão. O conteúdo de cada país está
traduzido pelo menos para a língua desse país.

## Nível de risco

- **protegido**: há reconhecimento legal do género e proteção contra discriminação.
- **atencao**: há reconhecimento legal, mas muita violência ou leis instáveis.
- **hostil**: ser trans, ou a "propaganda LGBT", é crime ou está a ser perseguido.
  Nestes países a comunidade, as partilhas, a agenda, os locais e a mentoria ficam
  desligados (`communityAllowed`). Fica o apoio, o modo privado e o SOS.

## Para acrescentar um país

1. Ter uma associação local que aceite rever o conteúdo. Sem revisão, o país não entra.
2. Juntar o código a `CountryCode` e um pacote a `countries`.
3. Contactos em `support.ts`: só números públicos e gratuitos, com a emergência incluída.
4. Guia legal em `guides.ts`, com a lei, quem pode pedir, passos, custos e fontes oficiais.
5. Marcar em `coverage` só o que foi verificado.
6. Acrescentar as traduções novas aos quatro ficheiros de `src/i18n`.
7. `npm test` verifica códigos únicos, emergência nos contactos e coerência do guia.

Fontes de partida (não substituem a revisão local): Trans Rights Map da TGEU,
base de dados da ILGA World, e as fontes oficiais de cada país.

## Estado (novembro de 2026)

Nenhum pacote foi ainda revisto por uma associação local.

| Países | O que têm |
| --- | --- |
| Portugal | Tudo: guia, cartas, saúde (SNS, listas de espera, comparador), direitos e contactos |
| Brasil, Espanha, França, Alemanha, Argentina, Uruguai, Chile, Colômbia, México, Canadá, EUA | Guia legal, sistema de saúde, direitos e queixas, entidades a atualizar, emergência e linhas de crise (`src/data/countryInfo.ts`) |
| Restantes países das Américas | Só número de emergência e nível de risco |

Hostis (relações entre pessoas do mesmo sexo ainda são crime, confirmado em
novembro de 2026): Jamaica, Guiana, Granada, São Vicente e Granadinas. Trindade e
Tobago passou a "atenção" depois da decisão do Privy Council de 10 de novembro de 2026.
Esta lista tem de ser revista pelo menos de seis em seis meses.

## Por fazer

- Rever Brasil, Espanha e França com associações parceiras e preencher `reviewedBy`.
- Percurso de saúde, direitos e cartas por país (hoje só existem para Portugal).
- Brasil: acrescentar o SUS (Processo Transexualizador).
- Contactos locais (associações) para os países das Américas que só têm emergência.
- Países seguintes sugeridos: Reino Unido e Irlanda, Bélgica e Suíça.
