module.exports = {
    testEnvironment: 'node',
    verbose: true,
    setupFiles: ['<rootDir>/tests/setup.js'],
    testMatch: ['**/tests/**/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/index.js',
        '!src/config/*.js'
    ],
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/']
};
