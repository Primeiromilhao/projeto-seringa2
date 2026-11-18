/* Conteúdo oficial do Seringa — partilhado pelo site e pelo app.
   Regras: só informação com fonte oficial citada; nada de doses; nada de orientação clínica que a fonte não traga
   (correção GPT v1.1 §1: não usar «o que ajuda» quando a fonte apenas descreve o efeito).
   Revisão clínica obrigatória antes de cada publicação de conteúdo novo. */
window.SERINGA_CONTEUDO = {
  versao: "2026-11-18",
  fontes: {
    bula: { nome: "Bula do Mounjaro (tirzepatida) — Eli Lilly do Brasil, Bulário Eletrônico da Anvisa",
            url: "https://consultas.anvisa.gov.br/#/bulario/" },
    lilly: { nome: "Lilly Medical Brasil — efeitos no esvaziamento gástrico (tirzepatida)",
             url: "https://medical.lilly.com/br/products/respostas/efeitos-no-esvaziamento-g-strico-281334" },
    ms: { nome: "Agência Gov — Ministério da Saúde: canetas no SUS serão oferecidas de forma responsável (set/2026)",
          url: "https://agenciagov.ebc.com.br/noticias/202609/canetas-emagrecedoras-serao-disponibilizadas-de-forma-responsavel" },
    anvisa: { nome: "Anvisa — consulta de produtos registrados", url: "https://consultas.anvisa.gov.br/" },
    bulario: { nome: "Anvisa — Bulário Eletrônico (consulte a bula do seu medicamento)", url: "https://consultas.anvisa.gov.br/#/bulario/" }
  },
  /* Medicamentos com conteúdo revisado. O app só mostra o guia de efeitos quando o nome configurado corresponde. */
  medicamentos: {
    mounjaro: { nome: "Mounjaro (tirzepatida)", termos: ["mounjaro", "tirzepatida"] }
  },
  efeitos: [
    { id: "enjoo", icone: "🤢", titulo: "Enjoo (náusea) e diarreia",
      oque: "São os efeitos mais frequentes (mais de 1 em cada 10 pessoas). Os efeitos digestivos aparecem mais no início do tratamento e na fase de aumento de dose, e costumam diminuir com o tempo.",
      fazer: ["Anote no Seringa quando acontecer e a intensidade", "Conte ao seu médico na consulta"],
      alerta: "Se não consegue manter líquidos ou a diarreia não para, procure atendimento: enjoo, vômitos e diarreia podem levar à desidratação.",
      fonte: ["bula", "lilly"] },
    { id: "vomito", icone: "💧", titulo: "Vômitos e desidratação",
      oque: "Vômitos são comuns (até 1 em cada 10 pessoas). Enjoo, vômitos e diarreia podem levar à perda de líquidos (desidratação).",
      fazer: ["Anote no Seringa quando acontecer, para mostrar ao médico"],
      alerta: "Vômitos que não param ou sinais de desidratação (boca muito seca, pouca urina, tontura): procure atendimento.",
      fonte: ["bula", "lilly"] },
    { id: "intestino", icone: "🌿", titulo: "Prisão de ventre",
      oque: "É um efeito comum. O medicamento deixa o esvaziamento do estômago mais lento.",
      fazer: ["Anote no Seringa", "Pergunte ao médico ou nutricionista como ajustar a alimentação"],
      alerta: "Se vier com dor forte na barriga que não passa, procure atendimento médico.",
      fonte: ["bula", "lilly"] },
    { id: "refluxo", icone: "🔥", titulo: "Refluxo, indigestão, arrotos e gases",
      oque: "São efeitos comuns, ligados ao esvaziamento mais lento do estômago.",
      fazer: ["Anote no Seringa", "Conte ao médico se incomodar no dia a dia"],
      alerta: "", fonte: ["bula", "lilly"] },
    { id: "apetite", icone: "🍽️", titulo: "Menos apetite",
      oque: "A redução do apetite é um efeito comum.",
      fazer: ["Converse com o médico ou nutricionista sobre a sua alimentação", "Registre o peso no Seringa para levar à consulta"],
      alerta: "", fonte: ["bula"] },
    { id: "local", icone: "📍", titulo: "Reação no local da injeção",
      oque: "Vermelhidão ou incômodo no local são comuns. A bula orienta aplicar no abdômen, na coxa ou no braço e alternar o local a cada aplicação.",
      fazer: ["Use o mapa do corpo do Seringa para ver onde aplicou da última vez", "Anote quando acontecer"],
      alerta: "", fonte: ["bula"] },
    { id: "remedios", icone: "💊", titulo: "Outros remédios que você toma",
      oque: "O Mounjaro deixa o esvaziamento do estômago mais lento e pode afetar a absorção de remédios tomados pela boca. Quem usa insulina ou sulfonilureia junto tem mais risco de hipoglicemia (açúcar baixo no sangue).",
      fazer: ["Informe o médico sobre todos os remédios que usa"],
      alerta: "Tremor, suor frio, fome intensa ou confusão em quem usa insulina ou sulfonilureia: siga o plano do seu médico e procure atendimento se não melhorar.",
      fonte: ["bula"] }
  ],
  /* Avisos fixos previamente definidos (texto da bula do Mounjaro). Não há triagem nem combinação de sintomas. */
  alertas: [
    "Dor forte na barriga que não passa (com ou sem vômitos), que pode ir para as costas — procure atendimento médico imediatamente.",
    "Inchaço no rosto, lábios ou garganta, ou falta de ar — procure atendimento de urgência (possível reação alérgica grave).",
    "Dor forte no lado direito da barriga, febre ou pele/olhos amarelados — procure atendimento médico.",
    "Vômitos ou diarreia que não param e sinais de desidratação — procure atendimento."
  ],
  /* Aviso fixo para quem usa outro medicamento (sem conteúdo revisado no Seringa). */
  alertaGeral: "Você marcou um sinal de alerta. Procure atendimento médico. Em urgência, ligue 192 (SAMU). Consulte também a bula do seu medicamento.",
  avisos: [
    { data: "2026-11-18", titulo: "Nasce o Seringa", texto: "Informação de fonte oficial e organização do tratamento, no seu celular. Comece pelo guia de efeitos do Mounjaro." },
    { data: "2026-09-18", titulo: "SUS vai ofertar canetas para obesidade — ainda sem data", texto: "O Ministério da Saúde anunciou a oferta conforme protocolo clínico ainda não publicado. Até lá, a oferta não está disponível em todo o país.", fonte: "ms" },
    { data: "2026-11-18", titulo: "Atenção a canetas irregulares", texto: "Compre só em farmácia, com receita, e confirme o registro do produto na Anvisa. A Anvisa tem apreendido canetas sem registro.", fonte: "anvisa" }
  ],
  sus: [
    "O Ministério da Saúde anunciou que o SUS vai oferecer canetas (análogos de GLP-1, como a semaglutida) a pessoas com obesidade, conforme um protocolo clínico que ainda vai ser publicado.",
    "Antes disso, o pedido passa pela análise da Conitec. A previsão divulgada é de oferta a partir de 2027.",
    "Hoje, a oferta pública existe apenas em iniciativas pontuais (por exemplo, a rede municipal do Rio de Janeiro e um estudo em Porto Alegre).",
    "Quando o protocolo for publicado, o Seringa explica aqui, passo a passo, quem pode receber e como pedir."
  ]
};
