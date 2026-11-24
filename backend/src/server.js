import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import express from 'express';

import config from './config.js';
import app from './app.js';

/*
const tlsOptions = {
    key: fs.readFileSync(config.tlsKeyPath),
    cert: fs.readFileSync(config.tlsCertPath),
};
*/

http.createServer(app).listen(config.httpPort, () => {
    console.log(`HTTP server listening on http://localhost:${config.httpPort}`);
});
