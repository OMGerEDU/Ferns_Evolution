const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Omer 09022026';

async function restartInstance() {
    try {
        console.log(`Restarting Instance: ${INSTANCE_NAME}...`);
        // Note: The endpoint might be /instance/restart/:instanceName or /instance/logout then connect?
        // Checking evolution.js: client.get(`/instance/restart/${instanceName}`)

        const res = await axios.post(`${BASE_URL}/api/instances/${encodeURIComponent(INSTANCE_NAME)}/restart`, {}, {
            headers: { 'apikey': API_KEY }
        });

        console.log('✅ Restart Triggered:', res.data);
    } catch (error) {
        console.error('❌ Restart Failed:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

restartInstance();
