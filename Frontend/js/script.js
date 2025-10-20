/**** ===================== helpers / état ===================== ****/

// Helpers à déclarer AVANT (si pas déjà faits)
const getRole = () =>
  (sessionStorage.getItem("userRole") || localStorage.getItem("userRole") || "")
    .trim()
    .toLowerCase();

const isAdmin = () => getRole() === "admin";

function syncAuthStorage() {
  const lr = localStorage.getItem("userRole");
  const ln = localStorage.getItem("userName");
  if (!sessionStorage.getItem("userRole") && lr) {
    sessionStorage.setItem("userRole", lr);
  }
  if (!sessionStorage.getItem("userName") && ln) {
    sessionStorage.setItem("userName", ln);
  }
}
function resolveImageUrl(v) {
  if (!v) return "/images/default.jpg";
  // si déjà une URL absolue ou chemin absolu, ne rien changer
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/"))
    return v;
  // chez toi, tu stockes souvent juste "i.jpg" => on pointe sur /images/i.jpg
  return `/images/${v}`;
}
function truncateText(text = "", max = 100) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

/**** ===================== LOGOUT ===================== ****/
document.querySelectorAll(".logout-btn").forEach((btn) =>
  btn.addEventListener("click", async () => {
    try {
      const r = await fetch("/api/logout", { method: "POST" });
      if (!r.ok) throw new Error();
      sessionStorage.clear();
      alert("Déconnexion réussie !");
      location.href = "/";
    } catch {
      alert("Erreur lors de la déconnexion.");
    }
  })
);

/**** =========== OUVERTURE / FERMETURE PANNEAU AJOUT =========== ****/

// Ouvrir le formulaire d’ajout
document.querySelector(".Ajouter_Button")?.addEventListener("click", () => {
  const form = document.getElementById("article-template");
  if (!form) return;
  form.classList.remove("hidden");
  form.classList.add("active");
});

// Fermeture via le bouton X présent dans ton HTML
function closeArticleForm() {
  closePanel("article-template");
}
// (exposé en global pour que l’onclick HTML fonctionne)
window.closeArticleForm = closeArticleForm;

/**** ===================== USERS (admin) ===================== ****/

async function fetchUsers() {
  const tbody = document.querySelector("#users-table tbody");
  if (!tbody) return; // pas sur cette page

  try {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Erreur récupération utilisateurs.");
    const users = await res.json();

    tbody.innerHTML = "";
    const rows = users.filter((u) => (u.role || "").toLowerCase() === "user");
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">Aucun utilisateur trouvé.</td></tr>`;
      return;
    }

    rows.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td><button class="btn delete-btn" data-del-user="${u.id}">Supprimer</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-del-user]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?"))
          return;
        const r = await fetch(`/api/users/${b.dataset.delUser}`, {
          method: "DELETE",
        });
        if (!r.ok)
          return alert("Erreur lors de la suppression de l'utilisateur.");
        fetchUsers();
      })
    );
  } catch (e) {
    console.error(e);
  }
}

/**** ===================== ARTICLES ===================== ****/

function updatePagination(totalPages = 1, currentPage = 1) {
  const box = document.getElementById("pagination");
  if (!box) return;
  box.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const b = document.createElement("button");
    b.textContent = i;
    b.className = i === currentPage ? "active" : "";
    b.addEventListener("click", () => fetchArticles(i));
    box.appendChild(b);
  }
}

// Ferme un panneau (ajoute/édition/détails)
function closePanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("active");
  el.classList.add("hidden");
}

