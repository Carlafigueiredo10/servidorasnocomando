const { google } = require('googleapis');

// Service Account credentials via variáveis separadas
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

const SPREADSHEET_IDS = {
  'ponto-partida': '1pXpz1JkIPqxFj3gJKFz0htFmkHdQMicCOcE4JVqCYS0',
  'diagnostico-trilhas': '1CDdL3eM5zwbKfLKRiIMhog2pBqx_66NkcabGNx-5-VU',
  'sugestao-rede': '1j5LVmeYZFagLqV9eJLVv4ZeN100pL82sChvTAwqB7Vs',
  'avaliacao': '1pXpz1JkIPqxFj3gJKFz0htFmkHdQMicCOcE4JVqCYS0',
  'certificado': '1pXpz1JkIPqxFj3gJKFz0htFmkHdQMicCOcE4JVqCYS0'
};

const SHEET_NAMES = {
  'ponto-partida': 'votos',
  'diagnostico-trilhas': 'diagnostico',
  'sugestao-rede': 'redes',
  'avaliacao': 'avaliacoes',
  'certificado': 'certificados'
};

async function appendToSheet(spreadsheetId, sheetName, values) {
  const auth = new google.auth.JWT({
    email: CREDENTIALS.client_email,
    key: CREDENTIALS.private_key,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] },
  });
}

async function getTotals(spreadsheetId, sheetName) {
  const auth = new google.auth.JWT({
    email: CREDENTIALS.client_email,
    key: CREDENTIALS.private_key,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return { 1: 0, 2: 0, 3: 0, 4: 0 };

    const totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    rows.slice(1).forEach(row => {
      const nivel = parseInt(row[5]); // Coluna F = nivel
      if (nivel >= 1 && nivel <= 4) totals[nivel]++;
    });

    return totals;
  } catch (e) {
    return { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const tipo = data.tipo || 'ponto-partida';

    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let spreadsheetId = SPREADSHEET_IDS[tipo];
    let sheetName = SHEET_NAMES[tipo];
    let values = [];

    switch (tipo) {
      case 'ponto-partida':
        // Colunas: Timestamp | Nome | Órgão | Email | Telefone | Nível | Quer Grupo
        values = [
          timestamp,
          data.nome || '',
          data.orgao || '',
          data.email || '',
          data.telefone || '',
          data.nivel || '',
          data.quer_grupo ? 'Sim' : 'Não'
        ];
        break;

      case 'diagnostico-trilhas':
        // Colunas: Timestamp | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | Trilha
        values = [
          timestamp,
          data.q1 || '',
          data.q2 || '',
          data.q3 || '',
          data.q4 || '',
          data.q5 || '',
          data.q6 || '',
          data.q7 || '',
          data.q8 || '',
          data.q9 || '',
          data.q10 || '',
          data.trilha || ''
        ];
        break;

      case 'sugestao-rede':
        // Colunas: Timestamp | Nome | Link | Descrição | Contato
        values = [
          timestamp,
          data.nome || '',
          data.link || '',
          data.descricao || '',
          data.contato || ''
        ];
        break;

      case 'avaliacao':
        // Colunas: Timestamp | Nome | Órgão | Email | Nota | Tempo | Ferramentas | Materiais | Gostou | Melhorar | Comentário | Quer Rede
        values = [
          timestamp,
          data.nome || '',
          data.orgao || '',
          data.email || '',
          data.nota_geral || '',
          data.tempo || '',
          data.ferramentas || '',
          data.materiais || '',
          data.gostou || '',
          data.melhorar || '',
          data.comentario || '',
          data.quer_rede || ''
        ];
        break;

      case 'certificado':
        // Colunas: Timestamp | Código | Nome | Email | Órgão | URL Verificação
        values = [
          timestamp,
          data.codigo || '',
          data.nome || '',
          data.email || '',
          data.orgao || '',
          data.url_verificacao || ''
        ];
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Tipo de dados desconhecido' })
        };
    }

    // Salvar na planilha
    await appendToSheet(spreadsheetId, sheetName, values);

    // Se for ponto-partida, retornar totais
    if (tipo === 'ponto-partida') {
      const totals = await getTotals(spreadsheetId, sheetName);
      const total = Object.values(totals).reduce((a, b) => a + b, 0);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, totals, total })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
