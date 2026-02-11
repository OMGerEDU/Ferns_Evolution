const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '445566';
const BASE_URL = process.env.EXTERNAL_URL || 'http://localhost:3000';
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
            "reject_call": false,
            "groups_ignore": false,
            "always_online": true,
            "read_messages": false,
            "read_status": false,
            "sync_full_history": true
        }, {
            headers: { 'apikey': API_KEY }
        });

        console.log('Update Response:', updateRes.data);

        // 3. Verify
        console.log('\n3. Verifying Update...');
        const verifyRes = await axios.get(`${BASE_URL}/api/instances/${encodeURIComponent(INSTANCE_NAME)}/settings`, {
            headers: { 'apikey': API_KEY }
        });

        const newSettings = verifyRes.data.data;
        if (newSettings.sync_full_history === true) {
            console.log('✅ SUCCESS: "sync_full_history" is now enabled!');
        } else {
            console.error('❌ FAILURE: "sync_full_history" is still disabled.');
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
