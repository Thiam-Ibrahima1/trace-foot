# Guide d'Installation — Trace FC v2
> Windows (PowerShell) · PHP 8.2+ · MySQL · Node.js 18+

---

## Prérequis

Avant de commencer, installez :

| Outil | Version | Vérifier |
|---|---|---|
| PHP | 8.2+ | `php -v` |
| MySQL | 8.0+ | `mysql --version` |
| Composer | 2+ | `composer --version` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |

---

## 1. Créer la base de données MySQL

Ouvrez MySQL et exécutez :

```sql
CREATE DATABASE trace_fc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 2. Installer le Backend

```powershell
# Aller dans le dossier backend
cd backend

# Installer les dépendances PHP
composer install

# ── IMPORTANT : créer les dossiers requis par Laravel ────────────────
# Ces dossiers doivent exister et être accessibles en écriture
# Erreur courante : "bootstrap/cache directory must be present and writable"

New-Item -ItemType Directory -Force -Path "bootstrap\cache"
New-Item -ItemType Directory -Force -Path "storage\app\public"
New-Item -ItemType Directory -Force -Path "storage\framework\cache"
New-Item -ItemType Directory -Force -Path "storage\framework\sessions"
New-Item -ItemType Directory -Force -Path "storage\framework\views"
New-Item -ItemType Directory -Force -Path "storage\logs"

# Copier le fichier de configuration
copy .env.example .env

# Générer la clé de l'application (doit fonctionner maintenant)
php artisan key:generate
```

### Configurer le fichier .env

> **Le fichier .env est invisible dans VSCode par défaut.**
> Pour le voir : dans VSCode → Fichier → Préférences → Paramètres → chercher "files.exclude" → supprimer la règle `**/.env` si elle existe.
> Ou ouvrez-le directement dans le terminal : `notepad .env`

Modifiez ces lignes dans `.env` :

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=trace_fc
DB_USERNAME=root
DB_PASSWORD=votre_mot_de_passe_mysql
```

### Créer les tables MySQL

```powershell
php artisan migrate
```

> Cette commande crée toutes les tables et insère le compte admin :
> - **Email** : `admin@trace-fc.com`
> - **Mot de passe** : `Admin@2024!`

### Activer le scheduler automatique (mise à jour à 04:00)

Sur Windows, créer une tâche planifiée :

```powershell
# Remplacer C:\chemin\backend par votre vrai chemin
schtasks /create /tn "TraceFC-Scheduler" /tr "php C:\chemin\backend\artisan schedule:run" /sc minute /mo 1 /f
```

### Démarrer le serveur backend

```powershell
php artisan serve
# Backend disponible sur : http://localhost:8000
```

---

## 3. Installer le Frontend

Dans un **nouveau terminal PowerShell** :

```powershell
# Aller dans le dossier frontend
cd frontend

# Installer les dépendances JavaScript
npm install

# Copier la configuration
copy .env.example .env
```

### Configurer le frontend .env

Ouvrez `frontend\.env` et vérifiez :

```env
VITE_API_URL=http://localhost:8000/api
VITE_ADMIN_PREFIX=gestion-trace-admin
```

### Démarrer le frontend

```powershell
npm run dev
# Frontend disponible sur : http://localhost:5173
```

---

## 4. Accès aux interfaces

| Interface | URL | Identifiants |
|---|---|---|
| Utilisateurs | `http://localhost:5173` | S'inscrire depuis l'appli |
| Admin | `http://localhost:5173/gestion-trace-admin` | `admin@trace-fc.com` / `Admin@2024!` |

---

## 5. Rendre .env visible dans VSCode

Par défaut VSCode masque les fichiers `.env`. Pour les voir :

**Option A — Via les paramètres VSCode :**
1. `Ctrl + Shift + P` → "Ouvrir les paramètres (JSON)"
2. Supprimer ou commenter la ligne `"**/.env": true` dans `files.exclude`

**Option B — Via PowerShell :**
```powershell
# Ouvrir .env directement dans le Bloc-notes
notepad .env

# Ou dans VSCode en forçant l'ouverture
code .env
```

