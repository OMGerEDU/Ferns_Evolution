/**
 * Black Box QA Script (Simulated Webhook + Notes API)
 * Usage: node scripts/test_full_automation.js [instanceName]
 * 
 * 1. SIMULATES an incoming Webhook (!note ...).
 * 2. VERIFIES persistence via GET /api/notes/:jid.
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const INSTANCE = process.argv[2] || 'Sasha';
const TEST_USER_JID = 'qa_test_user@s.whatsapp.net'; // Distinct JID
const BASE_URL = 'https://evolution.omger.cloud';
const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';

const headers = { 'apikey': API_KEY, 'Content-Type': 'application/json' };

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function simulateWebhook(text) {
    const payload = {
        event: 'messages.upsert',
        instance: INSTANCE,
        data: {
            key: {
                remoteJid: TEST_USER_JID,
                fromMe: false,
                id: `TEST_${Date.now()}`
            },
            pushName: 'QA Bot',
            message: {
                conversation: text
            },
            messageType: 'conversation',
            messageTimestamp: Math.floor(Date.now() / 1000)
        }
    };

    try {
        console.log(`[ACTION] Simulating Webhook: "${text}"...`);
        await axios.post(`${BASE_URL}/api/webhooks/evolution`, payload);
        console.log(`[ACTION] Webhook OK.`);
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
        console.error(`[ERROR] Verify Failed: ${err.message}`);
        return false;
    }
}

async function runTests() {
    console.log('--- STARTING QA (WEBHOOK -> API) ---');
    console.log(`Target: ${BASE_URL}`);

    // Test 1: !note Logic
    const uniqueNote = `Secret_${Date.now()}`;
    await simulateWebhook(`!note ${uniqueNote}`);

    await sleep(2000); // Wait for DB Insert

    const passed = await verifyNotePersistence(uniqueNote);

    console.log('--- TEST RESULTS ---');
    console.log(`!note Persistence: ${passed ? 'PASSED' : 'FAILED'}`);
}

runTests();
