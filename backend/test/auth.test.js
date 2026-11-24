import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { freshApp, validUser, registerAndLogin, findUserByEmail } from './helpers.js';

let app;
beforeEach(() => { app = freshApp(); });

const publicAlice = id => ({ id, email: 'alice@example.com', username: 'alice' });

test('register: creates a user and returns only public fields', async () => {
    const res = await request(app).post('/auth/register').send(validUser).expect(201);
    assert.equal(typeof res.body.id, 'number');
    assert.deepEqual(res.body, publicAlice(res.body.id));
});

test('register: stores an argon2id hash, not the password', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    const stored = findUserByEmail('alice@example.com');
    assert.match(stored.passwordStored, /^\$argon2id\$/);
    assert.ok(!('password' in stored));
    assert.ok(!JSON.stringify(stored).includes(validUser.password));
});

test('register: 400 when fields are missing or not strings', async () => {
    await request(app).post('/auth/register').send({ email: 'a@b.com', password: 'longenough' }).expect(400);
    await request(app).post('/auth/register').send({ ...validUser, password: 12345678 }).expect(400);
    await request(app).post('/auth/register').expect(400);
});

test('register: 400 on invalid email, username or password', async () => {
    await request(app).post('/auth/register').send({ ...validUser, email: 'not-an-email' }).expect(400);
    await request(app).post('/auth/register').send({ ...validUser, username: 'a' }).expect(400);
    await request(app).post('/auth/register').send({ ...validUser, username: 'bad name!' }).expect(400);
    await request(app).post('/auth/register').send({ ...validUser, password: 'short' }).expect(400);
    await request(app).post('/auth/register').send({ ...validUser, password: 'x'.repeat(129) }).expect(400);
});

test('register: 409 on duplicated email (case-insensitive) or username', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    await request(app).post('/auth/register')
        .send({ ...validUser, email: 'ALICE@example.com', username: 'other' }).expect(409);
    await request(app).post('/auth/register')
        .send({ ...validUser, email: 'other@example.com' }).expect(409);
});

test('login: returns a valid JWT and the public user', async () => {
    const registered = await request(app).post('/auth/register').send(validUser).expect(201);
    const res = await request(app).post('/auth/login')
        .send({ email: 'alice@example.com', password: validUser.password }).expect(200);
    assert.deepEqual(Object.keys(res.body).sort(), ['token', 'user']);
    assert.deepEqual(res.body.user, publicAlice(registered.body.id));

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET, {
        algorithms: [process.env.JWT_ALGORITHM],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
    });
    assert.equal(payload.sub, String(registered.body.id));
});

test('login: email is case-insensitive', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    await request(app).post('/auth/login')
        .send({ email: '  ALICE@example.COM ', password: validUser.password }).expect(200);
});

test('login: wrong password and unknown email give the same 401 response', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    const wrongPassword = await request(app).post('/auth/login')
        .send({ email: validUser.email, password: 'wrong-password' }).expect(401);
    const unknownEmail = await request(app).post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' }).expect(401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
    assert.equal(wrongPassword.body.token, undefined);
});

test('login: 401 on missing or malformed body', async () => {
    await request(app).post('/auth/login').expect(401);
    await request(app).post('/auth/login').send({ email: ['x'], password: { a: 1 } }).expect(401);
});

test('me: returns the current user with a valid token', async () => {
    const token = await registerAndLogin(app);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    assert.deepEqual(res.body, publicAlice(res.body.id));
});

test('me: 401 with WWW-Authenticate when token is missing or invalid', async () => {
    const missing = await request(app).get('/auth/me').expect(401);
    assert.equal(missing.headers['www-authenticate'], 'Bearer');
    const invalid = await request(app).get('/auth/me').set('Authorization', 'Bearer not.a.token').expect(401);
    assert.equal(invalid.headers['www-authenticate'], 'Bearer');
    await request(app).get('/auth/me').set('Authorization', 'Basic abc').expect(401);
    await request(app).get('/auth/me').set('Authorization', 'Bearer').expect(401);
});

test('me: 401 when the token belongs to a user that no longer exists', async () => {
    const token = await registerAndLogin(app);
    app = freshApp(); // wipes users
    await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
});

test('malformed JSON body returns 400 without leaking internals', async () => {
    const res = await request(app).post('/auth/login')
        .set('Content-Type', 'application/json').send('{"email":').expect(400);
    assert.deepEqual(res.body, { message: 'Petició invàlida' });
});

test('unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/does-not-exist').expect(404);
    assert.equal(typeof res.body.message, 'string');
});
