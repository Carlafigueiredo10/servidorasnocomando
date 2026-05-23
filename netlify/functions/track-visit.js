// netlify/functions/track-visit.js
// Registra cada acesso do site e guarda os totais no Netlify Blobs.
const { getStore } = require('@netlify/blobs');

const STORE = 'estatisticas';
const KEY = 'visitas';

// Abre o store de Blobs. Tenta auto-deteccao primeiro;
// se NETLIFY_BLOBS_TOKEN estiver definido, usa configuracao manual.
function abrirStore() {
  if (process.env.NETLIFY_BLOBS_TOKEN) {
    return getStore({
      name: STORE,
      siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.BLOB_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });
  }
  return getStore(STORE);
}

function vazio() {
  return { visits: 0, views: 0, pages: {}, daily: {} };
}

// Data de hoje no fuso de Brasilia, formato AAAA-MM-DD
function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo nao permitido' }) };
  }

  try {
    let path = '/index.html';
    let novaVisita = false;
    try {
      const body = JSON.parse(event.body || '{}');
      if (body.path) {
        path = String(body.path).slice(0, 120);
        if (path === '/' || path === '') path = '/index.html';
      }
      novaVisita = body.newVisit === true;
    } catch (e) { /* mantem os padroes */ }

    const store = abrirStore();
    const stats = (await store.get(KEY, { type: 'json' })) || vazio();

    const dia = hoje();
    if (!stats.daily[dia]) stats.daily[dia] = { visits: 0, views: 0 };

    stats.views += 1;
    stats.daily[dia].views += 1;
    stats.pages[path] = (stats.pages[path] || 0) + 1;
    if (novaVisita) {
      stats.visits += 1;
      stats.daily[dia].visits += 1;
    }

    await store.setJSON(KEY, stats);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error('track-visit erro:', error);
    // nunca quebra a experiencia do usuario: apenas deixa de contar
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false }) };
  }
};
