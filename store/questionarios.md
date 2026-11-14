# Respostas aos questionários das lojas

Respostas preparadas a partir do código (o que a app faz de facto). Se uma função mudar, rever esta página.
Base: o Casulo não tem conta, não tem anúncios, não tem estatísticas nem SDKs de terceiros. O que se escreve
para si fica cifrado no aparelho e **não conta como recolha** (nunca sai do telemóvel). Só conta o que a pessoa
envia à comunidade.

## O que sai do aparelho (resumo para os dois questionários)

| Dado | Quando | Ligado à identidade? | Para quê | Opcional? |
|---|---|---|---|---|
| Texto e respostas de formulário publicados (testemunhos, respostas, avaliações de profissionais, empregadores, locais e etapas de saúde, eventos, relatos de custos e esperas, relatos de discriminação) | Só quando a pessoa publica | Não (sem nome, sem conta, sem IP guardado) | Função da app (mostrar à comunidade, estatísticas agregadas) | Sim |
| O mesmo texto pode revelar **saúde** e **identidade de género** | Idem | Não | Idem | Sim |
| "Assinatura" aleatória do aparelho, enviada com as publicações (PR #21) | Ao publicar | Não (aleatória, trocável em Definições) | Bloquear, moderar, travar abusos | Sim (só existe se publicar) |
| E-mail de contacto | Só no pedido de mentoria e no registo de uma entidade para o Selo | Sim (é um contacto) | Função da app (a moderação faz a ligação) | Sim |
| Sugestões "Procurei e não encontrei" (texto, zona da app, país) | Quando a pessoa envia | Não | Melhorar a app | Sim |

Não se recolhe: localização da pessoa (o SOS envia-a por SMS aos contactos dela, sem passar por nós; a localização de um local seguro é a do local), fotos, contactos, diário, lembretes, identificadores de publicidade, dados de utilização, diagnósticos ou registos de falhas.
O endereço IP é usado só em memória, como impressão irreversível, até 24 horas, para limitar abusos (tratamento efémero, não declarado como recolha).

---

## Apple: App Privacy (App Store Connect › App Privacy)

"Recolhem dados desta app?" → **Sim**. Rastreio (tracking) → **Não** em todos.

| Tipo de dado (Apple) | Recolhido | Ligado à pessoa | Rastreio | Finalidade |
|---|---|---|---|---|
| Contact Info › Email Address | Sim | **Sim** | Não | App Functionality |
| Health & Fitness › Health | Sim | Não | Não | App Functionality |
| Sensitive Info | Sim | Não | Não | App Functionality |
| User Content › Other User Content | Sim | Não | Não | App Functionality |
| Identifiers › User ID | Sim | Não | Não | App Functionality, Other Purposes (moderação e segurança) |

Tudo o resto: **Não recolhido**. O ficheiro `ios/App/App/PrivacyInfo.xcprivacy` declara o mesmo.

Encriptação (Export Compliance): o `Info.plist` já tem `ITSAppUsesNonExemptEncryption = NO`. A app só usa a cifra padrão do sistema (Web Crypto/HTTPS), que está isenta. Se o App Store Connect perguntar: "Uses encryption: Yes / Exempt: Yes (standard encryption only)".

## Apple: classificação etária (Age Ratings, questionário de 2025)

| Pergunta | Resposta |
|---|---|
| Violência (cartoon, realista, prolongada) | Nenhuma |
| Conteúdo sexual, nudez | Nenhum |
| Linguagem obscena | Nenhuma |
| Temas maduros ou sugestivos | Infrequente/ligeiro (identidade de género, discriminação, saúde mental) |
| Terror, medo | Nenhum |
| Álcool, tabaco, drogas | Nenhum |
| Simulação de jogo, concursos, apostas | Nenhum |
| **Informação médica ou de tratamento** | **Frequente** (hormonas, cirurgias, percurso de saúde) |
| Conteúdo de saúde ou bem-estar | Sim |
| **Conteúdo gerado por utilizadores** | **Sim** |
| Mensagens e chat entre utilizadores | Não (só publicações moderadas, sem mensagens privadas) |
| Publicidade | Não |
| Controlos parentais / verificação de idade | Não |
| Acesso sem restrições à web | Não |

Resultado esperado: 13+ ou 16+, conforme o cálculo da Apple. Aceitar o que o questionário der.

## Apple: informação para a revisão (App Review Information)

- Conta de demonstração: **não é precisa** (a app não tem conta). Desligar "Sign-in required".
- Contacto: Pedro Oliveira, privacidade@casulo.space, telefone do Pedro.
- Notas (colar em inglês):

> Casulo is a support app for trans and non-binary people, built in Portugal. There is no account: tap "I'm a trans person" (or "I support someone trans"), then follow the short setup.
>
> Native features: local notifications for medication/test reminders (scheduled on device, no server), alternate app icon chosen by the user in Settings (UIApplication.setAlternateIconName, the system alert is shown), privacy screen in the app switcher, share sheet for exported letters, backups and calendar files, camera to scan a QR code when moving data between devices, location only when the user presses SOS (it opens the Messages composer with the location; nothing is sent automatically) or to show nearby safe places. All personal data is encrypted on device with AES-256; we have no server copy.
>
> User-generated content (guideline 1.2): before the first post, users must accept the terms (https://casulo.space/termos/) with zero tolerance for objectionable content. Every post goes through an automatic filter and doubtful content is held for human moderation. Every story, reply and comment has "Report" and "Block". Reports are reviewed within 24 hours and the content and its author are removed. Contact: privacidade@casulo.space.
>
> Optional "private mode" (Settings, off by default): a quick-exit button that locks the app and opens a weather website in Safari. It is a standard safety feature for people at risk at home, documented in the app and on the support page; nothing is hidden from the user or from review.
>
> Medical information (guideline 1.4.1): the app gives general, dated information with sources (Portuguese health service, legislation) and always tells users to decide with health professionals. It does not diagnose, prescribe or calculate doses.
>
> To test the community, go to Community › Stories, open any story and use Report or Block, or tap "Share" to post (posts appear after the filter or moderation).

## Google Play: Segurança dos dados (Data safety)

- Recolhe ou partilha dados? → **Sim, recolhe**. Partilha com terceiros → **Não**.
- Todos os dados são cifrados em trânsito → **Sim** (HTTPS).
- Pode pedir a eliminação dos dados → **Sim** (e-mail; os dados do aparelho apagam-se em Definições › Apagar tudo).
- Conta: a app não tem contas → "A app não permite criar contas".

| Categoria (Google) | Tipo | Recolhido | Partilhado | Efémero | Obrigatório/opcional | Finalidade |
|---|---|---|---|---|---|---|
| Informações pessoais | Endereço de email | Sim | Não | Não | Opcional | Funcionalidade da app |
| Informações pessoais | Outras informações (identidade de género, se a pessoa a mencionar) | Sim | Não | Não | Opcional | Funcionalidade da app |
| Saúde e fitness | Informações de saúde | Sim | Não | Não | Opcional | Funcionalidade da app |
| Atividade na app | Outro conteúdo gerado pelo utilizador | Sim | Não | Não | Opcional | Funcionalidade da app |
| IDs do dispositivo ou outros | Outros IDs (assinatura aleatória) | Sim | Não | Não | Opcional | Funcionalidade da app, Prevenção de fraudes, segurança e conformidade |

Não marcar: localização, fotos, contactos, mensagens, ficheiros, calendário, registos de falhas, diagnósticos, identificadores de publicidade.

## Google Play: outras declarações (Conteúdo da app)

| Secção | Resposta |
|---|---|
| Política de privacidade | https://casulo.space/privacidade/ |
| Anúncios | Não contém anúncios |
| Acesso à app | Todas as funcionalidades sem restrições (sem login) |
| Público-alvo | 13–15, 16–17 e 18+ (não escolher menores de 13). A app não é dirigida a crianças |
| Apps de notícias | Não |
| Apps governamentais | Não |
| Funcionalidades financeiras | Nenhuma |
| **Apps de saúde** | Sim: "Gestão de medicação e tratamentos" (lembretes), "Informação e educação médica", "Saúde mental e bem-estar". Não é dispositivo médico |
| Identificação de rastreio de contactos/estado de COVID | Não |
| Permissão de alarmes exatos | Não usa (removida no manifesto) |
| Localização em segundo plano | Não usa |
| Serviço em primeiro plano | Não usa |

## Google Play: classificação de conteúdo (IARC)

Categoria: **Todas as outras categorias de apps** (não é jogo).

| Pergunta | Resposta |
|---|---|
| Violência, sangue, medo | Não |
| Sexualidade, nudez | Não |
| Linguagem | Não |
| Substâncias controladas | Não promove. Há informação médica educativa sobre hormonas prescritas (responder "Não" à promoção/uso; se perguntar por referências, "Sim, educativas") |
| Jogo/apostas | Não |
| **Os utilizadores podem interagir ou trocar conteúdo** | **Sim** (publicações moderadas; há denúncia e bloqueio) |
| **Partilha a localização física da pessoa com outras pessoas** | **Sim** (o SOS envia a localização por SMS a contactos escolhidos) |
| Permite compras digitais | Não |
| Conteúdo de ódio, discriminação | Não (é proibido e moderado) |

Resultado esperado: PEGI 12 / ESRB Teen, com os avisos "Interação de utilizadores" e "Partilha localização".

## Google Play: acesso para revisão (App access)

"Todas as funcionalidades estão disponíveis sem acesso especial." Nas notas, colar o mesmo texto da revisão da Apple.
