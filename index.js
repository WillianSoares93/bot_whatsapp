// Arquivo: index.js
// Versão final que unifica server.js e bot.js para maior robustez na Railway.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@vercel/kv');

// --- Validação das Variáveis de Ambiente ---
const { KV_REST_API_URL, KV_REST_API_TOKEN, PORT = 3000 } = process.env;
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("ERRO FATAL: Variáveis de ambiente KV_... não encontradas. Verifique a aba 'Variables' na Railway.");
    process.exit(1);
}

// --- Clientes ---
const kv = createClient({ url: KV_REST_API_URL, token: KV_REST_API_TOKEN });
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-whatsapp-session" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Args para ambientes de servidor
    }
});

// --- Servidor WebSocket ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Painel de controle conectado via WebSocket.');
    const emitter = client.pupPage?.events();

    const sendStatus = (type, data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, data }));
    };

    if (emitter) {
        const listeners = {
            qr: (qr) => sendStatus('qr', qr),
            ready: () => sendStatus('ready', 'Conectado'),
            disconnected: (reason) => sendStatus('disconnected', reason),
        };
        Object.keys(listeners).forEach(event => emitter.on(event, listeners[event]));
        ws.on('close', () => {
            console.log('Painel de controle desconectado.');
            Object.keys(listeners).forEach(event => emitter.removeListener(event, listeners[event]));
        });
    }

    // Envia o status atual assim que o painel se conecta
    client.getState().then(state => {
        if (state === 'CONNECTED') sendStatus('ready');
    }).catch(() => {});
});

// --- Lógica do Bot WhatsApp ---
const temporarilyDisabled = {};
client.on('message_create', async (message) => {
    if (message.fromMe) return;
    try {
        const config = await kv.get('bot-config');
        if (!config || !config.prefix) {
            console.log("Configuração ou prefixo não encontrados no KV. Ignorando mensagem.");
            return;
        }

        const { prefix, responseMessage, sendSuccessMessage, successMessage, enableTemporaryDisable, disableDurationMinutes } = config;
        const chatId = message.from;
        const now = Date.now();

        if (temporarilyDisabled[chatId] && now < temporarilyDisabled[chatId]) return;
        if (temporarilyDisabled[chatId]) delete temporarilyDisabled[chatId];
        
        const messageText = message.body.trim();
        console.log(`[MSG] De: ${chatId} | Texto: "${messageText}"`);

        if (!messageText.startsWith(prefix)) {
            if (responseMessage) {
                await client.sendMessage(chatId, responseMessage);
            }
        } else {
            if (sendSuccessMessage && successMessage) {
                await client.sendMessage(chatId, successMessage);
                if (enableTemporaryDisable && disableDurationMinutes > 0) {
                    temporarilyDisabled[chatId] = now + (disableDurationMinutes * 60 * 1000);
                    console.log(` -> Resposta desativada para ${chatId} por ${disableDurationMinutes} min.`);
                }
            }
        }
    } catch (err) {
        console.error("ERRO ao processar mensagem:", err);
    }
});

// --- Inicialização ---
console.log("Iniciando o bot do WhatsApp...");
client.initialize().catch(err => console.error("ERRO CRÍTICO DURANTE A INICIALIZAÇÃO DO CLIENTE:", err));

server.listen(PORT, () => {
    console.log(`🚀 Servidor escutando na porta ${PORT}`);
});
