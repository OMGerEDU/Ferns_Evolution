const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');

/**
 * Create Axios instance for Evolution API
 */
const client = axios.create({
    baseURL: config.evolution.url,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add API key to all requests
client.interceptors.request.use((request) => {
    if (config.evolution.apiKey) {
        request.headers['apikey'] = config.evolution.apiKey;
    }
    logger.debug('Evolution API request', {
        method: request.method,
        url: request.url,
    });
    return request;
});

// Log responses
client.interceptors.response.use(
    (response) => {
        logger.debug('Evolution API response', {
            status: response.status,
            url: response.config.url,
        });
        return response;
    },
    (error) => {
        logger.error('Evolution API error', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
            data: error.response?.data,
        });
        throw error;
    }
);

/**
 * Create a new WhatsApp instance
 */
async function createInstance(instanceName, options = {}) {
    const payload = {
        instanceName,
        qrcode: options.qrcode !== false, // Default true
        integration: options.integration || 'WHATSAPP-BAILEYS',
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post('/instance/create', payload)
    );

    return response.data;
}

/**
 * Delete an instance
 */
async function deleteInstance(instanceName) {
    const response = await retryWithBackoff(() =>
        client.delete(`/instance/delete/${instanceName}`)
    );

    return response.data;
}

/**
 * Get QR code for connecting
 */
async function connect(instanceName) {
    const response = await retryWithBackoff(() =>
        client.get(`/instance/connect/${instanceName}`)
    );

    return response.data;
}

/**
 * Fetch all instances
 */
async function fetchInstances() {
    const response = await retryWithBackoff(() =>
        client.get('/instance/fetchInstances')
    );

    return response.data;
}

/**
 * Get instance connection state
 */
async function getConnectionState(instanceName) {
    const response = await retryWithBackoff(() =>
        client.get(`/instance/connectionState/${instanceName}`)
    );

    return response.data;
}

/**
 * Logout instance (disconnect without deleting)
 */
async function logout(instanceName) {
    const response = await retryWithBackoff(() =>
        client.delete(`/instance/logout/${instanceName}`)
    );

    return response.data;
}

/**
 * Restart instance
 */
async function restart(instanceName) {
    const response = await retryWithBackoff(() =>
        client.put(`/instance/restart/${instanceName}`)
    );

    return response.data;
}

/**
 * Send text message
 */
async function sendText(instanceName, number, text, options = {}) {
    const payload = {
        number,
        text,
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendText/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send media message
 */
async function sendMedia(instanceName, number, mediaUrl, options = {}) {
    const payload = {
        number,
        media: mediaUrl,
        mediatype: options.mediatype || 'image',
        caption: options.caption || '',
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendMedia/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Check if Evolution API is reachable
 */
async function healthCheck() {
    try {
        const response = await client.get('/health');
        return {
            healthy: true,
            data: response.data,
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
        };
    }
}

module.exports = {
    client,
    createInstance,
    deleteInstance,
    connect,
    fetchInstances,
    getConnectionState,
    logout,
    restart,
    sendText,
    sendMedia,
    healthCheck,
};
