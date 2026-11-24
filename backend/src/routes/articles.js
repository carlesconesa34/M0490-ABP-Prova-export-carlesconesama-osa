import express from "express";
import { articles } from "../data/articles.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

let nextId = articles.length + 1;

// Llegir és públic. Crear, modificar i esborrar requereix un JWT vàlid (requireAuth).

// Llistat
router.get("/", (req, res) => {
  res.json(articles);
});

// Un article
router.get("/:id", (req, res) => {
  const article = articles.find(
    (article) => article.id === Number(req.params.id)
  );
  if (!article) {
    return res
      .status(404)
      .json({ message: "No existeix cap article amb aquesta id" });
  }
  res.json(article);
});

// Crear
router.post("/", requireAuth, (req, res) => {
  // Si no s'envia body, req.body és undefined
  const { title, content } = req.body || {};

  if (!title || !content) {
    return res
      .status(400)
      .json({ message: "Cal proporcionar un article sencer" });
  }

  const newArticle = { id: nextId++, title, content };
  articles.push(newArticle);
  res.status(201).json(newArticle);
});

// Modificar (sencer)
router.put("/:id", requireAuth, (req, res) => {
  const { title, content } = req.body || {};

  if (!title || !content) {
    return res
      .status(400)
      .json({ message: "Cal proporcionar un article sencer" });
  }

  const article = articles.find(
    (article) => article.id === Number(req.params.id)
  );
  if (!article) {
    return res
      .status(404)
      .json({ message: "No existeix cap article amb aquesta id" });
  }

  article.title = title;
  article.content = content;
  res.json(article);
});

// Modificar (parcial)
router.patch("/:id", requireAuth, (req, res) => {
  const { title, content } = req.body || {};

  if (!title && !content) {
    return res
      .status(400)
      .json({ message: "Cal proporcionar el contingut que es vol modificar" });
  }

  const article = articles.find(
    (article) => article.id === Number(req.params.id)
  );
  if (!article) {
    return res
      .status(404)
      .json({ message: "No existeix cap article amb aquesta id" });
  }

  if (title) article.title = title;
  if (content) article.content = content;
  res.json(article);
});

// Esborrar
router.delete("/:id", requireAuth, (req, res) => {
  const index = articles.findIndex(
    (article) => article.id === Number(req.params.id)
  );
  if (index === -1) {
    return res
      .status(404)
      .json({ message: "No existeix cap article amb aquesta id" });
  }

  articles.splice(index, 1);
  res.status(204).end(); // 204 No Content: resposta sense body
});

export default router;
