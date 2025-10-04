// Arquivo: server.js
// Versão final e corrigida para rodar na Railway.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { startBot, getClient, setKvClient } = require('./bot');
const { createClient } = require('@vercel/kv');

const { KV_REST_API_URL, KV_REST_API_TOKEN, PORT = 3000 } = process.env;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("ERRO FATAL: Variáveis de ambiente KV_REST_API_URL e KV_REST_API_TOKEN não encontradas.");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

// Injeta o cliente do banco de dados no módulo do bot.
setKvClient(kv);

wss.on('connection', (ws) => {
    console.log('Painel de controle conectado via WebSocket.');
    
    const client = getClient();
    const emitter = client?.pupPage?.events();

    const sendStatus = (type, data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, data }));
        }
    };

    if (emitter) {
        const listeners = {
            qr: (qr) => sendStatus('qr', qr),
            ready: () => sendStatus('ready', 'Conectado'),
            disconnected: (reason) => sendStatus('disconnected', reason),
        };

        Object.keys(listeners).forEach(event => emitter.on(event, listeners[event]));

        // Envia status atual
        client.getState().then(state => {
            if (state === 'CONNECTED') sendStatus('ready');
        }).catch(() => {});

        ws.on('close', () => {
            console.log('Painel de controle desconectado.');
            Object.keys(listeners).forEach(event => emitter.removeListener(event, listeners[event]));
        });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor escutando na porta ${PORT}`);
    startBot();
});

process.on('SIGINT', async () => {
    const client = getClient();
    if (client) await client.destroy();
    process.exit(0);
});

