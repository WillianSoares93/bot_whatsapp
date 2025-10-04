// Arquivo: /api/config.js
// Versão final da API da Vercel, com tratamento de erros e CORS.

const { kv } = require('@vercel/kv');

module.exports = async (request, response) => {
  // Configurações de CORS para permitir a comunicação entre diferentes domínios
  response.setHeader('Access-Control-Allow-Origin', '*'); // Permite qualquer origem
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // O navegador envia um pedido 'OPTIONS' antes de um POST para verificar as permissões.
  // Precisamos de responder a ele com sucesso.
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    if (request.method === 'GET') {
      let config = await kv.get('bot-config');
      if (!config) {
        // Se não houver configuração, retorna valores padrão para evitar erros no frontend
        config = {
          prefix: '', responseMessage: '', sendSuccessMessage: false,
          successMessage: '', enableTemporaryDisable: false, disableDurationMinutes: 60,
        };
      }
      return response.status(200).json(config);

    } else if (request.method === 'POST') {
      // O corpo do pedido vem como string, precisamos de o converter para JSON
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      await kv.set('bot-config', body);
      return response.status(200).json({ success: true, message: 'Configuração salva!' });
    } else {
      // Se o método não for GET, POST ou OPTIONS
      response.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return response.status(405).json({ error: `Método ${request.method} não permitido` });
    }
  } catch (error) {
    console.error('Erro na API de configuração:', error);
    return response.status(500).json({ error: 'Erro interno do servidor ao aceder à base de dados.' });
  }
};

