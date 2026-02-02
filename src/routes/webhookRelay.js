const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../utils/logger');
const automationEngine = require('../services/automationEngine');
const evolutionAdapter = require('../adapters/evolutionAdapter');
const greenApiAdapter = require('../adapters/greenApiAdapter');

// Map of provider name to adapter
const adapters = {
    'evolution': evolutionAdapter,
    'greenapi': greenApiAdapter
};

/**
 * POST /wh/:provider/:tenantId/:secret
 * Universal Webhook Relay
 */
router.post('/:provider/:tenantId/:secret', async (req, res) => {
    const { provider, tenantId, secret } = req.params;
    const adapter = adapters[provider];

    // 1. Validate Provider
    if (!adapter) {
        logger.warn(`Unknown provider: ${provider}`);
        return res.status(404).send('Unknown provider');
    }

    try {
        // 2. Validate Tenant & Secret
        const result = await db.query(
            'SELECT id FROM tenants WHERE id = $1 AND webhook_secret = $2',
            [tenantId, secret]
        );

        if (result.rows.length === 0) {
            logger.warn(`Invalid webhook attempt`, { tenantId, validSecret: false });
            return res.status(403).send('Forbidden');
        }

        // 3. Acknowledge Receipt Immediately
        res.status(200).send('OK');

        // 4. Normalize & Process Asynchronously
        const messageEvent = adapter.normalize(req.body);
        if (messageEvent) {
            // Processing in background
            automationEngine.processEvent(messageEvent, tenantId).catch(err => {
                logger.error('Error processing event in background', { error: err.message });
            });
        }
    } catch (error) {
        logger.error('Error in webhook relay', { error: error.message });
        // Don't send error to provider if possible, they will retry.
        // But if it's a DB error, maybe we should 500? 
        // For webhooks, 200 is often safest to stop retries if the error is unrecoverable.
        // For now, we sent 200 early, so we are good.
    }
});

module.exports = router;
