// Set default environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = 3002; // Use a different port for tests
process.env.API_KEY = 'test-api-key';
process.env.EVOLUTION_API_KEY = 'test-evo-key';

// Increase timeout for integration tests
jest.setTimeout(30000);
