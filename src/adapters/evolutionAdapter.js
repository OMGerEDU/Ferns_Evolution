const evolution = require('../services/evolution');
const logger = require('../utils/logger');

/**
 * Adapter for Evolution API
 * Normalizes payloads and wraps sending logic
 */
const evolutionAdapter = {
    /**
     * Normalize Evolution webhook payload to internal MessageEvent
     * @param {object} payload - Webhook body
     * @returns {object|null} MessageEvent or null if invalid
     */
    normalize: (payload) => {
        const data = payload.data;
        if (!data || !data.message) return null;

        const message = data.message;
        const key = message.key;
        if (!key || key.fromMe) return null; // Loop prevention

        const messageContent = message.message;

        // Extract text content (for text messages or captions)
        const text = messageContent?.conversation ||
            messageContent?.extendedTextMessage?.text ||
            messageContent?.imageMessage?.caption ||
            messageContent?.videoMessage?.caption ||
            null;

        // Determine message type and extract URL for media
        let messageType = 'text';
        let mediaUrl = null;

        if (messageContent?.audioMessage) {
            messageType = 'audio';
            mediaUrl = messageContent.audioMessage.url;
        } else if (messageContent?.imageMessage) {
            messageType = 'image';
            mediaUrl = messageContent.imageMessage.url;
        } else if (messageContent?.videoMessage) {
            messageType = 'video';
            mediaUrl = messageContent.videoMessage.url;
        } else if (messageContent?.documentMessage) {
            messageType = 'document';
            mediaUrl = messageContent.documentMessage.url;
        } else if (!text) {
            // No text and no recognized media type
            return null;
        }

        return {
            provider: 'evolution',
            instanceName: payload.instance, // Specific to Evolution
            from: key.remoteJid,
            content: {
                type: messageType,
                text: text,
                url: mediaUrl
            },
            raw: payload // Keep raw for debugging
        };
    },

    /**
     * Send a message via Evolution API
     * @param {string} instanceName 
     * @param {string} to - Remote JID
     * @param {object} content - { type: 'text'|'interactive', ... }
     */
    sendMessage: async (instanceName, to, content) => {
        if (content.type === 'text') {
            return await evolution.sendText(instanceName, to, content.text);
        }

        if (content.type === 'audio') {
            return await evolution.sendAudio(instanceName, to, content.url);
        }

        if (content.type === 'interactive') {
            const { title, description, footer, buttons } = content.params || {};

            // Format buttons for Evolution API
            const formattedButtons = (buttons || []).map((btn, idx) => ({
                type: 'reply',
                reply: {
                    id: btn.id || `btn_${idx}`,
                    displayText: btn.text
                }
            }));

            return await evolution.sendButtons(instanceName, to, {
                title,
                description,
                footer,
                buttons: formattedButtons
            });
        }

        logger.warn(`EvolutionAdapter: Unsupported content type ${content.type}`);
    }
};

module.exports = evolutionAdapter;