async function fetchArticles(page = 1) {
  const container = document.getElementById("articles-list");
  if (!container) return;

  try {
    const res = await fetch(`/api/articles?page=${page}&limit=5`);
    if (!res.ok)
      throw new Error("Erreur lors de la récupération des articles.");
    const payload = await res.json();

    // L’API renvoie { articles, totalPages } (selon ton server.js)
    const articles = Array.isArray(payload) ? payload : payload.articles || [];
    const totalPages = payload.totalPages ?? 1;

    container.innerHTML = "";
    if (articles.length === 0) {
      container.innerHTML = "<p>Aucun article trouvé.</p>";
      updatePagination(1, 1);
      return;
    }

    articles.forEach((a) => {
      const card = document.createElement("div");
      card.className = "article_existent";
      card.innerHTML = `
        <img src="${resolveImageUrl(
          a.image_url
        )}" alt="Image de l'article" class="card-image">
        <div class="card-content">
          <h3 class="blog-title">${a.title}</h3>
          <p>${truncateText(a.content, 100)}</p>
          <div class="card-actions">
            <button class="btn read-more" data-read="${a.id}">Read More</button>
            ${
              isAdmin()
                ? `
                  <button class="btn edit" data-edit="${a.id}">Edit</button>
                  <button class="btn delete" data-del="${a.id}">Delete</button>
                `
                : ""
            }
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Branchements (délégation simple)
    container
      .querySelectorAll("[data-read]")
      .forEach((b) =>
        b.addEventListener("click", () => readMore(b.dataset.read))
      );
    container
      .querySelectorAll("[data-edit]")
      .forEach((b) =>
        b.addEventListener("click", () => editArticle(b.dataset.edit))
      );
    container
      .querySelectorAll("[data-del]")
      .forEach((b) =>
        b.addEventListener("click", () => deleteArticle(b.dataset.del))
      );

    updatePagination(totalPages, page);
  } catch (e) {
    console.error(e);
  }
}

async function searchArticles() {
  const input = document.getElementById("search-input");
  if (!input) return;
  const q = input.value.trim();
  if (!q) {
    alert("Veuillez saisir un terme de recherche.");
    return;
  }

  try {
    const res = await fetch(`/api/articles/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Erreur recherche articles.");
    const { articles } = await res.json();

    const container = document.getElementById("articles-list");
    container.innerHTML = "";
    if (!articles || articles.length === 0) {
      container.innerHTML = "<p>Aucun article trouvé.</p>";
      return;
    }
    articles.forEach((a) => {
      const card = document.createElement("div");
      card.className = "article_existent";
      card.innerHTML = `
        <img src="${resolveImageUrl(
          a.image_url
        )}" alt="Image de l'article" class="card-image">
        <div class="card-content">
          <h3 class="blog-title">${a.title}</h3>
          <p>${truncateText(a.content, 100)}</p>
          <div class="card-actions">
            <button class="btn read-more" data-read="${a.id}">Read More</button>
            ${
              isAdmin()
                ? `
                  <button class="btn edit" data-edit="${a.id}">Edit</button>
                  <button class="btn delete" data-del="${a.id}">Delete</button>
                `
                : ""
            }
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    container
      .querySelectorAll("[data-read]")
      .forEach((b) =>
        b.addEventListener("click", () => readMore(b.dataset.read))
      );
    container
      .querySelectorAll("[data-edit]")
      .forEach((b) =>
        b.addEventListener("click", () => editArticle(b.dataset.edit))
      );
    container
      .querySelectorAll("[data-del]")
      .forEach((b) =>
        b.addEventListener("click", () => deleteArticle(b.dataset.del))
      );
  } catch (e) {
    console.error(e);
    alert("Une erreur est survenue lors de la recherche des articles.");
  }
}

async function readMore(id) {
  try {
    const res = await fetch(`/api/articles/${id}`);
    if (!res.ok)
      throw new Error("Erreur lors de la récupération de l'article.");
    const a = await res.json();

    const p = document.getElementById("details-panel");
    p.querySelector("#details-title").textContent = a.title;
    p.querySelector("#details-content").textContent = a.content;
    p.querySelector("#details-image").src = resolveImageUrl(a.image_url);
    p.dataset.articleId = id;

    p.classList.add("active");
    p.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    alert("Une erreur est survenue lors de la récupération de l'article.");
  }
}

async function editArticle(id) {
  try {
    // 1) Charger l'article à éditer
    const res = await fetch(`/api/articles/${id}`);
    if (!res.ok)
      throw new Error("Erreur lors de la récupération de l'article.");
    const a = await res.json();

    // 2) Pré-remplir le panneau
    const p = document.getElementById("edit-panel");
    p.querySelector("#edit-title").value = a.title;
    p.querySelector("#edit-content").value = a.content;
    p.querySelector("#edit-image-preview").src = resolveImageUrl(a.image_url);
    p.dataset.articleId = id;
    p.dataset.articleImage = a.image_url || "/images/default.jpg";

    // 3) Afficher le panneau
    p.classList.add("active");
    p.classList.remove("hidden");

    // 4) (optionnel) Prévisualisation immédiate si on choisit un nouveau fichier
    const fileInput = p.querySelector("#edit-image");
    if (fileInput) {
      fileInput.onchange = () => {
        const f = fileInput.files?.[0];
        if (f) {
          const url = URL.createObjectURL(f);
          p.querySelector("#edit-image-preview").src = url;
        }
      };
    }

    // 5) Soumission de l'édition
    const form = document.getElementById("edit-form");
    form.onsubmit = async (e) => {
      e.preventDefault();

      const title = p.querySelector("#edit-title").value.trim();
      const content = p.querySelector("#edit-content").value.trim();
      const newFile = p.querySelector("#edit-image")?.files?.[0];

      if (!title || !content) {
        alert("Veuillez remplir tous les champs.");
        return;
      }

      // image_url initiale = ancienne image
      let image_url = p.dataset.articleImage || "/images/default.jpg";

      // 5a) S'il y a un nouveau fichier, on l’upload d’abord
      if (newFile) {
        const fd = new FormData();
        fd.append("file", newFile);

        const up = await fetch("/api/upload", {
          method: "POST",
          body: fd, // ne PAS mettre de Content-Type, fetch le fera pour FormData
        });

        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          alert(err.message || "Upload image échoué.");
          return;
        }

        const { url } = await up.json(); // URL publique Supabase
        image_url = url;
      }

      // 5b) Mettre à jour l’article avec la (nouvelle) URL
      const up = await fetch(`/api/articles/${p.dataset.articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, image_url }),
      });

      if (!up.ok) {
        const err = await up.json().catch(() => ({}));
        alert(err.message || "Erreur lors de la modification.");
        return;
      }

      alert("Article modifié !");
      fetchArticles(); // recharger la liste
      closePanel("edit-panel"); // fermer le panneau
    };
  } catch (e) {
    console.error(e);
    alert("Une erreur est survenue lors de la récupération de l'article.");
  }
}

