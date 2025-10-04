// Arquivo: bot.js
// Versão final que se conecta ao Vercel KV de forma independente.

const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@vercel/kv');

let client;
const temporarilyDisabled = {};

// O bot agora cria sua própria conexão com o banco de dados
const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("ERRO FATAL: Variáveis de ambiente KV não encontradas no bot.");
    process.exit(1);
}
const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});


const getClient = () => client;

async function startBot() {
    console.log("Iniciando o bot do WhatsApp...");

    client = new Client({
        authStrategy: new LocalAuth({ clientId: "bot-whatsapp" }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('message_create', async (message) => {
        if (message.fromMe) return;

        try {
            const config = await kv.get('bot-config');
            if (!config) {
                console.log("Nenhuma configuração encontrada no banco de dados.");
                return;
            }

            const { prefix, responseMessage, sendSuccessMessage, successMessage, enableTemporaryDisable, disableDurationMinutes } = config;
            const chatId = message.from;
            const now = Date.now();

            if (temporarilyDisabled[chatId] && now < temporarilyDisabled[chatId]) {
                return;
            }
            if (temporarilyDisabled[chatId]) {
                delete temporarilyDisabled[chatId];
            }

            const messageText = message.body.trim();
            console.log(`[MSG] De: ${chatId} | Texto: "${messageText}"`);

            if (!messageText.startsWith(prefix)) {
                console.log(` -> Enviando resposta padrão.`);
                await client.sendMessage(chatId, responseMessage);
            } else {
                console.log(` -> Prefixo correspondido.`);
                if (sendSuccessMessage && successMessage) {
                    await client.sendMessage(chatId, successMessage);
                    if (enableTemporaryDisable && disableDurationMinutes > 0) {
                        const expiryTimestamp = now + (disableDurationMinutes * 60 * 1000);
                        temporarilyDisabled[chatId] = expiryTimestamp;
                        console.log(` -> Resposta desativada para ${chatId} por ${disableDurationMinutes} min.`);
                    }
                }
            }
        } catch (err) {
            console.error("ERRO ao processar mensagem:", err);
        }
    });

    client.initialize().catch(err => {
        console.error("ERRO DURANTE A INICIALIZAÇÃO DO CLIENTE:", err);
    });
}

// Exporta apenas as funções necessárias
module.exports = { startBot, getClient };

