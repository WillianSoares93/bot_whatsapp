// Arquivo: /api/config.js
// Esta é a função serverless que roda na Vercel para ler e salvar as configurações.

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      // Busca a configuração no banco de dados KV
      let config = await kv.get('bot-config');
      // Se não houver configuração, retorna valores padrão
      if (!config) {
        config = {
          prefix: '-- *NOVO PEDIDO* --',
          responseMessage: 'Sua mensagem padrão aqui.',
          sendSuccessMessage: false,
          successMessage: '',
          enableTemporaryDisable: false,
          disableDurationMinutes: 60,
        };
      }
      return response.status(200).json(config);
    } else if (request.method === 'POST') {
      // Salva a nova configuração no banco de dados KV
      await kv.set('bot-config', request.body);
      return response.status(200).json({ success: true, message: 'Configuração salva com sucesso!' });
    } else {
      // Método não permitido
      return response.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API de configuração:', error);
    return response.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

