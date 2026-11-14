# Pagamentos e regras das lojas

A primeira versão nas lojas é **grátis, sem compras dentro da app**. Isto simplifica a revisão e não obriga
a dar 15–30 % à Apple e à Google. Os pacotes pagos que estão a ser criados encaixam assim:

| O que se vende | Quem paga | Onde se paga | Regra |
|---|---|---|---|
| Pacotes para entidades (perfil, rótulo Parceira, emprego, relatórios) | Empresas e associações | No site casulo.space ou por fatura, **fora da app** | Serviços entre empresas, comprados fora da app: permitido. A app nativa não pode ter botão de compra, preços nem ligação para pagar |
| Sessões 1:1 em tempo real com profissionais | Utilizadores | Fora da app (ex.: ligação de pagamento do profissional) | Apple 3.1.3(d) "serviços pessoa a pessoa": permitido sem compra na app. Google: serviços prestados fora da app, permitido |
| Conteúdo ou funções digitais desbloqueados na app (ex.: guia premium, relatórios para a própria pessoa) | Utilizadores | **Tem de ser compra dentro da app** (Apple In-App Purchase, Google Play Billing) | Apple 3.1.1 e política de pagamentos do Google Play |
| Donativos | Utilizadores | Fora da app, sem ligação na app nativa (exceto se o Casulo for associação sem fins lucrativos aprovada pela Apple) | Apple 3.2.1(vi) |

## O que está feito no código

- `isNative()` em `src/lib/native.ts` diz se a app está a correr dentro da app das lojas.
- Pedido ao trabalho de monetização: esconder ecrãs de compra, preços e ligações de pagamento quando `isNative()` for verdadeiro. Na web fica tudo.

## Se um dia houver compras dentro da app

1. Contrato "Paid Apps" no App Store Connect e perfil de pagamentos no Google Play (dados bancários e fiscais).
2. Plugin de compras (por exemplo RevenueCat ou `@capgo/native-purchases`) e produtos criados nas duas lojas.
3. Rever a ficha (o "Grátis" passa a "Grátis com compras na app") e os questionários de privacidade (dados de compras).
4. Na UE, a Apple e a Google permitem pagamentos alternativos com taxas reduzidas (DMA). Vale a pena ver no momento, porque estas regras mudam com frequência.
