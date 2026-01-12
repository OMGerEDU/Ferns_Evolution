const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Validates API key from headers
 */
module.exports = (req, res, next) => {
    const apiKey = req.headers['apikey'] ||
        req.headers['x-api-key'] ||
        req.headers['authorization']?.replace('Bearer ', '');

    const expectedKey = process.env.API_KEY;

    // If no API key is configured, skip auth (development mode)
    if (!expectedKey) {
        logger.warn('No API_KEY configured - running in insecure mode');
        return next();
    }

    if (!apiKey) {
        logger.warn('Request rejected: Missing API key', {
            path: req.path,
            ip: req.ip
        });
        return res.status(401).json({
            success: false,
            error: 'API key required',
            code: 'MISSING_API_KEY'
        });
    }

    if (apiKey !== expectedKey) {
        logger.warn('Request rejected: Invalid API key', {
            path: req.path,
            ip: req.ip
        });
        return res.status(401).json({
            success: false,
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
        });
    }

    next();
};
