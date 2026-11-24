// Loaded with --import before any test file, so config.js sees these values.
Object.assign(process.env, {
    JWT_SECRET: 'test-secret-that-is-long-enough-1234567890',
    JWT_ALGORITHM: 'HS256',
    JWT_EXPIRES_IN: '1h',
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    // Low cost to keep tests fast, but still argon2id with explicit parameters
    ARGON2_MEMORY_COST: '4096',
    ARGON2_TIME_COST: '2',
    ARGON2_PARALLELISM: '1',
    HTTP_PORT: '5000',
    HTTPS_PORT: '5443',
});
