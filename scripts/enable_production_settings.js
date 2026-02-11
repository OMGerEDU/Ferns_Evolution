const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
// Use external URL as fallback since local docker access is restricted
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';

const INSTANCE_NAME = 'Omer 09022026';

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'apikey': API_KEY },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function enableProductionSettings() {
    console.log(`--- 🛠️ Enabling Production Settings for: ${INSTANCE_NAME} ---`);

    try {
        // 1. Fetch Current Settings
        console.log('1. Fetching Current Settings...');
        try {
            const fetchRes = await client.get(`/api/instances/${encodeURIComponent(INSTANCE_NAME)}/settings`);
            console.log('   Current:', fetchRes.data.data);
        } catch (e) {
            console.log(`   (Could not fetch current settings: ${e.message})`);
        }

        // 2. Enable All Features
        console.log('\n2. Applying "Production" Configuration...');
        const settings = {
            "rejectCall": true,       // Auto-reject calls
            "groupsIgnore": false,    // Allow group interactions
            "alwaysOnline": true,     // Show as Online
            "readMessages": true,     // Send Blue Ticks
            "readStatus": true,       // View Statuses
            "syncFullHistory": true   // Sync History
        };

        console.log('   Settings:', settings);

        const updateRes = await client.post(`/api/instances/${encodeURIComponent(INSTANCE_NAME)}/settings`, settings);

        console.log('\n3. Result:');
        console.log('   ✅ Success:', updateRes.data.success);
        console.log('   Data:', updateRes.data.data);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

enableProductionSettings();