**Option C — Afficher les fichiers cachés :**
Dans VSCode, cliquez sur l'icône `...` dans l'explorateur de fichiers → `Afficher les fichiers cachés`

---

## 6. Sections de l'interface admin

| Section | Description |
|---|---|
| 📊 Tableau de bord | Métriques, paiements récents, statut mise à jour auto |
| ⚽ Matchs | Saisir et corriger les scores réels |
| 🔮 Tracé | Générer un tracé en 4 étapes (Tracé 1 → Certification → Tracé 2 → Score final) |
| 🗂️ Visualisation | Voir les grilles 4×4 des deux tracés + interprétation |
| ✅ Confirmation | Certifier que le score prédit correspond au résultat réel |
| ⭐ VIP & Paiements | Gérer les matchs payants et les paiements PayTech/Wave/OM |
| 📋 Historique | Tous les tracés sauvegardés |
| 📈 Statistiques | Taux de réussite par championnat et combinaison |
| 🗄️ Logs | Journal de toutes les actions système |

---

## 7. Processus de tracé (4 étapes)

```
ÉTAPE 1 — Tracé 1
  → Générer (V1 témoins + V2 MC verte obligatoires)
  → Voir grille 4×4, score et interprétation
  → Sauvegarder immédiatement en base

ÉTAPE 2 — Certification
  → Vérifier que les règles ont bien été respectées
  → Valider l'interprétation avant de continuer

ÉTAPE 3 — Tracé 2 (Rectification)
  → Générer un 2ème tracé pour confirmer le même score
  → Si score différent : relancer le tracé 2 (pas tout recommencer)
  → Si même score : score CERTIFIÉ

ÉTAPE 4 — Publication
  → 3 combinaisons gratuites publiées (V1, 1X, 2X, V2, +2.5, etc.)
  → Score exact réservé au VIP (payant)
```

---

## 8. Combinaisons gratuites (côté utilisateurs)

| Combinaison | Signification |
|---|---|
| **V1** | Victoire équipe domicile |
| **1X** | Victoire ou nul équipe domicile |
| **2X** | Victoire ou nul équipe extérieur |
| **V2** | Victoire équipe extérieur |
| **+2,5** | 3 buts ou plus dans le match |
| **-2,5** | Moins de 3 buts dans le match |
| **2EM** | Les deux équipes marquent |
| **+1,5** | 2 buts ou plus dans le match |
| **-1,5** | Moins de 2 buts dans le match |

Maximum **3 combinaisons** affichées par match côté utilisateurs.

---

## 9. Commandes Artisan utiles

```powershell
# Créer toutes les tables MySQL
php artisan migrate

# Recréer les tables (⚠️ efface les données)
php artisan migrate:fresh

# Voir toutes les routes API disponibles
php artisan route:list --path=api

# Mise à jour manuelle des scores (automatique à 04:00)
php artisan trace:mise-a-jour

# Vérifier que le scheduler est bien configuré
php artisan schedule:list

# Vider les caches Laravel
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Voir les logs en temps réel
Get-Content storage\logs\laravel.log -Wait -Tail 50
```

---

## 10. Problèmes fréquents

| Erreur | Cause | Solution |
|---|---|---|
| `bootstrap/cache must be present and writable` | Dossier manquant | `New-Item -ItemType Directory -Force -Path "bootstrap\cache"` |
| `.env` introuvable dans VSCode | Fichier caché | `notepad .env` ou voir section 5 |
| `SQLSTATE[HY000]` | Mauvais identifiants MySQL | Vérifier `DB_USERNAME` et `DB_PASSWORD` dans `.env` |
| `Class not found` | Autoload obsolète | `composer dump-autoload` |
| CORS bloqué | Frontend non autorisé | Vérifier `CORS_ALLOWED_ORIGINS` dans `.env` backend |
| Token invalide | Session expirée | Vider le `localStorage` du navigateur |
| Page blanche | URL API incorrecte | Vérifier `VITE_API_URL` dans `frontend\.env` |
| `php artisan key:generate` échoue | `.env` manquant | `copy .env.example .env` d'abord |

