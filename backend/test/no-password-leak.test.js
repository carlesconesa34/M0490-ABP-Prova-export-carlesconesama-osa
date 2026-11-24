import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { freshApp, validUser, findUserByEmail } from './helpers.js';
import { toPublicUser } from '../src/data/users.js';

const FORBIDDEN_KEYS = /pass|hash|salt/i;

// Recursively assert that no key or value leaks the password or its hash
function assertNoSecrets(value, secrets, path = 'body') {
    if (Array.isArray(value)) {
        value.forEach((item, i) => assertNoSecrets(item, secrets, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            assert.doesNotMatch(key, FORBIDDEN_KEYS, `forbidden key ${path}.${key}`);
            assertNoSecrets(child, secrets, `${path}.${key}`);
        }
    } else if (typeof value === 'string') {
        assert.ok(!value.includes('$argon2'), `argon2 hash leaked at ${path}`);
        for (const secret of secrets) {
            assert.ok(!value.includes(secret), `secret leaked at ${path}`);
        }
    }
}

function assertResponseClean(res, secrets) {
    assertNoSecrets(res.body, secrets);
    for (const secret of [...secrets, '$argon2']) {
        assert.ok(!res.text.includes(secret), 'secret found in raw response text');
        assert.ok(!JSON.stringify(res.headers).includes(secret), 'secret found in headers');
    }
}

test('toPublicUser never includes the password hash', () => {
    const publicUser = toPublicUser({ id: 1, email: 'a@b.c', username: 'a', passwordStored: '$argon2id$x', password: 'p' });
    assert.deepEqual(Object.keys(publicUser).sort(), ['email', 'id', 'username']);
});

test('no auth response ever contains the password or its hash', async () => {
    const app = freshApp();
    const secrets = [validUser.password];
    const responses = [];

    responses.push(await request(app).post('/auth/register').send(validUser));
    const hash = findUserByEmail('alice@example.com').passwordStored;
    secrets.push(hash);

    responses.push(await request(app).post('/auth/register').send(validUser)); // 409
    responses.push(await request(app).post('/auth/register').send({ ...validUser, email: 'bad' })); // 400
    responses.push(await request(app).post('/auth/register').send({ ...validUser, password: 'short' })); // 400

    const login = await request(app).post('/auth/login').send({ email: validUser.email, password: validUser.password });
    responses.push(login);
    responses.push(await request(app).post('/auth/login').send({ email: validUser.email, password: 'wrong-pass' }));
    responses.push(await request(app).post('/auth/login').send({ email: 'none@x.com', password: validUser.password }));

    responses.push(await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.token}`));
    responses.push(await request(app).get('/auth/me'));

    assert.deepEqual(responses.map(r => r.status), [201, 409, 400, 400, 200, 401, 401, 200, 401]);
    for (const res of responses) assertResponseClean(res, secrets);
});

test('JWT payload does not contain the password or its hash', async () => {
    const app = freshApp();
    await request(app).post('/auth/register').send(validUser);
    const hash = findUserByEmail('alice@example.com').passwordStored;
    const { body } = await request(app).post('/auth/login').send({ email: validUser.email, password: validUser.password });
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url').toString());
    assertNoSecrets(payload, [validUser.password, hash], 'jwt');
});
