const express = require('express');
const router = express.Router();
const evolution = require('../services/evolution');
const logger = require('../utils/logger');

/**
 * POST /api/profile/fetch
 * Fetch profile information
 */
router.post('/fetch', async (req, res, next) => {
    try {
        const { instanceName, number } = req.body;
        if (!instanceName || !number) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.fetchProfile(instanceName, number);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profile/name
 * Update profile name
 */
router.post('/name', async (req, res, next) => {
    try {
        const { instanceName, name } = req.body;
        if (!instanceName || !name) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.updateProfileName(instanceName, name);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profile/status
 * Update profile status
 */
router.post('/status', async (req, res, next) => {
    try {
        const { instanceName, status } = req.body;
        if (!instanceName || !status) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.updateProfileStatus(instanceName, status);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profile/picture
 * Update profile picture
 */
router.post('/picture', async (req, res, next) => {
    try {
        const { instanceName, picture } = req.body;
        if (!instanceName || !picture) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.updateProfilePicture(instanceName, picture);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profile/picture-url
 * Fetch profile picture URL
 */
router.post('/picture-url', async (req, res, next) => {
    try {
        const { instanceName, number } = req.body;
        if (!instanceName || !number) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.fetchProfilePictureUrl(instanceName, number);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
