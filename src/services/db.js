const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
    host: config.healthCheck.postgres.host,
    port: config.healthCheck.postgres.port,
    user: config.healthCheck.postgres.user,
    password: config.healthCheck.postgres.password,
    database: config.healthCheck.postgres.database,
});

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
        logger.error('Database initialization failed', { error: error.message });
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    initDb,
};
