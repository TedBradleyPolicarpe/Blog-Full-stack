require("dotenv").config();
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./knex"); // Assurez-vous que le fichier knex est correctement configuré
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);
const BUCKET = process.env.SUPABASE_BUCKET || "images";
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = 3000;
app.use(bodyParser.json());
const FRONTEND_DIR = path.resolve(__dirname, "..", "Frontend");

// Middlewares
app.use(express.json());
app.use(express.static(FRONTEND_DIR)); // sert / (HTML/CSS/JS)
app.use("/images", express.static(path.join(FRONTEND_DIR, "images"))); // images fixes
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // images uploadées

// Routes pages
app.get("/admin", (req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, "blog-Admin.html"))
);
app.get("/user", (req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, "blog-User.html"))
);
app.get("/", (req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, "Login&Signup.html"))
);
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier." });

    const ext = req.file.originalname.split(".").pop();
    const filePath = `articles/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (upErr) {
      console.error("Supabase upload error:", upErr);
      return res.status(500).json({ message: "Upload échoué." });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return res.status(200).json({ url: pub.publicUrl, path: filePath });
  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    res.status(500).json({ message: "Erreur serveur upload." });
  }
});
// Inscription d'un utilisateur
app.post("/api/users", async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || role === "choix") {
    return res
      .status(400)
      .json({ message: "Veuillez remplir tous les champs correctement." });
  }

  try {
    const [id] = await db("users").insert({
      username,
      email,
      password,
      role,
    });
    const user = await db("users").where({ id }).first();
    res.status(201).json(user);
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      res.status(400).json({ message: "Cet email est déjà utilisé." });
    } else {
      res
        .status(500)
        .json({ message: "Erreur serveur.", error: error.message });
    }
  }
});

// Authentification (login)
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  try {
    // Requête explicite (évite certains pièges d'objets)
    const user = await db("users")
      .where("email", email)
      .andWhere("password", password)
      .first();

    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }
    return res.json({ role: user.role, name: user.username });
  } catch (error) {
    console.error("LOGIN ERROR:", error); // <--- VOIR LA CONSOLE SERVEUR
    return res
      .status(500)
      .json({ message: "Erreur serveur.", error: "LOGIN_FAILED" });
  }
});

// Pagination et recherche d'articles
app.get("/api/articles", async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const articles = await db("articles").offset(offset).limit(limit);
    const totalArticles = await db("articles").count("id as count").first();
    res.json({ articles, totalPages: Math.ceil(totalArticles.count / limit) });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des articles.", error });
  }
});

// Ajouter un article
app.post("/api/articles", async (req, res) => {
  const { title, content, image_url, admin_id } = req.body;

  if (!title || !content || !admin_id) {
    return res
      .status(400)
      .json({ message: "Titre, contenu et ID admin sont requis." });
  }

  try {
    const [id] = await db("articles").insert({
      title,
      content,
      image_url,
      admin_id,
    });
    const article = await db("articles").where({ id }).first();
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de l'ajout de l'article.",
      error: error.message,
    });
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const users = await db("users").select("id", "username", "email", "role");
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs.",
      error,
    });
  }
});
// Récupérer les détails d'un article
app.get("/api/articles/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const article = await db("articles").where({ id }).first();
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé." });
    }

    const comments = await db("comments").where({ article_id: id });
    res.json({ ...article, comments });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération de l'article.",
      error: error.message,
    });
  }
});

// Modifier un article
app.put("/api/articles/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, image_url } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Titre et contenu sont requis." });
  }

  try {
    await db("articles").where({ id }).update({ title, content, image_url });
    const updatedArticle = await db("articles").where({ id }).first();
    res.json(updatedArticle);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la modification de l'article.",
      error: error.message,
    });
  }
});

// Supprimer un article
app.delete("/api/articles/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await db("articles").where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ message: "Article non trouvé." });
    }

    res.json({ message: "Article supprimé avec succès." });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de l'article.",
      error: error.message,
    });
  }
});
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await db("users").where({ id }).del();
    if (deleted) {
      res.json({ message: "Utilisateur supprimé avec succès." });
    } else {
      res.status(404).json({ message: "Utilisateur non trouvé." });
    }
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de l'utilisateur.",
      error,
    });
  }
});
// Récupérer les commentaires d'un article
app.get("/api/comments/:article_id", async (req, res) => {
  const { article_id } = req.params;

  try {
    const comments = await db("comments").where({ article_id });
    res.status(200).json(comments);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des commentaires." });
  }
});

// Ajouter un commentaire
app.post("/api/comments", async (req, res) => {
  const { content, article_id, user_id } = req.body;

  if (!content || !article_id || !user_id) {
    return res.status(400).json({ message: "Données incomplètes." });
  }

  try {
    const [id] = await db("comments").insert({
      content,
      article_id,
      user_id,
    });
    const comment = await db("comments").where({ id }).first();
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
});
app.post("/api/logout", (req, res) => {
  // Simulez une déconnexion réussie
  res.status(200).json({ message: "Déconnexion réussie." });
});
app.get("/api/articles/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res
      .status(400)
      .json({ message: "Le terme de recherche est requis." });
  }

  try {
    const articles = await db("articles").where("title", "like", `%${q}%`);
    res.json({ articles });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la recherche des articles.", error });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
