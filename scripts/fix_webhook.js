const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';

// Correct Internal URL for Docker Network
// Service: backend, Container: evolution_backend, Port: 3002
const WEBHOOK_URL = 'http://evolution_backend:3002/api/webhooks/evolution';

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'apikey': API_KEY },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const instances = ['Omer 09022026', 'Ebi01'];

async function fixWebhook(instanceName) {
    console.log(`\n🔧 Fixing Webhook for: ${instanceName}`);

    try {
        // 1. Check current settings
        console.log(`   Fetching current settings...`);
        try {
            const currentRes = await client.get(`/api/webhook-config/${encodeURIComponent(instanceName)}`);
            const currentWebhook = currentRes.data.data?.url || 'Not Set';
            console.log(`   Current URL: ${currentWebhook}`);
        } catch (e) {
            console.log(`   Current URL: (Failed to fetch) ${e.message}`);
        }

        // 2. Update settings
        console.log(`   Updating to: ${WEBHOOK_URL} ...`);
        const updateRes = await client.post(`/api/webhook-config/${encodeURIComponent(instanceName)}`, {
            enabled: true,
            url: WEBHOOK_URL,
            track_outgoing: true,
            outgoing_url: WEBHOOK_URL,
            events: [
                "messages.upsert",
                "messages.update",
                "groups.upsert",
                "send.message"
            ]
        });

        console.log(`   ✅ Update Success:`, updateRes.data?.data?.url || 'OK');

    } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        if (error.response) {
            console.error(`      Data:`, error.response.data);
        }
    }
}

async function run() {
    console.log(`--- Webhook Fixer ---`);
    for (const inst of instances) {
        await fixWebhook(inst);
    }
    console.log(`\n--- Done ---`);
}

run();
