import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { freshApp, validUser, findUserByEmail } from './helpers.js';

let app;
beforeEach(() => { app = freshApp(); });

test('hashes with argon2id using the parameters from the environment', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    const { passwordStored } = findUserByEmail('alice@example.com');
    assert.match(passwordStored, /^\$argon2id\$/);
    const m = process.env.ARGON2_MEMORY_COST;
    const t = process.env.ARGON2_TIME_COST;
    const p = process.env.ARGON2_PARALLELISM;
    assert.ok(passwordStored.includes(`$m=${m},t=${t},p=${p}$`), `unexpected params in ${passwordStored}`);
});

test('hash never contains the plain password and is salted', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    await request(app).post('/auth/register')
        .send({ ...validUser, email: 'bob@example.com', username: 'bob' }).expect(201);
    const a = findUserByEmail('alice@example.com').passwordStored;
    const b = findUserByEmail('bob@example.com').passwordStored;
    assert.ok(!a.includes(validUser.password));
    assert.notEqual(a, b, 'same password must produce different hashes (random salt)');
});

test('verifies correct and rejects incorrect passwords', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    await request(app).post('/auth/login').send({ email: validUser.email, password: validUser.password }).expect(200);
    await request(app).post('/auth/login').send({ email: validUser.email, password: 'wrong-password' }).expect(401);
});
