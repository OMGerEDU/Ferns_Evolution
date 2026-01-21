const express = require('express');
const router = express.Router();
const evolution = require('../services/evolution');
const logger = require('../utils/logger');

/**
 * GET /api/groups
 * Fetch all groups for an instance
 */
router.get('/', async (req, res, next) => {
    try {
        const { instanceName } = req.query;
        if (!instanceName) {
            return res.status(400).json({ success: false, error: 'instanceName is required' });
        }
        const result = await evolution.fetchGroups(instanceName);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups/create
 * Create a new group
 */
router.post('/create', async (req, res, next) => {
    try {
        const { instanceName, subject, participants, description } = req.body;
        if (!instanceName || !subject || !participants) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.createGroup(instanceName, subject, participants, description);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/groups/update-participants
 * Add or remove group participants
 */
router.put('/update-participants', async (req, res, next) => {
    try {
        const { instanceName, groupJid, action, participants } = req.body;
        if (!instanceName || !groupJid || !action || !participants) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.updateGroupParticipants(instanceName, groupJid, action, participants);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
