const logger = require('../../../utils/logger');
const evolution = require('../../services/evolution');

async function handlePrivacyCommand(command, args, message, instanceName) {
    logger.info(`[PrivacyCommand] Executing ${command} for ${instanceName}`);

    switch (command) {
        case 'viewonce':
        case 'vo':
            // Check if replying to ViewOnce
            if (message.quoted && message.quoted.type === 'view_once') {
                // We have the media URL from the extract logic in webhooks.js regarding 'voMsg.imageMessage.url'
                const mediaUrl = message.quoted.media_url;
                if (!mediaUrl) {
                    await evolution.sendText(instanceName, message.remoteJid, 'Could not retrieve media URL from ViewOnce message.');
                    return true;
                }

                // Resend as normal media
                // We assume it's an image or video based on extraction
                // Let's try sending as image first (most common)
                // TODO: Detect type better?
                try {
                    await evolution.sendMedia(instanceName, message.remoteJid, mediaUrl, { caption: 'Here is your ViewOnce media 🔓' });
                } catch (err) {
                    logger.error(`[PrivacyCommand] Failed to resend ViewOnce: ${err.message}`);
                    await evolution.sendText(instanceName, message.remoteJid, 'Failed to recover ViewOnce media.');
                }
                return true;
            }
            await evolution.sendText(instanceName, message.remoteJid, 'Reply to a ViewOnce message with !vo to save it.');
            return true;

        case 'profile':
            const targetJid = args.length > 0
                ? (args[0].includes('@') ? args[0] : `${args[0]}@s.whatsapp.net`)
                : (message.quoted ? message.quoted.key.participant || message.quoted.key.remoteJid : message.sender_jid);

            try {
                const picUrl = await evolution.fetchProfilePictureUrl(instanceName, targetJid) || 'https://via.placeholder.com/150';

                // Fetch status/about if possible (requires fetchStatus endpoint?)
                // evolution.js has fetchProfile?
                let about = 'N/A';
                try {
                    const profileData = await evolution.fetchProfile(instanceName, targetJid);
                    about = profileData?.status || 'N/A';
                } catch (e) { /* ignore */ }

                await evolution.sendMedia(instanceName, message.remoteJid, picUrl, {
                    caption: `*Profile Info*\nJID: ${targetJid}\nAbout: ${about}`
                });
            } catch (err) {
                logger.error(`[PrivacyCommand] Failed to fetch profile: ${err.message}`);
                await evolution.sendText(instanceName, message.remoteJid, 'Could not fetch profile info.');
            }
            return true;

        default:
            return false;
    }
}

module.exports = { handlePrivacyCommand };
