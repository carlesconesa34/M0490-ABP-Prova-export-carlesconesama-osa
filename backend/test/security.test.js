import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { freshApp } from './helpers.js';

const app = freshApp();
// Same origin as the frontend (and as allowedOrigin in bruno/environments/local.bru)
const ALLOWED = 'http://localhost:3000';
const BLOCKED = 'http://evil.test';

// ---------- Helmet ----------

test('Helmet: security headers are present on every response', async () => {
    for (const url of ['/', '/articles', '/does-not-exist']) {
        const res = await request(app).get(url);
        const h = res.headers;
        assert.equal(h['x-content-type-options'], 'nosniff', url);
        assert.equal(h['strict-transport-security'], 'max-age=31536000; includeSubDomains', url);
        assert.equal(h['referrer-policy'], 'no-referrer', url);
        assert.equal(h['cross-origin-opener-policy'], 'same-origin', url);
        assert.equal(h['x-dns-prefetch-control'], 'off', url);
        assert.equal(h['x-permitted-cross-domain-policies'], 'none', url);
        assert.equal(h['origin-agent-cluster'], '?1', url);
        assert.equal(h['x-xss-protection'], '0', url);
        /* Simplify helmet
        assert.equal(h['x-frame-options'], 'DENY', url);
        assert.equal(h['cross-origin-resource-policy'], 'same-site', url);
        */
    }
});

/* Simplify helmet
test('Helmet: strict CSP for a JSON API', async () => {
    const res = await request(app).get('/articles');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'CSP header missing');
    for (const directive of ["default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'none'"]) {
        assert.ok(csp.includes(directive), `missing ${directive} in ${csp}`);
    }
});
*/

test('Helmet: X-Powered-By is not sent', async () => {
    const res = await request(app).get('/');
    assert.equal(res.headers['x-powered-by'], undefined);
});

test('Helmet headers are also sent on 401 and error responses', async () => {
    const res = await request(app).post('/articles').send({});
    assert.equal(res.status, 401);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['strict-transport-security']);
});

// ---------- CORS ----------

test('CORS: allowed origin is echoed back', async () => {
    const res = await request(app).get('/articles').set('Origin', ALLOWED).expect(200);
    assert.equal(res.headers['access-control-allow-origin'], ALLOWED);
    assert.match(res.headers.vary, /Origin/);
});

test('CORS: blocked origin gets no CORS headers (but no server error)', async () => {
    const res = await request(app).get('/articles').set('Origin', BLOCKED).expect(200);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('CORS: never uses wildcard and never allows credentials', async () => {
    for (const origin of [ALLOWED, BLOCKED]) {
        const res = await request(app).get('/articles').set('Origin', origin);
        assert.notEqual(res.headers['access-control-allow-origin'], '*');
        assert.equal(res.headers['access-control-allow-credentials'], undefined);
    }
});

test('CORS: preflight from allowed origin', async () => {
    const res = await request(app)
        .options('/articles')
        .set('Origin', ALLOWED)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);
    assert.equal(res.headers['access-control-allow-origin'], ALLOWED);
    assert.equal(res.headers['access-control-allow-methods'], 'GET,POST,PUT,PATCH,DELETE');
    assert.equal(res.headers['access-control-allow-headers'], 'Content-Type,Authorization');
    assert.equal(res.headers['access-control-max-age'], '600');
});

test('CORS: preflight from blocked origin is not authorised', async () => {
    const res = await request(app)
        .options('/articles')
        .set('Origin', BLOCKED)
        .set('Access-Control-Request-Method', 'DELETE');
    // The cors package (origin as an array) still sends Allow-Methods/Headers,
    // but without Access-Control-Allow-Origin the browser blocks the request
    assert.equal(res.headers['access-control-allow-origin'], undefined);
    assert.notEqual(res.headers['access-control-allow-origin'], '*');
});

test('CORS: origin matching is exact (no prefix/suffix tricks)', async () => {
    for (const origin of ['http://localhost:3000.evil.test', 'https://localhost:3000', 'http://localhost:3001', 'http://localhost', 'null']) {
        const res = await request(app).get('/articles').set('Origin', origin);
        assert.equal(res.headers['access-control-allow-origin'], undefined, origin);
    }
});

// ---------- Body limits ----------

test('oversized JSON bodies are rejected', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'x'.repeat(20000) });
    assert.equal(res.status, 413);
});
