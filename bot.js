// Arquivo: bot.js
// Versão final que se conecta ao Vercel KV de forma independente e robusta.

const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@vercel/kv');

let client;
const temporarilyDisabled = {};

// O bot cria a sua própria ligação à base de dados usando as variáveis de ambiente
const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

// Validação crucial para garantir que as variáveis existem antes de continuar
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("ERRO FATAL: As variáveis de ambiente KV_REST_API_URL e KV_REST_API_TOKEN não foram encontradas no ambiente do bot. Verifique a aba 'Variables' na Railway.");
    process.exit(1); // Encerra o processo para evitar crashes contínuos
}

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

const getClient = () => client;

async function startBot() {
    console.log("Iniciando o bot do WhatsApp...");

    client = new Client({
        authStrategy: new LocalAuth({ clientId: "bot-whatsapp-session" }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Args necessários para ambientes como a Railway
        }
    });

    client.on('message_create', async (message) => {
        if (message.fromMe) return;

        try {
            const config = await kv.get('bot-config');
            if (!config || !config.prefix) { // Verifica se a configuração e o prefixo existem
                console.log("Configuração ou prefixo não encontrados no banco de dados. Ignorando mensagem.");
                return;
            }

            const { prefix, responseMessage, sendSuccessMessage, successMessage, enableTemporaryDisable, disableDurationMinutes } = config;
            const chatId = message.from;
            const now = Date.now();

            // Lógica de desativação temporária
            if (temporarilyDisabled[chatId] && now < temporarilyDisabled[chatId]) {
                return;
            }
            if (temporarilyDisabled[chatId]) {
                delete temporarilyDisabled[chatId];
            }

            const messageText = message.body.trim();
            console.log(`[MSG] De: ${chatId} | Texto: "${messageText}"`);

            if (!messageText.startsWith(prefix)) {
                if (responseMessage) { // Só envia se a mensagem de resposta não for vazia
                    console.log(` -> Enviando resposta padrão.`);
                    await client.sendMessage(chatId, responseMessage);
                }
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
        console.error("ERRO CRÍTICO DURANTE A INICIALIZAÇÃO DO CLIENTE:", err);
    });
}

// Exporta apenas as funções que o server.js precisa
module.exports = { startBot, getClient };

