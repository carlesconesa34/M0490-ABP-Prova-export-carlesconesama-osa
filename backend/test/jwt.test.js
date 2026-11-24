import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { freshApp, registerAndLogin } from './helpers.js';

const secret = process.env.JWT_SECRET;
const issuer = process.env.JWT_ISSUER;
const audience = process.env.JWT_AUDIENCE;

let app;
let token;
let userId;

before(async () => {
    app = freshApp();
    token = await registerAndLogin(app);
    userId = jwt.decode(token).sub;
});

// A token is accepted if GET /auth/me answers 200
const me = t => request(app).get('/auth/me').set('Authorization', `Bearer ${t}`);

test('token has subject, issuer, audience and expiry', () => {
    const payload = jwt.decode(token);
    assert.equal(typeof payload.sub, 'string');
    assert.equal(payload.username, 'alice');
    assert.equal(payload.iss, issuer);
    assert.equal(payload.aud, audience);
    assert.ok(payload.exp > payload.iat);
});

test('token payload does not contain sensitive data', () => {
    const payload = jwt.decode(token);
    assert.deepEqual(Object.keys(payload).sort(), ['aud', 'exp', 'iat', 'iss', 'sub', 'username']);
});

test('uses the configured algorithm', () => {
    const { header } = jwt.decode(token, { complete: true });
    assert.equal(header.alg, process.env.JWT_ALGORITHM);
});

test('accepts a correctly signed token', async () => {
    const valid = jwt.sign({}, secret, { subject: userId, issuer, audience, expiresIn: '1h' });
    await me(valid).expect(200);
});

test('rejects a token signed with another secret', async () => {
    const forged = jwt.sign({}, 'another-secret-another-secret-12345', { subject: userId, issuer, audience });
    await me(forged).expect(401);
});

test('rejects an expired token', async () => {
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, secret, { subject: userId, issuer, audience });
    await me(expired).expect(401);
});

test('rejects an unsigned token (alg: none)', async () => {
    const unsigned = jwt.sign({}, null, { algorithm: 'none', subject: userId, issuer, audience });
    await me(unsigned).expect(401);
});

test('rejects a token signed with a different HMAC algorithm', async () => {
    const otherAlg = jwt.sign({}, secret, { algorithm: 'HS512', subject: userId, issuer, audience });
    await me(otherAlg).expect(401);
});

test('rejects wrong issuer or audience', async () => {
    const wrongIss = jwt.sign({}, secret, { subject: userId, issuer: 'evil', audience });
    const wrongAud = jwt.sign({}, secret, { subject: userId, issuer, audience: 'evil' });
    await me(wrongIss).expect(401);
    await me(wrongAud).expect(401);
});

test('rejects a valid token for a non-existent user', async () => {
    const ghost = jwt.sign({}, secret, { subject: '999999', issuer, audience });
    await me(ghost).expect(401);
});
