// Arquivo: server.js
// Este é o arquivo principal do seu bot.

// A linha que causava o erro (require('dotenv').config()) foi removida.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { startBot, getClient, setKvClient } = require('./bot');
const { createClient } = require('@vercel/kv');

// --- Configuração das Variáveis de Ambiente ---
// A Railway injeta as variáveis automaticamente a partir da aba "Variables".
const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
const PORT = process.env.PORT || 3000;

// Validação para garantir que as variáveis foram carregadas
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("ERRO FATAL: As variáveis de ambiente KV_REST_API_URL e KV_REST_API_TOKEN não foram encontradas. Verifique a aba 'Variables' no seu projeto da Railway.");
    process.exit(1); // Encerra o processo se as variáveis estiverem ausentes
}

// --- Inicialização do App e Servidor ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Criação e configuração do cliente do banco de dados (Vercel KV)
const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});
setKvClient(kv); // Injeta o cliente KV no módulo do bot para que ele possa ler a configuração

// --- Lógica do WebSocket ---
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
        const qrListener = (qr) => sendStatus('qr', qr);
        const readyListener = () => sendStatus('ready', 'Conectado');
        const disconnectedListener = (reason) => sendStatus('disconnected', reason);

        emitter.on('qr', qrListener);
        emitter.on('ready', readyListener);
        emitter.on('disconnected', disconnectedListener);

        // Envia o status atual imediatamente após a conexão
        client.getState().then(state => {
            if (state === 'CONNECTED') {
                sendStatus('ready');
            }
        }).catch(() => { /* ignora erro se não conseguir pegar o estado */ });

        ws.on('close', () => {
            console.log('Painel de controle desconectado.');
            emitter.removeListener('qr', qrListener);
            emitter.removeListener('ready', readyListener);
            emitter.removeListener('disconnected', disconnectedListener);
        });
    }
});

// --- Inicialização do Servidor e Bot ---
server.listen(PORT, () => {
    console.log(`🚀 Servidor escutando na porta ${PORT}`);
    startBot(); // Inicia o bot do WhatsApp
});

process.on('SIGINT', async () => {
    console.log('\nDesligando o bot e o servidor...');
    const client = getClient();
    if (client) {
        await client.destroy();
        console.log('Cliente WhatsApp desconectado.');
    }
    process.exit(0);
});

