// Arquivo: /api/config.js
// Esta é a função serverless que roda na Vercel para ler e salvar as configurações.

const { kv } = require('@vercel/kv');

module.exports = async (request, response) => {
  // Configurações de CORS para permitir a comunicação entre Vercel e Railway
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde a pedidos pre-flight (verificação) do CORS
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    if (request.method === 'GET') {
      let config = await kv.get('bot-config');
      if (!config) {
        // Se não houver configuração, retorna valores padrão para evitar erros no frontend
        config = {
          prefix: '',
          responseMessage: '',
          sendSuccessMessage: false,
          successMessage: '',
          enableTemporaryDisable: false,
          disableDurationMinutes: 60,
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
    console.error('Erro na API de configuração:', error);
    return response.status(500).json({ error: 'Erro interno do servidor ao aceder à base de dados.' });
  }
};

