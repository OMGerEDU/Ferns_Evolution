const logger = require('../../utils/logger');
const evolution = require('../../services/evolution');
const mediaProcessor = require('../../services/mediaProcessor');

function extractMediaUrlFromQuotedRaw(quotedRaw) {
    if (!quotedRaw) return null;

    if (quotedRaw.imageMessage?.url) return quotedRaw.imageMessage.url;
    if (quotedRaw.videoMessage?.url) return quotedRaw.videoMessage.url;

    const voMsg = quotedRaw.viewOnceMessage?.message || quotedRaw.viewOnceMessageV2?.message;
    if (voMsg?.imageMessage?.url) return voMsg.imageMessage.url;
    if (voMsg?.videoMessage?.url) return voMsg.videoMessage.url;

    return null;
}

function isWhatsAppEncryptedMediaUrl(url) {
    if (!url) return false;
    return url.includes('mmg.whatsapp.net') || url.includes('.enc');
}

function normalizeOwnedMediaValue(value) {
    if (!value || typeof value !== 'string') return value;
    const marker = ';base64,';
    const idx = value.indexOf(marker);
    if (value.startsWith('data:') && idx !== -1) {
        return value.slice(idx + marker.length);
    }
    return value;
}

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
                targetMediaUrl = message.quoted.media_url || extractMediaUrlFromQuotedRaw(message.quoted.raw);
            }

            // 3. Prefer base64 for replied media (especially WhatsApp encrypted .enc URLs)
            const shouldResolveQuotedAsBase64 =
                message.quoted &&
                (message.quoted.type === 'image' || message.quoted.type === 'video') &&
                (!targetMediaUrl || isWhatsAppEncryptedMediaUrl(targetMediaUrl));

            if (shouldResolveQuotedAsBase64) {
                try {
                    const quotedMessageObject = {
                        key: message.quoted.key,
                        message: message.quoted.raw
                    };
                    const mediaResult = await evolution.getBase64(instanceName, quotedMessageObject);
                    if (mediaResult?.base64) {
                        const mime = mediaResult.mimetype || (message.quoted.type === 'video' ? 'video/mp4' : 'image/jpeg');
                        targetMediaUrl = mediaResult.base64;
                        logger.info(`[MediaCommand] Resolved quoted media as base64 for ${instanceName}`, {
                            quotedType: message.quoted.type,
                            mimetype: mime
                        });
                    }
                } catch (error) {
                    logger.error(`[MediaCommand] Failed base64 fallback for quoted media: ${error.message}`);
                }
            }

            // 4. Video sticker path: convert video base64 to WebP base64
            if (message.quoted?.type === 'video' && targetMediaUrl && !/^https?:\/\//i.test(targetMediaUrl)) {
                try {
                    targetMediaUrl = await mediaProcessor.processVideoBase64ForSticker(targetMediaUrl);
                    logger.info(`[MediaCommand] Converted quoted video base64 to webp for ${instanceName}`);
                } catch (error) {
                    logger.error(`[MediaCommand] Video->sticker conversion failed: ${error.message}`);
                }
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
                await evolution.sendSticker(instanceName, message.remoteJid, normalizeOwnedMediaValue(targetMediaUrl));
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
