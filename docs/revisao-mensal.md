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

Fontes de partida: Trans Rights Map da TGEU, base de dados da ILGA World, sites
oficiais de cada país e notícias dos últimos 45 dias.

## Regras

- Na dúvida, trata como mudança e abre PR. Nunca inventes valores; se não
  conseguires confirmar, deixa como está e assinala no PR.
- Um só commit para as datas e, no máximo, um PR por mês. Não fazer polling nem
  repetir execuções (a conta do GitHub já foi bloqueada uma vez por excesso de pedidos).
- Corre `npm test` e `npx tsc -b` antes de enviar.
- Texto novo em português de Portugal, dentro de `tr()`, com traduções nos quatro
  ficheiros de `src/i18n`.
- O resumo do PR diz, por país, o que mudou, a fonte e a data da fonte.
