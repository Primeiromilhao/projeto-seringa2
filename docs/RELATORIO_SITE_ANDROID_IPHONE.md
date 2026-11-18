# Relatório — Seringa: site + Android + iPhone

**Data:** 18/11/2026 · **Repositório:** `Primeiromilhao/projeto-seringa2` · **Branch:** `main` · **Fonte única:** `site/app/`
Esta entrega foi feita junto com a reconstrução visual pedida a seguir: a app empacotada já é a nova interface. Detalhes da reconstrução em `docs/RELATORIO_RECONSTRUCAO_SERINGA.md`.

## Três formas de uso, uma só lógica

| Forma | Como | Lógica |
|---|---|---|
| **Site / navegador** | `https://primeiromilhao.github.io/projeto-seringa2/` → «Usar no navegador» abre `app/` (PWA, funciona offline depois da primeira visita) | `site/app/` |
| **Android** | «Baixar para Android» descarrega o **arquivo real** `downloads/Seringa.apk`; instala como app própria | `site/app/` copiada para os assets do APK em cada compilação; não há segunda lógica |
| **iPhone** | «Instalar no iPhone» explica: Safari → Compartilhar → Adicionar à Tela de Início; abre em tela cheia como app | `site/app/` (PWA) |

**Sem sincronização automática:** cada forma de uso guarda os seus dados no próprio aparelho (IndexedDB criptografado). Para passar de uma para outra: Exportar dados → Restaurar uma cópia. Está dito no site e na app.

## Android — solução escolhida

- **App nativa com WebView e a app embutida** (assets servidos em `https://appassets.androidplatform.net/`, origem segura e local). **Não abre o Chrome. Não é uma PWA renomeada.**
- **TWA/Bubblewrap descartada:** exige `assetlinks.json` na raiz do domínio, impossível num site de projeto do GitHub Pages; sem isso a TWA mostraria a barra do Chrome e dependeria da internet na primeira abertura.
- **Offline:** total desde a instalação, porque todos os ficheiros estão no APK. O service worker não é usado no Android.
- **Integrações nativas:** notificação na data e hora da próxima aplicação (só com os dados da pessoa), evento no calendário, PDF pelo serviço de impressão, exportar para Downloads/Seringa, restaurar por seletor de ficheiros, botão voltar e modo escuro.
- **Sem permissão INTERNET**; `allowBackup=false`.
- Compilação sem Gradle (JDK 17 + Android SDK 35): `python android/construir.py`. A chave de assinatura fica fora do repositório (`Executor\runtime\seringa_android_chave\`).

## iPhone — solução escolhida

PWA instalável pelo Safari, preparada com manifest (`standalone`, ícones `any`/`maskable`/`apple-touch-icon`), metas `apple-mobile-web-app-*`, `viewport-fit=cover`, service worker offline e um cartão de instalação dentro da app. **Não foi criado `.ipa`** (exigiria conta Apple Developer paga e distribuição pela App Store ou TestFlight) e **não se distribui APK para iPhone**.

## Testes

- **Site + app + APK + WebKit:** `node site/testes/executar.js` — Resultado: 31/31 PASS. O teste 27 verifica no site: página, 3 botões, **APK descarregado com nome `Seringa.apk`**, extensão `.apk`, assinatura ZIP `PK`, **não é HTML**, **não é redirect**, tamanho plausível e **SHA-256 igual ao publicado**. O teste 28 verifica que os assets do APK são exatamente `site/app`. O teste 30 cobre o iPhone em WebKit (perfil iPhone 13).
- **Android (emulador Android 11, API 30, WebView 83), APK de publicação:** `node android/testes/testar_android.js` — Resultado do APK final: 19/19 PASS. (Em execuções intermédias, as únicas falhas vieram do próprio emulador sobrecarregado — SystemUI «não está a responder» a tapar o ecrã, adb sem resposta e limpeza da pasta temporária por outro processo; na execução final, depois de reiniciar o SystemUI, passaram todos.). Inclui instalar, abrir, interface, toque real, registo, lembrete (notificação mostrada), calendário, histórico, sintomas, persistência (incluindo atualização por cima), offline em modo avião e apagar dados.
- **Android 15 (emulador):** instalação e abertura OK; o resto não pôde correr por falta de recursos do anfitrião.
- **iPhone real:** VALIDAÇÃO iOS REAL: NÃO EXECUTADA — ambiente físico indisponível.

## Funções proibidas

Nenhuma presente (verificação estática no teste 25 e revisão dos textos): sem cálculo, conversão, sugestão, confirmação ou alteração de dose, diagnóstico, triagem, IA clínica, recomendação de tratamento, promessa de autenticidade de medicamento, venda ou partilha de dados. Os lembretes usam só o que a pessoa indicou.

[CLAUDE_RESULT]
SITE: OK — https://primeiromilhao.github.io/projeto-seringa2/ com «Usar no navegador», «Baixar para Android» (download real do APK) e «Instalar no iPhone» (instruções Safari)
ANDROID: OK — app nativa (WebView + app embutida, sem internet), testada em emulador Android 11
APK_PATH: site/downloads/Seringa.apk (publicado em /downloads/Seringa.apk)
APK_SIZE: 304787 bytes
APK_SHA256: 8d7f02fc6412b13021ebad40cb44a74224883b147482ae439e7f033a21e5a809
APK_VALID: SIM — apksigner verify v1+v2+v3, zipalign verificado, minSdk 24 / targetSdk 35, pacote com.bfavore.seringa
APK_DOWNLOAD: SIM — testado localmente (teste 27) e na URL pública após o deploy (ver a mensagem final)
ANDROID_INSTALL: SIM — instalado e aberto como app em emulador Android 11 (completo) e Android 15 (instalação e abertura)
ANDROID_OFFLINE: SIM — modo avião no emulador, reabrir e registar
IPHONE_PWA: SIM — manifest, ícones, standalone, viewport, service worker, offline e fluxo validados em WebKit com perfil iPhone 13
IPHONE_INSTALL: Safari → Compartilhar → Adicionar à Tela de Início (instruções no site e na app)
IPHONE_REAL_DEVICE_TEST: VALIDAÇÃO iOS REAL: NÃO EXECUTADA — ambiente físico indisponível
CORE_TESTS: PASS — 31/31 (app, site, APK, iPhone em WebKit) + 19/19 (Android 11 em emulador, APK de publicação)
PROHIBITED_FUNCTIONS: NENHUMA
DATA_SYNC: NÃO HÁ sincronização automática — dados locais em cada instalação; transferência manual por Exportar/Restaurar
READY_FOR_GPT: SIM
READY_FOR_PUBLICATION: SIM como MVP gratuito (site + PWA + APK por download direto), com duas validações pendentes antes de divulgar: celular Android físico e iPhone físico
COMMIT: ver a mensagem final da sessão
RECOMMENDATION: publicar; validar num Android físico e num iPhone real antes de divulgar; Play Store e App Store só depois de decidir conta de programador, revisão clínica/regulatória e política de privacidade
