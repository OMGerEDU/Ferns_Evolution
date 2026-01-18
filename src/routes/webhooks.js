const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * CNT-01: Evolution API Webhook Receiver
 * Handles incoming webhook events from Evolution API
 */

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

        // Return 200 OK immediately to acknowledge receipt
        // logic to process specific events can be added here

        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Error handling webhook', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;
