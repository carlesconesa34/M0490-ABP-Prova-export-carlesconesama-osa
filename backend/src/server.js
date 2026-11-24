import https from "node:https";

import app from "./app.js";
import config from "./config.js";

const tlsOptions = {
  key: fs.readFileSync(config.tlsKeyPath),
  cert: fs.readFileSync(config.tlsCertPath),
};

https.createServer(app, tlsOptions).listen(config.httpsPort, () => {
  console.log(`HTTP server listening on https://localhost:${config.httpsPort}`);
});
