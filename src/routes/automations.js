const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../utils/logger');
const { resolveTenantId } = require('../services/tenantResolver');

/**
 * GET /api/automations
 * List automations for a tenant
 */
router.get('/', async (req, res) => {
    try {
        let { tenantId } = req.query;
        if (!tenantId) {
            return res.status(400).json({ success: false, error: 'tenantId required' });
        }

        tenantId = await resolveTenantId(tenantId);
        if (!tenantId) {
            return res.status(404).json({ success: false, error: 'No tenant found' });
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

        const resolvedTenantId = await resolveTenantId(tenantId);
        if (!resolvedTenantId) {
            return res.status(404).json({ success: false, error: 'No tenant found' });
        }

        const query = `
            INSERT INTO automations (tenant_id, name, trigger, actions, enabled)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const params = [
            resolvedTenantId,
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
 * POST /api/automations/create
 * Alias for creating a new rule, potentially with different validation or pre-processing
 */
router.post('/create', async (req, res) => {
    try {
        const { tenantId, name, trigger, actions, enabled } = req.body;

        if (!tenantId || !name || !trigger) {
            return res.status(400).json({ success: false, error: 'Missing required fields (tenantId, name, trigger)' });
        }

        const resolvedTenantId = await resolveTenantId(tenantId);
        if (!resolvedTenantId) {
            return res.status(404).json({ success: false, error: 'No tenant found' });
        }

        const query = `
            INSERT INTO automations (tenant_id, name, trigger, actions, enabled)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const params = [
            resolvedTenantId,
            name,
            JSON.stringify(trigger),
            JSON.stringify(actions || []),
            enabled !== false
        ];

        const { rows } = await db.query(query, params);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error in /automations/create', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
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

/**
 * PUT /api/automations/:id
 * Update an existing rule
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, trigger, actions, enabled } = req.body;

        const query = `
            UPDATE automations 
            SET name = COALESCE($1, name),
                trigger = COALESCE($2, trigger),
                actions = COALESCE($3, actions),
                enabled = COALESCE($4, enabled),
                updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `;

        const params = [
            name,
            trigger ? JSON.stringify(trigger) : null,
            actions ? JSON.stringify(actions) : null,
            enabled,
            id
        ];

        const { rows } = await db.query(query, params);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Automation not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error updating automation', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/automations/:id/toggle
 * Quick toggle enabled/disabled
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(
            `UPDATE automations SET enabled = NOT enabled, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Automation not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error toggling automation', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/automations/:id
 * Get a single automation by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query('SELECT * FROM automations WHERE id = $1', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Automation not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error fetching automation', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/automations/logs/:instanceName
 * Get automation execution logs for an instance
 */
router.get('/logs/:instanceName', async (req, res) => {
    try {
        const { instanceName } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const { rows } = await db.query(
            `SELECT 
                id,
                automation_name,
                trigger_type,
                message_from,
                message_text,
                action_taken,
                status,
                error_message,
                created_at
            FROM automation_logs
            WHERE instance_name = $1
            ORDER BY created_at DESC
            LIMIT $2`,
            [instanceName, limit]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        logger.error('Error fetching automation logs', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
