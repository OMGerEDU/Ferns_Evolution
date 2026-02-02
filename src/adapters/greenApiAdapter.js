const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Adapter for Green API
 * Docs: https://green-api.com/en/docs/api/
 */
const greenApiAdapter = {
    /**
     * Normalize Green API webhook payload to internal MessageEvent
     * @param {object} payload - Webhook body
     * @returns {object|null} MessageEvent or null if invalid
     */
    normalize: (payload) => {
        // Green API structure:
        // { typeWebhook: 'incomingMessageReceived', senderData: { chatId: '...' }, messageData: { ... } }

        if (payload.typeWebhook !== 'incomingMessageReceived' &&
            payload.typeWebhook !== 'outgoingMessageReceived') {
            return null; // Ignore status updates for now
        }

        const msgData = payload.messageData;
        if (!msgData || !msgData.textMessageData) return null;

        const text = msgData.textMessageData.textMessage;
        const from = payload.senderData.chatId; // e.g., "12345@c.us"

        // Loop prevention (approximate, Green API has 'outgoingMessageReceived')
        if (payload.typeWebhook === 'outgoingMessageReceived') return null;

        return {
            provider: 'greenapi',
            instanceName: String(payload.instanceData?.idInstance || 'unknown'),
            from: from,
            content: {
                type: 'text',
                text: text
            },
            raw: payload
        };
    },

    /**
     * Send a message via Green API
     * @param {string} instanceId 
     * @param {string} to - Remote JID (chatId)
     * @param {object} content - { type: 'text', text: '...' }
     */
    sendMessage: async (instanceId, to, content) => {
        // For Green API, we need credentials.
        // In a real app, these would be stored in the 'instances' table securely.
        // For this MVP/POC, we will assume:
        // instanceId = idInstance, and we need an API Token.
        // We'll trust the caller to pass usage configuration or env vars?
        // Actually, for the adapter pattern to work cleanly, the 'instanceName' or 'id'
        // usually maps to a DB record containing the credentials.

        // HACK: For MVP Poc, we'll try to read from Env if not provided, 
        // or just log it if we can't really send without user input credentials.

        /* 
           To make this work dynamically, we'd need:
           const creds = await db.getInstance(instanceId);
           const { apiToken } = creds;
        */

        if (content.type === 'text') {
            const apiToken = process.env.GREEN_API_TOKEN; // Placeholder for POC
            const idInstance = instanceId;

            if (!apiToken || !idInstance) {
                logger.warn('GreenAPI: Missing credentials (idInstance or GREEN_API_TOKEN)');
                return;
            }

            const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`;

            try {
                await axios.post(url, {
                    chatId: to,
                    message: content.text
                });
                logger.info(`GreenAPI: Sent message to ${to}`);
            } catch (error) {
                logger.error('GreenAPI Send Failed', { error: error.message });
            }
        }
    }
};

module.exports = greenApiAdapter;
