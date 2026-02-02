const express = require('express');
const router = express.Router();
const db = require('../services/db');
const automationEngine = require('../services/automationEngine');
const logger = require('../utils/logger');

/**
 * Public Webhook Trigger
 * POST /api/wh/trigger/:automationId
 * Body example: { "to": "12345678", "name": "John", "custom_field": "val" }
 */
router.post('/trigger/:id', async (req, res) => {
    try {
        const automationId = req.params.id;
        const payload = req.body;

        logger.info(`Incoming Webhook Trigger for automation ${automationId}`, { payload });

        // 1. Fetch automation
        const { rows } = await db.query(
            `SELECT * FROM automations WHERE id = $1 AND enabled = true`,
            [automationId]
        );

        const automation = rows[0];
        if (!automation) {
            return res.status(404).json({ error: 'Automation not found or disabled' });
        }

        // 2. Determine target instance and recipient
        // We expect the payload to have a 'to' field (phone number)
        const to = payload.to || payload.phone || payload.number;
        if (!to) {
            return res.status(400).json({ error: 'Recipient number (to) is required in the JSON payload' });
        }

        // 3. Execution logic
        // We simulate a mock "message event" to satisfy the engine context
        const mockEvent = {
            provider: 'evolution', // Default to evolution
            instanceName: payload.instance || automation.trigger.instanceName || 'main',
            from: to.includes('@') ? to : `${to}@s.whatsapp.net`,
            content: {
                type: 'webhook_trigger',
                text: ''
            },
            ...payload // Merge custom fields into the event root
        };

        // Note: processEvent in v2 handles graph logic
        // We might need a slightly different entry point if the trigger node type isn't 'message'
        await automationEngine.processExternalTrigger(automation, mockEvent);

        res.json({ success: true, message: 'Automation triggered' });
    } catch (error) {
        logger.error('Webhook trigger failed', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
