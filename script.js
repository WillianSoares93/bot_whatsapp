// Arquivo: script.js

// IMPORTANTE: Mude esta URL para a URL do seu bot na Railway (ex: wss://seu-bot-production.up.railway.app)
const WEBSOCKET_URL = 'ws://localhost:3000'; 

document.addEventListener('DOMContentLoaded', () => {
    // Lógica do formulário (existente)
    const form = document.getElementById('config-form');
    const statusMessage = document.getElementById('status-message');
    const sendSuccessMessageCheckbox = document.getElementById('sendSuccessMessage');
    const successMessageGroup = document.getElementById('success-message-group');
    const enableTemporaryDisableCheckbox = document.getElementById('enableTemporaryDisable');
    const disableDurationGroup = document.getElementById('disable-duration-group');

    // Novos elementos para status do bot e QR Code
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const qrContainer = document.getElementById('qr-container');
    const qrcodeElement = document.getElementById('qrcode');
    const reconnectButton = document.getElementById('reconnect-button');
    let qrCodeInstance = null;

    function toggleSuccessMessage() {
        successMessageGroup.style.display = sendSuccessMessageCheckbox.checked ? 'block' : 'none';
    }

    function toggleDisableDuration() {
        disableDurationGroup.style.display = enableTemporaryDisableCheckbox.checked ? 'block' : 'none';
    }

    sendSuccessMessageCheckbox.addEventListener('change', toggleSuccessMessage);
    enableTemporaryDisableCheckbox.addEventListener('change', toggleDisableDuration);

    // Carregar configuração do formulário
    fetch('/api/config')
        .then(response => response.json())
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
        .catch(error => console.error('Erro ao carregar configuração:', error));

    // Salvar configuração do formulário
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const config = Object.fromEntries(formData.entries());
        config.sendSuccessMessage = sendSuccessMessageCheckbox.checked;
        config.enableTemporaryDisable = enableTemporaryDisableCheckbox.checked;

        statusMessage.textContent = 'Salvando...';
        statusMessage.className = '';

        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        })
        .then(response => response.json())
        .then(data => {
            statusMessage.textContent = data.success ? 'Configuração salva!' : 'Erro ao salvar.';
            statusMessage.className = data.success ? 'success' : 'error';
        })
        .catch(() => {
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

    // --- LÓGICA DO WEBSOCKET ---
    function connectWebSocket() {
        console.log(`Conectando ao bot em ${WEBSOCKET_URL}...`);
        statusText.textContent = 'Conectando ao servidor do bot...';
        statusIndicator.className = 'connecting';
        qrContainer.style.display = 'none';
        reconnectButton.style.display = 'none';

        const socket = new WebSocket(WEBSOCKET_URL);

        socket.onopen = () => {
            console.log('Conexão WebSocket estabelecida.');
            statusText.textContent = 'Aguardando QR Code...';
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Mensagem recebida do bot:', message.type);

            switch (message.type) {
                case 'qr':
                    statusText.textContent = 'QR Code recebido! Escaneie por favor.';
                    qrContainer.style.display = 'block';
                    // Limpa o QR code antigo e gera um novo
                    if (qrCodeInstance) {
                        qrCodeInstance.clear();
                        qrCodeInstance.makeCode(message.data);
                    } else {
                        qrCodeInstance = new QRCode(qrcodeElement, {
                            text: message.data,
                            width: 256,
                            height: 256,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.H
                        });
                    }
                    break;
                case 'ready':
                    statusText.textContent = 'Bot conectado ao WhatsApp!';
                    statusIndicator.className = 'connected';
                    qrContainer.style.display = 'none';
                    break;
                case 'disconnected':
                    statusText.textContent = 'Bot desconectado do WhatsApp.';
                    statusIndicator.className = 'disconnected';
                    qrContainer.style.display = 'none';
                    break;
                case 'auth_failure':
                    statusText.textContent = 'Falha na autenticação. Recarregue e tente um novo QR Code.';
                    statusIndicator.className = 'disconnected';
                    break;
            }
        };

        socket.onclose = () => {
            console.log('Conexão WebSocket fechada.');
            statusText.textContent = 'Desconectado. Clique para reconectar.';
            statusIndicator.className = 'disconnected';
            reconnectButton.style.display = 'block';
        };

        socket.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            statusText.textContent = 'Erro de conexão com o bot.';
            statusIndicator.className = 'disconnected';
        };
    }

    reconnectButton.addEventListener('click', connectWebSocket);

    // Inicia a primeira conexão
    connectWebSocket();
});
