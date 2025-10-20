# Blog Full-Stack (Node.js + Express + SQLite + Supabase Storage)

Ce projet est un mini blog full-stack :

Backend : Node.js, Express, Knex, SQLite

Frontend : HTML/CSS/JS 

Images : upload vers Supabase Storage puis affichage via URL publique

# 1) Prérequis

Node.js 20 LTS recommandé

Sur Windows, si npm install échoue avec sqlite3, utilisez Node v20.x (précompilé) via nvm.

Un compte Supabase (gratuit) → https://supabase.com

# 2) Cloner & installer
git clone https://github.com/<ton-user>/<ton-repo>.git
cd <ton-repo>

Installer le backend
cd Backend
npm install


Si tu utilises Windows et que l’installation de sqlite3 échoue avec Node 22/24, installe Node 20.x puis :

nvm install 20.17.0
nvm use 20.17.0
cd Backend
npm install

# 3) Créer le projet Supabase & le bucket

Va sur https://app.supabase.com
 → New project

Note Project URL et les API Keys (ne colle aucune clé dans le repo)

Storage → Buckets → Create bucket

Nom : images

Public : ON (lecture publique)

# 4) Configurer les variables d’environnement (sans clés dans GitHub)

Ouvre Backend/.env et remplis avec tes valeurs de supabase :

Ces informations se trouvent dans les paramètres de l’API.

SUPABASE_URL=__put_your_supabase_url__
SUPABASE_SERVICE_ROLE=__put_your_service_role_key__(server_only_do_not_commit)
SUPABASE_BUCKET=images

Assure-toi que .env est dans le .gitignore.

# 5) Lancement du serveur
cd .\Backend

node server.js ou npm start

# 6) Comment ça marche (upload & images)

Dans la page Admin, lorsque tu ajoutes/édites un article :

Le fichier image est envoyé via POST /api/upload

Le serveur uploade dans Supabase Storage (bucket images)

Le serveur renvoie une URL publique, stockée dans image_url de l’article

Les pages Admin/User affichent l’image via cette URL

Aucune clé Supabase n’est exposée côté Frontend : l’upload passe par ton serveur (Express).

# 7) Dépannage rapide

Erreur “Cannot find module 'express'” → installe les deps dans Backend :

cd Backend
npm install


Erreur sqlite3 à l’installation → passe à Node v20 LTS et réinstalle.

Images ne s’affichent pas :

Vérifie que /api/upload répond 200 et renvoie une URL https://...supabase.co/...

Vérifie que le bucket images est Public (lecture anonyme)


Remplace les URLs par tes propres captures (peu importe l’hébergeur : Imgur, Supabase public, etc.).

# 🌐 8) Aperçu visuel

<p align="center"> Lancer l’application : <br/> <img src="https://i.imgur.com/N6OzrU1.png" height="80%" width="80%" alt="Page Login"/> <br /><br /> Interface Admin (liste + ajout) : <br/> <img src="https://i.imgur.com/dEJir0O.png" height="80%" width="80%" alt="Admin Liste & Ajout"/> <br /><br /> Édition d’un article (prévisualisation image) : <br/> <img src="https://i.imgur.com/1iLFGte.png" height="80%" width="80%" alt="Admin Edition Article"/> <br /><br /> Interface User (lecture d’articles) : <br/> <img src="https://i.imgur.com/hWMAcLe.png" height="80%" width="80%" alt="User Lecture Articles"/> </p>

# 💼 9) Objectif

Ce projet démontre mes compétences en :

Développement full-stack (Node.js + Frontend)

Gestion de base de données avec Knex/SQLite

Intégration d’un service cloud externe (Supabase)

Création d’une interface claire et fonctionnelle
