const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../utils/logger');

/**
 * GET /api/automations/builtin
 * List all available built-in automation templates
 */
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM builtin_automations ORDER BY category, name'
        );

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        logger.error('Error fetching built-in automations', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * GET /api/automations/builtin/:id
 * Get details of a specific built-in automation template
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(
            'SELECT * FROM builtin_automations WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Built-in automation template not found'
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        logger.error('Error fetching built-in automation', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * POST /api/automations/builtin/:id/enable
 * Enable a built-in automation for a tenant with custom configuration
 * Body: { tenantId, config, enabled }
 */
router.post('/:id/enable', async (req, res) => {
    try {
        const { id } = req.params;
        let { tenantId, config = {}, enabled = true } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'tenantId is required'
            });
        }

        // Resolve 'default' to actual tenant UUID
        if (tenantId === 'default') {
            const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
            if (tenantResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'No tenant found' });
            }
            tenantId = tenantResult.rows[0].id;
        }

        // Fetch the built-in template
        const { rows: templateRows } = await db.query(
            'SELECT * FROM builtin_automations WHERE id = $1',
            [id]
        );

        if (templateRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Built-in automation template not found'
            });
        }

        const template = templateRows[0];

        // TODO: Validate config against config_schema (optional enhancement)

        // Check if this automation is already enabled for this tenant
        const { rows: existingRows } = await db.query(
            'SELECT id FROM automations WHERE tenant_id = $1 AND builtin_template_id = $2',
            [tenantId, id]
        );

        if (existingRows.length > 0) {
            // Update existing automation instance
            const { rows: updatedRows } = await db.query(
                `UPDATE automations 
                 SET config = $1, 
                     enabled = $2,
                     updated_at = NOW()
                 WHERE tenant_id = $3 AND builtin_template_id = $4
                 RETURNING *`,
                [JSON.stringify(config), enabled, tenantId, id]
            );

            return res.json({
                success: true,
                data: updatedRows[0],
                message: 'Built-in automation updated successfully'
            });
        }

        // Create new automation instance from template
        const query = `
            INSERT INTO automations (tenant_id, name, trigger, actions, enabled, is_builtin, builtin_template_id, config)
            VALUES ($1, $2, $3, $4, $5, true, $6, $7)
            RETURNING *
        `;

        const params = [
            tenantId,
            template.name,
            template.trigger,
            template.actions,
            enabled,
            id,
            JSON.stringify(config)
        ];

        const { rows } = await db.query(query, params);

        logger.info(`Built-in automation enabled: ${template.name}`, {
            tenantId,
            automationId: rows[0].id,
            config
        });

        res.status(201).json({
            success: true,
            data: rows[0],
            message: 'Built-in automation enabled successfully'
        });
    } catch (error) {
        logger.error('Error enabling built-in automation', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/automations/builtin/:id/disable
 * Disable a built-in automation for a tenant
 * Query: tenantId
 */
router.delete('/:id/disable', async (req, res) => {
    try {
        const { id } = req.params;
        let { tenantId } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'tenantId is required'
            });
        }

        // Resolve 'default' to actual tenant UUID
        if (tenantId === 'default') {
            const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
            if (tenantResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'No tenant found' });
            }
            tenantId = tenantResult.rows[0].id;
        }

        const { rows } = await db.query(
            'DELETE FROM automations WHERE tenant_id = $1 AND builtin_template_id = $2 RETURNING *',
            [tenantId, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Built-in automation not found or not enabled for this tenant'
            });
        }

        res.json({
            success: true,
            message: 'Built-in automation disabled successfully'
        });
    } catch (error) {
        logger.error('Error disabling built-in automation', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
