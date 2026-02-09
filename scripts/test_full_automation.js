/**
 * REAL DEVICE QA Script (Simulated Webhook -> Real WhatsApp Delivery)
 * Usage: node scripts/test_full_automation.js [instanceName]
 * 
 * 1. SIMULATES an incoming Webhook from YOUR REAL NUMBER (972545661640).
 * 2. Backend sees it as a command (!note, !sticker).
 * 3. Backend processes it and sends a REAL REPLY to your phone.
 * 4. VERIFIES persistence via GET /api/notes/:jid (if backend restarted).
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const INSTANCE = process.argv.slice(2).join(' ') || 'Omer 09022026';
const TEST_USER_JID = '972545661640@s.whatsapp.net'; // REAL USER NUMBER
const BASE_URL = 'https://evolution.omger.cloud';
const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';

const headers = { 'apikey': API_KEY, 'Content-Type': 'application/json' };

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function simulateWebhook(payloadData) {
    const payload = {
        event: 'messages.upsert',
        instance: INSTANCE,
        data: payloadData
    };

    try {
        console.log(`[ACTION] Simulating Webhook...`);
        await axios.post(`${BASE_URL}/api/webhooks/evolution`, payload);
        console.log(`[ACTION] Webhook Posted OK.`);
    } catch (err) {
        console.error(`[ERROR] Webhook Failed: ${err.message}`);
    }
}

async function verifyNotePersistence(noteContent) {
    try {
        console.log(`[VERIFY] Checking /api/notes/${TEST_USER_JID}...`);
        const res = await axios.get(`${BASE_URL}/api/notes/${TEST_USER_JID}`, { headers });

        if (res.data.success && Array.isArray(res.data.data)) {
            const found = res.data.data.find(n => n.content === noteContent);
            if (found) {
                console.log(`✅ Passed: Found note "${noteContent}" in DB.`);
                return true;
            } else {
                console.log(`❌ Failed: Note "${noteContent}" not found.`);
                return false;
            }
        } else {
            console.log(`❌ Failed: Invalid response format from /api/notes.`);
            return false;
        }

    } catch (err) {
        console.log(`⚠️ Verify Skipped/Failed (Backend might need restart): ${err.message}`);
        if (err.response?.status === 404) console.log("   -> Did you restart backend to apply /api/notes route?");
        return false;
    }
}

async function runTests() {
    console.log('--- STARTING REAL DEVICE QA ---');
    console.log(`Target: ${BASE_URL}`);
    console.log(`User: ${TEST_USER_JID}`);
    console.log('');

    // --- TEST 1: !note (Text Command) ---
    console.log('--- TEST 1: !note ---');
    const uniqueNote = `RealTest_${Date.now()}`;
    await simulateWebhook({
        key: { remoteJid: TEST_USER_JID, fromMe: false, id: `msg_${Date.now()}` },
        pushName: 'Omer',
        message: { conversation: `!note ${uniqueNote}` },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000)
    });

    console.log('-> Check your phone: You should receive a "📝" reaction or text confirmation.');
    await sleep(2000);
    await verifyNotePersistence(uniqueNote);
    console.log('');

    // --- TEST 2: !id (Info Command) ---
    console.log('--- TEST 2: !id ---');
    await simulateWebhook({
        key: { remoteJid: TEST_USER_JID, fromMe: false, id: `msg_${Date.now()}_2` },
        pushName: 'Omer',
        message: { conversation: `!id` },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000)
    });
    console.log('-> Check your phone: You should receive your JID info.');
    console.log('');
    await sleep(2000);

    // --- TEST 3: !sticker (Media Command) ---
    console.log('--- TEST 3: !sticker ---');
    // Simulate sending an image with caption !sticker
    await simulateWebhook({
        key: { remoteJid: TEST_USER_JID, fromMe: false, id: `msg_${Date.now()}_3` },
        pushName: 'Omer',
        message: {
            imageMessage: {
                caption: '!sticker',
                url: 'https://placehold.co/200x200.png', // Public placeholder image
                mimetype: 'image/png'
            }
        },
        messageType: 'imageMessage',
        messageTimestamp: Math.floor(Date.now() / 1000)
    });
    console.log('-> Check your phone: You should receive a STICKER of a placeholder image.');
    console.log('---------------------------');
}

runTests();
