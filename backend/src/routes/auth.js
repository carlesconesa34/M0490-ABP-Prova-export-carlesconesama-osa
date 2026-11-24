import express from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import config from '../config.js';
import requireAuth from '../middleware/requireAuth.js';
import { users, toPublicUser } from '../data/users.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

let nextId = 1;

const hashOptions = {
    type: argon2.argon2id,
    memoryCost: config.argon2.memoryCost,
    timeCost: config.argon2.timeCost,
    parallelism: config.argon2.parallelism,
};

// await argon2.verify(user.passwordStored, password);
const hashPassword = function(password) {
    return argon2.hash(password, hashOptions);
};

// Hash d'una contrasenya falsa, calculat un sol cop en arrencar.
const dummyHash = await hashPassword('dummy-password-for-timing-equalisation');

// Registre
router.post('/register', async (req, res) => {
    const { email, username, password } = req.body || {};

    if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
            message: "Cal proporcionar correu electrònic, nom d'usuari i contrasenya"
        });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!EMAIL_REGEX.test(cleanEmail)) {
        return res.status(400).json({ message: "El correu electrònic no és vàlid" });
    }
    if (!USERNAME_REGEX.test(cleanUsername)) {
        return res.status(400).json({
            message: "El nom d'usuari ha de tenir entre 3 i 30 caràcters (lletres, números, '_' o '.')"
        });
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
        return res.status(400).json({
            message: `La contrasenya ha de tenir entre ${PASSWORD_MIN} i ${PASSWORD_MAX} caràcters`
        });
    }

    const exists = users.find(user => user.email === cleanEmail || user.username === cleanUsername);
    if (exists) {
        return res.status(409).json({ message: "El correu electrònic o el nom d'usuari ja estan en ús" });
    }

    const newUser = {
        id: nextId++,
        email: cleanEmail,
        username: cleanUsername,
        passwordStored: password
    };
    users.push(newUser);

    res.status(201).json(toPublicUser(newUser));
});

// Login: retorna un JWT
router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    // Mateix missatge tant si falla el correu com la contrasenya:
    // així no revelem quins correus estan registrats
    const invalidCredentials = { message: "Correu electrònic o contrasenya incorrectes" };

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(401).json(invalidCredentials);
    }

    const user = users.find(user => user.email === email.trim().toLowerCase());
    if (!user) {
        return res.status(401).json(invalidCredentials);
    }

    const validPassword = password === user.passwordStored;
    if (!validPassword) {
        return res.status(401).json(invalidCredentials);
    }

    const token = jwt.sign(
        { username: user.username },
        config.jwt.secret,
        {
            algorithm: config.jwt.algorithm,
            expiresIn: config.jwt.expiresIn,
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
            subject: String(user.id),
        }
    );

    res.json({ token, user: toPublicUser(user) });
});

// Usuari autenticat
router.get('/me', (req, res) => {
    res.json(toPublicUser(req.user));
});

export default router;
