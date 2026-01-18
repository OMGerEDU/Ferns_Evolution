const axios = require('axios');
const https = require('https');
require('dotenv').config();

const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:3101';
const EVOLUTION_URL = process.env.TEST_EVOLUTION_URL || 'http://localhost:8091';
const API_KEY = process.env.API_KEY || 'your-backend-api-key';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'your-evolution-api-key';

// Client for Backend (via Caddy)
const client = axios.create({
    baseURL: BACKEND_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'Host': 'localhost'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    validateStatus: () => true
});

// Client for Evolution (Direct)
const evoClient = axios.create({
    baseURL: EVOLUTION_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
    },
    validateStatus: () => true
});

async function runTest(name, fn) {
    process.stdout.write(`🧪 Testing ${name.padEnd(40)}... `);
    try {
        await fn();
        console.log('✅ PASS');
        return true;
    } catch (error) {
        console.log('❌ FAIL');
        console.error(`   Error: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            if (error.response.data) {
                console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
            }
        }
        return false;
    }
}

async function main() {
    console.log('\n🚀 Starting Local Integration Tests');
    console.log(`📡 Backend API: ${BACKEND_URL}`);
    console.log(`📡 Evolution API: ${EVOLUTION_URL}\n`);

    let passed = 0;
    let total = 0;

    // 1. Backend Connectivity
    total++;
    await runTest('Backend public health check', async () => {
        const res = await client.get('/health');
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
        if (res.data.status !== 'ok') throw new Error('Status not "ok"');
    }) && passed++;

    // 2. Evolution API Connectivity (Direct)
    total++;
    await runTest('Evolution API direct health check', async () => {
        let res = await evoClient.get('/health');
        if (res.status === 404) {
            res = await evoClient.get('/');
        }
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    // 3. Authenticated Deep Health
    total++;
    await runTest('Backend detailed health check', async () => {
        const res = await client.get('/health/detailed');
        // Backend mounts health at /health, so detailed is /health/detailed
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    // 4. Instance Management via Backend
    total++;
    const testInstanceName = `test_${Math.floor(Math.random() * 1000)}`;
    await runTest('Create Evolution Instance via Backend', async () => {
        const res = await client.post('/api/instances', {
            instanceName: testInstanceName
        });
        if (res.status !== 201 && res.status !== 200) {
            throw new Error(`Status: ${res.status}`);
        }
    }) && passed++;

    // 4.5. Instance with Pairing Code
    total++;
    const testPairingInstanceName = `pair_${Math.floor(Math.random() * 1000)}`;
    const dummyNumber = '5511999999999'; // Dummy Brazilian number
    await runTest('Create Instance with Pairing Code', async () => {
        const res = await client.post('/api/instances', {
            instanceName: testPairingInstanceName,
            number: dummyNumber,
            qrcode: true // even for pairing code, Evolution might need this toggle or just use number
        });
        if (res.status !== 201 && res.status !== 200) {
            throw new Error(`Status: ${res.status}`);
        }
        // Verify response contains pairing code elements if possible, or just success
        // Evolution v2 might return the code immediately or require a separate call.
        // Based on grep, it looked like it returns "pairingCode": "..." or "code": "..."
        if (res.data.data && (res.data.data.pairingCode || res.data.data.code)) {
            console.log('   ℹ️  Received Pairing Code:', res.data.data.pairingCode || res.data.data.code);
        }

        // Cleanup this instance
        try {
            await client.delete(`/api/instances/${testPairingInstanceName}`);
        } catch (e) { /* ignore cleanup error */ }

    }) && passed++;

    // 5. Cleanup
    total++;
    await runTest('Delete Test Instance', async () => {
        const res = await client.delete(`/api/instances/${testInstanceName}`);
        if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    }) && passed++;

    console.log(`\n📊 Summary: ${passed}/${total} tests passed.`);
    process.exit(passed === total ? 0 : 1);
}

main();
