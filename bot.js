// Arquivo: bot.js (Modificado)
// Agora o bot busca as configurações do Vercel KV em vez de um arquivo local.
require('dotenv').config();
const { kv } = require('@vercel/kv');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

// Declaramos o cliente em um escopo mais amplo para que possa ser exportado.
let client;
const temporarilyDisabled = {};
const configKey = 'whatsapp-bot-config';

function startBot() {
    console.log("Iniciando o bot do WhatsApp...");

    client = new Client({
        authStrategy: new LocalAuth({ clientId: "seu-bot-id" }),
        puppeteer: {
            args: ['--no-sandbox'], // Adicionado para compatibilidade com alguns ambientes de servidor
        }
    });

    client.on('qr', (qr) => {
        console.log('--------------------------------------------------');
        console.log('ESCANEAR O QR CODE ABAIXO COM O WHATSAPP DO SEU CELULAR:');
        qrcode.generate(qr, { small: true });
        console.log('--------------------------------------------------');
    });

    client.on('ready', () => {
        console.log('==================================================');
        console.log('✅ Cliente WhatsApp conectado e pronto para uso!');
        console.log('==================================================');
    });

    client.on('auth_failure', msg => {
        console.error('❌ ERRO DE AUTENTICAÇÃO:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 Cliente WhatsApp foi desconectado:', reason);
        client.initialize();
    });

    client.on('message_create', async (message) => {
        if (message.fromMe) {
            return;
        }

        let config;
        try {
            config = await kv.get(configKey);
            if (!config) {
                console.error("CONFIGURAÇÃO NÃO ENCONTRADA! Verifique o Vercel KV e suas variáveis de ambiente (.env).");
                return;
            }
        } catch (err) {
            console.error("ERRO ao buscar configuração do Vercel KV:", err);
            return;
        }

        const { prefix, responseMessage, sendSuccessMessage, successMessage, enableTemporaryDisable, disableDurationMinutes } = config;

        const chatId = message.from;
        const now = Date.now();

        if (temporarilyDisabled[chatId] && now < temporarilyDisabled[chatId]) {
            console.log(` -> Resposta padrão desativada para ${chatId} até ${new Date(temporarilyDisabled[chatId]).toLocaleTimeString()}`);
            return;
        }

        if (temporarilyDisabled[chatId]) {
            delete temporarilyDisabled[chatId];
            console.log(` -> Período de desativação expirou para ${chatId}.`);
        }

        const messageText = message.body.trim();
        console.log(`[NOVA MENSAGEM] De: ${chatId} | Mensagem: "${messageText}"`);

        if (!messageText.startsWith(prefix)) {
            console.log(` -> Mensagem não corresponde ao prefixo. Enviando resposta padrão...`);
            client.sendMessage(chatId, responseMessage)
                .then(() => console.log(` -> Resposta enviada com sucesso para ${chatId}`))
                .catch(e => console.error(` -> ERRO ao enviar resposta para ${chatId}:`, e));
        } else {
            console.log(` -> Mensagem corresponde ao prefixo.`);
            if (sendSuccessMessage && successMessage) {
                console.log(` -> Enviando resposta de sucesso...`);
                client.sendMessage(chatId, successMessage)
                    .then(() => {
                        console.log(` -> Resposta de sucesso enviada para ${chatId}`);
                        if (enableTemporaryDisable && disableDurationMinutes > 0) {
                            const expiryTimestamp = now + (disableDurationMinutes * 60 * 1000);
                            temporarilyDisabled[chatId] = expiryTimestamp;
                            console.log(` -> Resposta padrão desativada para ${chatId} por ${disableDurationMinutes} minuto(s).`);
                        }
                    })
                    .catch(e => console.error(` -> ERRO ao enviar resposta de sucesso para ${chatId}:`, e));
            } else {
                console.log(` -> Nenhuma ação necessária.`);
            }
        }
    });

    client.initialize().catch(err => {
        console.error("ERRO DURANTE A INICIALIZAÇÃO DO CLIENTE WHATSAPP:", err);
    });
}

module.exports = { startBot, getClient: () => client };
