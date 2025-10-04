// Arquivo: script.js

// Conexão com o bot rodando na Railway
const WEBSOCKET_URL = 'wss://botwhatsapp-production-a015.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('config-form');
    const statusMessage = document.getElementById('status-message');

    // --- Elementos da Interface (UI) ---
    const sendSuccessMessageCheckbox = document.getElementById('sendSuccessMessage');
    const successMessageGroup = document.getElementById('success-message-group');
    const enableTemporaryDisableCheckbox = document.getElementById('enableTemporaryDisable');
    const disableDurationGroup = document.getElementById('disable-duration-group');

    // --- Elementos de Status do Bot ---
    const botStatusDiv = document.getElementById('bot-status');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const qrCodeContainer = document.getElementById('qrcode');

    function toggleSuccessMessage() {
        successMessageGroup.style.display = sendSuccessMessageCheckbox.checked ? 'block' : 'none';
    }

    function toggleDisableDuration() {
        disableDurationGroup.style.display = enableTemporaryDisableCheckbox.checked ? 'block' : 'none';
    }

    sendSuccessMessageCheckbox.addEventListener('change', toggleSuccessMessage);
    enableTemporaryDisableCheckbox.addEventListener('change', toggleDisableDuration);

    // Carregar configuração inicial da API da Vercel
    fetch('/api/config')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao carregar configuração.');
            }
            return response.json();
        })
        .then(data => {
            form.prefix.value = data.prefix || '';
            form.responseMessage.value = data.responseMessage || '';
            form.sendSuccessMessage.checked = data.sendSuccessMessage || false;
            form.successMessage.value = data.successMessage || '';
            form.enableTemporaryDisable.checked = data.enableTemporaryDisable || false;
            form.disableDurationMinutes.value = data.disableDurationMinutes || 1440;
            toggleSuccessMessage();
            toggleDisableDuration();
        })
        .catch(error => {
            console.error('Erro ao carregar configuração:', error);
            statusMessage.textContent = 'Erro ao carregar configuração.';
            statusMessage.className = 'error';
        });

    // Evento de submit do formulário para salvar a configuração
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const configData = Object.fromEntries(formData.entries());

        // Converte os checkboxes para booleanos
        configData.sendSuccessMessage = sendSuccessMessageCheckbox.checked;
        configData.enableTemporaryDisable = enableTemporaryDisableCheckbox.checked;

        statusMessage.textContent = 'Salvando...';
        statusMessage.className = '';

        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                statusMessage.textContent = data.message;
                statusMessage.className = 'success';
            } else {
                statusMessage.textContent = data.error || 'Ocorreu um erro.';
                statusMessage.className = 'error';
            }
        })
        .catch(error => {
            console.error('Erro ao salvar configuração:', error);
            statusMessage.textContent = 'Erro de conexão ao salvar.';
            statusMessage.className = 'error';
        })
        .finally(() => {
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = '';
            }, 3000);
        });
    });

    // --- LÓGICA DO WEBSOCKET PARA O STATUS DO BOT ---
    let socket;

    function connectWebSocket() {
        console.log(`Conectando ao bot em ${WEBSOCKET_URL}...`);
        socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = function() {
            console.log("Conexão WebSocket estabelecida.");
            statusIcon.className = 'status-icon connecting';
            statusText.textContent = 'Conectado ao servidor. Aguardando status do bot...';
        };

        socket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'qr':
                    statusIcon.className = 'status-icon disconnected';
                    statusText.textContent = 'Aguardando conexão! Escaneie o QR Code abaixo:';
                    qrCodeContainer.innerHTML = ''; // Limpa QR anterior
                    new QRCode(qrCodeContainer, {
                        text: message.data,
                        width: 200,
                        height: 200,
                    });
                    break;
                case 'ready':
                    statusIcon.className = 'status-icon connected';
                    statusText.textContent = 'Bot conectado ao WhatsApp e pronto!';
                    qrCodeContainer.innerHTML = '<p>Conectado!</p>';
                    break;
                case 'disconnected':
                    statusIcon.className = 'status-icon disconnected';
                    statusText.textContent = `Bot desconectado. Motivo: ${message.data}`;
                    qrCodeContainer.innerHTML = '';
                    break;
                case 'auth_failure':
                     statusIcon.className = 'status-icon disconnected';
                    statusText.textContent = `Falha na autenticação: ${message.data}`;
                    qrCodeContainer.innerHTML = '';
                    break;
            }
        };

        socket.onclose = function() {
            console.log("Conexão WebSocket fechada.");
            statusIcon.className = 'status-icon disconnected';
            statusText.textContent = 'Desconectado do servidor do bot. Tentando reconectar em 5 segundos...';
            qrCodeContainer.innerHTML = '';
            setTimeout(connectWebSocket, 5000); // Tenta reconectar
        };

        socket.onerror = function(error) {
            console.error("Erro no WebSocket:", error);
            statusText.textContent = 'Erro de conexão com o servidor do bot.';
        };
    }

    connectWebSocket(); // Inicia a conexão
});

