import request from 'supertest';
import app from '../src/app.js';
import { users } from '../src/data/users.js';
import { articles } from '../src/data/articles.js';

// Snapshot of the seed articles, taken before any test modifies them
const initialArticles = structuredClone(articles);

// Restores the in-memory data (users and articles) and returns the app.
// Ids keep growing between tests (the counters live inside the route modules),
// so tests never assume concrete ids for created resources.
export function freshApp() {
    users.length = 0;
    articles.splice(0, articles.length, ...structuredClone(initialArticles));
    return app;
}

export function findUserByEmail(email) {
    return users.find(user => user.email === email);
}

export const validUser = {
    email: 'Alice@Example.com',
    username: 'alice',
    password: 'S3cure-password!',
};

export async function registerAndLogin(app, user = validUser) {
    await request(app).post('/auth/register').send(user).expect(201);
    const res = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
    return res.body.token;
}
