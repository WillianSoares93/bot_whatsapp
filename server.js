// Arquivo: server.js
// Versão final, simplificada e corrigida para rodar na Railway.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { startBot, getClient } = require('./bot');

const { PORT = 3000 } = process.env;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    startBot(); // O bot agora inicializa-se de forma independente e robusta
});

process.on('SIGINT', async () => {
    const client = getClient();
    if (client) await client.destroy();
    process.exit(0);
});

