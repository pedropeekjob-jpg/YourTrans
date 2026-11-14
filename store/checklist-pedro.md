# O que só o Pedro pode fazer

Tudo o resto está pronto no código e nos textos. Por ordem:

## 1. Contas de developer (esta semana)

- [ ] **Apple Developer Program** (developer.apple.com/programs › Enroll), 99 USD por ano.
  - Conta individual: chega um Apple ID com autenticação de dois fatores e o cartão. Fica pronta em 1–2 dias.
  - ⚠️ Na loja, o vendedor aparece com o **nome legal** ("Pedro Oliveira"). Para aparecer "Casulo", é preciso uma organização (associação ou empresa) com número **D-U-N-S** (grátis, 1–2 semanas).
  - ⚠️ A Apple pode pedir que apps de saúde sejam publicadas por uma entidade (diretriz 5.1.1(ix)). O Casulo é informação e diário, não presta cuidados de saúde, por isso deve passar como individual; se a Apple pedir, a solução é a organização.
- [ ] **Google Play Console** (play.google.com/console), 25 USD uma vez.
  - Conta pessoal: verificação de identidade com documento e confirmação num telemóvel Android.
  - ⚠️ Contas pessoais novas têm de fazer um **teste fechado com pelo menos 12 pessoas durante 14 dias seguidos** antes de poderem publicar. A beta fechada (8 dez – 31 jan) serve para isto.
- [ ] **Lei dos Serviços Digitais (UE):** as duas lojas perguntam se és "comerciante" (trader). Se o Casulo vender pacotes, és, e a loja **mostra publicamente morada, telefone e e-mail** na UE. Usa uma morada profissional ou apartado e um telefone que não seja o pessoal. Enquanto a app não vender nada, podes declarar "não comerciante".

## 2. Na Cloudflare e no Render (5 minutos)

- [ ] Render › casulo-comunidade › Environment › `ALLOWED_ORIGIN`: acrescentar `,https://localhost,capacitor://localhost` (a app nativa precisa disto para falar com a comunidade). O `render.yaml` já tem o valor novo.
- [ ] (Opcional) Criar `suporte@casulo.space` no Email Routing. Por agora as páginas usam `privacidade@casulo.space`.

## 3. Compromisso de moderação

- [ ] Os termos e as notas para a revisão prometem **rever denúncias em 24 horas**. É o que a Apple exige. Combinem entre os dois quem vê o /mod todos os dias, incluindo fins de semana.

## 4. Primeira compilação (no Mac)

- [ ] Instalar o **Xcode** (App Store do Mac) e o **Android Studio**.
- [ ] Na pasta do projeto: `git pull`, `npm ci`.
- [ ] Android: criar a chave de upload (`store/README.md`, "Android") e **guardá-la no gestor de palavras-passe**. Sem ela não há atualizações.
- [ ] iOS: no Xcode, escolher a equipa (Team) em Signing & Capabilities.
- [ ] Experimentar num telemóvel: o APK de teste do GitHub (Android) ou Xcode › Run (iPhone).

## 5. Criar as apps nas lojas

App Store Connect › Apps › + Nova app:
- [ ] Plataforma iOS, nome **"Casulo: apoio trans"** (ou "Casulo"), idioma principal Português (Portugal), Bundle ID **space.casulo.app**, SKU `casulo`.
- [ ] Acrescentar a localização English (U.S. ou U.K.).
- [ ] Colar os textos de `store/ficha-loja.md` e as capturas `app-trans/lojas/capturas/<pt|en>/iphone-*.png` (pasta partilhada).
- [ ] App Privacy, Age Rating, App Review Information: respostas em `store/questionarios.md`.
- [ ] Preço: Grátis. Disponibilidade: todos os países (ou começar por Portugal e Brasil).

Play Console › Criar app:
- [ ] Nome "Casulo: apoio trans", idioma Português (Portugal), App, Grátis.
- [ ] Ficha principal: textos de `store/ficha-loja.md`, ícone e destaque de `store/graficos/`, capturas `app-trans/lojas/capturas/<pt|en>/android-*.png`. Acrescentar tradução em inglês.
- [ ] Conteúdo da app: privacidade, anúncios, público-alvo, apps de saúde, segurança dos dados, classificação (respostas em `store/questionarios.md`).

## 6. Beta e envio

- [ ] **TestFlight** (iPhone) e **Teste fechado** (Android) para a beta de 8 de dezembro, com as associações. Testers externos do TestFlight passam por uma revisão rápida da Apple.
- [ ] Depois de 14 dias de teste fechado com 12+ pessoas, pedir acesso à produção no Google Play.
- [ ] Enviar para revisão da App Store. Se a Apple recusar, mandem-me a mensagem: costumam ser ajustes de texto.
- [ ] Lançamento público a 31 de março de 2027, como planeado: nas lojas, escolher "publicar manualmente" depois de aprovada.

## Custos

| | Valor |
|---|---|
| Apple Developer Program | 99 USD/ano |
| Google Play | 25 USD, uma vez |
| Mac com Xcode | já tens |
| Tudo o resto (Capacitor, ícones, compilação no GitHub) | 0 € |
