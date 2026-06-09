# Trace FC — v2

Application de prédiction de scores de football basée sur la méthode du **tracé astrologique sportif**.

---

## Architecture complète

```
trace-fc-v2/
├── backend/                          # Laravel 11 (PHP 8.2) — API REST
│   ├── app/
│   │   ├── Console/
│   │   │   ├── Kernel.php            # Scheduler → mise à jour auto à 04:00
│   │   │   └── Commands/
│   │   │       └── MiseAJourScores.php # php artisan trace:mise-a-jour
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.php        # Connexion, inscription, reset MDP
│   │   │   │   ├── PredictionController.php  # CRUD tracés + correction scores
│   │   │   │   ├── AdminController.php       # Sections admin (logs, stats, users...)
│   │   │   │   ├── VipController.php         # Paiements PayTech/Wave/OM + webhooks
│   │   │   │   └── StatistiquesController.php # Taux de réussite, combinaisons
│   │   │   └── Middleware/
│   │   │       └── AdminSeulement.php        # Protège les routes admin
│   │   └── Models/
│   │       ├── User.php              # prenom, nom, email, telephone, role
│   │       ├── Prediction.php        # Tracé + maisons + vérifications + score
│   │       ├── PredictionVip.php     # Match VIP avec score exact
│   │       ├── PaiementVip.php       # Historique paiements
│   │       └── LogApplication.php   # Journal des actions
│   ├── bootstrap/
│   │   ├── app.php                   # Point d'entrée Laravel + middlewares
│   │   └── cache/                    # ← Dossier requis (doit exister)
│   ├── config/
│   │   ├── app.php                   # Config générale (timezone: Africa/Dakar)
│   │   ├── database.php              # MySQL utf8mb4
│   │   ├── services.php              # Clés PayTech, Wave, Orange Money
│   │   ├── cors.php                  # CORS pour le frontend React
│   │   └── sanctum.php               # Tokens API
│   ├── database/migrations/
│   │   ├── 2024_01_01_000001_creer_tables.php      # Toutes les tables principales
│   │   └── 2024_01_02_000001_ajouter_colonnes_users.php # prenom, nom, telephone, reset
│   ├── routes/api.php                # Toutes les routes organisées par section
│   ├── storage/                      # ← Dossier requis (doit exister)
│   ├── .env.example                  # Variables à copier dans .env
│   ├── artisan                       # Point d'entrée des commandes
│   └── composer.json
│
├── frontend/                         # React 18 + Vite
│   └── src/
│       ├── App.jsx                   # Routing admin/utilisateur
│       ├── adapters/
│       │   ├── api/ServiceApi.js     # Tous les appels backend
│       │   └── ui/
│       │       ├── composants/
│       │       │   ├── AdminLayout.jsx   # Sidebar admin verte groupée
│       │       │   └── NavbarUser.jsx    # Barre navigation utilisateur (bas)
│       │       ├── pages/
│       │       │   ├── PageConnexion.jsx         # Connexion + Inscription + MDP oublié
│       │       │   ├── PageConnexionAdmin.jsx    # Connexion admin + MDP oublié
│       │       │   ├── DashboardAdmin.jsx        # Vue d'ensemble + statut auto 04:00
│       │       │   ├── PageTrace.jsx             # Tracé 4 étapes (Tracé1→Cert→Tracé2→Final)
│       │       │   ├── PageVisualisationTrace.jsx # Grilles 4×4 + interprétation + comparaison
│       │       │   ├── PageConfirmationScore.jsx  # Certification scores réels
│       │       │   ├── PageMatchsAdmin.jsx        # Saisie/correction scores admin
│       │       │   ├── PageVIPAdmin.jsx           # Prédictions VIP + paiements + correction
│       │       │   ├── PageMatchs.jsx             # Matchs temps réel + combinaisons + détails
│       │       │   ├── PageVIP.jsx                # Score exact payant (PayTech/Wave/OM)
│       │       │   ├── PageHistorique.jsx         # Historique paginé
│       │       │   ├── PageStats.jsx              # Statistiques taux de réussite
│       │       │   └── PageLogs.jsx               # Journal système
│       │       └── styles/App.css                # Styles globaux (vert clair + blanc)
│       └── domain/
│           ├── entities/Maison.js    # Les 16 maisons du tracé
│           └── usecases/TraceUseCases.js # Moteur du tracé + combinaisons + interprétation
│
├── GUIDE-INSTALLATION-POWERSHELL.md  # Guide complet Windows
├── GUIDE-INTEGRATION-PAIEMENT.md    # PayTech + Wave + Orange Money
└── README.md
```

