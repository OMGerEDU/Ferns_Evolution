const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';

// Instance Config
const BOT_INSTANCE = 'Omer 09022026';
const BOT_NUMBER = '972545661640'; // Target (Receiver)
const TESTER_INSTANCE = 'Ebi01';
const TESTER_NUMBER = '972538245304'; // Sender

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'apikey': API_KEY },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    validateStatus: () => true
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkInstanceStatus(instance) {
    console.log(`[${instance}] Checking status...`);
    try {
        const res = await client.get(`/api/instances/${instance}`);
        const status = res.data?.data?.status || res.data?.data?.connectionStatus || 'Unknown';
        console.log(`✅ Status: ${status}`);
        return true;
    } catch (e) {
        console.error(`❌ Failed to fetch instance: ${e.message}`, e.response?.data);
        return false;
    }
}

async function sendText(instance, number, text) {
    console.log(`[${instance}] Sending "${text}" to ${number}...`);
    try {
        const res = await client.post(`/api/messages/text`, {
            instanceName: instance,
            number: number,
            text: text
        });

        if (res.data && res.data.success) {
            console.log(`✅ Sent.`);
            return true;
        } else {
            console.error(`❌ Failed to send:`, res.data);
            return false;
        }
    } catch (e) {
        console.error(`❌ Failed to send: ${e.message}`, e.response?.data);
        return false;
    }
}

async function checkHistoryForReply(instance, remoteJid, expectedText, fromMe = false, limit = 10) {
    console.log(`[${instance}] Checking history with ${remoteJid} for "${expectedText}" (fromMe: ${fromMe})...`);

    // Use findMessages which searches DB
    // Since sync is flaky, this might fail, but it's our best automated check
    const res = await client.post(`/api/chats/find-messages`, {
        instanceName: instance,
        where: {
            key: { remoteJid: remoteJid + '@s.whatsapp.net' }
        },
        options: {
            limit: limit,
            order: 'DESC'
        }
    });

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const messages = res.data;
        const found = messages.find(m => {
            const content = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
            const isMatch = content.toLowerCase().includes(expectedText.toLowerCase());
            const directionMatch = m.key.fromMe === fromMe;
            return isMatch && directionMatch;
        });

        if (found) {
            console.log(`✅ Found message: "${found.message?.conversation || found.message?.extendedTextMessage?.text}"`);
            return true;
        }
    }

    console.warn(`⚠️ Message not found in history (Sync issue possible).`);
    return false;
}

async function runTests() {
    console.log(`--- 🤖 Inter-Instance Testing 🤖 ---`);
    console.log(`Sender: ${TESTER_INSTANCE} (${TESTER_NUMBER})`);
    console.log(`Receiver: ${BOT_INSTANCE} (${BOT_NUMBER})`);
    console.log(`------------------------------------\n`);

    if (!await checkInstanceStatus(TESTER_INSTANCE)) return;
    if (!await checkInstanceStatus(BOT_INSTANCE)) return;

    // 1. Ping
    console.log(`🔹 Test 1: Ping`);
    if (await sendText(TESTER_INSTANCE, BOT_NUMBER, 'ping')) {
        console.log(`   ⏳ Waiting 10s for reply...`);
        await sleep(10000);
        // Check Tester (Ebi01) for incoming 'pong'
        await checkHistoryForReply(TESTER_INSTANCE, BOT_NUMBER, 'pong', false);
        // Check Bot (Omer) for outgoing 'pong'
        await checkHistoryForReply(BOT_INSTANCE, TESTER_NUMBER, 'pong', true);
    }

    // 2. Hello (Receipt)
    console.log(`\n🔹 Test 2: Receipt Config`);
    if (await sendText(TESTER_INSTANCE, BOT_NUMBER, 'Hello from Ebi01')) {
        console.log(`   ⏳ Waiting 10s for reply...`);
        await sleep(10000);
        await checkHistoryForReply(TESTER_INSTANCE, BOT_NUMBER, 'Receipt Confirmed', false);
    }

    // 3. !help
    console.log(`\n🔹 Test 3: Command Help`);
    if (await sendText(TESTER_INSTANCE, BOT_NUMBER, '!help')) {
        console.log(`   ⏳ Waiting 10s for reply...`);
        await sleep(10000);
        await checkHistoryForReply(TESTER_INSTANCE, BOT_NUMBER, 'Bot Command Menu', false);
    }

    console.log(`\n--- 🏁 Tests Complete ---`);
    console.log(`👉 Please check Ebi01's phone (or the logs above if history sync worked) to verify replies.`);
}

runTests().catch(console.error);
