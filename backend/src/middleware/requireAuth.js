import jwt from 'jsonwebtoken';
import config from '../config.js';
import { users } from '../data/users.js';

// Comprova que la petició porta un JWT vàlid a la capçalera:
//   Authorization: Bearer <token>
export default function requireAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        res.set('WWW-Authenticate', 'Bearer');
        return res.status(401).json({ message: "Cal estar autenticat" });
    }

    try {
        // Fixem l'algorisme: així es rebutgen tokens amb "alg": "none"
        const payload = jwt.verify(token, config.jwt.secret, {
            algorithms: [config.jwt.algorithm],
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
        });

        const user = users.find(user => user.id === Number(payload.sub));
        if (!user) {
            throw new Error('Usuari inexistent');
        }

        req.user = user;
        next();
    } catch {
        res.set('WWW-Authenticate', 'Bearer');
        return res.status(401).json({ message: "Token invàlid o caducat" });
    }
}
