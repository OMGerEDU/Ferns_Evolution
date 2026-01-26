const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../utils/logger');

/**
 * GET /api/automations
 * List automations for a tenant
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.query;
        if (!tenantId) {
            return res.status(400).json({ success: false, error: 'tenantId required' });
        }

        const { rows } = await db.query(
            'SELECT * FROM automations WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        logger.error('Error fetching automations', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * POST /api/automations
 * Create a new rule
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId, name, trigger, actions, enabled } = req.body;

        if (!tenantId || !name || !trigger) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const query = `
            INSERT INTO automations (tenant_id, name, trigger, actions, enabled)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const params = [
            tenantId,
            name,
            JSON.stringify(trigger),
            JSON.stringify(actions || []),
            enabled !== false
        ];

        const { rows } = await db.query(query, params);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error creating automation', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * DELETE /api/automations/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM automations WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
