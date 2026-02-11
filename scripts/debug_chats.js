const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Omer 09022026';

async function listChats() {
    try {
        console.log(`Fetching chats for: ${INSTANCE_NAME}...`);
        const res = await axios.get(`${BASE_URL}/api/chats?instanceName=${encodeURIComponent(INSTANCE_NAME)}`, {
            headers: { 'apikey': API_KEY }
        });

        const chats = res.data.data || [];
        console.log(`Found ${chats.length} chats.`);

        console.log('--- First Chat Object Structure ---');
        if (chats.length > 0) {
            console.log(JSON.stringify(chats[0], null, 2));
        }

        // Search for owner by remoteJid
        const ownerNum = '972545661640';
        const ownerChat = chats.find(c => c.remoteJid && c.remoteJid.includes(ownerNum));

        if (ownerChat) {
            console.log(`\n✅ Found Owner Chat! Internal ID: ${ownerChat.id}, RemoteJid: ${ownerChat.remoteJid}`);

            // Test 1: Search by remoteJid (Old way)
            console.log('\nTest 1: Search messages by remoteJid...');
            try {
                const res1 = await axios.post(`${BASE_URL}/api/chats/find-messages`, {
                    instanceName: INSTANCE_NAME,
                    where: { key: { remoteJid: ownerChat.remoteJid } },
                    limit: 5
                }, { headers: { 'apikey': API_KEY } });
                console.log(`   Result: Found ${res1.data?.data?.length || res1.data?.length || 0} messages.`);
            } catch (e) { console.log('   Error:', e.message); }

            // Test 2: Search by conversationId (Internal ID)
            console.log('\nTest 2: Search messages by conversationId (Internal ID)...');
            try {
                const res2 = await axios.post(`${BASE_URL}/api/chats/find-messages`, {
                    instanceName: INSTANCE_NAME,
                    where: { conversationId: ownerChat.id },
                    limit: 5
                }, { headers: { 'apikey': API_KEY } });
                console.log(`   Result: Found ${res2.data?.data?.length || res2.data?.length || 0} messages.`);
            } catch (e) { console.log('   Error:', e.message); }

        } else {
            console.log(`\n❌ Owner Chat (${ownerNum}) NOT found in list.`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listChats();
