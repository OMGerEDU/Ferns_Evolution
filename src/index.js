const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const healthRoutes = require('./routes/health');
const instanceRoutes = require('./routes/instances');

const messageRoutes = require('./routes/messages');
const webhookRoutes = require('./routes/webhooks');

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
// Health routes (no auth required)
app.get(['/', '/health'], (req, res) => res.json({ status: 'ok', service: 'evolution-backend', admin: '/admin' }));
app.use('/health', healthRoutes);

// Serve Admin Playground
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Admin Auth Endpoint
app.post('/admin/auth', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded credentials for local playground
    if (username === 'omger' && password === 'zxcv1234') {
        return res.json({ success: true, apiKey: process.env.API_KEY });
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Serve API documentation (no auth required)
app.use('/docs', express.static('public/docs'));

// API routes (auth required)
app.use('/api/instances', authMiddleware, instanceRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/chats', authMiddleware, require('./routes/chats'));
app.use('/api/groups', authMiddleware, require('./routes/groups'));
app.use('/api/profile', authMiddleware, require('./routes/profile'));

// Webhook routes (no auth token required, verify signature in future)
app.use('/api/webhooks', webhookRoutes);

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
