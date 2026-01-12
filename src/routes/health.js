const express = require('express');
const router = express.Router();
const healthService = require('../services/healthCheck');

/**
 * GET /health
 * Quick liveness check
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'evolution-backend',
    });
});

/**
 * GET /health/detailed
 * Full stack health check
 */
router.get('/detailed', async (req, res) => {
    try {
        const health = await healthService.runAllChecks();
        const statusCode = health.healthy ? 200 : 503;

        res.status(statusCode).json(health);
    } catch (error) {
        res.status(500).json({
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /health/evolution
 * Evolution API health only
 */
router.get('/evolution', async (req, res) => {
    try {
        const health = await healthService.checkEvolution();
        const statusCode = health.healthy ? 200 : 503;

        res.status(statusCode).json({
            service: 'evolution',
            ...health,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            service: 'evolution',
            healthy: false,
            error: error.message,
        });
    }
});

/**
 * GET /health/instances
 * Instance status summary
 */
router.get('/instances', async (req, res) => {
    try {
        const summary = await healthService.getInstanceSummary();

        res.json({
            timestamp: new Date().toISOString(),
            ...summary,
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

module.exports = router;
