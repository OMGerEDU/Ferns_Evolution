const crypto = require('crypto');
const db = require('./db');
const logger = require('../utils/logger');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
    return UUID_RE.test(value || '');
}

function generateSecret() {
    return `secret_${crypto.randomBytes(8).toString('hex')}`;
}

async function ensureTenantForInstance(instanceName) {
    if (!instanceName) return null;

    const { rows } = await db.query(
        'SELECT id FROM tenants WHERE instance_name = $1',
        [instanceName]
    );

    if (rows.length > 0) {
        return rows[0].id;
    }

    const secret = generateSecret();
    const insert = await db.query(
        'INSERT INTO tenants (name, webhook_secret, instance_name) VALUES ($1, $2, $3) RETURNING id',
        [instanceName, secret, instanceName]
    );

    logger.info('Created tenant for instance', { instanceName });
    return insert.rows[0].id;
}

async function resolveTenantId(tenantKey, instanceName) {
    // Prefer instance scoping when available
    if (instanceName) {
        return ensureTenantForInstance(instanceName);
    }

    if (tenantKey && tenantKey !== 'default') {
        if (isUuid(tenantKey)) {
            const byId = await db.query('SELECT id FROM tenants WHERE id = $1', [tenantKey]);
            if (byId.rows.length > 0) return byId.rows[0].id;
        }

        // Treat tenantKey as instance name
        const byInstance = await db.query(
            'SELECT id FROM tenants WHERE instance_name = $1',
            [tenantKey]
        );
        if (byInstance.rows.length > 0) return byInstance.rows[0].id;

        // Auto-create for instance-scoped tenant
        return ensureTenantForInstance(tenantKey);
    }

    // Fallback to first tenant (legacy behavior)
    const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
        return null;
    }
    return tenantResult.rows[0].id;
}

module.exports = {
    ensureTenantForInstance,
    resolveTenantId,
};
