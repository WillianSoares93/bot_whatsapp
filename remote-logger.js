// Arquivo: remote-logger.js
// Módulo para gerir o envio de logs para um serviço externo (Logtail).

const { Logtail } = require("@logtail/node");

let logtail;

/**
 * Inicializa o cliente Logtail.
 * @param {string} sourceToken - O token da sua 'source' no Logtail.
 */
function init(sourceToken) {
    // Apenas reinicia se o token mudar para evitar recriações desnecessárias.
    if (sourceToken && (!logtail || logtail.sourceToken !== sourceToken)) {
        logtail = new Logtail(sourceToken);
        // Anexa o token ao objeto para verificação futura.
        logtail.sourceToken = sourceToken; 
        console.log("[LOGTAIL] Logger remoto inicializado com sucesso.");
    } else if (!sourceToken && logtail) {
        logtail = null;
        console.log("[LOGTAIL] Token removido, logs remotos desativados.");
    }
}

/**
 * Envia uma mensagem de log para o Logtail.
 * @param {string} message - A mensagem de log.
 * @param {string} level - O nível do log ('info', 'error', 'warn').
 * @param {object} metadata - Dados estruturados adicionais.
 */
function log(message, level = 'info', metadata = {}) {
    if (!logtail) {
        return; // Não faz nada se não estiver inicializado.
    }

    // A biblioteca Logtail tem métodos como .info(), .error(), etc.
    if (typeof logtail[level] === 'function') {
        logtail[level](message, metadata);
    } else {
        logtail.info(message, { ...metadata, originalLevel: level }); // Envia como 'info' se o nível for desconhecido
    }
}

module.exports = { init, log };
