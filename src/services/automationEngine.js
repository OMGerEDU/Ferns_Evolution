const axios = require('axios');
const db = require('./db');
const logger = require('../utils/logger');
const evolutionAdapter = require('../adapters/evolutionAdapter');
const greenApiAdapter = require('../adapters/greenApiAdapter');
const evaluator = require('../utils/expressionEvaluator');

// Map of provider name to adapter
const adapters = {
    'evolution': evolutionAdapter,
    'greenapi': greenApiAdapter
};

/**
 * Core Automation Engine v2.0
 */
const automationEngine = {
    /**
     * Process an incoming normalized event
     */
    processEvent: async (event, tenantId) => {
        try {
            logger.debug(`Processing event v2 for tenant ${tenantId}`, { event });

            // 1. Fetch enabled rules
            const { rows: rules } = await db.query(
                `SELECT * FROM automations WHERE tenant_id = $1 AND enabled = true`,
                [tenantId]
            );

            // 2. Initial Context
            const context = {
                ...event,
                sender_name: event.senderName || 'User',
                now: new Date().toISOString()
            };

            for (const rule of rules) {
                // Compatibility layer: Handle both legacy triggers and new graph structure
                const trigger = rule.trigger;
                if (!evaluateTrigger(trigger, event)) continue;

                logger.info(`Rule matched: ${rule.name} for ${event.from}`);

                // 3. Graph Execution
                // rule.actions can now be a Graph object: { nodes: [], edges: [] }
                // For legacy, it might be an array of simple actions.
                if (Array.isArray(rule.actions)) {
                    await executeLinearActions(rule.actions, event, context);
                } else if (rule.actions && rule.actions.nodes) {
                    await executeGraphFlow(rule.actions, event, context);
                }
            }
        } catch (error) {
            logger.error('Error in automationEngine v2', { error: error.message, tenantId });
        }
    },

    /**
     * Entry point for external webhooks
     */
    processExternalTrigger: async (rule, payload) => {
        try {
            const context = {
                ...payload,
                now: new Date().toISOString()
            };

            logger.info(`Processing external trigger for rule ${rule.name}`);

            if (Array.isArray(rule.actions)) {
                await executeLinearActions(rule.actions, payload, context);
            } else if (rule.actions && rule.actions.nodes) {
                await executeGraphFlow(rule.actions, payload, context);
            }
        } catch (e) {
            logger.error('External trigger processing failed', { error: e.message });
        }
    }
};

/**
 * Evaluates the entry trigger for a rule
 */
function evaluateTrigger(trigger, event) {
    if (trigger.provider && trigger.provider !== 'any' && trigger.provider !== event.provider) return false;
    if (trigger.message_type && trigger.message_type !== 'any' && event.content.type !== trigger.message_type) return false;

    if (trigger.source && trigger.source !== 'any') {
        const isGroup = event.from.includes('@g.us');
        if (trigger.source === 'group' && !isGroup) return false;
        if (trigger.source === 'private' && isGroup) return false;
    }

    if (trigger.text_contains && event.content.type === 'text') {
        if (!event.content.text.toLowerCase().includes(trigger.text_contains.toLowerCase())) return false;
    }

    return true;
}

/**
 * Modern Graph Execution Flow
 */
async function executeGraphFlow(graph, event, context) {
    // 1. Find the trigger node (entry point)
    const triggerNode = graph.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return;

    // 2. Start traversal from neighbors of trigger
    let currentNodes = findNextNodes(triggerNode.id, graph, context);
    const visited = new Set([triggerNode.id]);

    // Safety limit to prevent infinite loops in cycles
    let iterations = 0;
    const MAX_ITERATIONS = 50;

    while (currentNodes.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const nextBatch = [];

        for (const node of currentNodes) {
            if (visited.has(node.id)) continue;
            visited.add(node.id);

            // Execute node action
            const shouldContinue = await executeNode(node, event, context);

            // If the node logic allows, find next connected nodes
            if (shouldContinue !== false) {
                const next = findNextNodes(node.id, graph, context, shouldContinue);
                nextBatch.push(...next);
            }
        }
        currentNodes = nextBatch;
    }
}

/**
 * Finds next nodes connected to the current one
 * @param {string} nodeId 
 * @param {object} graph 
 * @param {object} context
 * @param {any} branchResult Optional result from node execution (e.g. true/false for conditions)
 */
function findNextNodes(nodeId, graph, context, branchResult) {
    let relevantEdges = graph.edges.filter(e => e.source === nodeId);

    // If we have a branch result (from Choice/Condition node), filter edges by sourceHandle
    if (branchResult !== undefined && branchResult !== null) {
        const handleId = branchResult === true ? 'true' : 'false';
        relevantEdges = relevantEdges.filter(e => e.sourceHandle === handleId);
    }

    return relevantEdges
        .map(e => graph.nodes.find(n => n.id === e.target))
        .filter(Boolean);
}

/**
 * Executes a single node's logic
 * @returns {any} Result that affects branching (or true to continue default)
 */
