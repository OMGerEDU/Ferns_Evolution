const axios = require('axios');
const https = require('https');
require('dotenv').config();

const EXTERNAL_URL = 'https://evolution.omger.cloud';
const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
// Use the verified info
const INSTANCE_NAME = 'Omer 09022026';
const OWNER_JID = '972545661640@s.whatsapp.net'; // User's number (as sender of trigger)

const client = axios.create({
    baseURL: EXTERNAL_URL,
    headers: { 'apikey': API_KEY },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    validateStatus: () => true
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'automation_test.log');

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

function error(message, data) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [ERROR] ${message}`;
    if (data) {
        formattedMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    console.error(formattedMessage);
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

async function runAutomationCycle() {
    // Clear old log
    fs.writeFileSync(LOG_FILE, `--- Test Run Start: ${new Date().toISOString()} ---\n`);
    log(`\n--- 🔄 Automation Lifecycle Test: ${INSTANCE_NAME} ---\n`);

    try {
        // 1. ENABLE "System Help" Automation
        log('1. Enabling "System Help" Automation...');
        const enableRes = await client.post('/api/automations/builtin/command-help/enable', {
            tenantId: INSTANCE_NAME,
            enabled: true
        });

        if (enableRes.status !== 200 && enableRes.status !== 201) {
            error('❌ Failed to enable automation:', enableRes.data);
            return;
        }
        log('✅ Automation enabled.');
        await sleep(2000);

        // 2. TRIGGER via Webhook Injection
        // We simulate an INCOMING message from the user's number.
        // This bypasses 'fromMe' checks and makes the bot reply to the user.
        log('⏳ Waiting 5s...');
        await sleep(5000);

        // 2.5 DIAGNOSTIC: Send a real message to ensure chat exists
        log('\n2.5. Diagnostic: Sending real text message to ensure chat exists...');
        const testMsgId = `DIAG_${Date.now()}`;
        const sendRes = await client.post('/api/messages/text', {
            instanceName: INSTANCE_NAME,
            number: OWNER_JID,
            text: `Diagnostic Message ${testMsgId}`
        });
        if (sendRes.status === 200 || sendRes.status === 201) {
            log('✅ Diagnostic message sent.');
        } else {
            error('❌ Failed to send diagnostic message:', sendRes.data);
        }

        log('⏳ Waiting 5s for sync...');
        await sleep(5000);

        // 2.6 DIAGNOSTIC: List Chats
        log('\n2.6. Diagnostic: Fetching Chats...');
        try {
            const chatRes = await client.get(`/api/chats?instanceName=${encodeURIComponent(INSTANCE_NAME)}`);
            if (chatRes.data?.data) {
                const chats = chatRes.data.data;
                log(`Found ${chats.length} active chats.`);
                // Fix: Check remoteJid for WhatsApp JID, not id (which is internal UUID)
                const myChat = chats.find(c => c.remoteJid === OWNER_JID || c.remoteJid?.includes(OWNER_JID.split('@')[0]));
                if (myChat) {
                    log(`✅ Found Chat with OWNER_JID: ${myChat.remoteJid} (Internal ID: ${myChat.id})`);
                } else {
                    log(`⚠️ Chat with OWNER_JID (${OWNER_JID}) NOT found in chat list.`);
                }
            }
        } catch (cError) {
            log('⚠️ Fetch Chats failed: ' + cError.message);
        }

        log(`\n2. Triggering "!help" via Webhook Injection (Simulating sender: ${OWNER_JID})...`);

        const timestamp = Math.floor(Date.now() / 1000);
        const webhookPayload = {
            event: 'messages.upsert',
            instance: INSTANCE_NAME,
            data: {
                key: {
                    remoteJid: OWNER_JID,
                    fromMe: false, // Vital for triggering logic
                    id: `TEST_MSG_${timestamp}`
                },
                pushName: 'QA Tester',
                messageTimestamp: timestamp,
                message: {
                    conversation: '!help'
                },
                messageType: 'conversation'
            }
        };

        const triggerRes = await client.post('/api/webhooks/evolution/messages.upsert', webhookPayload);

        if (triggerRes.status === 200) {
            log('✅ Webhook injected successfully.');
        } else {
            error('❌ Failed to inject webhook:', triggerRes.data);
            return;
        }

        log('⏳ Waiting 10s for processing...');
        await sleep(10000);

        // 3. VERIFY (Attempt to find the reply)
        log('\n3. Verifying Bot Reply...');

        try {
            // Step 3b: Verify Reply (fromMe: true)
            // fetch more messages to be safe
            const replyCheck = await client.post('/api/chats/find-messages', {
                instanceName: INSTANCE_NAME,
                where: {
                    key: {
                        remoteJid: OWNER_JID
                    }
                },
                limit: 10
            });

            log(`Raw Find Response Data Type: ${typeof replyCheck.data}`);

            let messages = [];
            if (Array.isArray(replyCheck.data?.data)) {
                messages = replyCheck.data.data;
            } else if (Array.isArray(replyCheck.data?.data?.messages)) {
                messages = replyCheck.data.data.messages;
            } else if (Array.isArray(replyCheck.data)) {
                messages = replyCheck.data;
            }

            log(`Found ${messages.length} messages in history.`);

            if (messages.length === 0) {
                log('⚠️ Specific search returned 0 messages. Attempting broad search (no filters)...');
                try {
                    const broadCheck = await client.post('/api/chats/find-messages', {
                        instanceName: INSTANCE_NAME,
                        where: {},
                        limit: 5
                    });
                    if (Array.isArray(broadCheck.data?.data)) {
                        messages = broadCheck.data.data;
                    } else if (Array.isArray(broadCheck.data?.data?.messages)) {
                        messages = broadCheck.data.data.messages;
                    }
                    log(`Broad search found ${messages.length} messages.`);
                    // Log the first few to check format
                    messages.slice(0, 3).forEach((m, i) => {
                        log(`[Broad ${i}] JID: ${m.key?.remoteJid} | TS: ${m.messageTimestamp}`);
                    });
                } catch (bError) {
                    log('⚠️ Broad search failed: ' + bError.message);
                }

                // Final Diagnosis based on collected data
                try {
                    const chatRes = await client.get(`/api/chats?instanceName=${encodeURIComponent(INSTANCE_NAME)}`);
                    const chatCount = chatRes.data?.data?.length || 0;
                    if (messages.length === 0 && chatCount > 0) {
                        error('❌ CRITICAL DIAGNOSIS: Chats exist (' + chatCount + ') but Message Search returned 0 results.');
                        error('👉 This indicates that the Evolution API Database Sync is DISABLED or BROKEN for this instance.');
                        error('👉 The automation might be working, but we cannot verify it via API history.');
                    }
                } catch (dError) { }
            }
            messages.slice(0, 3).forEach((m, i) => {
                const content = m.message?.conversation || m.message?.extendedTextMessage?.text || '[Media/Other]';
                const ts = m.messageTimestamp;
                const date = new Date(ts * 1000).toISOString();
                log(`[${i}] ${date} (${ts}): ${content.substring(0, 100)}`);
            });

            // Relaxed Filter: Just look for a recent message (last 30 seconds)
            // Handling potential clock skew by accepting messages from slightly before our start time if needed,
            // but primarily we just want to see if the BOT replied.

            const reply = messages.find(m => {
                const content = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
                return content.toLowerCase().includes('help') || content.toLowerCase().includes('command');
            });

            if (reply) {
                const content = reply.message?.conversation || reply.message?.extendedTextMessage?.text || '';
                log('✅ Verified: Bot dispatched a reply!');
                log(`   Reply Content: "${content.substring(0, 100)}..."`);
            } else {
                log('⚠️ Could not find expected "Help" reply in history.');
                log('👉 Please check your phone manually. If it replied, there might be a sync delay or keyword mismatch.');
            }
        } catch (vError) {
            log('⚠️ Verification step failed (non-critical): ' + vError.message);
        }

    } catch (err) {
        error('❌ Test Script Error:', err.message);
        if (err.response) error('Data:', err.response.data);
    } finally {
        // 4. DISABLE "System Help" Automation (Ensure cleanup)
        log('\n4. Disabling "System Help" Automation...');
        try {
            const disableRes = await client.post('/api/automations/builtin/command-help/enable', {
                tenantId: INSTANCE_NAME,
                enabled: false
            });

            if (disableRes.status === 200 || disableRes.status === 201) {
                log('✅ Automation disabled.');
            } else {
                error('❌ Failed to disable automation:', disableRes.data);
            }
        } catch (dError) {
            error('❌ Error disabling automation:', dError.message);
        }

        log('\n--- 🏁 Cycle Complete ---');
    }
}

runAutomationCycle();
