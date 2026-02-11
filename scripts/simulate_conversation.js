const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Omer 09022026';
const OWNER_JID = process.env.OWNER_JID || '972545661640@s.whatsapp.net';

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    validateStatus: () => true
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

/**
 * DEFINE YOUR CONVERSATION FLOW HERE
 */
async function runScenario() {
    console.log(`\n--- 🎭 Starting Conversation Simulation: ${INSTANCE_NAME} ---`);
    const TARGET_JID = '972538245304@s.whatsapp.net'; // Ebi01

    // 1. Simulate "Ping"
    console.log(`\n🔹 Test 1: Ping from Ebi01`);
    await injectMessage('ping', TARGET_JID);
    console.log(`   ✅ Sent!`);
    await sleep(2000);

    // 2. Simulate "Hello"
    console.log(`\n🔹 Test 2: Hello from Ebi01`);
    await injectMessage('Hello from Simulation', TARGET_JID);
    console.log(`   ✅ Sent!`);
    await sleep(2000);

    // 3. Simulate "!help"
    console.log(`\n🔹 Test 3: !help from Ebi01`);
    await injectMessage('!help', TARGET_JID);
    console.log(`   ✅ Sent!`);
    await sleep(2000);

    console.log(`\n--- 🏁 Simulation Complete ---`);
}

async function injectMessage(text, remoteJid) {
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookPayload = {
        event: 'messages.upsert',
        instance: INSTANCE_NAME,
        data: {
            key: {
                remoteJid: remoteJid,
                fromMe: false,
                id: `SIM_${Date.now()}`
            },
            pushName: 'Ebi01 Simulation',
            messageTimestamp: timestamp,
            message: {
                conversation: text
            },
            messageType: 'conversation'
        }
    };

    try {
        // Use the internal endpoint if modifying for local test, otherwise external
        // Here we use the path that matched previous success or direct webhook
        // POST /api/webhooks/evolution/messages.upsert
        const res = await client.post('/api/webhooks/evolution/messages.upsert', webhookPayload);
        if (res.status === 200) {
            console.log(`   SERVER: 200 OK`);
        } else {
            console.log(`   SERVER: ${res.status}`);
        }
        return res.status === 200;
    } catch (err) {
        console.error('   ❌ Injection failed:', err.message);
        if (err.response) {
            console.error('   ❌ Response:', err.response.data);
        }
        return false;
    }
}

runScenario();
