const axios = require('axios');
const https = require('https');
require('dotenv').config();

// Configuration
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:3101';
const EXTERNAL_URL = 'https://evolution.omger.cloud';
const API_KEY = process.env.API_KEY;
const ADMIN_USER = 'omger';
const ADMIN_PASS = 'zxcv1234';

// Clients
const localClient = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000,
    headers: { 'apikey': API_KEY, 'Host': 'localhost' },
    validateStatus: () => true
});

const externalClient = axios.create({
    baseURL: EXTERNAL_URL,
    timeout: 10000,
    headers: { 'apikey': API_KEY },
    validateStatus: () => true
});

// Helper
async function runTest(name, fn) {
    process.stdout.write(`🧪 ${name.padEnd(50)} `);
    try {
        await fn();
        console.log('✅ PASS');
        return true;
    } catch (error) {
        console.log('❌ FAIL');
        console.error(`   Error: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, JSON.stringify(error.response.data));
        }
        return false;
    }
}

async function main() {
    console.log('\n🚀 Starting ALL Integration Tests (Local + External + Admin)\n');
    let passed = 0;
    let total = 0;

    // --- 1. LOCAL CONNECTIVITY ---
    total++;
    await runTest('Local Backend Health [GET /health]', async () => {
        const res = await localClient.get('/health');
        if (res.status !== 200 || res.data.status !== 'ok') throw new Error('Health check failed');
    }) && passed++;

    // --- 2. INSTANCE OPERATIONS (Local) ---
    total++;
    const userNumberInstance = '972545661640'; // Sanitized from 0545661640
    await runTest(`Create Specific Instance (${userNumberInstance})`, async () => {
        // Try to delete first in case it was left over from a previous run
        try { await localClient.delete(`/api/instances/${userNumberInstance}`); } catch (e) { }

        const res = await localClient.post('/api/instances', { instanceName: userNumberInstance });
        if (res.status !== 201 && res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    total++;
    await runTest(`Delete Specific Instance (${userNumberInstance})`, async () => {
        const res = await localClient.delete(`/api/instances/${userNumberInstance}`);
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    total++;
    const testInstance = `test_auto_${Math.floor(Math.random() * 1000)}`;
    await runTest('Create Instance (Random)', async () => {
        const res = await localClient.post('/api/instances', { instanceName: testInstance });
        if (res.status !== 201 && res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    total++;
    await runTest('Get Connection State (Local)', async () => {
        const res = await localClient.get(`/api/instances/${testInstance}`);
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
        if (!res.data.data.instanceName) throw new Error('Invalid response structure');
    }) && passed++;

    total++;
    await runTest('Get QR Code (Local)', async () => {
        const res = await localClient.get(`/api/instances/${testInstance}/qr`);
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
        // Data might vary (qrcode or base64), but request should succeed
    }) && passed++;

    total++;
    await runTest('Send Message (Expect Fail - Disconnected)', async () => {
        try {
            await localClient.post('/api/messages/text', {
                instanceName: testInstance,
                number: '1234567890',
                text: 'Hello World'
            });
            throw new Error('Should have failed (instance not connected)');
        } catch (e) {
            // We expect a 400/404/500 or a specific Evolution error because instance is not connected
            // Just verifying we hit the right endpoint and got a response is enough for integration test
            if (!e.response) throw e;
        }
    }) && passed++;

    total++;
    await runTest('Delete Instance (Local)', async () => {
        const res = await localClient.delete(`/api/instances/${testInstance}`);
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    // --- 3. EXTERNAL CONNECTIVITY (Tunnel) ---
    total++;
    await runTest('External Backend Health [GET /health]', async () => {
        const res = await externalClient.get('/health');
        if (res.status !== 200) throw new Error(`Status: ${res.status} (Tunnel might be down)`);
    }) && passed++;

    total++;
    const testInstanceExt = `test_ext_${Math.floor(Math.random() * 1000)}`;
    await runTest('Create Instance (External) [POST /api/instances]', async () => {
        const res = await externalClient.post('/api/instances', { instanceName: testInstanceExt });
        if (res.status !== 201 && res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    total++;
    await runTest('Delete Instance (External) [DELETE /api/instances/:name]', async () => {
        try {
            const res = await externalClient.delete(`/api/instances/${testInstanceExt}`);
            if (res.status !== 200) throw new Error(`Status: ${res.status}`);
        } catch (e) {
            // Ignore 404 if creation failed previously to avoid double error
            if (e.response && e.response.status !== 404) throw e;
        }
    }) && passed++;

    // --- 4. ADMIN PLAYGROUND TESTS (New) ---
    total++;
    await runTest('Admin Static Files [/admin/index.html]', async () => {
        const res = await localClient.get('/admin/index.html');
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
        if (!res.data.includes('Evolution Admin')) throw new Error('HTML content mismatch');
    }) && passed++;

    total++;
    await runTest('Admin Auth Success', async () => {
        const res = await localClient.post('/admin/auth', {
            username: ADMIN_USER,
            password: ADMIN_PASS
        });
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
        if (!res.data.success || !res.data.apiKey) throw new Error('Auth response invalid');
    }) && passed++;

    total++;
    await runTest('Admin Auth Failure', async () => {
        const res = await localClient.post('/admin/auth', {
            username: ADMIN_USER,
            password: 'wrongpassword'
        });
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    }) && passed++;

    console.log(`\n📊 Summary: ${passed}/${total} tests passed.`);
    process.exit(passed === total ? 0 : 1);
}

main();