async function deleteArticle(id) {
  if (!confirm("Voulez-vous vraiment supprimer cet article ?")) return;
  try {
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur lors de la suppression de l'article.");
    alert("Article supprimé !");
    fetchArticles();
  } catch (e) {
    console.error(e);
    alert("Erreur lors de la suppression de l'article.");
  }
}

/**** ===================== AJOUT ARTICLE ===================== ****/

document
  .getElementById("article-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("article-title")?.value?.trim();
    const content = document
      .getElementById("article-description")
      ?.value?.trim();
    const fileInput = document.getElementById("article-image");

    if (!title || !content) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    let image_url = "/images/default.jpg"; // fallback

    // 1) Upload vers ton backend (Supabase derrière)
    if (fileInput?.files?.[0]) {
      const fd = new FormData();
      fd.append("file", fileInput.files[0]);

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const err = await up.json().catch(() => ({}));
        alert(err.message || "Échec de l'upload d'image.");
        return;
      }
      const { url } = await up.json(); // URL publique Supabase
      image_url = url;
    }

    // 2) Créer l’article avec l’URL reçue
    const r = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, image_url, admin_id: 1 }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.message || "Erreur lors de l'ajout de l'article.");
      return;
    }

    alert("Article ajouté !");
    fetchArticles();
    closeArticleForm();
  });

/**** ===================== INIT PAGE ===================== ****/

document.addEventListener("DOMContentLoaded", () => {
  // 1) Synchroniser sessionStorage depuis localStorage (utile après refresh/onglet neuf)
  syncAuthStorage();

  // 2) Garde d'accès admin
  if (location.pathname === "/admin" && !isAdmin()) {
    alert("Accès réservé aux admins. Connectez-vous avec un compte admin.");
    location.href = "/";
    return;
  }

  // 3) Afficher le nom (fallback session/local)
  const userName =
    sessionStorage.getItem("userName") ||
    localStorage.getItem("userName") ||
    "";
  const userInfo = document.getElementById("user-name");
  if (userInfo) {
    userInfo.textContent = userName
      ? `Bonjour ${userName}`
      : "Bonjour l'administrateur";
  }

  // 4) (optionnel) Brancher les boutons X si tu utilises data-close-panel
  document
    .querySelectorAll("[data-close-panel]")
    .forEach((btn) =>
      btn.addEventListener("click", () => closePanel(btn.dataset.closePanel))
    );

  // 5) Charger données de la page
  fetchUsers();
  fetchArticles();
});

// Exposer closePanel pour les onclick HTML existants
window.closePanel = closePanel;
// Exposer searchArticles si tu cliques sur le bouton Rechercher dans le header
window.searchArticles = searchArticles;
window.closeArticleForm = function () {
  closePanel("article-template");
};
