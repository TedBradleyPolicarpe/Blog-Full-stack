async function login(email, password) {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({})); // au cas où pas de JSON
    if (!res.ok) {
      alert(data.message || "Erreur de connexion.");
      return;
    }

    // data = { role, name }
    const role = (data.role || "").trim().toLowerCase();
    const name = data.name || "";

    // stocker dans les deux storages (fiable après refresh)
    sessionStorage.setItem("userRole", role);
    sessionStorage.setItem("userName", name);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userName", name);

    // redirection selon rôle
    if (role === "admin") {
      window.location.href = "/admin";
    } else if (role === "user") {
      window.location.href = "/user";
    } else {
      alert("Rôle utilisateur non reconnu !");
    }
  } catch (err) {
    console.error("Erreur login:", err);
    alert("Une erreur est survenue lors de la connexion.");
  }
}

// écouteur du formulaire de login
document.querySelector(".login form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document
    .querySelector(".login input[name='email']")
    ?.value?.trim();
  const password = document
    .querySelector(".login input[name='password']")
    ?.value?.trim();
  if (!email || !password) {
    alert("Veuillez remplir tous les champs.");
    return;
  }
  login(email, password);
});
