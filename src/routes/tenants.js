const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../utils/logger');

/**
 * GET /api/tenants/default
 * Get or Create the default tenant for the admin
 */
router.get('/default', async (req, res) => {
    try {
        // 1. Check if ANY tenant exists
        let result = await db.query('SELECT * FROM tenants LIMIT 1');

        if (result.rows.length === 0) {
            // 2. Create Default Tenant
            const secret = 'secret_' + Math.random().toString(36).substring(7);
            result = await db.query(
                'INSERT INTO tenants (name, webhook_secret) VALUES ($1, $2) RETURNING *',
                ['Default Admin Tenant', secret]
            );
            logger.info('Created default tenant for admin');
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error('Error fetching default tenant', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;