async function executeNode(node, event, context) {
    try {
        const data = node.data || {};

        switch (node.type) {
            case 'action':
            case 'send_message': {
                const adapter = adapters[event.provider];
                if (!adapter) return false;

                // Determine Recipient
                let recipient = event.from;
                if (data.recipientType === 'custom' && data.customNumber) {
                    recipient = evaluator.injectVariables(data.customNumber, context);
                    // Ensure number format if needed (simple check for now)
                    recipient = recipient.replace(/\D/g, '') + '@s.whatsapp.net'; // Basic formatting assumption
                }

                const text = evaluator.injectVariables(data.text || data.params?.text, context);
                await adapter.sendMessage(event.instanceName, recipient, {
                    type: 'text',
                    text: text
                });
                return true;
            }

            case 'condition': {
                // Expected data structure: { field, operator, value }
                return evaluator.evaluate(data, context);
            }

            case 'ai_response': {
                const aiProvider = require('./aiProvider');
                const systemPrompt = evaluator.injectVariables(data.systemPrompt || 'You are a helpful assistant.', context);
                const userPrompt = evaluator.injectVariables(data.userPrompt || '{{content.text}}', context);

                // Prioritize API key in node data, fallback to env
                const apiKey = data.apiKey || process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
                const provider = data.provider || (process.env.OPENAI_API_KEY ? 'openai' : 'claude');

                const response = await aiProvider.generateResponse(systemPrompt, userPrompt, {
                    provider,
                    model: data.model,
                    apiKey
                });

                // Save to context for later nodes (e.g. {{ai_response}})
                context.ai_response = response;
                return true;
            }

            case 'interactive_message': {
                const adapter = adapters[event.provider];
                if (!adapter) return false;

                const params = {
                    title: evaluator.injectVariables(data.title, context),
                    description: evaluator.injectVariables(data.description, context),
                    footer: evaluator.injectVariables(data.footer, context),
                    buttons: (data.buttons || []).map(b => ({
                        ...b,
                        text: evaluator.injectVariables(b.text, context)
                    }))
                };

                await adapter.sendMessage(event.instanceName, event.from, {
                    type: 'interactive',
                    params
                });
                return true;
            }

            case 'http_request': {
                const url = evaluator.injectVariables(data.url || data.params?.url, context);
                const method = data.method || data.params?.method || 'POST';
                await axios({
                    method,
                    url,
                    data: context
                });
                return true;
            }

            case 'delay': {
                const seconds = data.seconds || 3;
                await new Promise(resolve => setTimeout(resolve, seconds * 1000));
                return true;
            }

            case 'forward_message': {
                const adapter = adapters[event.provider];
                if (!adapter) {
                    logger.warn('Adapter not found for message forwarding', { provider: event.provider });
                    return false;
                }

                // Get target number from config (supports variable injection like {{config.targetNumber}})
                let targetNumber = evaluator.injectVariables(data.to || data.params?.to, context);

                // Format number properly for WhatsApp
                targetNumber = formatWhatsAppNumber(targetNumber);

                logger.info('Forwarding message', {
                    from: event.from,
                    to: targetNumber,
                    type: event.content?.type,
                    provider: event.provider
                });

                // Forward the original message based on type
                const messageType = event.content?.type || 'text';

                try {
                    if (messageType === 'audio') {
                        // Get audio URL from event
                        const audioUrl = event.content?.url || event.raw?.data?.message?.audioMessage?.url;
                        if (!audioUrl) {
                            logger.warn('No audio URL found for forwarding');
                            return false;
                        }

                        const evolution = require('../services/evolution');
                        await evolution.sendAudio(event.instanceName, targetNumber, audioUrl);
                    } else if (messageType === 'image') {
                        const imageUrl = event.content?.url || event.raw?.data?.message?.imageMessage?.url;
                        const caption = event.content?.text || event.raw?.data?.message?.imageMessage?.caption || '';

                        if (!imageUrl) {
                            logger.warn('No image URL found for forwarding');
                            return false;
                        }

                        const evolution = require('../services/evolution');
                        await evolution.sendMedia(event.instanceName, targetNumber, imageUrl, {
                            caption,
                            mediatype: 'image'
                        });
                    } else if (messageType === 'video') {
                        const videoUrl = event.content?.url || event.raw?.data?.message?.videoMessage?.url;
                        const caption = event.content?.text || event.raw?.data?.message?.videoMessage?.caption || '';

                        if (!videoUrl) {
                            logger.warn('No video URL found for forwarding');
                            return false;
                        }

                        const evolution = require('../services/evolution');
                        await evolution.sendMedia(event.instanceName, targetNumber, videoUrl, {
                            caption,
                            mediatype: 'video'
                        });
                    } else if (messageType === 'text') {
                        await adapter.sendMessage(event.instanceName, targetNumber, {
                            type: 'text',
                            text: event.content?.text || 'Forwarded message'
                        });
                    } else {
                        logger.warn(`Unsupported message type for forwarding: ${messageType}`);
                        return false;
                    }

                    logger.info('Message forwarded successfully', {
                        to: targetNumber,
                        type: messageType
                    });
                    return true;
                } catch (error) {
                    logger.error('Error forwarding message', {
                        error: error.message,
                        type: messageType,
                        to: targetNumber
                    });
                    return false;
                }
            }

            default:
                logger.warn(`Unknown node type: ${node.type}`);
                return true;
        }
    } catch (e) {
        logger.error(`Node execution failed [${node.type}]`, { error: e.message });
        return false;
    }
}

/**
 * Format phone number for WhatsApp
 * Ensures number has proper @s.whatsapp.net suffix
 */
function formatWhatsAppNumber(number) {
    if (!number) return null;

    // If already formatted with @, return as is
    if (number.includes('@')) {
        return number;
    }

    // Remove all non-digits
    const cleaned = number.replace(/\D/g, '');

    // Add WhatsApp suffix
    return `${cleaned}@s.whatsapp.net`;
}

/**
 * Legacy Linear Execution (Compatibility)
 */
async function executeLinearActions(actions, event, context) {
    for (const action of actions) {
        // Map simple action to a temporary node
        await executeNode({ type: action.type, data: action.params || action }, event, context);
    }
}

module.exports = automationEngine;
