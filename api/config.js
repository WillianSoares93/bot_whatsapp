// Arquivo: /api/config.js
// Versão final da API da Vercel, com validação de variáveis de ambiente.

const { createClient } = require('@vercel/kv');

module.exports = async (request, response) => {
  // Configurações de CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- Validação Crucial das Variáveis de Ambiente ---
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("Erro na API: Variáveis de ambiente do KV não encontradas na Vercel.");
    return response.status(500).json({ error: 'Erro de configuração interna do servidor.' });
  }
  
  const kv = createClient({ url: KV_REST_API_URL, token: KV_REST_API_TOKEN });

  try {
    if (request.method === 'GET') {
      let config = await kv.get('bot-config');
      if (!config) {
        config = {
          prefix: '', responseMessage: '', sendSuccessMessage: false,
          successMessage: '', enableTemporaryDisable: false, disableDurationMinutes: 60,
        };
      }
      return response.status(200).json(config);

    } else if (request.method === 'POST') {
      await kv.set('bot-config', request.body);
      return response.status(200).json({ success: true, message: 'Configuração salva!' });
    } else {
      return response.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API de configuração ao aceder ao KV:', error);
    return response.status(500).json({ error: 'Erro ao comunicar com o banco de dados.' });
  }
};

