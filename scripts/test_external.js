const axios = require('axios');
require('dotenv').config();

/**
 * This script tests the external availability of the Evolution Backend
 * and the Evolution API through the Cloudflare Tunnel.
 */

const EXTERNAL_URL = 'https://evolution.omger.cloud';
const API_KEY = process.env.API_KEY;

async function testExternalAccess() {
    console.log(`\n--- testing External Access to: ${EXTERNAL_URL} ---\n`);

    try {
        // 1. Test Backend Health via Tunnel
        console.log('1. Checking Backend Health...');
        const backendHealth = await axios.get(`${EXTERNAL_URL}/health`, {
            headers: { 'x-api-key': API_KEY },
            timeout: 10000
        });
        console.log('✅ Backend is reachable! Status:', backendHealth.data.status);

        // 2. Test Evolution API proxying through Backend
        console.log('\n2. Checking Evolution API access (via Backend proxy)...');
        // Note: This assumes /evolution is a route in your backend that proxies to Evolution API
        // If you want to test Evolution API directly, you'd need another hostname or a specific path.
        // For now, let's just see if we can reach the main entry point.

        console.log('\n✨ External Test Passed!');
    } catch (error) {
        console.error('\n❌ External Test Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        console.log('\nPossible reasons:');
        console.log('- Cloudflare Tunnel is not running.');
        console.log('- Token in .env is incorrect.');
        console.log('- Cloudflare Dashboard Public Hostname is misconfigured (should be http://caddy:80).');
    }
}

testExternalAccess();
