const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Check if Evolution API is healthy
 */
async function checkEvolution() {
    try {
        const start = Date.now();
        const response = await axios.get(`${config.evolution.url}/health`, {
            timeout: 5000,
        });
        const latency = Date.now() - start;

        return {
            healthy: true,
            latency,
            status: response.status,
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
        };
    }
}

/**
 * Check if Postgres is healthy (via TCP connection test)
 */
async function checkPostgres() {
    const net = require('net');
    const { postgres } = config.healthCheck;

    return new Promise((resolve) => {
        const socket = new net.Socket();
        const start = Date.now();

        socket.setTimeout(5000);

        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ healthy: true, latency });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ healthy: false, error: 'Connection timeout' });
        });

        socket.on('error', (err) => {
            resolve({ healthy: false, error: err.message });
        });

        socket.connect(postgres.port, postgres.host);
    });
}

/**
 * Check if Redis is healthy (via TCP connection test)
 */
async function checkRedis() {
    const net = require('net');
    const { redis } = config.healthCheck;

    return new Promise((resolve) => {
        const socket = new net.Socket();
        const start = Date.now();

        socket.setTimeout(5000);

        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ healthy: true, latency });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ healthy: false, error: 'Connection timeout' });
        });

        socket.on('error', (err) => {
            resolve({ healthy: false, error: err.message });
        });

        socket.connect(redis.port, redis.host);
    });
}

/**
 * Get instance summary from Evolution API
 */
async function getInstanceSummary() {
    try {
        const response = await axios.get(`${config.evolution.url}/instance/fetchInstances`, {
            headers: {
                'apikey': config.evolution.apiKey,
            },
            timeout: 10000,
        });

        const instances = response.data || [];
        const connected = instances.filter(i => i.connectionStatus === 'open').length;
        const disconnected = instances.filter(i => i.connectionStatus !== 'open').length;

        return {
            total: instances.length,
            connected,
            disconnected,
            instances: instances.map(i => ({
                name: i.instanceName || i.name,
                status: i.connectionStatus || 'unknown',
            })),
        };
    } catch (error) {
        return {
            error: error.message,
        };
    }
}

/**
 * Run all health checks
 */
async function runAllChecks() {
    const [evolution, postgres, redis] = await Promise.all([
        checkEvolution(),
        checkPostgres(),
        checkRedis(),
    ]);

    const allHealthy = evolution.healthy && postgres.healthy && redis.healthy;

    return {
        healthy: allHealthy,
        timestamp: new Date().toISOString(),
        services: {
            evolution,
            postgres,
            redis,
        },
    };
}

module.exports = {
    checkEvolution,
    checkPostgres,
    checkRedis,
    getInstanceSummary,
    runAllChecks,
};
