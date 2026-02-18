const db = require('./db');
const logger = require('../utils/logger');

const KNOWN_PACKS = ['help', 'media', 'admin', 'personal', 'privacy'];

function getInitialPackMap() {
    return {
        help: false,
        media: false,
        admin: false,
        personal: false,
        privacy: false
    };
}

async function getEnabledCommandPacks(tenantId) {
    if (!tenantId) return null;

    const packs = getInitialPackMap();

    try {
        const { rows } = await db.query(
            'SELECT actions FROM automations WHERE tenant_id = $1 AND enabled = true',
            [tenantId]
        );

        for (const row of rows) {
            const actions = Array.isArray(row.actions) ? row.actions : [];
            for (const action of actions) {
                if (action?.type === 'enable_command_pack' && KNOWN_PACKS.includes(action.pack)) {
                    packs[action.pack] = true;
                }
            }
        }

        return packs;
    } catch (error) {
        logger.error('Failed to resolve enabled command packs', {
            tenantId,
            error: error.message
        });
        return null;
    }
}

module.exports = {
    KNOWN_PACKS,
    getEnabledCommandPacks
};
