const logger = require('../utils/logger');
const { handleAdminCommand } = require('./commands/admin');
const { handleMediaCommand } = require('./commands/media');
const { handlePersonalCommand } = require('./commands/personal');
const { handlePrivacyCommand } = require('./commands/privacy');

const COMMAND_PREFIX = '!';

/**
 * Routes incoming messages to specific command handlers if they start with the prefix.
 * @param {object} message - The standardized message object
 * @param {string} instanceName - The instance name
 * @returns {Promise<boolean>} - True if a command was handled, false otherwise
 */
async function routeCommand(message, instanceName) {
    const content = message.content?.text || '';

    // Quick check for prefix
    if (!content.startsWith(COMMAND_PREFIX)) {
        return false;
    }

    // Parse command and args
    const args = content.slice(COMMAND_PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    logger.info(`[CommandRouter] Detected command: ${command} from ${message.remoteJid}`);

    try {
        switch (command) {
            // Media Pack
            case 'sticker':
            case 's':
            case 'toimg':
            case 'mp3':
                return await handleMediaCommand(command, args, message, instanceName);

            // Admin Pack
            case 'everyone':
            case 'all':
            case 'purge':
            case 'id':
                return await handleAdminCommand(command, args, message, instanceName);

            // Personal Pack
            case 'note':
            case 'notes':
            case 'me':
                return await handlePersonalCommand(command, args, message, instanceName);

            // Privacy Pack
            case 'viewonce':
            case 'vo':
            case 'profile':
                return await handlePrivacyCommand(command, args, message, instanceName);

            default:
                return false; // Not a known command
        }
    } catch (error) {
        logger.error(`[CommandRouter] Error execution command ${command}:`, error);
        return false;
    }
}

module.exports = { routeCommand };
