const express = require('express');
const router = express.Router();
const evolution = require('../services/evolution');
const logger = require('../utils/logger');

/**
 * POST /api/instances
 * Create a new WhatsApp instance
 */
router.post('/', async (req, res, next) => {
    try {
        const { instanceName, qrcode, integration, number } = req.body;

        if (!instanceName) {
            return res.status(400).json({
                success: false,
                error: 'instanceName is required',
                code: 'MISSING_INSTANCE_NAME',
            });
        }

        logger.info('Creating instance', { instanceName, integration, hasNumber: !!number });

        const result = await evolution.createInstance(instanceName, {
            qrcode,
            integration,
            number,
        });

        // Debug log
        logger.info('Initial Create Response', {
            keys: Object.keys(result),
            qrcode: result.qrcode
        });

        // FIX: If Evolution returns empty QR/Pairing code, fetch it explicitly
        // This handles cases where "count: 0" is returned immediately
        let finalResult = result;

        const hasQr = result.qrcode && (result.qrcode.base64 || result.qrcode.code);
        const hasPairing = !!result.pairingCode;

        if (!hasQr && !hasPairing) {
            logger.info('Creation returned no QR/Pairing code. Triggering explicit connect...', { instanceName });
            try {
                // Wait 7 seconds - optimal time for Baileys to initialize
                await new Promise(resolve => setTimeout(resolve, 10000));

                const connectData = await evolution.connect(instanceName);

                logger.info('Explicit connect data received', {
                    dataKeys: Object.keys(connectData || {}),
                    pairingCode: connectData?.pairingCode,
                    qrCount: connectData?.count
                });

                // Merge the new data carefully
                // The connect endpoint returns { pairingCode: '...', code: '...', base64: '...' }
                finalResult = {
                    ...result,
                    ...connectData,
                    // Ensure qrcode object is populated if base64 is present at top level
                    qrcode: connectData.base64 ? { base64: connectData.base64 } : result.qrcode
                };

            } catch (err) {
                logger.warn('Failed to fetch explicit connection state', { error: err.message });
            }
        }

        res.status(201).json({
            success: true,
            data: finalResult,
        });
    } catch (error) {
        // Handle Evolution API errors
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
 * GET /api/instances
 * List all instances
 */
router.get('/', async (req, res, next) => {
    try {
        const instances = await evolution.fetchInstances();

        res.json({
            success: true,
            data: instances,
        });
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data?.message || error.message,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

/**
 * GET /api/instances/:name
 * Get instance details with connection state
 */
router.get('/:name', async (req, res, next) => {
    try {
        const { name } = req.params;

        const state = await evolution.getConnectionState(name);

        res.json({
            success: true,
            data: {
                instanceName: name,
                ...state,
            },
        });
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Instance not found',
                code: 'INSTANCE_NOT_FOUND',
            });
        }
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data?.message || error.message,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

/**
 * GET /api/instances/:name/qr
 * Get QR code for connecting
 */
router.get('/:name/qr', async (req, res, next) => {
    try {
        const { name } = req.params;

        logger.info('Getting QR code', { instanceName: name });

        const qrData = await evolution.connect(name);

        res.json({
            success: true,
            data: qrData,
        });
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Instance not found',
                code: 'INSTANCE_NOT_FOUND',
            });
        }
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data?.message || error.message,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

/**
 * DELETE /api/instances/:name
 * Delete an instance
 */
router.delete('/:name', async (req, res, next) => {
    try {
        const { name } = req.params;

        logger.info('Deleting instance', { instanceName: name });

        await evolution.deleteInstance(name);

        res.json({
            success: true,
            message: 'Instance deleted successfully',
        });
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Instance not found',
                code: 'INSTANCE_NOT_FOUND',
            });
        }
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data?.message || error.message,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

/**
 * POST /api/instances/:name/logout
 * Logout instance (disconnect without deleting)
 */
router.post('/:name/logout', async (req, res, next) => {
    try {
        const { name } = req.params;

        logger.info('Logging out instance', { instanceName: name });

        const result = await evolution.logout(name);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data?.message || error.message,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

/**
 * POST /api/instances/:name/restart
 * Restart an instance
 */
router.post('/:name/restart', async (req, res, next) => {
    try {
        const { name } = req.params;

        logger.info('Restarting instance', { instanceName: name });

        const result = await evolution.restart(name);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data?.message || error.message,
                code: 'EVOLUTION_ERROR',
            });
        }
        next(error);
    }
});

module.exports = router;
