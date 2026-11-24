import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import argon2 from 'argon2';
import { freshApp, validUser, findUserByEmail as findByEmail } from './helpers.js';

afterEach(() => mock.restoreAll());

// "$argon2id$v=19$m=4096,t=2,p=1$salt$hash" -> "argon2id$v=19$m=4096,t=2,p=1"
const costOf = hash => hash.split('$').slice(1, 4).join('$');

test('login with an unknown email still runs one argon2 verification with the same cost', async () => {
    const app = freshApp();
    await request(app).post('/auth/register').send(validUser).expect(201);
    const realHash = findByEmail('alice@example.com').passwordStored;

    const verify = mock.method(argon2, 'verify');

    await request(app).post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever-password' }).expect(401);

    assert.equal(verify.mock.callCount(), 1, 'argon2.verify must run even if the user does not exist');
    const [dummyHash] = verify.mock.calls[0].arguments;
    assert.equal(costOf(dummyHash), costOf(realHash), 'dummy hash must use the same argon2 parameters');
});

test('login with a known email also runs exactly one verification', async () => {
    const app = freshApp();
    await request(app).post('/auth/register').send(validUser).expect(201);

    const verify = mock.method(argon2, 'verify');
    await request(app).post('/auth/login')
        .send({ email: validUser.email, password: 'wrong-password' }).expect(401);

    assert.equal(verify.mock.callCount(), 1);
});
