const logger = require('../utils/logger');
const { handleAdminCommand } = require('./commands/admin');
const { handleMediaCommand } = require('./commands/media');
const { handlePersonalCommand } = require('./commands/personal');
const { handlePrivacyCommand } = require('./commands/privacy');
const evolution = require('./evolution');

const COMMAND_PREFIX = '!';
const REQUIRE_ENABLED_BY_DEFAULT = process.env.COMMAND_PACKS_REQUIRE_ENABLE === 'true';

function resolveCommandPack(command) {
    switch (command) {
        case 'help':
            return 'help';
        case 'sticker':
        case 's':
        case 'toimg':
        case 'mp3':
            return 'media';
        case 'everyone':
        case 'all':
        case 'purge':
        case 'id':
            return 'admin';
        case 'note':
        case 'notes':
        case 'me':
            return 'personal';
        case 'viewonce':
        case 'vo':
        case 'profile':
            return 'privacy';
        default:
            return null;
    }
}

function isPackEnabled(pack, options = {}) {
    // If explicit pack map is provided, it is the source of truth
    if (options.enabledPacks && typeof options.enabledPacks === 'object') {
        return !!options.enabledPacks[pack];
    }

    // Fallback behavior can be controlled by env/options for backward compatibility
    const requireEnabled = options.requireEnabled !== undefined
        ? options.requireEnabled
        : REQUIRE_ENABLED_BY_DEFAULT;

    return !requireEnabled;
}

/**
 * Routes incoming messages to specific command handlers if they start with the prefix.
 * @param {object} message - The standardized message object
 * @param {string} instanceName - The instance name
 * @param {object} options - Optional routing context ({ enabledPacks, requireEnabled })
 * @returns {Promise<boolean>} - True if a command was handled, false otherwise
 */
async function routeCommand(message, instanceName, options = {}) {
    const content = message.content?.text || '';

    // Quick check for prefix
    if (!content.startsWith(COMMAND_PREFIX)) {
        return false;
    }

    // Parse command and args
    const args = content.slice(COMMAND_PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const commandPack = resolveCommandPack(command);

    logger.info(`[CommandRouter] Detected command: ${command} from ${message.remoteJid}`);

    if (!commandPack) {
        return false; // Not a known command
    }

    if (!isPackEnabled(commandPack, options)) {
        logger.info(`[CommandRouter] Command pack disabled: ${commandPack} (command=${command})`);
        await evolution.sendText(
            instanceName,
            message.remoteJid,
            `This command pack is disabled (${commandPack}). Enable it in Built-in Automations.`
        );
        return true;
    }

    try {
        switch (command) {
            case 'help':
                return await handleHelpCommand(instanceName, message.remoteJid, message.fromMe);
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
                return false;
        }
    } catch (error) {
        logger.error(`[CommandRouter] Error execution command ${command}:`, error);
        return false;
    }
}

async function handleHelpCommand(instanceName, remoteJid, fromMe) {
    // If testing from API (fromMe=false), reply to remoteJid. If real fromMe, reply to remoteJid (self).
    const helpText = `*🤖 Bot Command Menu*\n\n` +
        `*Media Commands:*\n` +
        `!sticker - Convert image/video to sticker\n` +
        `!toimg - Convert sticker to image\n\n` +
        `*Admin Commands:*\n` +
        `!everyone - Tag everyone in group\n` +
        `!id - Get Chat ID\n\n` +
        `*Personal:*\n` +
        `!note <text> - Save a note\n` +
        `!me - Get your info`;

    await evolution.sendText(instanceName, remoteJid, helpText);
    return true;
}

module.exports = { routeCommand };
