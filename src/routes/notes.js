const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');
const logger = require('../utils/logger');

/**
 * GET /api/notes/:jid
 * Fetch personal notes for a specific user JID
 */
router.get('/:jid', async (req, res) => {
    try {
        const { jid } = req.params;
        const { limit = 20 } = req.query;

        if (!jid) {
            return res.status(400).json({ success: false, error: 'JID is required' });
        }

        const result = await pool.query(
            'SELECT * FROM personal_notes WHERE user_jid = $1 ORDER BY created_at DESC LIMIT $2',
            [jid, limit]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error(`Error fetching notes for ${req.params.jid}`, error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;
