// Configuració de l'aplicació. Tots els valors surten del fitxer .env

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Cal definir JWT_SECRET al .env (mínim 32 caràcters)');
}

const config = {
    httpPort: Number(process.env.HTTP_PORT) || 5000,
    httpsPort: Number(process.env.HTTPS_PORT) || 5443,
    tlsKeyPath: process.env.TLS_KEY_PATH || 'certs/key.pem',
    tlsCertPath: process.env.TLS_CERT_PATH || 'certs/cert.pem',

    jwt: {
        secret: process.env.JWT_SECRET,
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: process.env.JWT_ISSUER || 'article-backend',
        audience: process.env.JWT_AUDIENCE || 'article-frontend',
    },

    argon2: {
        memoryCost: Number(process.env.ARGON2_MEMORY_COST) || 19456, // KiB
        timeCost: Number(process.env.ARGON2_TIME_COST) || 2,
        parallelism: Number(process.env.ARGON2_PARALLELISM) || 1,
    }
};

export default config;
