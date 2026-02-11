const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.E2E_BASE_URL || 'https://evolution.omger.cloud';
const INSTANCE = process.env.E2E_INSTANCE || 'Omer 09022026';
const TEST_USER_JID = '972545661640@s.whatsapp.net';
const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap'; // Default from original script

// Skip if we are not running E2E explicitly or missing crucial vars
const runE2E = process.env.RUN_E2E === 'true';

describe('E2E Real Device Automation', () => {
    // Only run if conditions met, otherwise skip suite
    if (!runE2E) {
        it.skip('Skipping E2E tests (RUN_E2E != true)', () => { });
        return;
    }

    const headers = { 'apikey': API_KEY, 'Content-Type': 'application/json' };

    // Helper to simulate webhook
    async function simulateWebhook(payloadData) {
        const payload = {
            event: 'messages.upsert',
            instance: INSTANCE,
            data: payloadData
        };
        await axios.post(`${BASE_URL}/api/webhooks/evolution`, payload);
    }

    // Helper to verify note persistence
    async function verifyNotePersistence(noteContent) {
        try {
            const res = await axios.get(`${BASE_URL}/api/notes/${TEST_USER_JID}`, { headers });
            if (res.data.success && Array.isArray(res.data.data)) {
                return res.data.data.find(n => n.content === noteContent);
            }
        } catch (err) {
            console.error('Note verification failed:', err.message);
        }
        return false;
    }

    it('should handle !note command and persist it', async () => {
        const uniqueNote = `JestE2E_${Date.now()}`;

        console.log(`[E2E] Simulating !note ${uniqueNote}`);
        await simulateWebhook({
            key: { remoteJid: TEST_USER_JID, fromMe: false, id: `msg_${Date.now()}` },
            pushName: 'jest-e2e',
            message: { conversation: `!note ${uniqueNote}` },
            messageType: 'conversation',
            messageTimestamp: Math.floor(Date.now() / 1000)
        });

        // Wait for processing
        await new Promise(r => setTimeout(r, 2000));

        const note = await verifyNotePersistence(uniqueNote);
        expect(note).toBeTruthy();
        expect(note.content).toBe(uniqueNote);
    }, 20000); // Increased timeout for E2E

    it('should handle !id command (simulated)', async () => {
        // We can't verify the reply on the phone programmatically easily without reading the phone's messages 
        // via another API, but we can ensure the webhook endpoint returns 200 OK.

        console.log(`[E2E] Simulating !id`);
        // We just expect this promise to resolve (status 200 assumed from axios call in helper)
        await expect(simulateWebhook({
            key: { remoteJid: TEST_USER_JID, fromMe: false, id: `msg_${Date.now()}_2` },
            pushName: 'jest-e2e',
            message: { conversation: `!id` },
            messageType: 'conversation',
            messageTimestamp: Math.floor(Date.now() / 1000)
        })).resolves.not.toThrow();
    });
});
