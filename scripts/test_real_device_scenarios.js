const axios = require('axios');
const https = require('https');
require('dotenv').config();

const EXTERNAL_URL = 'https://evolution.omger.cloud';
const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';

// Found from previous step
const INSTANCE_NAME = 'Omer 09022026';
const OWNER_JID = '972545661640@s.whatsapp.net'; // The user's number
const DESTINATION_NUMBER = '972545661640'; // Send to self

const client = axios.create({
    baseURL: EXTERNAL_URL,
    headers: { 'apikey': API_KEY },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    validateStatus: () => true
});

async function runRealDeviceTests() {
    console.log(`\n--- 📱 Real Device Verification: ${INSTANCE_NAME} ---\n`);

    try {
        // 1. Check Instance Connection State
        console.log(`1. Checking connection state for ${INSTANCE_NAME}...`);
        const stateRes = await client.get(`/api/instances/${encodeURIComponent(INSTANCE_NAME)}`);

        console.log('Full State Response:', JSON.stringify(stateRes.data, null, 2));

        // Fix: Use 'state' instead of 'connectionStatus' based on actual response
        const status = stateRes.data?.data?.instance?.state || stateRes.data?.instance?.state;

        if (status !== 'open') {
            console.error(`❌ Instance is NOT connected! Status: ${status}`);
            console.log('Please check your phone and ensure WhatsApp is connected.');
            return;
        }
        console.log('✅ Instance is OPEN and connected.');

        // 2. Send Text Message to Self
        console.log(`\n2. Sending test message to ${DESTINATION_NUMBER}...`);
        const msgRes = await client.post(`/api/messages/text`, {
            instanceName: INSTANCE_NAME,
            number: DESTINATION_NUMBER,
            text: `🔔 Test Message from Evolution Backend QA\nTime: ${new Date().toISOString()}`
        });

        if (msgRes.status === 200 && msgRes.data?.success) {
            console.log('✅ Message sent successfully!', msgRes.data);
            console.log('👉 PLEASE CHECK YOUR PHONE NOW for a message.');
        } else {
            console.error('❌ Failed to send message:', msgRes.data);
        }

        // 3. List Built-in Automations (Verification)
        console.log('\n3. Checking Built-in Automations...');
        const autoRes = await client.get('/api/automations/builtin');
        if (autoRes.status === 200) {
            console.log(`✅ Found ${autoRes.data?.count || 0} built-in automations.`);
            if (autoRes.data?.data) {
                autoRes.data.data.forEach(a => console.log(`   - [${a.id}] ${a.name} (${a.description})`));
            }
        } else {
            console.error('❌ Failed to list automations:', autoRes.data);
        }

        // 4. Enable "System Help" Automation (Test)
        console.log('\n4. Enabling "System Help" Automation...');
        try {
            const enableRes = await client.post('/api/automations/builtin/command-help/enable', {
                tenantId: INSTANCE_NAME,
                enabled: true
            });
            if (enableRes.status === 201 || enableRes.status === 200) {
                console.log('✅ Successfully enabled "System Help" automation!', enableRes.data);
                console.log('👉 Try sending "!help" to your bot from another phone to test it.');
            } else {
                console.error('❌ Failed to enable automation:', enableRes.data);
            }
        } catch (err) {
            console.error('❌ Error enabling automation:', err.message, err.response?.data);
        }


    } catch (error) {
        console.error('❌ Test Script Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

runRealDeviceTests();
