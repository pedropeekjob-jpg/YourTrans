# Pacotes para entidades e pagamentos

A app é gratuita para pessoas trans e para quem as apoia. Pagam as entidades: empresas,
profissionais de saúde, escolas e autarquias. Preços e regras: documento "Casulo — Pacotes e
preços para entidades" (14/11/2026) e `src/data/plans.ts`.

## O que já está na app

| Onde | O quê |
| --- | --- |
| `#/entidades` | Pacotes e preços (empresas, saúde, escolas e autarquias), formação avulsa e pedido de adesão. Abre sem passar pela apresentação da app. |
| `#/entidades/painel` | Painel da entidade: entra com o código e a chave dados no registo do Selo. Edita a ficha completa, publica ofertas de emprego, vê o relatório anónimo e regista códigos de sessões solidárias. |
| `#/transparencia` | As 7 regras: o selo não se compra, a ordem não depende de pagamento, relatórios só com 5 ou mais, sem dados de utilizadores. |
| `#/servicos` | Serviços especializados (jurídico, voz, psicologia, imagem) de profissionais com perfil pago, e pedido de código de sessão solidária. |
| `#/emprego` | Ofertas de emprego de empresas Aliadas e Parceiras. |
| `#/selo/:id` | Ficha completa com o rótulo "pacote pago", sempre depois das avaliações da comunidade. |
| `/mod` | Pedidos de adesão, atribuir pacote e data de fim, nova chave de acesso, reserva de sessões solidárias e sessões usadas a pagar. |

Na app das lojas (Capacitor), `#/entidades` não mostra preços nem botões de compra: as regras
da Apple e da Google obrigam a vender os pacotes só no site ou por fatura.

## Como se vende um pacote (sem Stripe)

1. A entidade regista-se no Selo (grátis) e guarda o código e a chave que aparecem no fim.
2. Pede o pacote em `#/entidades` → Aderir. O pedido aparece em `/mod` → "Pedidos de adesão a pacotes".
3. Envias a fatura para o e-mail do pedido.
4. Quando estiver paga, em `/mod` → "Pacotes pagos": escolhes a entidade, o pacote e a data de fim
   (normalmente daqui a um ano). Para um município, indica o distrito (igual à lista da app).
5. Apagas o pedido de adesão. Os pedidos também se apagam sozinhos ao fim de 12 meses.

Se a entidade perder a chave: `/mod` → "Nova chave de acesso" e envias-lha por e-mail.
A chave nunca fica guardada no servidor, só o hash.

## Sessões solidárias

- Cada Aliada paga 2 sessões e cada Parceira 10. Quando o pacote é pago, juntas essas sessões
  à reserva em `/mod` → "Sessões solidárias".
- Quem usa a app pede um código em `#/servicos` (no máximo 2 por dia e por ligação). Não se guarda nada sobre quem pede.
- O profissional regista o código no painel no dia da sessão. Em `/mod` vês as sessões usadas
  por profissional e mês, para lhes pagar.

## O que falta fazeres tu

- **E-mail `parcerias@casulo.space`:** criar a regra no Email Routing da Cloudflare (como a de `privacidade@`).
- **Faturação:** é preciso uma entidade que passe faturas (associação, atividade aberta ou sociedade). Confirmar com um contabilista.
- **Pagamento com cartão (opcional):** criar uma conta Stripe, fazer uma Payment Link por pacote
  e dimensão, e pôr em GitHub → Settings → Secrets and variables → Actions → Variables a variável
  `VITE_PAYMENT_LINKS` com este formato:
  `{"aliada-pequena":"https://buy.stripe.com/...","aliada-media":"...","parceira-pequena":"..."}`.
  O botão "Pagar já com cartão" aparece depois do pedido. O pacote continua a ser ativado à mão em `/mod`.

## Decisão: sem comissão de 10% nos serviços

O documento propunha 10% sobre cada sessão paga. Para isso, o Casulo teria de processar os pagamentos
e saberia quem pagou que serviço (por exemplo, terapia de voz), o que vai contra a regra de não
guardar dados de quem usa a app. Por isso a receita vem só do perfil pago do profissional
(12 €/mês ou 120 €/ano). Se quiseres mesmo a comissão, a alternativa é a Stripe Connect, com esse custo de privacidade.
