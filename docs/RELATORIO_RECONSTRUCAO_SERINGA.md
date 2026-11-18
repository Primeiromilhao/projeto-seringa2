# Relatório — Reconstrução da experiência do Seringa (app + Android + iPhone + site)

**Data:** 18/11/2026 · **Executor:** Claude Code · **Repositório:** `Primeiromilhao/projeto-seringa2` · **Branch:** `main`
**Fonte única da aplicação:** `site/app/` (o mesmo código serve o navegador, o iPhone e o APK Android)
**Referência visual:** imagem enviada pelo Senhor Novaes (8 ecrãs). Foi usada como referência de UX/UI; não foram copiados logotipos, textos de terceiros nem identidade de outros apps. O desenho do corpo, os ícones e o ícone do app foram desenhados de raiz.

---

## 1. O que mudou na experiência

A interface anterior (cartões teal, menus de texto, «Hoje/Registrar/Sintomas/Efeitos/Mais») foi **substituída**. Só a lógica foi reaproveitada: armazenamento IndexedDB com criptografia, validação de cópias, regras do lembrete, conteúdo oficial e alertas fixos.

| Ecrã | Como ficou |
|---|---|
| **Início** | Logo Seringa · «Olá, *nome*!» (nome opcional) · **cartão principal roxo «Próxima aplicação»** com data, hora e «Faltam N dias» (toca e abre Lembretes) · cartão «Última aplicação» (data e local) · botão **Registrar aplicação** · grade **Meu corpo · Minha jornada · Peso e medidas · Sintomas**. A informação secundária saiu da Home. |
| **Navegação inferior** | **Início · Histórico · ( + ) · Relatório · Mais**, com o **«+» central** para registar. |
| **Registrar aplicação** | Data e hora · Local (**Abdômen / Coxa / Braço / Outro**) · Lado (**Esquerdo / Direito**) · Observação opcional · **Salvar**. Abdômen e Esquerdo vêm pré-selecionados: **2 a 3 toques**. Nada sobre dose. |
| **Meu corpo** | Separadores **Mapa / Histórico**. Corpo humano simples (SVG próprio) com os locais coloridos: **última aplicação** (roxo forte), **usado anteriormente** (roxo claro), **sem registro** (cinza). O separador Histórico lista os registos por local, com contagem e datas. A nota diz que o mapa **não indica onde aplicar**. |
| **Minha jornada** (aba Histórico) | Linha do tempo agrupada por mês, com cartões por evento (aplicação, sintoma, peso com variação face ao registo anterior, medida). Filtros **Tudo / Aplicações / Sintomas / Peso**. Tocar num evento abre o detalhe, com «Apagar este registro» (confirmação dupla). |
| **Evolução** (Peso e medidas) | Separadores **Peso / Medidas / Sintomas**. Valor atual grande, variação desde o primeiro registo, gráfico de linha (SVG, sem bibliotecas), medidas (cintura, quadril, braço, coxa) com gráfico por medida e contagem de sintomas em 30 dias. **Sem juízo de valor**: não há «Boa evolução», metas, cores de sucesso nem interpretação; os textos avaliativos da referência («Você perdeu…», troféu) **não foram reproduzidos de propósito**. |
| **Meu relatório** | «Gere um resumo dos seus registros para levar à consulta.» · Período (30 / 90 dias / tudo) · ☑ Aplicações ☑ Peso e evolução ☑ Sintomas ☑ Observações · Dúvidas para o médico · **Gerar PDF** · «Ver na tela». O PDF é um resumo organizado, com cabeçalho Seringa e o aviso «não substitui a avaliação médica». |
| **Lembretes** | Interruptor **Ativar lembretes** · **Próximo lembrete** (data e hora) · Notificações: no **Android**, notificação nativa à hora indicada; no **navegador e iPhone**, evento com alarme no calendário (.ics), explicando porquê. Os interruptores da referência «registo de peso» e «resumo semanal» **não foram incluídos**, porque não existem por trás e seria enganoso mostrá-los. |
| **Mais** | Efeitos e cuidados · Guia SUS · Avisos e novidades · Meu medicamento · Lembretes · Calendário · Privacidade · Exportar dados · Restaurar uma cópia · Apagar meus dados · Sobre o Seringa · cartão **Seringa Premium** · assinatura **Seringa · BFAVORE · Versão 1.1.0**. |
| **Premium** | Ecrã informativo: o que vem a seguir (vários medicamentos, família/cuidador, backup criptografado, relatórios avançados). **Não há pagamentos nem bloqueios**, e o ecrã diz que nenhuma função gratuita será bloqueada. |
| **Identidade** | Roxo (#6d28d9 / #5b21b6), cartões brancos com cantos de 18 px, ícones de traço próprios, modo escuro em #111827. Novo ícone do app (seringa branca sobre roxo) para web, iPhone e Android. |

Também mantidos: calendário mensal, sintomas com alerta fixo da bula (sem triagem), efeitos e cuidados só para Mounjaro (outros medicamentos recebem mensagem neutra), Guia SUS, avisos, privacidade, exportar/restaurar/apagar e boas-vindas com aviso legal.

## 2. Bugs encontrados e corrigidos durante a reconstrução

| Bug | Correção |
|---|---|
| Duas aplicações registadas no mesmo minuto empatavam e a data ajustada continuava a valer depois de um novo registo | Desempate pela data de criação; a regra compara o ajuste com o registo **criado mais recentemente** |
| No Safari/WebKit, a primeira visita mostrava «Nova versão disponível» e recarregava a página | A faixa só aparece se a página já abriu controlada por um service worker; só recarrega quando a pessoa toca em «Atualizar» |
| Em Android ≤ 12 (WebView antigo), o modo escuro do sistema não chegava à app | Ponte `modoNoturno()`; a app ativa as suas regras escuras via CSSOM, compatível com a CSP |
| O APK tinha «header mismatch» no ZIP | O ZIP é reconstruído do zero, preservando a compressão de cada entrada; `zipalign -c` passou a validar |
| O `apksigner` gerava um `.idsig` que seria publicado | Assinatura v4 desativada (o APK mantém as assinaturas v1, v2 e v3) |
| Sombras roxas «glow» no modo escuro | Sombras neutras |

## 3. Android — APK real

- **Tipo:** app Android nativa (Java, sem frameworks pagos e sem Gradle) com **WebView** que carrega a mesma `site/app/` **embutida no APK** (assets), servida em `https://appassets.androidplatform.net/` (origem segura local). **Não abre o Chrome. Não é uma PWA renomeada.**
- **Escolha WebView em vez de TWA:** uma TWA exige Digital Asset Links na raiz do domínio (`primeiromilhao.github.io/.well-known/`), o que não é possível num site de projeto do GitHub Pages; sem isso, a TWA mostraria a barra do Chrome. A WebView com assets locais funciona **100 % offline desde a instalação** e é estável.
- **Sem lógica duplicada:** `android/construir.py` copia `site/app/*` e `site/conteudo.js` para os assets em cada compilação. O teste 28 compara o CRC dos assets do APK com os ficheiros de `site/`.
- **Integração nativa (só pontes, nenhuma regra de tratamento):** notificação local na data e hora da próxima aplicação (AlarmManager; reagenda após reiniciar ou atualizar; no ecrã bloqueado não mostra o nome do medicamento), evento no calendário do celular, guardar cópia em Downloads/Seringa, PDF pelo serviço de impressão do Android, escolher ficheiro para restaurar, botão voltar e modo escuro.
- **Privacidade:** o APK **não tem permissão INTERNET**. `allowBackup=false` (os dados de saúde não vão para backups na nuvem). Permissões: POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED e SCHEDULE_EXACT_ALARM.
- **Ficheiro:** `site/downloads/Seringa.apk` (publicado em `/downloads/Seringa.apk`), com `Seringa.apk.sha256` ao lado.
- **minSdk 24 (Android 7.0) · targetSdk 35 (Android 15)** · versão 1.0.0 (code 1) · pacote `com.bfavore.seringa` · certificado `CN=Seringa, O=BFAVORE, C=BR`.
- **Chave de assinatura:** está **fora do repositório**, em `Executor\runtime\seringa_android_chave\` (`seringa-release.jks` + `senha.txt`). **Guarde esta pasta**: sem ela, o Android não aceita atualizações por cima da versão instalada.
- **Compilar:** `python android/construir.py` (APK de publicação) · `python android/construir.py --teste` (APK depurável para testes).

## 4. iPhone

- **Mecanismo:** PWA instalada pelo Safari (Compartilhar → Adicionar à Tela de Início). **Não existe APK para iPhone.** Um `.ipa` exige conta Apple Developer paga, assinatura e distribuição pela App Store ou TestFlight, por isso não foi criado.
- **Preparado:** manifest com `display: standalone`, `id`, `orientation`, ícones `any` + `maskable` (512) + `apple-touch-icon` 180 px · `apple-mobile-web-app-capable`, título, status bar e `viewport-fit=cover` com safe areas · service worker com cache offline (versão `seringa-2026-11-18-3`) · cartão nas boas-vindas que ensina a instalar quando a app é aberta no Safari sem estar instalada.
- **Limitações honestas:** no iPhone, a app instalada guarda os dados separados da aba do Safari (a app avisa). Notificações de PWA no iOS exigem a app instalada e não são fiáveis sem servidor push, por isso o lembrete no iPhone é um evento com alarme no calendário (.ics).

## 5. Site

O site passou a ser **a porta de entrada** e não imita a app: «SERINGA · Organize o seu tratamento com mais simplicidade.», três botões (**Usar no navegador** → `app/`; **Baixar para Android** → `downloads/Seringa.apk` com `download`; **Instalar no iPhone** → instruções), secções **O que é o Seringa? · Como funciona? · Por que usar? · Baixe o Seringa**, efeitos do Mounjaro com fontes, Guia SUS, avisos, privacidade, aviso legal e BFAVORE. O tamanho do APK é lido do próprio ficheiro publicado e há link para o SHA-256.

## 6. Dados

- **Não há sincronização automática** entre navegador, Android e iPhone: cada instalação guarda os seus dados no próprio aparelho. Isto está dito no site, na Privacidade e no Lembretes. Para passar dados de um para outro: Exportar dados → Restaurar uma cópia.
- A arquitetura de segurança (IndexedDB + AES-GCM com chave não exportável) **não foi alterada**. O formato da cópia passou a `formato: 2` (inclui perfil, preferências e medidas) e continua a aceitar cópias antigas.

## 7. Funções proibidas — verificação

Verificado no código final (teste 25, análise estática da app, site, `/antigo/`, 404 e código Android) e nos textos visíveis:
sem cálculo, conversão, sugestão, confirmação ou alteração de dose · sem diagnóstico · sem triagem (alertas fixos por sintoma) · sem IA · sem câmara ou interpretação de imagem · sem recomendação de tratamento nem de local de aplicação · sem afirmação de autenticidade de medicamento · sem venda ou partilha de dados, sem rastreadores e sem envio externo · APK sem permissão de internet. Os lembretes usam **apenas** a data, a hora e a frequência introduzidas pela pessoa.

## 8. Testes executados

### 8.1 App + site + APK publicado + iPhone em WebKit — `node site/testes/executar.js`
Chromium headless e **WebKit 26.6** (motor do Safari), fuso de São Paulo, pt-BR. **Resultado: 31/31 PASS**
01 boas-vindas · 02 configurar · 03 Home e barra inferior · 04 registo em ≤ 3 toques com «+» · 05 Outro/lado/observação e data futura recusada · 06 Meu corpo (última, anteriores, sem registo, histórico por local, sem recomendação) · 07 sintomas e alerta fixo · 08 Evolução (peso, variação, gráfico, medidas, sintomas, sem texto avaliativo) · 09 Minha jornada (filtros, detalhe, apagar) · 10 Lembretes (interruptor, .ics) · 11 calendário · 12 efeitos e SUS · 13 relatório (opções, prévia, PDF, CSS de impressão) · 14 exportar · 15 IndexedDB cifrado · 16 persistência · 17 apagar, restaurar e recusar ficheiro inválido · 18 hash inválido · 19 data de referência · 20 Insulina sem conteúdo Mounjaro · 21 offline (SW) · 22 migração do formato antigo · 23 responsividade 320–768 px e letra ≥ 16 px · 24 contraste AA claro/escuro · 25 funções proibidas · 26 pt-BR e textos · 27 **site: 3 botões, APK descarregado, extensão .apk, assinatura ZIP «PK», não é HTML, não é redirect, tamanho plausível, SHA-256 confere** · 28 **assets do APK = site/app** · 29 `/antigo/` · 30 **iPhone (WebKit, perfil iPhone 13): metas iOS, manifest, ícones, fluxo, armazenamento cifrado, service worker e offline** · 31 consola sem erros.

### 8.2 Android real em emulador — `node android/testes/testar_android.js`
**Emulador Android 11 (API 30), WebView 83, imagem AOSP «userdebug». APK testado: o de publicação (`site/downloads/Seringa.apk`).** Resultado do APK final: 19/19 PASS. (Em execuções intermédias, as únicas falhas vieram do próprio emulador sobrecarregado — SystemUI «não está a responder» a tapar o ecrã, adb sem resposta e limpeza da pasta temporária por outro processo; na execução final, depois de reiniciar o SystemUI, passaram todos.)
A1 instala (não é depurável, sem INTERNET) · A2 abre como app própria (não o Chrome) · A3 interface visível · A4 toque real em «Começar» · A5 sem falhas nativas · B1 WebView seguro (`appassets`, IndexedDB) · B2 configurar e registar · B3 **alarme agendado e notificação mostrada na hora indicada** · B4 calendário, jornada e corpo · B5 sintomas e alerta · B6 evolução · B7 **Gerar PDF abre o serviço de impressão do Android** · B8 exportar para Downloads · B9 **persistência após fechar e após atualizar o APK por cima** · B10 **offline em modo avião** · B11 botão voltar · B12 modo escuro · B13 apagar dados (e cancelar o lembrete) · B14 sem erros JS e Insulina sem conteúdo Mounjaro.

**Também tentado:** emulador Android 15 (API 35, Google APIs). O APK **instalou e abriu como app** (A1–A2 passaram), mas o anfitrião (3 núcleos, cerca de 0,7 GB de RAM livre) não aguentou o sistema: o SystemUI entrou em «não está a responder» e os restantes testes não puderam correr. **Não é um defeito do APK, mas o Android 15 não ficou validado de ponta a ponta.**

### 8.3 iPhone real
**VALIDAÇÃO iOS REAL: NÃO EXECUTADA — ambiente físico indisponível.** A validação foi feita no WebKit (motor do Safari) com perfil de iPhone 13. Antes de divulgar, instale num iPhone real pelo Safari e confirme o fluxo.

## 9. O que falta / riscos

| Item | Impacto |
|---|---|
| Teste num **iPhone físico** | Necessário antes de divulgar para iPhone |
| Teste num **celular Android físico** e num Android 13–15 com recursos suficientes | Recomendado; os testes completos correram em Android 11 (emulador) |
| APK fora da Play Store | Quem instala tem de permitir «instalar apps desta fonte»; o site explica. A Play Store exige conta de programador (paga) e formato AAB |
| **Revisão clínica** do conteúdo de efeitos, **validação regulatória** (Anvisa) e **política de privacidade jurídica** com contacto BFAVORE | Pendentes desde os relatórios anteriores; bloqueiam a **venda**, não esta publicação gratuita |
| Premium | Só a estrutura e a explicação; sem pagamentos, como pedido |

## 10. Recomendação

Publicar esta versão (site + PWA + APK) como **versão gratuita de demonstração/MVP**, e antes de divulgar em larga escala: (1) instalar o APK num celular Android real e (2) instalar pelo Safari num iPhone real, seguindo os passos do site. Em seguida: revisão clínica e regulatória, e decidir o modelo Premium (pagamento e backup).

[CLAUDE_RESULT]
UI_REBUILT: SIM — interface reconstruída de raiz segundo a referência (Home, + central, Registo, Meu corpo, Minha jornada, Evolução, Relatório, Lembretes, Mais, Premium); lógica, segurança e conteúdo reaproveitados
HOME: OK — próxima aplicação (cartão principal), última aplicação, Registrar aplicação, Meu corpo / Minha jornada / Peso e medidas / Sintomas, barra Início · Histórico · + · Relatório · Mais
REGISTRO: OK — data e hora, Abdômen/Coxa/Braço/Outro, Esquerdo/Direito, observação, Salvar; 2–3 toques; sem dose
MEU_CORPO: OK — mapa SVG com última / anteriores / sem registo + histórico por local; não recomenda onde aplicar
MINHA_JORNADA: OK — linha do tempo por mês, filtros Tudo/Aplicações/Sintomas/Peso, detalhe e apagar
EVOLUCAO: OK — peso (valor, variação, gráfico), medidas, sintomas; sem interpretação nem juízo de valor
RELATORIO: OK — período, ☑ Aplicações / Peso e evolução / Sintomas / Observações, Gerar PDF (impressão do sistema) e prévia
LEMBRETES: OK — baseados só na data/frequência indicadas; Android: notificação nativa testada no emulador; navegador/iPhone: calendário .ics
ANDROID: OK — app nativa (WebView com a app embutida, sem internet), testada em emulador Android 11 (19/19 testes); Android 15 só instalação/abertura (anfitrião sem recursos)
APK: site/downloads/Seringa.apk · 304787 bytes · SHA-256 8d7f02fc6412b13021ebad40cb44a74224883b147482ae439e7f033a21e5a809 · assinatura v1+v2+v3 válida · minSdk 24 / targetSdk 35
IPHONE_PWA: OK em WebKit (perfil iPhone 13) — manifest, ícones, standalone, viewport, service worker, offline, fluxo; VALIDAÇÃO iOS REAL: NÃO EXECUTADA — ambiente físico indisponível
OFFLINE: OK — navegador (Chromium) e WebKit com service worker; Android em modo avião
TESTS: PASS — 31/31 (app, site, APK, iPhone em WebKit) + 19/19 (Android 11 em emulador, APK de publicação)
PROHIBITED_FUNCTIONS: NENHUMA — sem cálculo/conversão/sugestão/confirmação/alteração de dose, diagnóstico, triagem, IA, imagem, recomendação de tratamento, autenticidade de medicamento ou partilha de dados
READY_FOR_GPT: SIM
COMMIT: ver a mensagem final da sessão (o hash do commit não pode estar dentro do próprio commit)
RECOMMENDATION: publicar como MVP gratuito; antes de divulgar, validar num Android físico e num iPhone físico; depois, revisão clínica/regulatória e modelo Premium
