# Notas: app de apoio para pessoas trans (MVP)

App web mobile-first (PWA) pensada para Portugal, pronta a ser convertida em app Android/iOS com Capacitor.
No ecrã inicial chama-se apenas **"Notas"** e tem um ícone neutro, de propósito.

## O que tem

| Área | Funcionalidades |
|---|---|
| Documentos | Guia passo a passo da Lei 38/2018 (e Brasil), checklist de 19 entidades a atualizar, cartas de retificação geradas automaticamente (RGPD art. 16.º), carta de pedido de referenciação ao/à médico/a de família |
| Ensaio de nome | Ver e ouvir um nome em situações do dia a dia, com pronomes ela/ele/elu, e guardar favoritos |
| Saúde | Diretório de profissionais avaliado pela comunidade ("trataram-me pelo nome certo?"), percurso do SNS com os 3 centros especializados, rastreios por órgãos (e não pelo sexo registado) |
| Diário | Registos com fotos cifradas (sem EXIF), momentos de euforia, linha do tempo de fotos, lembretes de hormonas/análises com exportação para calendário, registo de efeitos com evolução, preparação de consultas e resumo para o/a médico/a |
| Segurança | Botão de alerta (SMS com localização a contactos de confiança), locais trans safe com informação de WC neutro, vestiário neutro, cabines individuais e duches individuais/comuns, reporte anónimo de incidentes |
| Comunidade | Linhas de apoio e associações (ILGA, Opus Diversidades, rede ex aequo, AMPLOS, Casa Qui, Plano i), agenda de eventos e manifestações com "lembrar-me", mentoria entre pares, regras de comunidade |
| Trabalho | Avaliação de empregadores com critérios concretos e selo "Inclusão Trans", direitos no trabalho |

## Privacidade (o que não pode falhar)

- **Sem conta.** Tudo funciona offline e fica no dispositivo.
- **Cifragem AES-GCM 256** de todos os dados e fotos no IndexedDB. Sem código, a chave é aleatória e não exportável; com código, é derivada por PBKDF2 (310 000 iterações) e nunca é guardada. Bloqueio progressivo após 5 tentativas falhadas.
- **Modo discreto:** nome e ícone neutros, notificações e eventos de calendário com texto neutro, bloqueio automático ao sair.
- **Botão de pânico** ("Sair" no topo de cada ecrã, ou Esc 3 vezes): esquece a chave em memória e mostra uma calculadora que funciona. Para voltar, escreve o código e carrega em "=" (sem código: manter "=" 2 segundos). Alternativa: abrir o site do IPMA.
- **Cópias de segurança** cifradas com palavra-passe; **apagar tudo** num toque.
- O servidor comunitário só recebe o que a pessoa escolhe partilhar, sem conta, sem IP guardado, e publica apenas o que a moderação humana aprova. Estatísticas de incidentes só aparecem com 5 ou mais relatos (k-anonimato).

## Correr localmente

Precisa de Node 22.5 ou mais recente.

```bash
npm install
npm run dev            # app em http://localhost:5173
npm test               # testes da app e do servidor
npm run build          # versão de produção em dist/
```

Servidor comunitário (opcional):

```bash
MOD_TOKEN=um-segredo-longo npm run server     # http://localhost:8787, moderação em /mod
VITE_API_URL=http://localhost:8787 npm run dev
```

Sem `VITE_API_URL` a app funciona toda em modo local e as partilhas com a comunidade ficam desativadas.

## Converter em app móvel (Capacitor)

```bash
npm i @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios        # precisa de macOS com Xcode
npm run cap:sync
npx cap open android
```

Passos seguintes recomendados na versão nativa:
- `@capacitor/local-notifications` para lembretes com a app fechada (hoje funcionam com a app aberta e via calendário).
- `@capacitor/privacy-screen` para esconder o conteúdo no seletor de apps.
- Biometria para desbloquear (`@capgo/capacitor-native-biometric` ou equivalente).

## Estrutura

```
src/
  lib/        cifragem, armazenamento, cofre (contexto React), cartas, calendário, API
  data/       guias, checklist, saúde, rastreios, eventos, associações
  pages/      ecrãs
  components/ navegação, calculadora-disfarce, bloqueio, UI
server/       servidor comunitário sem dependências (node:sqlite) e página de moderação
```

## Antes de lançar

- Validar todo o conteúdo com a ILGA Portugal, Opus Diversidades e pessoas trans (valores, prazos e contactos estão marcados para confirmar).
- Formar a equipa de moderação e definir quem acede à fila e aos contactos da mentoria.
- Avaliação de impacto sobre a proteção de dados (AIPD), obrigatória para dados de categorias especiais.
