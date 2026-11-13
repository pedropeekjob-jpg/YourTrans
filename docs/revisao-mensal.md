# Revisão mensal das leis por país (feita por IA)

Uma tarefa agendada abre, uma vez por mês, uma sessão do Claude neste repositório.
Regra decidida pelo Pedro a 12 de novembro de 2026:

- **Nada mudou** num país → a IA renova só a data `reviewedAt` desse pacote e
  junta diretamente ao `main`.
- **Alguma coisa mudou** (lei, procedimento, custos, idades, contactos, números de
  emergência, nível de risco) → a IA abre **um único PR** com as alterações e as
  fontes, e só entra na app depois de o Pedro juntar.

## O que verificar em cada país

Para cada pacote em `src/data/countries.ts` (guias em `guides.ts` e `guidesWorld.ts`,
contactos em `support.ts` e `supportWorld.ts`):

1. Lei de reconhecimento de género: houve lei nova, revogação, decisão de tribunal
   ou mudança de idades, custos ou passos?
2. Números de emergência e linhas de apoio: continuam ativos e com o mesmo número?
3. Nível de risco: houve criminalização, descriminalização ou leis de "propaganda"?
   Um país passa a `hostil` se ser LGBT ou trans passar a ser crime.
4. Ligações oficiais: continuam a abrir?

## Fontes

1. **Primeira fonte: ILGA World** (pedido do Pedro, 13 nov 2026).
   - Página de cada país na base de dados: `ilgaCountryUrl(código)` em
     `src/data/ilga.ts` (database.ilga.org/<país>-lgbti). Ver as secções de
     reconhecimento legal de género, criminalização, expressão de género,
     proteção contra discriminação e terapias de conversão, e as últimas atualizações.
   - Visão global: database.ilga.org/legal-gender-recognition e
     database.ilga.org/latest-updates.
   - Mapas da ILGA World: ilga.org/ilga-world-maps (podem ser reproduzidos sem
     alterações, citando a ILGA World).
   - O site da base de dados é uma aplicação JavaScript: abre-o com o Playwright
     (já instalado) para ler o texto. Usa só as páginas públicas, sem a API interna.
2. Trans Rights Map da TGEU, sites oficiais de cada país e notícias dos últimos 45 dias,
   para confirmar e para o que a ILGA ainda não tenha.

Quando a ILGA e a app não coincidem, trata como mudança: abre PR com as duas versões e
as fontes. Se a ILGA não estiver acessível (rede), diz isso no resumo e usa as outras fontes.
A app nunca pede dados à ILGA: só mostra ligações, para que ninguém saiba o país de quem a usa.

## Regras

- Na dúvida, trata como mudança e abre PR. Nunca inventes valores; se não
  conseguires confirmar, deixa como está e assinala no PR.
- Um só commit para as datas e, no máximo, um PR por mês. Não fazer polling nem
  repetir execuções (a conta do GitHub já foi bloqueada uma vez por excesso de pedidos).
- Corre `npm test` e `npx tsc -b` antes de enviar.
- Texto novo em português de Portugal, dentro de `tr()`, com traduções nos cinco
  ficheiros de `src/i18n` (en, es, fr, br, de).
- O resumo do PR diz, por país, o que mudou, a fonte e a data da fonte.
