const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');

/**
 * Create Axios instance for Evolution API
 */
const client = axios.create({
    baseURL: config.evolution.url,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add API key to all requests
client.interceptors.request.use((request) => {
    if (config.evolution.apiKey) {
        request.headers['apikey'] = config.evolution.apiKey;
    }
    logger.debug('Evolution API request', {
        method: request.method,
        url: request.url,
    });
    return request;
});

// Log responses
client.interceptors.response.use(
    (response) => {
        logger.debug('Evolution API response', {
            status: response.status,
            url: response.config.url,
        });
        return response;
    },
    (error) => {
        const errorData = error.response?.data;
        logger.error('Evolution API error', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
            evolutionError: errorData?.message || errorData?.response?.message || errorData,
            fullResponse: errorData // Added to capture 400 details
        });
        throw error;
    }
);

/**
 * Create a new WhatsApp instance
 */
async function createInstance(instanceName, options = {}) {
    const cleanedInstanceName = instanceName.trim();
    const payload = {
        instanceName: cleanedInstanceName,
        qrcode: options.qrcode !== false,
        integration: options.integration || 'WHATSAPP-BAILEYS',
    };

    if (options.number) {
        payload.number = options.number;
    }

    if (options.token) {
        payload.token = options.token;
    }

    logger.debug('Evolution v2 Create Instance', {
        url: `${config.evolution.url}/instance/create`,
        payload
    });

    const response = await retryWithBackoff(() =>
        client.post('/instance/create', payload)
    );

    return response.data;
}

/**
 * Delete an instance
 */
async function deleteInstance(instanceName) {
    const response = await retryWithBackoff(() =>
        client.delete(`/instance/delete/${instanceName}`)
    );

    return response.data;
}

/**
 * Get QR code for connecting
 */
async function connect(instanceName) {
    const response = await retryWithBackoff(() =>
        client.get(`/instance/connect/${instanceName}`)
    );

    return response.data;
}

/**
 * Fetch all instances
 */
async function fetchInstances() {
    const response = await retryWithBackoff(() =>
        client.get('/instance/fetchInstances')
    );

    return response.data;
}

/**
 * Get instance connection state
 */
async function getConnectionState(instanceName) {
    const response = await retryWithBackoff(() =>
        client.get(`/instance/connectionState/${instanceName}`)
    );

    return response.data;
}

/**
 * Logout instance (disconnect without deleting)
 */
async function logout(instanceName) {
    const response = await retryWithBackoff(() =>
        client.delete(`/instance/logout/${instanceName}`)
    );

    return response.data;
}

/**
 * Restart instance
 */
async function restart(instanceName) {
    const response = await retryWithBackoff(() =>
        client.put(`/instance/restart/${instanceName}`)
    );

    return response.data;
}

/**
 * Send text message
 */
async function sendText(instanceName, number, text, options = {}) {
    const payload = {
        number,
        text,
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendText/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send media message
 */
async function sendMedia(instanceName, number, mediaUrl, options = {}) {
    const payload = {
        number,
        media: mediaUrl,
        mediatype: options.mediatype || 'image',
        caption: options.caption || '',
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendMedia/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send audio message
 */
async function sendAudio(instanceName, number, audioUrl, options = {}) {
    const payload = {
        number,
        audioMessage: {
            audio: audioUrl,
            ppt: options.ptt || false // 'ppt' is the key in Evolution v2 for PTT (Push-To-Talk)
        },
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendWhatsAppAudio/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send location message
 */
async function sendLocation(instanceName, number, latitude, longitude, options = {}) {
    const payload = {
        number,
        latitude,
        longitude,
        name: options.name || '',
        address: options.address || '',
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendLocation/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send contact message
 */
async function sendContact(instanceName, number, contact) {
    const payload = {
        number,
        contact: Array.isArray(contact) ? contact : [contact],
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendContact/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send reaction to message
 */
async function sendReaction(instanceName, messageKey, reaction) {
    const payload = {
        reactionMessage: {
            key: messageKey,
            reaction: reaction,
        },
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendReaction/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send poll message
 */
async function sendPoll(instanceName, number, name, options) {
    const payload = {
        number,
        pollMessage: {
            name,
            selectableCount: options.selectableCount || 1,
            values: options.values || [],
        },
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendPoll/${instanceName}`, payload)
    );

    return response.data;
}

/**
 * Send sticker message
 */
async function sendSticker(instanceName, number, stickerUrl, options = {}) {
    const payload = {
        number,
        sticker: stickerUrl,
        ...options,
    };

    const response = await retryWithBackoff(() =>
        client.post(`/message/sendSticker/${instanceName}`, payload)
    );

    return response.data;
}


/**
 * Calculate WhatsApp ID (remoteJid)
 */
function getRemoteJid(number) {
    if (number.includes('@s.whatsapp.net') || number.includes('@g.us')) {
        return number;
    }
    return `${number}@s.whatsapp.net`;
}

// --- PROFILE ---

/**
 * Fetch Profile Info (Status/About)
 */
async function fetchProfile(instanceName, number) {
    const response = await retryWithBackoff(() =>
        client.get(`/chat/findStatus/${instanceName}`, {
            params: { number: getRemoteJid(number) }
        })
    );
    return response.data;
}

/**
 * Fetch Profile Picture URL
 */
async function fetchProfilePictureUrl(instanceName, number) {
    const response = await retryWithBackoff(() =>
        client.post(`/chat/fetchProfilePictureUrl/${instanceName}`, {
            number: getRemoteJid(number)
        })
    );
    return response.data;
}

/**
 * Fetch Profile Picture
 */
async function fetchProfilePicture(instanceName, number) {
    const response = await retryWithBackoff(() =>
        client.post(`/chat/fetchProfilePicture/${instanceName}`, {
            number: getRemoteJid(number)
        })
    );
    return response.data;
}

/**
 * Update Profile Name (PushName)
 */
async function updateProfileName(instanceName, name) {
    const response = await retryWithBackoff(() =>
        client.post(`/profile/updateProfileName/${instanceName}`, { name })
    );
    return response.data;
}

/**
 * Update Profile Status (About)
 */
async function updateProfileStatus(instanceName, status) {
    const response = await retryWithBackoff(() =>
        client.post(`/profile/updateProfileStatus/${instanceName}`, { status })
    );
    return response.data;
}

/**
 * Update Profile Picture
 */
async function updateProfilePicture(instanceName, picture) {
    const response = await retryWithBackoff(() =>
        client.post(`/profile/updateProfilePicture/${instanceName}`, { picture })
    );
    return response.data;
}


// --- GROUPS ---

/**
 * Create Group
 */
async function createGroup(instanceName, subject, participants, description) {
    const payload = {
        subject,
        participants: Array.isArray(participants) ? participants : [participants],
        description: description || ''
    };
    const response = await retryWithBackoff(() =>
        client.post(`/group/create/${instanceName}`, payload)
    );
    return response.data;
}

/**
 * Fetch All Groups
 */
async function fetchGroups(instanceName) {
    try {
        // Fallback: fetchAllGroups hangs, so we use findChats and filter for groups
        const chats = await fetchChats(instanceName);
        return chats.filter(chat => chat.id.includes('@g.us') || (chat.remoteJid && chat.remoteJid.includes('@g.us')))
            .map(chat => ({
                ...chat,
                subject: chat.name || chat.subject || chat.pushName || 'Unknown Group', // Map name to subject
                participants: [] // Participants not available in findChats summary
            }));
    } catch (error) {
        logger.error(`Error fetching groups via findChats strategy: ${error.message}`);
        throw error;
    }
}

/**
 * Fetch Group Participants
 */
async function fetchGroupParticipants(instanceName, groupJid) {
    const response = await retryWithBackoff(() =>
        client.get(`/group/participants/${instanceName}?groupJid=${groupJid}`)
    );
    return response.data;
}

/**
 * Update Group Participants (add/remove/promote/demote)
 */
async function updateGroupParticipants(instanceName, groupJid, action, participants) {
    // action: "add" | "remove" | "promote" | "demote"
    const payload = {
        action,
        participants: Array.isArray(participants) ? participants : [participants]
    };
    const response = await retryWithBackoff(() =>
        client.post(`/group/updateParticipant/${instanceName}?groupJid=${groupJid}`, payload)
    );
    return response.data;
}


// --- CHATS ---

/**
 * Fetch Chats
 */
async function fetchChats(instanceName) {
    const response = await retryWithBackoff(() =>
        client.post(`/chat/findChats/${instanceName}`)
    );
    return response.data;
}

/**
 * Archive/Unarchive Chat
 */
async function archiveChat(instanceName, number, archive = true) {
    const payload = {
        number: getRemoteJid(number),
        archive
    };
    const response = await retryWithBackoff(() =>
        client.post(`/chat/archiveChat/${instanceName}`, payload)
    );
    return response.data;
}

/**
 * Delete Chat
 */
async function deleteChat(instanceName, number) {
    const response = await retryWithBackoff(() =>
        client.delete(`/chat/deleteChat/${instanceName}/${getRemoteJid(number)}`)
    );
    return response.data;
}

/**
 * Mark message as read
 */
async function markAsRead(instanceName, messageKey) {
    const payload = {
        readMessages: [messageKey],
    };
    const response = await retryWithBackoff(() =>
        client.put(`/chat/markMessageAsRead/${instanceName}`, payload)
    );
    return response.data;
}

/**
 * Delete message for everyone
 */
async function deleteMessage(instanceName, messageKey) {
    const payload = {
        key: messageKey,
    };
    const response = await retryWithBackoff(() =>
        client.delete(`/chat/deleteMessageForEveryone/${instanceName}`, { data: payload })
    );
    return response.data;
}

/**
 * Find messages
 */
async function findMessages(instanceName, options = {}) {
    const response = await retryWithBackoff(() =>
        client.post(`/chat/findMessages/${instanceName}`, options)
    );
    return response.data;
}

/**
 * Update message (Edit)
 */
async function updateMessage(instanceName, messageKey, newMessage) {
    const payload = {
        key: messageKey,
        newMessage: {
            text: newMessage
        }
    };
    // Evolution v2 endpoint for editing
    const response = await retryWithBackoff(() =>
        client.put(`/chat/updateMessage/${instanceName}`, payload)
    );
    return response.data;
}

/**
 * Send Presence (Typing/Recording)
 */
async function sendPresence(instanceName, number, presence) {
    const payload = {
        number: getRemoteJid(number),
        presence: presence, // 'composing', 'recording', 'available', 'unavailable'
        delay: 1200
    };
    const response = await retryWithBackoff(() =>
        client.post(`/chat/sendPresence/${instanceName}`, payload)
    );
    return response.data;
}

/**
 * Get Base64 from Media Message
 */
async function getBase64(instanceName, message) {
    let messageToUse = message;

    // Check if it's our DB object - usually has green_id as the WA ID
    // We prioritize green_id if available, otherwise fallback to id (if it happens to be the WA ID)
    const messageId = message.green_id || message.id;
    const isInternalObject = !message.key && (message.green_id || message.chat_id);

    if (isInternalObject) {
        console.log(`[Evolution] Detected internal message object. Attempting resolve. ID: ${messageId}`);
        try {
            // Build Where clause
            // Note: Evolution findMessages often requires remoteJid for efficiency or uniqueness,
            // but we'll try with just the ID first if we don't have a JID-like chat_id.
            const whereClause = {
                key: {
                    id: messageId
                }
            };

            // If chat_id looks like a JID (contains @), use it. 
            // The user provided a UUID for chat_id, so we ignore it if it doesn't look like a JID.
            if (message.chat_id && message.chat_id.includes('@')) {
                whereClause.key.remoteJid = message.chat_id;
            }

            const findPayload = {
                where: whereClause
            };

            console.log(`[Evolution] Looking up raw message with payload:`, JSON.stringify(findPayload));

            const findRes = await retryWithBackoff(() =>
                client.post(`/chat/findMessages/${instanceName}`, findPayload)
            );

            const messages = Array.isArray(findRes.data) ? findRes.data : (findRes.data?.messages || []);

            if (messages.length > 0) {
                messageToUse = messages[0];
                const type = Object.keys(messageToUse.message || {})[0];
                console.log(`[Evolution] Found raw message. Type: ${type}, Key: ${JSON.stringify(messageToUse.key)}`);
            } else {
                console.warn(`[Evolution] Raw message not found for ID ${messageId}. Attempting with original object.`);
            }
        } catch (error) {
            console.error(`[Evolution] Error fetching raw message: ${error.message}`);
            if (error.response) {
                console.error(`[Evolution] Upstream Error Data:`, JSON.stringify(error.response.data));
            }
        }
    }

    const payload = {
        message: messageToUse,
        convertToMp4: false
    };

    try {
        const response = await retryWithBackoff(() =>
            client.post(`/chat/getBase64FromMediaMessage/${instanceName}`, payload)
        );
        return response.data;
    } catch (error) {
        // Enhance error for user
        console.error(`[Evolution] getBase64 failed. Payload embedded message:`, JSON.stringify(payload.message).substring(0, 200));
        throw error;
    }
}



/**
 * Check if Evolution API is reachable
 */
async function healthCheck() {
    try {
        const response = await client.get('/health');
        return {
            healthy: true,
            data: response.data,
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
        };
    }
}

module.exports = {
    client,
    createInstance,
    deleteInstance,
    connect,
    fetchInstances,
    getConnectionState,
    logout,
    restart,
    sendText,
    sendMedia,
    sendAudio,
    sendLocation,
    sendContact,
    sendReaction,
    sendPoll,
    healthCheck,
    // Profile
    fetchProfile,
    fetchProfilePictureUrl,
    updateProfileName,
    updateProfileStatus,
    updateProfilePicture,
    // Groups
    createGroup,
    fetchGroups,
    fetchGroupParticipants,
    updateGroupParticipants,
    // Chats
    fetchChats,
    archiveChat,
    deleteChat,
    markAsRead,
    deleteMessage,
    findMessages,
    updateMessage,
    sendPresence,
    getBase64,
    sendSticker
};
