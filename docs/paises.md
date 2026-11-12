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

Quando uma parte não está coberta, a app mostra o conteúdo de Portugal com um aviso
(`<CountryNotice part="…" />`) a dizer que ainda não está verificado para esse país.

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

## Estado

| País | Guia legal | Contactos | Saúde, direitos, cartas | Revisto por associação |
| --- | --- | --- | --- | --- |
| Portugal | sim | sim | sim | não |
| Brasil | sim | sim | não | não |
| Espanha | sim | sim | não | não |
| França | sim | sim | não | não |

## Por fazer

- Rever Brasil, Espanha e França com associações parceiras e preencher `reviewedBy`.
- Percurso de saúde, direitos e cartas por país (hoje só existem para Portugal).
- Brasil: acrescentar o SUS (Processo Transexualizador).
- Países seguintes sugeridos: Reino Unido e Irlanda (já há inglês), Bélgica e Suíça
  (francês), e uma classificação de risco para os países onde a app pode ser usada
  em segredo.
