# ESTATUTO DIRETOR: PROJETO SERINGA UNIVERSAL

## Documento Fundacional

**Missão:** Fornecer suporte tecnológico de excelência, focado na usabilidade e na privacidade extrema, para qualquer utilizador que dependa de agulhas e injeções, independentemente do fim terapêutico ou estético.

> Este documento define produto, arquitetura e requisitos. O Seringa não prescreve, diagnostica, altera dose, ensina técnica de injeção nem autoriza autonomamente a administração. Funcionalidades clínicas devem permanecer subordinadas à prescrição e validação profissional.

## FASE 0 — Reestruturação da Base Arquitetural

A fundação já construída (HTML, Tailwind CSS e JavaScript Vanilla) será convertida num **Super App Modular Backendless/PWA**.

### Motor Dinâmico de Ecrãs

O Hall de Entrada identificará o utilizador e carregará apenas o módulo necessário, alterando a visualização conforme o contexto (por exemplo, corpo/abdómen para mapa facial).

### Protocolo de Privacidade “Bomba-Relógio”

Usar IndexedDB para anexos fotográficos locais e iniciar imediatamente um cronómetro de 5 minutos para a retenção temporária.

### Motor de Exportação Local

Gerar o relatório PDF no cliente (jsPDF) e executar purge imediato da fotografia temporária após a operação, preservando a privacidade íntima.

## MÓDULO 1 — Doentes Crónicos

**Público:** GLP-1 (Mounjaro, Ozempic), Insulina, Anticoagulantes (Heparina) e Biológicos (Humira).

- **Mapa Corporal de Rotação:** abdómen em 6 quadrantes e coxas/vasto lateral, com objetivo de reduzir repetição de locais e risco de lipodistrofia.
- **Rastreador de Complicações:** bloqueio automático de quadrante quando o utilizador registar hematoma grave.
- **Gestor de Inventário:** canetas/frascos, descarte de agulhas e validade pós-abertura configurável conforme informação oficial do medicamento (não assumir 28 dias universalmente).
- **Assistente de Titulação:** registo e acompanhamento de um esquema já prescrito; nunca recomendar autonomamente alteração de dose.

## MÓDULO 2 — Fertilidade e Hormonas

**Público:** FIV, TRT e terapias de transição de género.

- **Mapa IM:** visualização anatómica focada em glúteos e deltóides, para registo/organização conforme orientação profissional.
- **Gestor de Múltiplos Fármacos:** vários registos no mesmo dia, com horários distintos.
- **Alarmes de Alta Prioridade:** lembretes rigorosos para horários definidos pelo laboratório/equipa clínica, incluindo shot de gatilho.

## MÓDULO 3 — Estética Avançada

**Público:** pacientes e clínicas que registam Botox, ácido hialurónico, bioestimuladores e fios.

- **Mapa Facial Frontal:** rosto interativo para registo de locais.
- **Contabilização de Unidades:** registo de unidades de toxina botulínica por lado para controlo documental de simetria, sem sugerir dose clínica.
- **Dossiê Visual:** antes/depois temporário, associado ao relatório PDF e sujeito à política de retenção local.

## MÓDULO 4 — Modificação Corporal

**Público:** clientes de tatuagem e body piercing em cicatrização.

- **Pin Drop Corporal 360º:** corpo interativo para marcar localização da tatuagem/piercing.
- **Rastreador de Cicatrização:** contagem de dias e lembretes configuráveis de cuidados fornecidos pelo profissional.
- **Alerta de Infeção/Rejeição:** registo fotográfico temporário e PDF de evolução para partilha com o profissional.

## MÓDULO 5 — Acupuntura e Fisioterapia (Dry Needling)

**Público:** reabilitação física, dor crónica e desportistas.

- **Mapa de Pontos Gatilho:** costas, pescoço e membros, com pontos de registo definidos pelo profissional.
- **Escala EVA 0–10:** intensidade no momento da sessão e 24 horas depois.
- **Mapa Térmico de Alívio:** visualização/relatório da evolução subjetiva do alívio e desconforto para discussão com o fisioterapeuta.

## Ordem de Execução

**FASE 0 → Módulo 1 → Módulo 2 → Módulo 3 → Módulo 4 → Módulo 5.**

O Hall é a porta de entrada. O sistema deve carregar apenas o módulo necessário e manter a arquitetura offline-first/local-first.

## Regra de Armazenamento

O desenvolvimento do Seringa deve permanecer no **HD externo** e no **Google Drive**. O armazenamento interno do PC não deve manter uma cópia permanente do projeto.
