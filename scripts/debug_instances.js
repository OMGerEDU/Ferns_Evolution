const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.API_KEY || '54yWPufPt9y2Wp9QUap';
const BASE_URL = process.env.EXTERNAL_URL || 'https://evolution.omger.cloud';

async function debugInstances() {
    try {
        console.log(`Checking instances at: ${BASE_URL}`);

        // 1. Fetch All Instances
        const res = await axios.get(`${BASE_URL}/api/instances`, {
            headers: { 'apikey': API_KEY }
        });

        const instances = res.data.data || [];
        console.log(`Found ${instances.length} instances.`);

        for (const inst of instances) {
            console.log(`\n--- Instance: ${inst.name} ---`);
            console.log(`Status: ${inst.connectionStatus}`);
            console.log(`Owner: ${inst.ownerJid}`);

            // 2. Probe Settings Endpoints
            const probes = [
                `/instance/settings/find/${inst.name}`, // Current (Failing)
                `/settings/find/${inst.name}`,
                `/instance/settings/${inst.name}`,
                `/instance/fetch/${inst.name}`
            ];

            for (const probe of probes) {
                try {
                    console.log(`\n   Probing: ${probe}`);
                    const res = await axios.get(`${BASE_URL}/server-proxy${probe}`, { // Hack: Bypass backend proxy if possible, or just log what happens
                        // Actually, we can't hit Evolution API directly from here easily if it's internal to Docker network.
                        // But wait, the backend client uses the internal URL.
                        // We are testing the BACKEND's ability to proxy.
                        // To test potential endpoints, we need to modify the BACKEND code or rely on documentation.
                        // Since I can't hit Evolution API directly (it's behind Caddy/Backend), 
                        // effectively I need to change the backend code to test.

                        // RE-THINK:
                        // I can't probe the internal Evolution API from this external script easily.
                        // usage of "client" in evolution.js points to `process.env.EVOLUTION_API_URL`
                        // I will assume standard endpoints.
                    });
                } catch (e) { }
            }

            // Revert to simple logic: Just logging
            console.log('   (Unable to probe internal API directly from outside)');
        }

    } catch (error) {
        console.error('❌ Error fetching instances:', error.message);
    }
}

debugInstances();
