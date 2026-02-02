const db = require('./src/services/db');
const logger = require('./src/utils/logger');

async function migrate() {
    try {
        console.log('Creating instance_webhooks table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS instance_webhooks (
                instance_name VARCHAR(255) PRIMARY KEY,
                url VARCHAR(500) NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                events JSONB DEFAULT '[]',
                sources JSONB DEFAULT '[]',
                allow_media BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
