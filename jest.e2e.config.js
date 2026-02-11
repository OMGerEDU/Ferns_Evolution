const baseConfig = require('./jest.config');

module.exports = {
    ...baseConfig,
    testMatch: ['**/tests/e2e/**/*.test.js'],
    collectCoverage: false, // Don't collect coverage for E2E usually
    setupFiles: [], // Might need different setup or none
};
