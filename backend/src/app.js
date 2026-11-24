import cors from "cors";
import express from "express";

import articles from "./routes/articles.js";
import auth from "./routes/auth.js";

const app = express();

// Helmet?

// CORS
app.use(
  cors({
    origin: "https://localhost:5443",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600, // segons que el navegador guarda la resposta del preflight
  })
);

// HELMET
app.use(helmet({}));

// Llegeix el body JSON (màxim 10kb)
app.use(express.json({ limit: "10kb" }));

// Rutes
app.get("/", (req, res) => {
  res.json({
    name: "REST backend per a la prova M0490-ABP",
    version: process.env.npm_package_version,
    author: "Carles Conesa Mañosa",
  });
});
app.use("/auth", auth);
app.use("/articles", articles);

// Cap ruta ha coincidit
app.use((req, res) => {
  res.status(404).json({ message: "Recurs no trobat" });
});

// Gestor d'errors: Express hi envia qualsevol error (també JSON mal format).
// Mai enviem el detall de l'error al client.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
    return res.status(500).json({ message: "Error intern del servidor" });
  }
  res.status(status).json({ message: "Petició invàlida" });
});

export default app;
