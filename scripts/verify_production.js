const axios = require('axios');
const https = require('https');
require('dotenv').config();

const BASE_URL = process.env.QA_URL || 'https://evolution.builders-tech.com:3101';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error('❌ Error: API_KEY is missing in .env');
    process.exit(1);
}

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    validateStatus: () => true // Don't throw on error status
});

async function runTest(name, fn) {
    process.stdout.write(`Testing ${name}... `);
    try {
        await fn();
        console.log('✅ PASS');
        return true;
    } catch (error) {
        console.log('❌ FAIL');
        console.error(`   ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        }
        return false;
    }
}

async function main() {
    console.log(`🚀 Starting QA Confirmation against: ${BASE_URL}\n`);

    let passed = 0;
    let total = 0;

    // 1. SSL/Connectivity Check
    total++;
    await runTest('SSL & Connectivity', async () => {
        const response = await client.get('/health');
        if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    });

    // 2. Public Health Check
    total++;
    await runTest('Public Health Endpoint (/health)', async () => {
        const response = await client.get('/health');
        if (response.data.status !== 'ok') throw new Error('Response status is not "ok"');
    });

    // 3. Auth Failure Check
    total++;
    await runTest('Auth Protection (No Key)', async () => {
        const response = await client.get('/health/detailed'); // Should require auth check logic if protected, defaulting to fail check logic
        // Wait, /health/detailed might change. Let's check /api/instances which IS protected.
        const protectedRes = await client.get('/api/instances');
        if (protectedRes.status !== 401) throw new Error(`Expected 401 Unauthorized for protected route, got ${protectedRes.status}`);
    });

    // 4. Authenticated Health Check
    total++;
    await runTest('Authenticated Access (With Key)', async () => {
        const response = await client.get('/health/detailed', {
            headers: { 'apikey': API_KEY }
        });
        if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
        if (!response.data.healthy) throw new Error('System reports "unhealthy" status');
    });

    // 5. Evolution API Connectivity
    total++; // If /health/detailed passes, this is implicitly tested, but let's check specifically
    await runTest('Evolution API Connection', async () => {
        const response = await client.get('/health/detailed', {
            headers: { 'apikey': API_KEY }
        });
        if (!response.data.services.evolution.healthy) throw new Error('Evolution API is reported unhealthy');
    });

    console.log(`\n🎉 Results: ${passed}/${total} Tests Passed`);
}

main();
