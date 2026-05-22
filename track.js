/* Servidoras no Comando — contador de visitas
   Registra cada acesso de pagina chamando a funcao track-visit.
   Nao coleta nenhum dado pessoal (sem IP, sem cookie). */
(function () {
  try {
    var caminho = location.pathname;
    // nao conta acessos ao proprio painel de administrador
    if (caminho.indexOf('admin') !== -1) return;

    var novaVisita = false;
    try {
      novaVisita = !sessionStorage.getItem('snc_visita');
      sessionStorage.setItem('snc_visita', '1');
    } catch (e) { /* sessionStorage indisponivel: conta apenas como acesso */ }

    fetch('/.netlify/functions/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: caminho, newVisit: novaVisita }),
      keepalive: true,
    }).catch(function () { /* falha silenciosa */ });
  } catch (e) { /* nunca atrapalha a pagina */ }
})();
