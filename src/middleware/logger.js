const logger = require('../utils/logger');

/**
 * Request logging middleware
 */
module.exports = (req, res, next) => {
    const start = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        };

        // Log level based on status code
        // Add function context if configured (from other middlewares) or just use method+path
        const context = req.route ? `${req.method} ${req.route.path}` : `${req.method} ${req.path}`;

        if (res.statusCode >= 500) {
            logger.error(`Request failed: ${context}`, logData);
        } else if (res.statusCode >= 400) {
            logger.warn(`Request error: ${context}`, logData);
        } else {
            logger.info(`Request completed: ${context}`, logData);
        }
    });

    next();
};
