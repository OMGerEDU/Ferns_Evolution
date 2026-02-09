/**
 * Test Script for Micro-Automations
 * Usage: node scripts/test_micro_automations.js [instanceName]
 * 
 * This script simulates incoming webhooks to the local backend to verify command logic.
 * It mocks the Evolution API calls to see what the backend *would* do.
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000/api/webhooks/evolution';
const INSTANCE = process.argv[2] || 'Sasha';
const TARGET_JID = '1234567890@s.whatsapp.net'; // Fake user

async function sendWebhook(eventType, data) {
    try {
        console.log(`[TEST] Sending ${eventType}...`);
        await axios.post(BACKEND_URL, {
            event: eventType,
            instance: INSTANCE,
            data: data,
            timestamp: new Date().toISOString()
        });
        console.log(`[TEST] ${eventType} Sent OK.`);
    } catch (err) {
        console.error(`[TEST] Failed: ${err.message}`);
        if (err.response) console.error(err.response.data);
    }
}

// Mock Message Data Generators
const createMessage = (text) => ({
    key: {
        remoteJid: TARGET_JID,
        fromMe: false,
        id: 'TEST_MSG_ID_' + Date.now()
    },
    pushName: 'TestUser',
    message: {
        conversation: text
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
});

const createQuotedImageSync = (text, mediaUrl) => ({
    key: { remoteJid: TARGET_JID, fromMe: false, id: 'TEST_CMD_' + Date.now() },
    pushName: 'TestUser',
    message: {
        extendedTextMessage: {
            text: text,
            contextInfo: {
                stanzaId: 'QUOTED_ID_123',
                participant: TARGET_JID,
                quotedMessage: {
                    imageMessage: {
                        url: mediaUrl,
                        caption: 'Original Image'
                    }
                }
            }
        }
    }
});

async function runTests() {
    console.log('--- STARTING AUTOMATION TESTS ---');

    // 1. Test !note
    await sendWebhook('messages.upsert', createMessage('!note Automated Test Note'));

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // 2. Test !notes
    await sendWebhook('messages.upsert', createMessage('!notes'));

    // 3. Test !id (Reply simulation)
    // Needs context info, but let's try basic
    await sendWebhook('messages.upsert', createMessage('!id'));

    // 4. Test !sticker (Should fail nicely without media)
    await sendWebhook('messages.upsert', createMessage('!sticker'));

    console.log('--- TESTS COMPLETED ---');
    console.log('Check your backend logs to verify the "Evolution API" calls were triggered (or mocked).');
}

runTests();