---

## Fonctionnalités complètes

### Côté Utilisateurs
- **Connexion** — Email + mot de passe
- **Inscription** — Prénom, nom, email, téléphone, mot de passe
- **Mot de passe oublié** — Code à 6 chiffres (email/SMS)
- **Matchs du jour** — Scores en temps réel (actualisation auto 60s)
- **Combinaisons gratuites** — 1 à 3 combinaisons par match (V1, 1X, V2, +2,5, 2EM…)
- **Détails match** — Classement, forme des équipes, compositions, historique
- **Couleur résultat** — 🟢 Vert si correct / 🔴 Rouge si incorrect après match
- **VIP** — Score exact payant via PayTech / Wave / Orange Money

### Côté Admin (sidebar verte, 9 sections)
- **Tableau de bord** — Métriques, paiements récents, statut mise à jour 04:00
- **Tracé** — 4 étapes : Tracé 1 → Certification → Tracé 2 (rectification) → Publication
- **Visualisation** — Grilles 4×4 des 2 tracés, interprétation, tableau comparatif
- **Confirmation** — Certifier que le score prédit correspond au résultat réel
- **Matchs** — Saisir et corriger les scores réels (avec raison si déjà certifié)
- **VIP** — Créer matchs payants, voir paiements, corriger scores VIP
- **Historique** — Tous les tracés avec pagination et stats
- **Statistiques** — Taux de réussite global, VIP, par championnat, meilleures combinaisons
- **Logs** — Journal complet avec filtres par type

---

## Démarrage rapide (Windows PowerShell)

```powershell
# ── BACKEND ────────────────────────────────────────────────────
cd backend
composer install

# Créer les dossiers requis (évite l'erreur bootstrap/cache)
New-Item -ItemType Directory -Force -Path "bootstrap\cache"
New-Item -ItemType Directory -Force -Path "storage\framework\cache"
New-Item -ItemType Directory -Force -Path "storage\framework\sessions"
New-Item -ItemType Directory -Force -Path "storage\framework\views"
New-Item -ItemType Directory -Force -Path "storage\logs"

copy .env.example .env
# → Ouvrir .env : notepad .env
# → Modifier : DB_USERNAME, DB_PASSWORD

php artisan key:generate
php artisan migrate
php artisan serve
# Backend : http://localhost:8000

# ── FRONTEND (nouveau terminal) ─────────────────────────────────
cd frontend
npm install
copy .env.example .env
npm run dev
# Frontend : http://localhost:5173
```

**Admin** : `http://localhost:5173/gestion-trace-admin`
**Login** : `admin@trace-fc.com` / `Admin@2024!`

---

## Processus du tracé (4 étapes)

| Étape | Action | Condition |
|---|---|---|
| **1 — Tracé 1** | Générer + vérifier V1 (témoins) + V2 (MC verte) | V1 ET V2 obligatoires |
| **2 — Certification** | Admin lit l'interprétation et sauvegarde | Règles vérifiées |
| **3 — Tracé 2** | Rectification pour obtenir le même score | Même résultat obligatoire |
| **4 — Publication** | Score certifié + 3 combinaisons publiées | Score VIP en payant |

## Combinaisons gratuites

`V1` `1X` `2X` `V2` `+2,5` `-2,5` `2EM` `+1,5` `-1,5` → max **3 affichées** par match

---

## Paiements

- **PayTech** (recommandé) → Wave + Orange Money + Free Money en une seule intégration
- **Wave** (direct) → optionnel
- **Orange Money** (direct) → optionnel
- **Mode simulation** → automatique si les clés `.env` ne sont pas configurées

Voir `GUIDE-INTEGRATION-PAIEMENT.md` pour la configuration complète.

---

## Mise à jour automatique

Les scores sont récupérés **automatiquement chaque jour à 04:00** via le scheduler Laravel.
L'admin peut aussi déclencher une mise à jour manuellement depuis le tableau de bord.

```
Cron serveur (Linux) :
* * * * * cd /chemin/backend && php artisan schedule:run >> /dev/null 2>&1

Vérifier :
php artisan schedule:list  → doit afficher : trace:mise-a-jour → Daily at 04:00
```
