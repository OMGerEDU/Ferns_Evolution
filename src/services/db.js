const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Support both DATABASE_URL (Railway, managed Postgres) and individual config (local docker-compose)
const poolConfig = config.healthCheck.postgres.connectionString
    ? { connectionString: config.healthCheck.postgres.connectionString }
    : {
        host: config.healthCheck.postgres.host,
        port: config.healthCheck.postgres.port,
        user: config.healthCheck.postgres.user,
        password: config.healthCheck.postgres.password,
        database: config.healthCheck.postgres.database,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
});

/**
 * Initialize database tables
 */
async function initDb() {
    try {
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(sql);
        logger.info('Database schema initialized successfully');
    } catch (error) {
        // Check if error is specifically about "relation chats does not exist" - if so, it's expected during first run before schema is applied
        if (error.message && error.message.includes('relation "chats" does not exist')) {
            // This might happen if we query before init? But here we are IN init.
            // Wait, if pool.query(sql) fails with "relation does not exist", it might be that the schema.sql is trying to alter something that doesn't exist?
            // Or maybe the error is coming from elsewhere?
            // The previous log showed "Database initialization failed" so it IS caught here.
            logger.error('Database initialization failed', {
                message: error.message,
                stack: error.stack,
                code: error.code
            });
        } else {
            logger.error('Database initialization failed', {
                message: error.message,
                stack: error.stack,
                ...error
            });
        }
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    initDb,
};
