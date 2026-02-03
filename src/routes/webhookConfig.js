const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../utils/logger');

/**
 * GET /api/webhook-config/:instanceName
 * Get webhook settings for an instance
 */
router.get('/:instanceName', async (req, res) => {
    try {
        const { instanceName } = req.params;
        const { rows } = await db.query(
            'SELECT * FROM instance_webhooks WHERE instance_name = $1',
            [instanceName]
        );

        if (rows.length === 0) {
            return res.json({ success: true, data: null });
        }

        // Parse JSON fields
        const config = rows[0];
        config.events = typeof config.events === 'string' ? JSON.parse(config.events) : config.events;
        config.sources = typeof config.sources === 'string' ? JSON.parse(config.sources) : config.sources;

        res.json({ success: true, data: config });
    } catch (error) {
        logger.error('Error fetching webhook config', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * POST /api/webhook-config/:instanceName
 * Save or update webhook settings
 */
router.post('/:instanceName', async (req, res) => {
    try {
        const { instanceName } = req.params;
        const { url, enabled, events, sources, allow_media, outgoing_url, track_outgoing } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const query = `
            INSERT INTO instance_webhooks (instance_name, url, enabled, events, sources, allow_media, outgoing_url, track_outgoing, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (instance_name) 
            DO UPDATE SET 
                url = EXCLUDED.url,
                enabled = EXCLUDED.enabled,
                events = EXCLUDED.events,
                sources = EXCLUDED.sources,
                allow_media = EXCLUDED.allow_media,
                outgoing_url = EXCLUDED.outgoing_url,
                track_outgoing = EXCLUDED.track_outgoing,
                updated_at = NOW()
            RETURNING *
        `;

        const values = [
            instanceName,
            url,
            enabled !== false,
            JSON.stringify(events || ['messages.upsert']),
            JSON.stringify(sources || ['private', 'groups']),
            allow_media || false,
            outgoing_url || null,
            track_outgoing || false
        ];

        const evolution = require('../services/evolution');
        const appConfig = require('../config');

        // ...

        const { rows } = await db.query(query, values);

        // Sync with Evolution API
        try {
            // Use internal Docker URL for Evolution API to call back to us
            // Default to http://evolution_backend:3002 if not set (which fits our docker-compose)
            const serverUrl = appConfig.serverUrl || 'http://evolution_backend:3002';
            const webhookUrl = `${serverUrl}/api/webhooks/evolution`;

            logger.info(`Syncing webhook to Evolution API for ${instanceName}`, { webhookUrl });

            // We enable specific events based on what we want to receive
            // note: "events" from body is for our internal filtering (Relay)
            // For Evolution API, we want to subscribe to everything we might need
            const evolutionEvents = [
                "connection.update",
                "qrcode.updated",
                "messages.upsert",
                "messages.update",
                "send.message"
            ];

            await evolution.setWebhook(instanceName, webhookUrl, true, evolutionEvents);
            logger.info(`Successfully synced webhook for ${instanceName}`);
        } catch (syncError) {
            logger.error(`Failed to sync webhook with Evolution API`, { error: syncError.message });
            // We don't fail the request, just log it, as the DB save was successful
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error saving webhook config', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * DELETE /api/webhook-config/:instanceName
 * Delete webhook settings
 */
router.delete('/:instanceName', async (req, res) => {
    try {
        const { instanceName } = req.params;
        await db.query('DELETE FROM instance_webhooks WHERE instance_name = $1', [instanceName]);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting webhook config', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;
