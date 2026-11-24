import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import config from '../src/config.js';

const configUrl = new URL('../src/config.js', import.meta.url).href;
const backendDir = fileURLToPath(new URL('..', import.meta.url));

// config.js validates on import, so invalid environments are checked in a child process
function importConfigWith(env) {
    return spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(configUrl)})`], {
        cwd: backendDir,
        env: { PATH: process.env.PATH, ...env },
        encoding: 'utf8',
    });
}

test('loads and parses the configuration from the environment', () => {
    assert.equal(config.argon2.memoryCost, 4096);
    assert.equal(config.argon2.timeCost, 2);
    assert.equal(config.argon2.parallelism, 1);
    assert.equal(config.jwt.secret, process.env.JWT_SECRET);
    assert.equal(config.jwt.algorithm, 'HS256');
    assert.equal(config.jwt.issuer, 'test-issuer');
    assert.equal(config.jwt.audience, 'test-audience');
    assert.equal(config.httpPort, 5000);
    assert.equal(config.httpsPort, 5443);
});

test('numeric values are numbers, not strings', () => {
    for (const value of [config.httpPort, config.httpsPort, config.argon2.memoryCost, config.argon2.timeCost, config.argon2.parallelism]) {
        assert.equal(typeof value, 'number');
    }
});

test('fails when JWT_SECRET is missing', () => {
    const result = importConfigWith({});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET/);
});

test('fails when JWT_SECRET is too short', () => {
    const result = importConfigWith({ JWT_SECRET: 'short' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET/);
});

test('accepts a JWT_SECRET of 32 characters', () => {
    const result = importConfigWith({ JWT_SECRET: 'x'.repeat(32) });
    assert.equal(result.status, 0, result.stderr);
});
