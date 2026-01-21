const express = require('express');
const router = express.Router();
const evolution = require('../services/evolution');
const logger = require('../utils/logger');

/**
 * GET /api/chats
 * Fetch all chats for an instance
 */
router.get('/', async (req, res, next) => {
    try {
        const { instanceName } = req.query;
        if (!instanceName) {
            return res.status(400).json({ success: false, error: 'instanceName is required' });
        }
        const result = await evolution.fetchChats(instanceName);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/chats/mark-read
 * Mark message as read
 */
router.put('/mark-read', async (req, res, next) => {
    try {
        const { instanceName, messageKey } = req.body;
        if (!instanceName || !messageKey) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.markAsRead(instanceName, messageKey);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/chats/delete-message
 * Delete message for everyone
 */
router.delete('/delete-message', async (req, res, next) => {
    try {
        const { instanceName, messageKey } = req.body;
        if (!instanceName || !messageKey) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.deleteMessage(instanceName, messageKey);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/chats/find-messages
 * Find messages in a chat
 */
router.post('/find-messages', async (req, res, next) => {
    try {
        const { instanceName, ...options } = req.body;
        if (!instanceName) {
            return res.status(400).json({ success: false, error: 'instanceName is required' });
        }
        const result = await evolution.findMessages(instanceName, options);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});



/**
 * PUT /api/chats/update-message
 * Edit a message
 */
router.put('/update-message', async (req, res, next) => {
    try {
        const { instanceName, messageKey, newMessage } = req.body;
        if (!instanceName || !messageKey || !newMessage) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.updateMessage(instanceName, messageKey, newMessage);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/chats/presence
 * Send presence (typing/recording)
 */
router.post('/presence', async (req, res, next) => {
    try {
        const { instanceName, number, presence } = req.body;
        if (!instanceName || !number || !presence) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.sendPresence(instanceName, number, presence);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/chats/download-media
 * Convert media message to base64
 */
router.post('/download-media', async (req, res, next) => {
    try {
        const { instanceName, message } = req.body;
        if (!instanceName || !message) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.getBase64(instanceName, message);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
