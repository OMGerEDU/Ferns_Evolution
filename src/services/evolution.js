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
 * Fetch Profile Info
 */
async function fetchProfile(instanceName, number) {
    const response = await retryWithBackoff(() =>
        client.get(`/chat/findStatus/${instanceName}`, {
            data: { number: getRemoteJid(number) } // Evolution v2 uses POST-like body in GET or query param?
            // Actually v2 usually uses POST for this or a specific endpoint. 
            // Let's use the robust /chat/findStatus or /chat/fetchProfilePicture
        })
    );
    // Note: Evolution v2 API might strictly differentiate between fetching status and picture.
    // We will implement what's common.
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
    const response = await retryWithBackoff(() =>
        client.get(`/group/fetchAllGroups/${instanceName}?getParticipants=true`)
    );
    return response.data;
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
        client.get(`/chat/findChats/${instanceName}`)
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
    healthCheck,
    // Profile
    fetchProfile,
    fetchProfilePicture,
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
    deleteChat
};
