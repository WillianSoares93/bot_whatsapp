// Arquivo: server.js
// Este é o arquivo principal do seu bot.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { startBot, getClient, setKvClient } = require('./bot');
const { createClient } = require('@vercel/kv');

// --- Configuração das Variáveis de Ambiente ---
// A Railway injeta as variáveis automaticamente.
const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
const PORT = process.env.PORT || 3000;

// Validação das variáveis de ambiente
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("ERRO: As variáveis de ambiente KV_REST_API_URL e KV_REST_API_TOKEN são obrigatórias.");
    process.exit(1);
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
setKvClient(kv); // Injeta o cliente KV no módulo do bot

// --- Lógica do WebSocket ---
wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado ao servidor.');

    // Função para enviar o status do bot para o cliente
    const sendStatus = (type, data) => {
        try {
            ws.send(JSON.stringify({ type, data }));
        } catch (error) {
            console.error('Erro ao enviar mensagem via WebSocket:', error);
        }
    };
    
    const client = getClient();
    if (client) {
        // Envia o status atual assim que o cliente se conecta
        client.getState().then(state => {
            if (state === 'CONNECTED') {
                sendStatus('ready', 'Conectado');
            }
        }).catch(() => {
            // Se não conseguir o estado, é porque precisa de QR
             sendStatus('qr', client.qr); 
        });
    }


    // Reencaminha eventos do bot para o cliente WebSocket
    const clientEmitter = getClient()?.pupPage?.events();
    if (clientEmitter) {
        clientEmitter.on('qr', (qr) => sendStatus('qr', qr));
        clientEmitter.on('ready', () => sendStatus('ready', 'Conectado'));
        clientEmitter.on('disconnected', (reason) => sendStatus('disconnected', reason));
        clientEmitter.on('auth_failure', (msg) => sendStatus('auth_failure', msg));
    }
    
    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado.');
    });
});

// --- Inicialização do Servidor e Bot ---
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    startBot(); // Inicia o bot do WhatsApp
});

// --- Encerramento Gracioso ---
process.on('SIGINT', async () => {
    console.log('\nDesligando o bot e o servidor...');
    const client = getClient();
    if (client) {
        await client.destroy();
        console.log('Cliente WhatsApp desconectado.');
    }
    server.close(() => {
        console.log('Servidor encerrado.');
        process.exit(0);
    });
});

