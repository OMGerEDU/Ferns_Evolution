const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
module.exports = (err, req, res, next) => {
    // Log the error
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const errorResponse = {
        success: false,
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
    };

    // Add stack trace in development
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};
