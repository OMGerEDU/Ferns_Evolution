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

        // FIX: Evolution v2 requires explicit /instance/connect call to generate QR
        // The qrcode:true parameter in create only enables the feature, doesn't generate it
        let finalResult = result;

        const hasQr = result.qrcode && (result.qrcode.base64 || result.qrcode.code);
        const hasPairing = !!result.pairingCode;

        if (!hasQr && !hasPairing) {
            logger.info('Triggering QR generation via connect endpoint...', { instanceName });

            try {
                // Call connect() to trigger QR generation
                const connectData = await evolution.connect(instanceName);

                logger.info('Connect response received', {
                    hasBase64: !!connectData.base64,
                    hasPairingCode: !!connectData.pairingCode,
                    hasCode: !!connectData.code,
                    count: connectData.count
                });

                // If we got QR/pairing code directly, use it
                if (connectData.base64 || connectData.pairingCode || connectData.code) {
                    finalResult = {
                        ...result,
                        qrcode: connectData.base64 ? { base64: connectData.base64 } : result.qrcode,
                        pairingCode: connectData.pairingCode,
                        code: connectData.code
                    };
                } else {
                    // Otherwise, poll webhook store for up to 10 seconds
                    logger.info('Polling webhook store for QR code...', { instanceName });
                    const { qrCodeStore } = require('./webhooks');

                    const maxAttempts = 20; // 20 * 500ms = 10 seconds
                    let attempts = 0;

                    while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 500));

                        const qrData = qrCodeStore.get(instanceName);
                        if (qrData && (qrData.qrcode || qrData.pairingCode)) {
                            logger.info('QR/Pairing code received from webhook!', {
                                hasQr: !!qrData.qrcode,
                                hasPairing: !!qrData.pairingCode
                            });

                            finalResult = {
                                ...result,
                                qrcode: qrData.qrcode ? { base64: qrData.qrcode } : result.qrcode,
                                pairingCode: qrData.pairingCode,
                                code: qrData.code
                            };
                            break;
                        }
                        attempts++;
                    }

                    if (attempts >= maxAttempts) {
                        logger.warn('Timeout waiting for QR code', { instanceName });
                    }
                }
            } catch (err) {
                logger.error('Failed to generate QR code', { error: err.message, stack: err.stack });
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

        // Run in parallel for performance
        // We fetch both state and full list because list contains 'owner' (number) 
        // which might be missing from state if disconnected
        const [state, instances] = await Promise.all([
            evolution.getConnectionState(name),
            evolution.fetchInstances()
        ]);

        // Find this instance in the list
        // instances is expected to be an array based on fetchInstances docs/code
        const instanceList = Array.isArray(instances) ? instances : [];
        const instanceInfo = instanceList.find(i => i.instanceName === name) || {};

        res.json({
            success: true,
            data: {
                ...instanceInfo, // Base info from list (might have owner/number)
                ...state,        // Connection state (overrides if more recent)
                instanceName: name,
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
