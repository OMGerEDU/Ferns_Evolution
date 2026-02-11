const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';
// const INSTANCE_NAME = 'Omer 09022026';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Omer 09022026';

console.log(`--- 🛠️ Enabling Sync for Instance: ${INSTANCE_NAME} ---`);
console.log(`Target URL: ${BASE_URL}`);

async function enableSync() {
    try {
        // 1. Fetch Current Settings
        console.log('\n1. Fetching Current Settings...');
        const fetchRes = await axios.get(`${BASE_URL}/api/instances/${encodeURIComponent(INSTANCE_NAME)}/settings`, {
            headers: { 'apikey': API_KEY }
        });

        console.log('Current Settings:', fetchRes.data.data);

        // 2. Enable Sync
        console.log('\n2. Enabling "sync_full_history"...');
        const updateRes = await axios.post(`${BASE_URL}/api/instances/${encodeURIComponent(INSTANCE_NAME)}/settings`, {
            "rejectCall": false,
            "groupsIgnore": false,
            "alwaysOnline": true,
            "readMessages": false,
            "readStatus": false,
            "syncFullHistory": true
        }, {
            headers: { 'apikey': API_KEY }
        });

        console.log('Update Response:', JSON.stringify(updateRes.data, null, 2));

        // 3. Verify
        console.log('\n3. Verifying Update...');
        const verifyRes = await axios.get(`${BASE_URL}/api/instances/${encodeURIComponent(INSTANCE_NAME)}/settings`, {
            headers: { 'apikey': API_KEY }
        });

        const newSettings = verifyRes.data.data;
        if (newSettings.syncFullHistory === true) {
            console.log('✅ SUCCESS: "syncFullHistory" is now enabled!');
        } else {
            console.log('Current Value:', newSettings.syncFullHistory);
            console.error('❌ FAILURE: "syncFullHistory" is still disabled.');
        }

    } catch (error) {
        console.error('❌ Error Message:', error.message);
        if (error.response) {
            console.error('❌ Response Status:', error.response.status);
            console.error('❌ Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('❌ No Response Received. Request:', error.request);
        } else {
            console.error('❌ Request Config Error:', error.config);
        }
    }
}

enableSync();
