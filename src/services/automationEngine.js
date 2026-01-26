const axios = require('axios');
const db = require('./db');
const logger = require('../utils/logger');
const evolutionAdapter = require('../adapters/evolutionAdapter');

// Map of provider name to adapter
const adapters = {
    'evolution': evolutionAdapter
    // 'greenapi': greenApiAdapter // Future
};

/**
 * Core Automation Engine
 */
const automationEngine = {
    /**
     * Process an incoming normalized event
     * @param {object} messageEvent 
     * @param {string} tenantId 
     */
    processEvent: async (messageEvent, tenantId) => {
        try {
            logger.debug(`Processing event for tenant ${tenantId}`, { event: messageEvent });

            // 1. Fetch enabled rules for tenant
            const result = await db.query(
                `SELECT * FROM automations WHERE tenant_id = $1 AND enabled = true`,
                [tenantId]
            );
            const rules = result.rows;

            // 2. Evaluate rules
            for (const rule of rules) {
                if (evaluateRule(rule, messageEvent)) {
                    await executeActions(rule, messageEvent);
                }
            }
        } catch (error) {
            logger.error('Error in automationEngine', { error: error.message, tenantId });
        }
    }
};

/**
 * Check if rule conditions match the event
 */
function evaluateRule(rule, event) {
    const trigger = rule.trigger;

    // Check provider filter
    if (trigger.provider && trigger.provider !== 'any' && trigger.provider !== event.provider) {
        return false;
    }

    // Text contains match
    if (trigger.text_contains && event.content.type === 'text') {
        if (!event.content.text.toLowerCase().includes(trigger.text_contains.toLowerCase())) {
            return false;
        }
    }

    return true;
}

/**
 * Execute actions defined in the rule
 */
async function executeActions(rule, event) {
    logger.info(`Executing rule '${rule.name}' for user ${event.from}`);

    for (const action of rule.actions) {
        try {
            if (action.type === 'send_message') {
                const adapter = adapters[event.provider];
                if (adapter) {
                    await adapter.sendMessage(event.instanceName, event.from, {
                        type: 'text',
                        text: action.params.text
                    });
                }
            } else if (action.type === 'http_request') {
                await axios({
                    method: action.params.method || 'POST',
                    url: action.params.url,
                    headers: action.params.headers || {},
                    data: action.params.payload || event // Send event data by default
                });
            }
        } catch (error) {
            logger.error(`Failed to execute action ${action.type}`, { error: error.message });
        }
    }
}

module.exports = automationEngine;
