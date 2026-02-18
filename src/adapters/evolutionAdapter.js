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
        if (!data) return null;

        // Evolution API can send key at top-level (data.key) or nested (data.message.key)
        const key = data.key || data.message?.key;
        if (!key) return null;

        // Message content may be nested (data.message.message) or direct (data.message)
        const messageContentRaw = data.message?.message ? data.message.message : data.message;
        if (!messageContentRaw) return null;

        // Some events wrap real content in ephemeral/view-once containers.
        const messageContent = messageContentRaw.ephemeralMessage?.message ||
            messageContentRaw.viewOnceMessage?.message ||
            messageContentRaw.viewOnceMessageV2?.message ||
            messageContentRaw;

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
        } else if (messageContent?.stickerMessage) {
            messageType = 'sticker';
            mediaUrl = messageContent.stickerMessage.url;
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

        // Normalize reply target for "Message Yourself" chat
        let from = key.remoteJid;
        if (key.fromMe && key.remoteJid?.endsWith('@lid') && payload.sender) {
            from = payload.sender.includes('@') ? payload.sender : `${payload.sender}@s.whatsapp.net`;
        }

        // Parse quoted/replied message for command handlers (e.g. !sticker on reply)
        const contextInfo = messageContent.extendedTextMessage?.contextInfo ||
            messageContent.imageMessage?.contextInfo ||
            messageContent.videoMessage?.contextInfo ||
            messageContent.documentMessage?.contextInfo ||
            data.contextInfo;
        let quoted = null;

        if (contextInfo?.quotedMessage) {
            const qMsg = contextInfo.quotedMessage;
            let qType = 'unknown';
            let qText = '';
            let qMediaUrl = null;

            if (qMsg.conversation) {
                qType = 'text';
                qText = qMsg.conversation;
            } else if (qMsg.extendedTextMessage) {
                qType = 'text';
                qText = qMsg.extendedTextMessage.text || '';
            } else if (qMsg.imageMessage) {
                qType = 'image';
                qText = qMsg.imageMessage.caption || '';
                qMediaUrl = qMsg.imageMessage.url || null;
            } else if (qMsg.videoMessage) {
                qType = 'video';
                qText = qMsg.videoMessage.caption || '';
                qMediaUrl = qMsg.videoMessage.url || null;
            } else if (qMsg.stickerMessage) {
                qType = 'sticker';
                qMediaUrl = qMsg.stickerMessage.url || null;
            } else if (qMsg.viewOnceMessage || qMsg.viewOnceMessageV2) {
                const voMsg = qMsg.viewOnceMessage?.message || qMsg.viewOnceMessageV2?.message;
                if (voMsg?.imageMessage) {
                    qType = 'image';
                    qText = voMsg.imageMessage.caption || '';
                    qMediaUrl = voMsg.imageMessage.url || null;
                } else if (voMsg?.videoMessage) {
                    qType = 'video';
                    qText = voMsg.videoMessage.caption || '';
                    qMediaUrl = voMsg.videoMessage.url || null;
                }
            }

            quoted = {
                key: {
                    id: contextInfo.stanzaId,
                    remoteJid: contextInfo.remoteJid || key.remoteJid,
                    participant: contextInfo.participant
                },
                type: qType,
                text: qText,
                media_url: qMediaUrl,
                raw: qMsg
            };
        }

        return {
            provider: 'evolution',
            instanceName: payload.instance,
            // Match structure expected by CommandRouter and commands
            id: key.id,
            remoteJid: key.remoteJid,
            from, // Required by automationEngine
            sender_jid: key.participant || key.remoteJid, // For groups vs private
            fromMe: key.fromMe,
            isGroup: key.remoteJid?.endsWith('@g.us'),
            pushName: data.pushName,
            messageTimestamp: data.messageTimestamp,
            // Backward-compatible fields used by command modules
            message_type: messageType,
            text,
            media_url: mediaUrl,
            quoted,
            content: {
                type: messageType,
                text: text,
                url: mediaUrl
            },
            raw: payload
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
