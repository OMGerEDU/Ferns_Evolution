const logger = require('../../../utils/logger');
const evolution = require('../../services/evolution');

async function handleAdminCommand(command, args, message, instanceName) {
    logger.info(`[AdminCommand] Executing ${command} for ${instanceName} from ${message.remoteJid}`);

    // Check if user is admin (simple check: isGroup? sender in participants?)
    // For now, we assume if it's "fromMe" it's valid, OR we need to fetch group metadata.
    // Simplifying: "everyone" allowed for everyone in v1, or strictly checking?
    // Let's implement strict check later. For now, open power! (Or limit to fromMe)
    const isFromMe = message.fromMe;

    switch (command) {
        case 'id':
            const replyText = `Message ID: ${message.id}\nRemote JID: ${message.remoteJid}\nParticipant: ${message.participant || 'N/A'}`;
            await evolution.sendText(instanceName, message.remoteJid, replyText);
            return true;

        case 'everyone':
        case 'all':
            if (!message.isGroup) {
                await evolution.sendText(instanceName, message.remoteJid, 'This command only works in groups.');
                return true;
            }
            // Fetch participants
            const groupData = await evolution.fetchGroupParticipants(instanceName, message.remoteJid);
            if (!groupData || !groupData.participants) {
                logger.error('Failed to fetch participants');
                return false;
            }

            const mentions = groupData.participants.map(p => p.id);
            const text = args.join(' ') || 'Attention everyone!';

            // Send text with mentions
            await evolution.sendText(instanceName, message.remoteJid, text, { mentions });
            return true;

        case 'purge':
            // TODO: Implement Purge logic (needs specific Evolution API support for bulk delete or loop)
            await evolution.sendText(instanceName, message.remoteJid, 'Purge command not yet implemented.');
            return true;

        default:
            return false;
    }
}

module.exports = { handleAdminCommand };
