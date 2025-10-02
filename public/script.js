// Arquivo: public/script.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('config-form');
    const statusMessage = document.getElementById('status-message');
    
    const sendSuccessMessageCheckbox = document.getElementById('sendSuccessMessage');
    const successMessageGroup = document.getElementById('success-message-group');
    
    const enableTemporaryDisableCheckbox = document.getElementById('enableTemporaryDisable');
    const disableDurationGroup = document.getElementById('disable-duration-group');

    function toggleSuccessMessage() {
        successMessageGroup.style.display = sendSuccessMessageCheckbox.checked ? 'block' : 'none';
    }

    function toggleDisableDuration() {
        disableDurationGroup.style.display = enableTemporaryDisableCheckbox.checked ? 'block' : 'none';
    }

    sendSuccessMessageCheckbox.addEventListener('change', toggleSuccessMessage);
    enableTemporaryDisableCheckbox.addEventListener('change', toggleDisableDuration);

    fetch('/api/config')
        .then(response => response.json())
        .then(data => {
            form.prefix.value = data.prefix || '';
            form.responseMessage.value = data.responseMessage || '';
            
            form.sendSuccessMessage.checked = data.sendSuccessMessage || false;
            form.successMessage.value = data.successMessage || '';
            
            form.enableTemporaryDisable.checked = data.enableTemporaryDisable || false;
            form.disableDurationMinutes.value = data.disableDurationMinutes || 1440; // Alterado para minutos
            
            toggleSuccessMessage();
            toggleDisableDuration();
        })
        .catch(error => {
            console.error('Erro ao carregar configuração:', error);
            statusMessage.textContent = 'Erro ao carregar configuração.';
            statusMessage.className = 'error';
        });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const prefix = form.prefix.value;
        const responseMessage = form.responseMessage.value;
        const sendSuccessMessage = form.sendSuccessMessage.checked;
        const successMessage = form.successMessage.value;
        const enableTemporaryDisable = form.enableTemporaryDisable.checked;
        const disableDurationMinutes = form.disableDurationMinutes.value; // Alterado para minutos

        statusMessage.textContent = 'Salvando...';
        statusMessage.className = '';

        fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prefix, 
                responseMessage, 
                sendSuccessMessage, 
                successMessage, 
                enableTemporaryDisable, 
                disableDurationMinutes // Alterado para minutos
            }),
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
});

