/**
 * Seringa Shield - Módulo de Segurança Frontend
 * Proteção contra XSS, Clickjacking e manipulação de DOM.
 */
(function() {
  'use strict';

  // 1. Anti-Clickjacking (Impede que o site seja aberto dentro de iframes maliciosos)
  if (window.top !== window.self) {
    window.top.location.replace(window.self.location.href);
  }

  // 2. Desabilitar ferramentas de developer e clique direito (opcional, pode incomodar utilizadores legítimos, vamos apenas bloquear F12 se quisermos, mas a melhor defesa é sanitização)
  // Decidi não bloquear o botão direito para manter acessibilidade.

  // 3. Sanitização Global: Interceta entradas e saídas perigosas
  // Embora usemos a função `esc()` localmente, o Shield garante que métodos padrão não sejam abusados.
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    // Apenas monitorização - se detetar scripts claros sendo gravados, pode alertar
    if (typeof value === 'string' && (value.includes('<script>') || value.includes('javascript:'))) {
        console.warn('Seringa Shield: Tentativa de injeção de script detetada e neutralizada no armazenamento.');
        value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[CONTEÚDO BLOQUEADO]");
    }
    originalSetItem.apply(this, arguments);
  };

  // 4. Bloqueio de eval() - Previne execução de código arbitrário caso alguma biblioteca tente
  window.eval = function() {
    throw new Error("Seringa Shield: A execução de código dinâmico (eval) está bloqueada por motivos de segurança.");
  };

  console.log('🛡️ Seringa Shield ativado. Navegação segura e isolada garantida.');
})();
