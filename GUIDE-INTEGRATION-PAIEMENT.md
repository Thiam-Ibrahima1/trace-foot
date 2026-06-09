# Guide d'Intégration des Paiements — Trace FC
> Dernière mise à jour : v2 — PayTech (principal) + Wave + Orange Money

---

## 1. Vue d'ensemble

Trace FC utilise **3 services de paiement** :

| Service | Rôle | Quand l'utiliser |
|---|---|---|
| **PayTech** | Agrégateur principal | Recommandé — regroupe Wave, Orange Money, Free Money |
| **Wave** | Accès direct optionnel | Si vous préférez gérer Wave séparément |
| **Orange Money** | Accès direct optionnel | Si vous préférez gérer OM séparément |

> **Conseil** : Commencez par PayTech. Une seule intégration donne accès à tous les opérateurs mobiles du Sénégal.

---

## 2. PayTech — Configuration (Recommandé)

### Étape 1 : Créer un compte PayTech

1. Allez sur **https://paytech.sn/**
2. Cliquez sur **"S'inscrire"** → remplissez le formulaire entreprise
3. Vérifiez votre email et connectez-vous au dashboard

### Étape 2 : Récupérer vos clés API

1. Dashboard PayTech → **"Paramètres"** → **"API Keys"**
2. Copiez votre **API Key** et votre **API Secret**
3. Ajoutez-les dans votre fichier `.env` :

```env
PAYTECH_API_KEY=votre_api_key_ici
PAYTECH_API_SECRET=votre_api_secret_ici
PAYTECH_BASE_URL=https://paytech.sn/api
```

### Étape 3 : Configurer l'URL de notification (IPN)

Dans le dashboard PayTech → **"Mes applications"** → configurez :

- **IPN URL** : `https://votre-domaine.com/api/vip/webhook/paytech`
- **Success URL** : `https://votre-domaine.com/vip/succes`
- **Cancel URL** : `https://votre-domaine.com/vip/echec`

### Étape 4 : Tester en mode sandbox

PayTech propose un environnement de test. Mettez `APP_ENV=local` dans `.env` — le code envoie automatiquement `env: "test"` à PayTech.

**Numéros de test Wave** :
- `771234567` → paiement accepté
- `770000000` → paiement refusé

### Comment ça marche (flux PayTech)

```
Utilisateur clique "Payer"
        ↓
Backend crée un paiement (statut: en_attente)
        ↓
Appel API PayTech → reçoit une redirect_url
        ↓
Frontend redirige l'utilisateur vers PayTech
        ↓
Utilisateur paie sur la page PayTech (Wave / OM / Free Money)
        ↓
PayTech envoie une notification IPN à /api/vip/webhook/paytech
        ↓
Backend valide le paiement → score débloqué
```

---

## 3. Wave — Configuration directe (Optionnel)

> Utilisez Wave directement seulement si vous ne souhaitez pas PayTech.

### Étape 1 : Créer un compte Wave Business

1. Allez sur **https://wave.com/business**
2. Remplissez le formulaire avec les informations de votre entreprise
3. Attendez la validation du compte (1-3 jours ouvrables)

### Étape 2 : Générer une clé API Wave

1. Dashboard Wave → **"Intégrations"** → **"Clé API"**
2. Copiez votre clé et votre webhook secret
3. Ajoutez dans `.env` :

```env
WAVE_API_KEY=votre_wave_api_key
WAVE_WEBHOOK_SECRET=votre_wave_webhook_secret
WAVE_BASE_URL=https://api.wave.com/v1
```

### Étape 3 : Configurer le webhook Wave

Dans le dashboard Wave → **"Webhooks"** :

- URL : `https://votre-domaine.com/api/vip/webhook/wave`
- Événement : `checkout.session.completed`

### Flux Wave

```
Backend crée une session checkout Wave
        ↓
Reçoit wave_launch_url → redirige l'utilisateur
        ↓
Utilisateur confirme sur l'app Wave
        ↓
Wave envoie un webhook → backend valide le paiement
```

---

## 4. Orange Money — Configuration directe (Optionnel)

> Utilisez Orange Money directement seulement si vous ne souhaitez pas PayTech.

### Étape 1 : Créer un compte développeur Orange

1. Allez sur **https://developer.orange.com**
2. Cliquez sur **"Sign up"** et créez votre compte
3. Connectez-vous au portail développeur

### Étape 2 : Créer une application

1. Dashboard → **"My Apps"** → **"New Application"**
2. Donnez un nom : `Trace FC`
3. Dans les APIs disponibles, activez **"Orange Money Payments SN"**
4. Récupérez votre **Client ID** et **Client Secret**

### Étape 3 : Configurer `.env`

```env
ORANGE_MONEY_API_KEY=votre_client_id
ORANGE_MONEY_MERCHANT_KEY=votre_client_secret
ORANGE_MONEY_BASE_URL=https://api.orange.com/orange-money-webpay/sn/v1
ORANGE_MONEY_TOKEN_URL=https://api.orange.com/oauth/v3/token
```

### Étape 4 : Configurer les URL de retour

Dans le portail Orange Developer → votre application :

- **Return URL** : `https://votre-domaine.com/vip/succes`
- **Cancel URL** : `https://votre-domaine.com/vip/echec`
- **Notif URL** : `https://votre-domaine.com/api/vip/webhook/orange`

### Flux Orange Money

```
Backend obtient un token OAuth (Client Credentials)
        ↓
Appel /webpayment → reçoit payment_url + pay_token
        ↓
Utilisateur redirigé vers la page OM pour confirmer
        ↓
Orange envoie une notification à /api/vip/webhook/orange
        ↓
Backend valide le paiement
```

---

## 5. Mode simulation (développement)

Si aucune clé réelle n'est configurée dans `.env`, l'application active automatiquement le **mode simulation** :

- Tous les paiements sont validés immédiatement
- Aucun appel API externe n'est fait
- Un log `paiement_simule` est enregistré
- Utile pour tester l'interface sans compte PayTech/Wave/OM

---

## 6. Récapitulatif des variables `.env`

```env
# PayTech (recommandé)
PAYTECH_API_KEY=...
PAYTECH_API_SECRET=...
PAYTECH_BASE_URL=https://paytech.sn/api

# Wave (optionnel)
WAVE_API_KEY=...
WAVE_WEBHOOK_SECRET=...
WAVE_BASE_URL=https://api.wave.com/v1

# Orange Money (optionnel)
ORANGE_MONEY_API_KEY=...
ORANGE_MONEY_MERCHANT_KEY=...
ORANGE_MONEY_BASE_URL=https://api.orange.com/orange-money-webpay/sn/v1
ORANGE_MONEY_TOKEN_URL=https://api.orange.com/oauth/v3/token
```

---

## 7. Dépannage courant

| Problème | Cause probable | Solution |
|---|---|---|
| Paiement toujours "en_attente" | IPN URL inaccessible | Vérifier que l'URL webhook est publique (pas localhost) |
| Signature invalide | Mauvais API Secret | Copier exactement la clé depuis le dashboard |
| Score non débloqué | Webhook non reçu | Consulter les Logs admin → vérifier `webhook_paytech` |
| Mode simulation actif | Clé = valeur par défaut | Remplacer les valeurs `_ICI` dans `.env` |

