// netlify/functions/get-config.js
// Devolve configuracoes publicas que o painel precisa no navegador.
// O Client ID do Google NAO e secreto — pode ficar visivel no site.

// Client ID do Google (projeto CLIC). Nao e segredo — pode ficar no codigo.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ||
  '697204129673-03pcobng48aablb5mifaar67h4jhjj28.apps.googleusercontent.com';

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ googleClientId: GOOGLE_CLIENT_ID }),
  };
};
