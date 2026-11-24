import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { freshApp, registerAndLogin } from './helpers.js';

let app;
let token;
const article = { title: 'Títol', content: 'Contingut' };

beforeEach(async () => {
    app = freshApp();
    token = await registerAndLogin(app);
});

const auth = () => ({ Authorization: `Bearer ${token}` });

test('GET list and GET by id are public', async () => {
    const list = await request(app).get('/articles').expect(200);
    assert.equal(list.body.length, 3);
    await request(app).get('/articles/1').expect(200);
    await request(app).get('/articles/999').expect(404);
});

const writes = [
    ['post', '/articles', article],
    ['put', '/articles/1', article],
    ['patch', '/articles/1', { title: 'nou' }],
    ['delete', '/articles/1', undefined],
];

for (const [method, url, body] of writes) {
    test(`${method.toUpperCase()} ${url} without token returns 401`, async () => {
        const res = await request(app)[method](url).send(body).expect(401);
        assert.equal(res.headers['www-authenticate'], 'Bearer');
    });

    test(`${method.toUpperCase()} ${url} with invalid token returns 401`, async () => {
        await request(app)[method](url).set('Authorization', 'Bearer invalid.token.value').send(body).expect(401);
    });
}

test('rejected writes do not modify data', async () => {
    await request(app).delete('/articles/1').expect(401);
    await request(app).post('/articles').send(article).expect(401);
    await request(app).put('/articles/1').send(article).expect(401);
    const list = await request(app).get('/articles').expect(200);
    assert.equal(list.body.length, 3);
    assert.equal(list.body[0].title, 'Article 1');
});

test('authenticated create', async () => {
    const res = await request(app).post('/articles').set(auth()).send(article).expect(201);
    assert.deepEqual(Object.keys(res.body).sort(), ['content', 'id', 'title']);
    assert.equal(typeof res.body.id, 'number');
    assert.equal(res.body.title, article.title);
    assert.equal(res.body.content, article.content);

    const stored = await request(app).get(`/articles/${res.body.id}`).expect(200);
    assert.deepEqual(stored.body, res.body);

    const list = await request(app).get('/articles').expect(200);
    assert.equal(list.body.length, 4);
});

test('create: ids are unique', async () => {
    const a = await request(app).post('/articles').set(auth()).send(article).expect(201);
    const b = await request(app).post('/articles').set(auth()).send(article).expect(201);
    assert.notEqual(a.body.id, b.body.id);
    for (const seedId of [1, 2, 3]) {
        assert.notEqual(a.body.id, seedId);
        assert.notEqual(b.body.id, seedId);
    }
});

test('create: 400 when incomplete or without body', async () => {
    await request(app).post('/articles').set(auth()).send({ title: 'x' }).expect(400);
    await request(app).post('/articles').set(auth()).send({ content: 'x' }).expect(400);
    await request(app).post('/articles').set(auth()).expect(400);
});

test('authenticated update (PUT)', async () => {
    const res = await request(app).put('/articles/1').set(auth()).send(article).expect(200);
    assert.deepEqual(res.body, { id: 1, ...article });
    const stored = await request(app).get('/articles/1').expect(200);
    assert.deepEqual(stored.body, { id: 1, ...article });

    await request(app).put('/articles/1').set(auth()).send({ title: 'x' }).expect(400);
    await request(app).put('/articles/999').set(auth()).send(article).expect(404);
});

test('authenticated partial update (PATCH) keeps the fields not sent', async () => {
    const before = await request(app).get('/articles/2').expect(200);
    const res = await request(app).patch('/articles/2').set(auth()).send({ title: 'Nou' }).expect(200);
    assert.equal(res.body.title, 'Nou');
    assert.equal(res.body.content, before.body.content);

    await request(app).patch('/articles/2').set(auth()).send({}).expect(400);
    await request(app).patch('/articles/999').set(auth()).send({ title: 'x' }).expect(404);
});

test('authenticated delete', async () => {
    const res = await request(app).delete('/articles/3').set(auth()).expect(204);
    assert.equal(res.text, '');
    await request(app).get('/articles/3').expect(404);
    await request(app).delete('/articles/3').set(auth()).expect(404);
});
