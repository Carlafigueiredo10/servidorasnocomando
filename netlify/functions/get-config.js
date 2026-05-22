// netlify/functions/get-config.js
// Devolve configuracoes publicas que o painel precisa no navegador.
// O Client ID do Google NAO e secreto — pode ficar visivel no site.
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' }),
  };
};
