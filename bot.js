// Arquivo: bot.js
// Versão final que usa o Vercel KV em vez de um arquivo local.

const { Client, LocalAuth } = require('whatsapp-web.js');

let client;
let kv; // Variável para armazenar o cliente do banco de dados
const temporarilyDisabled = {};

// Função para o server.js "injetar" o cliente do banco de dados
const setKvClient = (kvClient) => {
  kv = kvClient;
};

const getClient = () => client;

async function startBot() {
    console.log("Iniciando o bot do WhatsApp...");

    client = new Client({
        authStrategy: new LocalAuth({ clientId: "bot-whatsapp" }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Args necessários para rodar em ambientes como a Railway
        }
    });

    // Os eventos de QR, Ready, etc., são agora emitidos para o WebSocket em server.js
    // Aqui focamos apenas na lógica de mensagem.

    client.on('message_create', async (message) => {
        if (message.fromMe) return;

        if (!kv) {
            console.error("Cliente KV não inicializado. Não é possível processar a mensagem.");
            return;
        }

        try {
            // Busca a configuração diretamente do Vercel KV
            const config = await kv.get('bot-config');

            if (!config) {
                console.log("Nenhuma configuração encontrada no banco de dados.");
                return;
            }

            const { prefix, responseMessage, sendSuccessMessage, successMessage, enableTemporaryDisable, disableDurationMinutes } = config;
            const chatId = message.from;
            const now = Date.now();

            if (temporarilyDisabled[chatId] && now < temporarilyDisabled[chatId]) {
                return; // Silenciosamente ignora se estiver desativado
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

// Exporta as funções necessárias
module.exports = { startBot, getClient, setKvClient };

