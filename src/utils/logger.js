const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../config');

const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'evolution-backend' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? ` ${JSON.stringify(meta)}`
                        : '';
                    return `${timestamp} [${level}]: ${message}${metaStr}`;
                })
            ),
        }),
        // Daily Rotate File
        new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
        // Custom Webhook Transport
        new winston.transports.Http({
            host: 'hook.eu2.make.com',
            path: '/tk8ryd0cwlggryt7f8xhst0tapaue3fe',
            ssl: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json() // Send as standard JSON object
            ),
            level: 'error' // Only send errors to webhook
        })
    ],
});

module.exports = logger;
