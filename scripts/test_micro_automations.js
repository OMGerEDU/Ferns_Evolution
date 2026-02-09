/**
 * Test Script for Micro-Automations
 * Usage: node scripts/test_micro_automations.js [instanceName]
 * 
 * This script simulates incoming webhooks to the PUBLIC URL to verify:
 * 1. Cloudflare Tunnel / DNS
 * 2. Caddy Reverse Proxy
 * 3. Backend Logic logic
 */

const axios = require('axios');

const BACKEND_URL = 'https://evolution.omger.cloud/api/webhooks/evolution';
const HEALTH_URL = 'https://evolution.omger.cloud/health';
const INSTANCE = process.argv[2] || 'Sasha';
const TARGET_JID = '1234567890@s.whatsapp.net'; // Fake user

async function checkHealth() {
    try {
        console.log(`[TEST] Checking Health at ${HEALTH_URL}...`);
        const res = await axios.get(HEALTH_URL);
        console.log(`[TEST] Health OK: ${res.status}`);
    } catch (err) {
        console.error(`[TEST] Health Failed: ${err.message}`);
        if (err.code) console.error(`[TEST] Code: ${err.code}`);
    }
}

async function sendWebhook(eventType, data) {
    try {
        console.log(`[TEST] Sending ${eventType} to ${BACKEND_URL}...`);
        await axios.post(BACKEND_URL, {
            event: eventType,
            instance: INSTANCE,
            data: data,
            timestamp: new Date().toISOString()
        });
        console.log(`[TEST] ${eventType} Sent OK.`);
    } catch (err) {
        console.error(`[TEST] Failed: ${err.message}`);
        if (err.code) console.error(`[TEST] Code: ${err.code}`);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data);
        }
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

async function runTests() {
    console.log('--- STARTING PUBLIC URL AUTOMATION TESTS ---');

    // 0. Health Check
    await checkHealth();

    // 1. Test !note
    await sendWebhook('messages.upsert', createMessage('!note Automated Public Test Note'));

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // 2. Test !notes
    await sendWebhook('messages.upsert', createMessage('!notes'));

    // 3. Test !id (Reply simulation)
    await sendWebhook('messages.upsert', createMessage('!id'));

    console.log('--- TESTS COMPLETED ---');
    console.log('Check your backend logs to verify the "Evolution API" calls were triggered (or mocked).');
}

runTests();
