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
            let finalMessage = 'Unknown Evolution API error';

            // Try to find the message in various places
            if (errorData) {
                if (typeof errorData === 'string') {
                    finalMessage = errorData;
                } else if (errorData.response?.message) {
                    finalMessage = errorData.response.message;
                } else if (errorData.message) {
                    finalMessage = errorData.message;
                } else if (errorData.error) {
                    finalMessage = errorData.error;
                } else {
                    // Fallback: stringify the whole data if it's an object we don't recognize
                    try {
                        const str = JSON.stringify(errorData);
                        finalMessage = str !== '{}' ? str : error.message;
                    } catch (e) {
                        finalMessage = error.message;
                    }
                }
            } else {
                finalMessage = error.message;
            }

            // If message is an array (some frameworks do this), join it
            if (Array.isArray(finalMessage)) {
                finalMessage = finalMessage.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(', ');
            }
            // If it's still an object (e.g. message was an object), stringify it
            if (typeof finalMessage === 'object') {
                finalMessage = JSON.stringify(finalMessage);
            }

            return res.status(error.response.status).json({
                success: false,
                error: finalMessage,
                code: 'EVOLUTION_ERROR',
                details: errorData // Include raw data for debugging
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

/**
 * POST /api/messages/audio
 * Send an audio message
 */
router.post('/audio', async (req, res, next) => {
    try {
        const { instanceName, number, audioUrl, ptt } = req.body;
        if (!instanceName || !number || !audioUrl) {
            logger.warn('Audio Validation Failed', { body: req.body });
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        logger.info('Processing Audio Request', {
            instanceName,
            number,
            audioUrl,
            originalPtt: ptt
        });

        const mediaProcessor = require('../services/mediaProcessor');

        try {
            // 1. Convert to MP3 on backend
            // This ensures whatever format comes in (WebM/Ogg) is normalized to MP3
            logger.info('Converting audio to MP3 on backend...');
            const audioBase64 = await mediaProcessor.processAudioForWhatsApp(audioUrl);

            // 2. Send as Media Message with Base64
            // Using base64 avoids Evolution having to download/convert again
            const result = await evolution.sendMedia(instanceName, number, audioBase64, {
                mediatype: 'audio',
                fileName: 'audio.mp3',
                mimetype: 'audio/mp4', // Safe for WhatsApp
                // We send as standard audio file based on our conversion
            });

            return res.json({ success: true, data: result });

        } catch (conversionError) {
            logger.error('Backend Conversion Failed - Falling back to URL pass-through', { error: conversionError.message });

            // Fallback: Just send the URL and hope for the best
            const result = await evolution.sendMedia(instanceName, number, audioUrl, {
                mediatype: 'audio',
                fileName: 'audio.mp3',
                mimetype: 'audio/mp4'
            });
            return res.json({ success: true, data: result, note: 'Fallback used', error: conversionError.message });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/messages/location
 * Send a location message
 */
router.post('/location', async (req, res, next) => {
    try {
        const { instanceName, number, latitude, longitude, name, address } = req.body;
        if (!instanceName || !number || !latitude || !longitude) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.sendLocation(instanceName, number, latitude, longitude, { name, address });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/messages/contact
 * Send a contact message
 */
router.post('/contact', async (req, res, next) => {
    try {
        const { instanceName, number, contact } = req.body;
        if (!instanceName || !number || !contact) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.sendContact(instanceName, number, contact);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/messages/reaction
 * Send a reaction to a message
 */
router.post('/reaction', async (req, res, next) => {
    try {
        const { instanceName, messageKey, reaction } = req.body;
        if (!instanceName || !messageKey || !reaction) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.sendReaction(instanceName, messageKey, reaction);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/messages/poll
 * Send a poll message
 */
router.post('/poll', async (req, res, next) => {
    try {
        const { instanceName, number, name, selectableCount, values } = req.body;
        if (!instanceName || !number || !name || !values) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.sendPoll(instanceName, number, name, { selectableCount, values });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});



/**
 * POST /api/messages/sticker
 * Send a sticker message
 */
router.post('/sticker', async (req, res, next) => {
    try {
        const { instanceName, number, sticker } = req.body;
        if (!instanceName || !number || !sticker) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const result = await evolution.sendSticker(instanceName, number, sticker);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
