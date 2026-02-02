const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * CNT-01: Evolution API Webhook Receiver
 * Handles incoming webhook events from Evolution API
 */

// In-memory storage for QR codes and pairing codes
// Format: { instanceName: { qrcode: 'base64...', pairingCode: '...', timestamp: Date } }
const qrCodeStore = new Map();

const db = require('../services/db');
const axios = require('axios');

// ... (keep existing route definition)

// Handle all evolution webhook events
// POST /api/webhooks/evolution/:event type
router.post('/evolution/:event?', async (req, res) => {
    try {
        const event = req.params.event || 'unknown';
        const data = req.body;

        const isVerboseEvent = event === 'qrcode-updated' || data.event === 'qrcode.updated' || event === 'connection-update';

        logger.info(`Webhook received: ${event}`, {
            event,
            instance: data.instance,
            type: data.type,
            fullBody: isVerboseEvent ? '[Verbose Details Suppressed]' : JSON.stringify(data).substring(0, 500)
        });

        // 1. Handle Internal Logic (QR Code Store)
        if (event === 'qrcode-updated' || data.event === 'qrcode.updated') {
            const instanceName = data.instance?.instanceName || data.instance;

            logger.info('QR Code received via webhook', {
                instanceName,
                hasBase64: !!data.data?.qrcode?.base64,
                hasPairingCode: !!data.data?.pairingCode
            });

            if (instanceName) {
                qrCodeStore.set(instanceName, {
                    qrcode: data.data?.qrcode?.base64 || data.data?.qrcode,
                    pairingCode: data.data?.pairingCode,
                    code: data.data?.code,
                    timestamp: new Date()
                });
            }
        }

        // 2. FORWARDING LOGIC
        const instanceName = data.instance?.instanceName || data.instance;
        if (instanceName) {
            try {
                // Fetch config
                const { rows } = await db.query(
                    'SELECT * FROM instance_webhooks WHERE instance_name = $1 AND enabled = true',
                    [instanceName]
                );

                if (rows.length > 0) {
                    const config = rows[0];
                    const subscribedEvents = config.events || [];
                    const subscribedSources = config.sources || []; // ['groups', 'private']

                    // Check Event Type
                    // normalize event name from params or body
                    const currentEvent = event === 'unknown' ? data.event : event;

                    if (subscribedEvents.includes(currentEvent) || subscribedEvents.includes('all')) {
                        let shouldForward = true;

                        // Check Sources (only for messages)
                        if (currentEvent === 'messages.upsert' || currentEvent === 'messages.update') {
                            const isGroup = data.data?.key?.remoteJid?.endsWith('@g.us') || data.data?.key?.remoteJid?.includes('-'); // Basic check

                            if (isGroup && !subscribedSources.includes('groups')) shouldForward = false;
                            if (!isGroup && !subscribedSources.includes('private')) shouldForward = false;
                        }

                        // Check Media
                        // If not allowed, we might strip it or skip? 
                        // Requirement says "allow media", implying if false we might not send it or strip it.
                        // For now, let's assuming forwarding the event but maybe stripping base64 if it's there?
                        // Evolution API usually sends media as part of message.
                        // Implementing "Allow Media" as: if false, and message is media, maybe don't forward or strip?
                        // Let's keep it simple: if media message and allow_media is false, SKIP.
                        if (config.allow_media === false && (data.data?.messageType === 'imageMessage' || data.data?.messageType === 'videoMessage' || data.data?.messageType === 'audioMessage' || data.data?.messageType === 'documentMessage')) {
                            logger.info(`Skipping webhook for ${instanceName}: Media not allowed`, { type: data.data?.messageType });
                            shouldForward = false;
                        }

                        if (!shouldForward) {
                            logger.warn(`Webhook dropped for ${instanceName}`, {
                                reason: 'Filtered by configuration',
                                event: currentEvent,
                                isFromMe: data.data?.key?.fromMe,
                                isGroup: data.data?.key?.remoteJid?.endsWith('@g.us')
                            });
                        }

                        if (shouldForward) {
                            // Build enriched webhook payload
                            const webhookPayload = {
                                event: currentEvent,
                                instance: instanceName,
                                timestamp: new Date().toISOString(),
                                raw_data: data // Include original data for reference
                            };

                            // Enrich message events with structured data
                            if (currentEvent === 'messages.upsert' || currentEvent === 'messages.update') {
                                const message = data.data;
                                const key = message?.key || {};
                                const messageContent = message?.message || {};

                                // Extract message type and content
                                let messageText = null;
                                let mediaUrl = null;
                                let messageType = 'unknown';

                                if (messageContent.conversation) {
                                    messageText = messageContent.conversation;
                                    messageType = 'text';
                                } else if (messageContent.extendedTextMessage) {
                                    messageText = messageContent.extendedTextMessage.text;
                                    messageType = 'text';
                                } else if (messageContent.imageMessage) {
                                    messageText = messageContent.imageMessage.caption || '';
                                    mediaUrl = messageContent.imageMessage.url;
                                    messageType = 'image';
                                } else if (messageContent.videoMessage) {
                                    messageText = messageContent.videoMessage.caption || '';
                                    mediaUrl = messageContent.videoMessage.url;
                                    messageType = 'video';
                                } else if (messageContent.audioMessage) {
                                    mediaUrl = messageContent.audioMessage.url;
                                    messageType = 'audio';
                                } else if (messageContent.documentMessage) {
                                    messageText = messageContent.documentMessage.caption || messageContent.documentMessage.fileName || '';
                                    mediaUrl = messageContent.documentMessage.url;
                                    messageType = 'document';
                                }

                                // Determine chat type
                                const remoteJid = key.remoteJid || '';
                                const isGroup = remoteJid.endsWith('@g.us');
                                const isFromMe = key.fromMe || false;

                                // Filter Outgoing Messages
                                if (isFromMe && !config.track_outgoing) {
                                    shouldForward = false;
                                }

                                // Select URL (Outgoing vs Incoming)
                                let targetUrl = config.url;
                                if (isFromMe && config.track_outgoing && config.outgoing_url) {
                                    targetUrl = config.outgoing_url;
                                }

                                webhookPayload.message = {
                                    id: key.id,
                                    from_me: isFromMe,
                                    chat_id: remoteJid,
                                    chat_type: isGroup ? 'group' : 'private',
                                    sender: message?.pushName || remoteJid.split('@')[0],
                                    sender_jid: key.participant || remoteJid,
                                    message_type: messageType,
                                    text: messageText,
                                    media_url: mediaUrl,
                                    timestamp: message?.messageTimestamp || Math.floor(Date.now() / 1000),
                                    status: message?.status || 'received'
                                };
                            }

                            // Forward enriched payload
                            logger.info(`Forwarding enriched webhook to ${targetUrl}`, {
                                event: currentEvent,
                                hasMessage: !!webhookPayload.message,
                                isOutgoing: isFromMe
                            });

                            axios.post(targetUrl, webhookPayload)
                                .catch(err => logger.error(`Failed to forward webhook to ${targetUrl}`, { error: err.message }));
                        }
                    }
                }
            } catch (err) {
                logger.error('Error in webhook forwarding logic', { error: err.message });
            }
        }

        // Return 200 OK immediately to acknowledge receipt
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Error handling webhook', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * GET /api/webhooks/qr/:instanceName
 * Retrieve stored QR code for an instance
 */
router.get('/qr/:instanceName', (req, res) => {
    const { instanceName } = req.params;
    const qrData = qrCodeStore.get(instanceName);

    if (!qrData) {
        return res.status(404).json({
            success: false,
            error: 'No QR code found for this instance'
        });
    }

    res.json({
        success: true,
        data: qrData
    });
});

module.exports = router;
module.exports.qrCodeStore = qrCodeStore;

