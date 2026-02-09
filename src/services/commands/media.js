const logger = require('../../../utils/logger');
const evolution = require('../../services/evolution');

async function handleMediaCommand(command, args, message, instanceName) {
    logger.info(`[MediaCommand] Executing ${command} for ${instanceName}`);

    switch (command) {
        case 'sticker':
        case 's':
            let targetMediaUrl = null;

            // 1. Check if the message itself is an image/video
            if (message.message_type === 'image' || message.message_type === 'video') {
                targetMediaUrl = message.media_url;
            }
            // 2. Check if it quotes an image/video
            else if (message.quoted && (message.quoted.type === 'image' || message.quoted.type === 'video')) {
                // For quoted media, the URL in the webhook might be null or expired?
                // Actually, baileys webhooks usually include the `url` in `contextInfo` only if it's fresh?
                // If it's null, we might need to fetch it?
                // Let's try using what we extracted.
                targetMediaUrl = message.quoted.media_url;
            }

            if (!targetMediaUrl) {
                await evolution.sendText(instanceName, message.remoteJid, 'Please reply to an image or video with !sticker');
                return true;
            }

            // Send Sticker
            try {
                // Evolution API handles downloading if we provide the url?
                // Limitation: If the URL is the internal WhatsApp Media URL, Evolution might fail if cookies aren't shared.
                // However, usually `sendSticker` expects a publicly accessible URL or Base64.
                // If this fails, we need to implement `start/downloadMediaMessage`.
                // Let's try passing the message object to a custom "convertToSticker" if needed.
                // For now, try existing endpoint.
                await evolution.sendSticker(instanceName, message.remoteJid, targetMediaUrl);
            } catch (error) {
                logger.error(`[MediaCommand] Failed to create sticker: ${error.message}`);
                await evolution.sendText(instanceName, message.remoteJid, 'Failed to create sticker.');
            }
            return true;

        case 'toimg':
            if (message.quoted && message.quoted.type === 'sticker') {
                // Evolution V2 doesn't have a direct "sticker to image" endpoint usually.
                // We'd need to download the sticker and send as image.
                await evolution.sendText(instanceName, message.remoteJid, 'Sticker to Image conversion coming soon!');
                return true;
            }
            return false;

        default:
            return false;
    }
}

module.exports = { handleMediaCommand };
