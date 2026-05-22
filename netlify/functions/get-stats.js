// netlify/functions/get-stats.js
// Retorna as estatisticas de visitas para o painel de administrador.
// Acesso liberado apenas para a conta Google autorizada (login com Google).
const { getStore } = require('@netlify/blobs');

const STORE = 'estatisticas';
const KEY = 'visitas';

// E-mail da conta Google que pode abrir o painel.
const EMAIL_ADMIN = (process.env.ADMIN_EMAIL || 'carlacristinesoares@gmail.com').toLowerCase();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo nao permitido' }) };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Painel nao configurado: falta a variavel GOOGLE_CLIENT_ID no Netlify.' }),
    };
  }

  // 1. Pega o token gerado pelo login do Google
  let credential = '';
  try {
    credential = String(JSON.parse(event.body || '{}').credential || '');
  } catch (e) { /* sem token */ }
  if (!credential) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Faca login com o Google para acessar.' }) };
  }

  // 2. Valida o token diretamente com o Google
  let info;
  try {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    if (!r.ok) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Login invalido ou expirado. Entre novamente.' }) };
    }
    info = await r.json();
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Nao foi possivel validar o login com o Google.' }) };
  }

  // 3. Confere que o token e do nosso app e da conta autorizada
  if (info.aud !== clientId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Login nao reconhecido por este site.' }) };
  }
  const emailVerificado = info.email_verified === true || info.email_verified === 'true';
  const email = String(info.email || '').toLowerCase();
  if (!emailVerificado || email !== EMAIL_ADMIN) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Esta conta Google nao tem acesso ao painel.' }) };
  }

  // 4. Acesso liberado: devolve as estatisticas
  try {
    const store = getStore(STORE);
    const stats = (await store.get(KEY, { type: 'json' })) || { visits: 0, views: 0, pages: {}, daily: {} };
    return { statusCode: 200, headers, body: JSON.stringify(stats) };
  } catch (error) {
    console.error('get-stats erro:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao ler as estatisticas.' }) };
  }
};
