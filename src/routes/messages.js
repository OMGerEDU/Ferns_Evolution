const express = require('express');
const router = express.Router();
const evolution = require('../services/evolution');
const logger = require('../utils/logger');

/**
 * POST /api/messages/text
 * Send a text message
 */
router.post('/text', async (req, res, next) => {
    try {
        const { instanceName, number, text } = req.body;

        // Validation
        if (!instanceName) {
            return res.status(400).json({
                success: false,
                error: 'instanceName is required',
                code: 'MISSING_INSTANCE_NAME',
            });
        }

        if (!number) {
            return res.status(400).json({
                success: false,
                error: 'number is required',
                code: 'MISSING_NUMBER',
            });
        }

        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'text is required',
                code: 'MISSING_TEXT',
            });
        }

        logger.info('Sending text message', {
            instanceName,
            to: number,
            textLength: text.length,
        });

        const result = await evolution.sendText(instanceName, number, text);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error.response) {
            const errorData = error.response.data;
            const evolutionMessage = errorData?.response?.message || errorData?.message || error.message;
            const finalMessage = Array.isArray(evolutionMessage) ? evolutionMessage.join(', ') : evolutionMessage;

            return res.status(error.response.status).json({
                success: false,
                error: finalMessage,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

/**
 * POST /api/messages/media
 * Send a media message (image, video, audio, document)
 */
router.post('/media', async (req, res, next) => {
    try {
        const { instanceName, number, media, mediatype, caption } = req.body;

        // Validation
        if (!instanceName) {
            return res.status(400).json({
                success: false,
                error: 'instanceName is required',
                code: 'MISSING_INSTANCE_NAME',
            });
        }

        if (!number) {
            return res.status(400).json({
                success: false,
                error: 'number is required',
                code: 'MISSING_NUMBER',
            });
        }

        if (!media) {
            return res.status(400).json({
                success: false,
                error: 'media (URL or base64) is required',
                code: 'MISSING_MEDIA',
            });
        }

        logger.info('Sending media message', {
            instanceName,
            to: number,
            mediatype: mediatype || 'image',
        });

        const result = await evolution.sendMedia(instanceName, number, media, {
            mediatype,
            caption,
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error.response) {
            const errorData = error.response.data;
            const evolutionMessage = errorData?.response?.message || errorData?.message || error.message;
            const finalMessage = Array.isArray(evolutionMessage) ? evolutionMessage.join(', ') : evolutionMessage;

            return res.status(error.response.status).json({
                success: false,
                error: finalMessage,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

module.exports = router;
