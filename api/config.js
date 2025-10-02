// Arquivo: api/config.js
// Esta é uma Função Serverless que a Vercel usará.
// Ela se conecta ao Vercel KV para ler e salvar as configurações.

const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const configKey = 'whatsapp-bot-config';

  // Se a requisição for GET, busca a configuração
  if (req.method === 'GET') {
    try {
      let config = await kv.get(configKey);
      // Se não houver configuração salva, retorna valores padrão
      if (!config) {
        config = {
          prefix: "-- *NOVO PEDIDO* --",
          responseMessage: "Sua mensagem não parece ser um pedido. Por favor, use nosso cardápio online.",
          sendSuccessMessage: true,
          successMessage: "Pedido recebido com sucesso!",
          enableTemporaryDisable: true,
          disableDurationMinutes: 5
        };
      }
      return res.status(200).json(config);
    } catch (error) {
      console.error("Erro ao ler configuração do Vercel KV:", error);
      return res.status(500).json({ error: 'Erro ao ler a configuração.' });
    }
  }

  // Se a requisição for POST, salva a nova configuração
  if (req.method === 'POST') {
    try {
      const newConfig = req.body;
      if (newConfig.prefix === undefined || newConfig.responseMessage === undefined) {
        return res.status(400).json({ error: 'Prefixo e mensagem de resposta são obrigatórios.' });
      }
      await kv.set(configKey, newConfig);
      return res.status(200).json({ success: true, message: 'Configuração salva na Vercel!' });
    } catch (error) {
      console.error("Erro ao salvar configuração no Vercel KV:", error);
      return res.status(500).json({ error: 'Erro ao salvar a configuração.' });
    }
  }

  // Se for outro método (PUT, DELETE, etc.), retorna erro
  return res.status(405).json({ error: `Método ${req.method} não permitido.` });
};
