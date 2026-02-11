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
const SCENARIO = [
    {
        label: "Step 1: Simple Ping",
        customerSays: "ping",
        note: "Server should reply 'pong'"
    },
    {
        label: "Step 2: Unknown Message",
        customerSays: "Hello there!",
        note: "Server should reply with Receipt Confirmation (if enabled)"
    },
    {
        label: "Step 3: Testing Help",
        customerSays: "!help",
        note: "Server should reply with Command Menu (via Command Router)"
    }
];

async function injectMessage(text) {
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookPayload = {
        event: 'messages.upsert',
        instance: INSTANCE_NAME,
        data: {
            key: {
                remoteJid: OWNER_JID,
                fromMe: false, // Vital: Simulates message FROM customer
                id: `SIM_${Date.now()}`
            },
            pushName: 'Simulated Customer',
            messageTimestamp: timestamp,
            message: {
                conversation: text
            },
            messageType: 'conversation'
        }
    };

    try {
        const res = await client.post('/api/webhooks/evolution/messages.upsert', webhookPayload);
        return res.status === 200;
    } catch (err) {
        console.error('Injection failed:', err.message);
        return false;
    }
}

async function runScenario() {
    console.log(`\n--- 🎭 Starting Conversation Simulation: ${INSTANCE_NAME} ---`);
    console.log(`Target: ${OWNER_JID} (You will receive replies here)\n`);

    for (const step of SCENARIO) {
        console.log(`\n🔹 ${step.label}`);
        console.log(`   Customer writes: "${step.customerSays}"`);

        await injectMessage(step.customerSays);

        console.log(`   ✅ Sent!`);
        console.log(`   👀 Expectation: ${step.note}`);
        console.log(`   ⏳ Waiting 5 seconds for reply...`);

        await sleep(5000); // Give time for server to reply and user to read
    }

    console.log(`\n--- 🏁 Simulation Complete ---`);
}

runScenario();
