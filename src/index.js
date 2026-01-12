const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const healthRoutes = require('./routes/health');
const instanceRoutes = require('./routes/instances');
const messageRoutes = require('./routes/messages');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/logger');

// Create Express app
const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health routes (no auth required)
app.use('/health', healthRoutes);

// API routes (auth required)
app.use('/api/instances', authMiddleware, instanceRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
    logger.info(`🚀 Evolution Backend started on port ${config.port}`);
    logger.info(`📡 Evolution API URL: ${config.evolution.url}`);
    logger.info(`🔧 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after 10s timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
