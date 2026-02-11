const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Omer 09022026';

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    validateStatus: () => true
});

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function setup() {
    console.log(`--- 🛠️ Setting up Manual Testing on ${INSTANCE_NAME} ---`);

    try {
        // 1. Enable Keyword Helper
        log('1. Enabling "Keyword Helper" (Trigger: "ping" -> Response: "pong")...');
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
        }

        // 2. Enable Receipt Confirmation
        log('2. Enabling "Receipt Confirmation" (Trigger: Any incoming message)...');
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
        }

        log('\n--- Setup Complete ---');
        log('You can now test manually:');
        log('1. Send "ping" to the bot -> Should reply "pong".');
        log('2. Send any other message -> Should reply "Receipt Confirmed...".');

    } catch (error) {
        console.error('Setup Error:', error.message);
    }
}

setup();
