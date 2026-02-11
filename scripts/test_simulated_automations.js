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

async function runTests() {
    console.log(`--- 🤖 Testing Built-in Automations on ${INSTANCE_NAME} ---`);

    try {
        // 1. Enable Keyword Helper
        log('1. Enabling "Keyword Helper" (ping -> pong)...');
        const enableKw = await client.post('/api/automations/builtin/keyword-helper/enable', {
            tenantId: INSTANCE_NAME,
            config: {
                keyword1: 'ping',
                response1: 'pong'
            },
            enabled: true
        });

        if (enableKw.status === 200 || enableKw.status === 201) {
            log('✅ Keyword Helper Enabled');
        } else {
            console.error('❌ Failed to enable Keyword Helper:', enableKw.data);
            return;
        }

        // 2. Enable Receipt Confirmation
        log('2. Enabling "Receipt Confirmation"...');
        const enableRc = await client.post('/api/automations/builtin/receipt-confirmation/enable', {
            tenantId: INSTANCE_NAME,
            config: {
                confirmationMessage: 'Receipt Confirmed: We got your message.'
            },
            enabled: true
        });

        if (enableRc.status === 200 || enableRc.status === 201) {
            log('✅ Receipt Confirmation Enabled');
        } else {
            console.error('❌ Failed to enable Receipt Confirmation:', enableRc.data);
            // Continue anyway to test keyword helper if that worked
        }

        await sleep(2000);

        // 3. Trigger Incoming "ping"
        log('\n--- Test 1: Incoming Message "ping" ---');
        await injectMessage('ping', false);
        log('👉 Check logs: Should see "pong" response.');

        await sleep(5000);

        // 4. Trigger Outgoing "ping" (API Simulation)
        log('\n--- Test 2: Outgoing Message "ping" (fromMe: true) ---');
        await injectMessage('ping', true);
        log('👉 Check logs: Should see "pong" response IF outgoing triggers are allowed.');

        await sleep(5000);

        // 5. Trigger Incoming "Hello" (Receipt Confirmation)
        log('\n--- Test 3: Incoming Message "Hello" (Receipt) ---');
        await injectMessage('Hello World', false);
        log('👉 Check logs: Should see "Receipt Confirmed" response.');

        await sleep(5000);

        // 6. Cleanup
        log('\n--- Cleanup ---');
        log('Disabling automations...');
        await client.delete(`/api/automations/builtin/keyword-helper/disable?tenantId=${encodeURIComponent(INSTANCE_NAME)}`);
        await client.delete(`/api/automations/builtin/receipt-confirmation/disable?tenantId=${encodeURIComponent(INSTANCE_NAME)}`);
        log('✅ Cleanup complete.');

    } catch (error) {
        console.error('Test Error:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

async function injectMessage(text, fromMe) {
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookPayload = {
        event: 'messages.upsert',
        instance: INSTANCE_NAME,
        data: {
            key: {
                remoteJid: OWNER_JID,
                fromMe: fromMe,
                id: `TEST_MSG_${Date.now()}`
            },
            pushName: 'QA Tester',
            messageTimestamp: timestamp,
            message: {
                conversation: text
            },
            messageType: 'conversation'
        }
    };

    log(`Injecting webhook: "${text}" (fromMe: ${fromMe})...`);
    const res = await client.post('/api/webhooks/evolution/messages.upsert', webhookPayload);
    if (res.status === 200) {
        log('✅ Webhook injected.');
    } else {
        log(`❌ Webhook injection failed: ${res.status}`);
    }
}

runTests();
