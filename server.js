// Arquivo: server.js (Modificado)
// Este arquivo agora serve para desenvolvimento local. Ele inicia a interface web
// e o bot, usando as mesmas variáveis de ambiente que a Vercel usará.
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const path = require('path');
const { kv } = require('@vercel/kv'); // Usa o Vercel KV para a API local
const { startBot, getClient } = require('./bot');

const app = express();
const PORT = 3000;
const configKey = 'whatsapp-bot-config';

app.use(express.json());
app.use(express.static('public')); // Serve o frontend

// Endpoint da API para desenvolvimento local, espelhando a função da Vercel
app.get('/api/config', async (req, res) => {
    try {
        const config = await kv.get(configKey);
        res.json(config);
    } catch (err) {
        console.error("Erro ao ler config do KV (servidor local):", err);
        res.status(500).json({ error: 'Erro ao ler a configuração.' });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        const newConfig = req.body;
        await kv.set(configKey, newConfig);
        res.json({ success: true, message: 'Configuração salva!' });
    } catch (err) {
        console.error("Erro ao salvar config no KV (servidor local):", err);
        res.status(500).json({ error: 'Erro ao salvar a configuração.' });
    }
});

app.listen(PORT, () => {
    console.log('==================================================');
    console.log(`🚀 Interface de configuração local rodando em: http://localhost:${PORT}`);
    console.log('==================================================');
    startBot();
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
