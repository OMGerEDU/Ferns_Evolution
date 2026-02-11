const request = require('supertest');
const nock = require('nock');

// Mock DB and TenantResolver BEFORE importing app
jest.mock('../../src/services/db', () => ({
    query: jest.fn(),
    pool: { end: jest.fn() },
    initDb: jest.fn()
}));
jest.mock('../../src/services/tenantResolver', () => ({
    ensureTenantForInstance: jest.fn().mockResolvedValue(true)
}));

const app = require('../../src/index');

describe('Instance Management API', () => {
    const API_KEY = process.env.API_KEY || 'test-api-key';
    const EVO_URL = process.env.EVOLUTION_API_URL || 'https://evolution.omger.cloud';

    beforeEach(() => {
        nock.cleanAll();
    });

    it('POST /api/instances should create an instance (mocked)', async () => {
        // Mock Evolution API response
        const instanceName = 'test-instance';
        nock(EVO_URL)
            .post('/instance/create')
            .reply(201, {
                instance: {
                    instanceName: instanceName,
                    status: 'created'
                },
                hash: { apikey: 'some-hash-key' }
            });

        const res = await request(app)
            .post('/api/instances')
            .set('apikey', API_KEY)
            .send({ instanceName });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        // Fix expectation: Evolution returns { instance: { ... } }
        expect(res.body.data.instance).toHaveProperty('instanceName', instanceName);
    });

    it('POST /api/instances should fail without API key', async () => {
        const res = await request(app)
            .post('/api/instances')
            .send({ instanceName: 'no-auth' });

        expect(res.status).toBe(401);
    });

    it('GET /api/instances/:name should return instance details (mocked)', async () => {
        const instanceName = 'test-instance';
        nock(EVO_URL)
            .get(`/instance/fetchInstances`)
            .reply(200, [
                {
                    instance: {
                        instanceName: instanceName,
                        status: 'open'
                    }
                }
            ]);

        // The backend `getInstance` might call fetchInstances or connectionState
        // Let's assume it calls connectionState based on typical usage or check src/services/evolution.js
        // For now, mocking typical endpoints
        nock(EVO_URL)
            .get(`/instance/connectionState/${instanceName}`)
            .reply(200, {
                instance: {
                    instanceName: instanceName,
                    state: 'open'
                }
            });

        const res = await request(app)
            .get(`/api/instances/${instanceName}`)
            .set('apikey', API_KEY);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
    });
});
