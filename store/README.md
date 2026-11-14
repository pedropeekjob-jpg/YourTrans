# Casulo nas lojas (App Store e Google Play)

As apps nativas são o mesmo código da PWA (React) dentro de um invólucro **Capacitor 8**.
A PWA em casulo.space continua igual: as lojas são mais uma forma de instalar.

| Pasta / ficheiro | O que é |
|---|---|
| `capacitor.config.json` | Identificador **space.casulo.app**, nome Casulo, arranque e notificações |
| `android/` | Projeto Android Studio (alvo Android 16, API 36; mínimo Android 7) |
| `ios/` | Projeto Xcode (iPhone, iOS 15+; Swift Package Manager, sem CocoaPods) |
| `src/lib/native.ts`, `src/components/Native.tsx` | Ponte nativa: ficheiros, partilha, lembretes locais, ícone discreto, ecrã de privacidade, botão voltar |
| `src/lib/terms.ts`, `src/components/TermsSheet.tsx` | Aceitar as regras da comunidade antes de publicar (exigido pelas lojas) |
| `scripts/icones-nativos.mjs` | Gera ícones, ecrã de arranque e gráficos do Google Play (`npm run icones`) |
| `scripts/paginas-legais.mjs` | Gera casulo.space/privacidade/, /termos/ e /suporte/ em cada build |
| `scripts/capturas-lojas.mjs` | Gera as capturas de ecrã PT/EN (`npm run capturas`) |
| `store/ficha-loja.md` | Textos das fichas PT e EN |
| `store/questionarios.md` | Privacidade (Apple e Google), classificação etária, declarações, notas para a revisão |
| `store/pagamentos.md` | O que se pode vender e onde |
| `store/checklist-pedro.md` | O que só o Pedro pode fazer |
| `.github/workflows/apps-nativas.yml` | Verifica que as duas apps compilam e deixa um APK de teste |

## Decisões tomadas

- **Identificador `space.casulo.app`**, igual nas duas lojas. Depois da primeira publicação não pode mudar.
- **Sem contas, sem SDKs de terceiros, sem push.** Os lembretes são notificações locais agendadas no telemóvel (até 60 à frente, reagendadas sempre que a app abre).
- **Ecrã de arranque sem logótipo**, só a cor de fundo, para não revelar o Casulo a quem usa o ícone discreto.
- **Modo discreto:** no Android o nome e o ícone passam a "Notas" (dois `activity-alias`, plugin `DiscreetIconPlugin.java`). No iPhone a Apple só deixa trocar o ícone; o nome continua "Casulo" (plugin em `AppDelegate.swift`). É sempre a pessoa que escolhe, em Definições, e está explicado na revisão, para não parecer "função escondida".
- **Ecrã de privacidade** ligado por omissão: desfoca a app no seletor (iOS) e bloqueia capturas (Android). Desliga-se em Definições.
- **Sem cópias para a nuvem do Google** (`allowBackup=false`): o cofre muda de telemóvel por QR ou cópia cifrada.
- **Sem alarmes exatos** no Android (a política do Google Play limita-os); os lembretes chegam à hora com uns minutos de margem.
- **Só iPhone** na App Store (o iPad abre a versão de iPhone). Evita capturas de iPad e revisão de layout de tablet.
- **CORS:** o servidor aceita `https://localhost` (Android) e `capacitor://localhost` (iOS) (`render.yaml`, e a versão Workers do PR #21).
- As ligações partilhadas (cartões, convite) usam sempre https://casulo.space, mesmo dentro da app.

## Compilar

Precisa de Node 22.5+, e:
- Android: Android Studio (traz o SDK e o Java).
- iOS: um Mac com Xcode 16 ou mais recente.

```bash
npm ci
npm run cap:android     # compila a web, copia para android/ e abre o Android Studio
npm run cap:ios         # idem para o Xcode
```

### Android: gerar o pacote para o Google Play

1. Uma vez: criar a chave de upload e o `android/keystore.properties` (modelo em `android/keystore.properties.exemplo`). **Guardar a chave e as palavras-passe num gestor de palavras-passe.**
2. Subir `versionCode` (e `versionName`) em `android/app/build.gradle`.
3. `npm run android:aab` → `android/app/build/outputs/bundle/release/app-release.aab`.
4. Carregar o .aab na Play Console (Teste fechado primeiro, ver checklist). Aceitar a "Assinatura de apps do Google Play".

### iOS: enviar para a App Store

1. `npm run cap:ios`.
2. No Xcode: projeto App › Signing & Capabilities › Team = a conta de developer. O Xcode cria os certificados sozinho.
3. Subir a versão em General › Identity (Version 1.0.0, Build 1, 2, 3…).
4. Escolher "Any iOS Device (arm64)", depois Product › Archive › Distribute App › App Store Connect › Upload.
5. No App Store Connect a versão aparece em TestFlight em ~15 minutos.

## Atualizações

A app nativa leva a web **dentro** dela. Uma mudança no main publica o casulo.space automaticamente,
mas as apps das lojas só mudam quando se envia uma versão nova (passos acima). Juntar várias mudanças
por versão; a revisão da Apple costuma levar 1–2 dias.

## Testar sem lojas

- Android: o workflow "Apps nativas" deixa um APK de teste em Actions › execução › Artifacts. Instalar no telemóvel (permitir "fontes desconhecidas").
- iOS: Xcode › escolher o iPhone ligado por cabo › Run (precisa só de uma conta Apple gratuita durante 7 dias).

## Ícones e capturas

- `npm run icones` refaz ícones e gráficos a partir de `resources/icone-casulo.svg` e `public/icon.svg`.
- `npx vite --port 5173` e, noutro terminal, `npm run capturas` refaz as 28 capturas.
