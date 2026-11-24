import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The redirect server lives inside src/server.js, so these tests start the real
// server in a child process, on free ports and with a throwaway self-signed certificate.

const backendDir = fileURLToPath(new URL('..', import.meta.url));
const HTTP_PORT = 15000 + Math.floor(Math.random() * 1000);
const HTTPS_PORT = HTTP_PORT + 1000;
const httpUrl = `http://localhost:${HTTP_PORT}`;

let server;
let tmpDir;

before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirect-test-'));
    const keyPath = path.join(tmpDir, 'key.pem');
    const certPath = path.join(tmpDir, 'cert.pem');
    execFileSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
        '-keyout', keyPath, '-out', certPath, '-subj', '/CN=localhost',
    ], { stdio: 'ignore' });

    server = spawn(process.execPath, ['src/server.js'], {
        cwd: backendDir,
        env: {
            ...process.env,
            HTTP_PORT: String(HTTP_PORT),
            HTTPS_PORT: String(HTTPS_PORT),
            TLS_KEY_PATH: keyPath,
            TLS_CERT_PATH: certPath,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait until the HTTP server says it is listening
    await new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error(`Server did not start:\n${output}`)), 10000);
        const onData = chunk => {
            output += chunk;
            if (output.includes(`localhost:${HTTP_PORT}`)) {
                clearTimeout(timer);
                resolve();
            }
        };
        server.stdout.on('data', onData);
        server.stderr.on('data', onData);
        server.on('exit', code => {
            clearTimeout(timer);
            reject(new Error(`Server exited with code ${code}:\n${output}`));
        });
    });
});

after(() => {
    server?.kill();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('GET over HTTP is redirected to HTTPS with 308, keeping path and query', async () => {
    const res = await fetch(`${httpUrl}/articles/1?x=1`, { redirect: 'manual' });
    assert.equal(res.status, 308);
    assert.equal(res.headers.get('location'), `https://localhost:${HTTPS_PORT}/articles/1?x=1`);
});

test('POST over HTTP is redirected with 308 (method preserved) and not processed', async () => {
    const res = await fetch(`${httpUrl}/auth/login`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c', password: 'secret123' }),
    });
    assert.equal(res.status, 308);
    assert.equal(res.headers.get('location'), `https://localhost:${HTTPS_PORT}/auth/login`);
    assert.ok(!(await res.text()).includes('token'));
});

test('redirect server does not advertise Express', async () => {
    const res = await fetch(`${httpUrl}/`, { redirect: 'manual' });
    assert.equal(res.headers.get('x-powered-by'), null);
});
