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

// Handle all evolution webhook events
// POST /api/webhooks/evolution/:event type
router.post('/evolution/:event?', async (req, res) => {
    try {
        const event = req.params.event || 'unknown';
        const data = req.body;

        // Log the webhook
        logger.info(`Webhook received: ${event}`, {
            event,
            instance: data.instance,
            type: data.type
        });

        // Handle QRCODE_UPDATED event
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

