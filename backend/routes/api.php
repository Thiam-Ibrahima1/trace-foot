<?php
// ============================================================
// routes/api.php — Toutes les routes de l'API Trace FC
// ============================================================
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PredictionController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\VipController;
use App\Http\Controllers\StatistiquesController;
use App\Http\Controllers\MatchController;

// ── 1. Routes publiques ──────────────────────────────────────
Route::post('/auth/connexion',   [AuthController::class, 'connexion']);
Route::post('/admin/connexion',  [AuthController::class, 'connexionAdmin']);
Route::post('/auth/inscription',  [AuthController::class, 'inscription'])->middleware('throttle:10,1');
Route::post('/auth/mot-de-passe-oublie',         [AuthController::class, 'motDePasseOublie'])->middleware('throttle:5,1');
Route::post('/auth/reinitialiser-mot-de-passe',  [AuthController::class, 'reinitialiserMotDePasse'])->middleware('throttle:5,1');
Route::post('/vip/webhook/paytech',  [VipController::class, 'webhookPaytech']);
Route::post('/vip/webhook/wave',     [VipController::class, 'webhookWave']);
Route::post('/vip/webhook/orange',   [VipController::class, 'webhookOrange']);

// Matchs — public (API-Sports)
Route::get('/matchs/jour',    [MatchController::class, 'matchsDuJour']);
Route::get('/matchs/semaine', [MatchController::class, 'matchsSemaine']);
Route::get('/matchs/live',    [MatchController::class, 'matchsEnDirect']);
// Détail d'un match : résumé, compos, forme, H2H, classement (chargement par section)
Route::get('/matchs/{fixtureId}/details', [MatchController::class, 'details']);

// Compétitions — classement + matchs par ligue (API-Sports)
Route::get('/competitions/{leagueId}/classement', [MatchController::class, 'classement']);
Route::get('/competitions/{leagueId}/matchs',     [MatchController::class, 'matchsCompetition']);
Route::get('/competitions/{leagueId}/calendrier', [MatchController::class, 'calendrierCompetition']);

// ── 2. Routes authentifiées ──────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get  ('/auth/moi',         [AuthController::class, 'moi']);
    Route::patch('/auth/profil',      [AuthController::class, 'modifierProfil']);
    Route::post ('/auth/deconnexion', [AuthController::class, 'deconnexion']);
    Route::get ('/predictions',      [PredictionController::class, 'lister']);

    // VIP utilisateur
    // Tracker d'activité utilisateur (toutes les actions côté utilisateur)
    Route::post('/activites/tracker', [AdminController::class, 'trackerActivite']);

    Route::prefix('vip')->group(function () {
        Route::get ('/matchs',            [VipController::class, 'matchsDuJour']);
        Route::post('/paiement/initier',  [VipController::class, 'initierPaiement'])->middleware('throttle:10,1');
        Route::post('/paiement/verifier', [VipController::class, 'verifierPaiement']);
    });

    // ── 3. Admin uniquement ──────────────────────────────────
    Route::middleware('admin.seulement')->group(function () {

        // Section : Matchs & Prédictions
        Route::post  ('/predictions',                         [PredictionController::class, 'creer']);
        Route::post  ('/predictions/{id}/publier',            [PredictionController::class, 'publierCombinaisons']);
        Route::post  ('/predictions/recuperer-scores',        [PredictionController::class, 'recupererScores']);
        Route::patch ('/predictions/{id}/resultat',           [PredictionController::class, 'mettreAJourResultat']);
        Route::patch ('/predictions/{id}/corriger',           [PredictionController::class, 'corrigerScore']);
        Route::patch ('/predictions/{id}/reinitialiser',      [PredictionController::class, 'reinitialiserScore']);
        Route::delete('/predictions/{id}',                    [PredictionController::class, 'supprimer']);

        // Section : Mise à jour (automatique 04:00 + bouton admin)
        Route::get ('/admin/mise-a-jour/statut',             [AdminController::class, 'statutMiseAJour']);
        Route::post('/admin/mise-a-jour/declencher',          [AdminController::class, 'declencherMiseAJour']);
        Route::post('/admin/mise-a-jour/synchroniser',        [AdminController::class, 'synchroniserPredictions']);

        // Section : Génération auto tracés (03:55 + bouton dashboard)
        Route::get ('/admin/generation/statut',              [AdminController::class, 'statutGeneration']);
        Route::post('/admin/generation/declencher',           [AdminController::class, 'declencherGeneration']);

        // Section : Cache matchs (vider le cache pour forcer le rechargement)
        Route::post('/admin/matchs/vider-cache',             [MatchController::class, 'viderCache']);
        Route::get ('/admin/matchs/quota',                   [MatchController::class, 'quotaApi']);

        // Section : Badges navigation (compteurs légers pour sidebar)
        Route::get   ('/admin/badges',                       [AdminController::class, 'badges']);

        // Section : Intelligence (données filtrées + mises en cache)
        Route::get   ('/admin/intelligence',                 [AdminController::class, 'intelligenceData']);

        // Section : Logs
        Route::get   ('/admin/logs',                         [AdminController::class, 'logs']);
        Route::delete('/admin/logs/purger',                  [AdminController::class, 'purgerLogs']);
        Route::get   ('/admin/activites',                    [AdminController::class, 'activitesRecentes']);

        // Section : Statistiques
        Route::get('/admin/stats',                           [AdminController::class, 'stats']);
        Route::get('/admin/statistiques',                    [StatistiquesController::class, 'index']);
        Route::get('/admin/statistiques/detail',             [StatistiquesController::class, 'detail']);

        // Section : Utilisateurs
        Route::get   ('/admin/utilisateurs',                 [AdminController::class, 'listeUtilisateurs']);
        Route::post  ('/admin/utilisateurs',                 [AdminController::class, 'creerUtilisateur']);
        Route::patch ('/admin/utilisateurs/{id}',            [AdminController::class, 'modifierUtilisateur']);
        Route::delete('/admin/utilisateurs/{id}',            [AdminController::class, 'supprimerUtilisateur']);

        // Section : Confirmation scores
        Route::get ('/admin/confirmations',                  [AdminController::class, 'predictionsAConfirmer']);
        Route::post('/admin/confirmations/{id}',             [AdminController::class, 'confirmerScoreTrace']);
        Route::get ('/admin/confirmations/historique',       [AdminController::class, 'scoresConfirmes']);

        // Section : VIP admin
        Route::get   ('/admin/vip/paiements',                 [VipController::class, 'listePaiementsAdmin']);
        Route::delete('/admin/vip/paiements/{id}',            [VipController::class, 'supprimerPaiement']);
        Route::get  ('/admin/vip/predictions',               [VipController::class, 'gererPredictionsVip']);
        Route::post ('/admin/vip/predictions',               [VipController::class, 'gererPredictionsVip']);
        Route::patch ('/admin/vip/predictions/{id}/score-reel',   [VipController::class, 'mettreAJourScoreReelVip']);
        Route::patch ('/admin/vip/predictions/{id}/reinitialiser',[VipController::class, 'reinitialiserScoreVip']);
        Route::delete('/admin/vip/predictions/{id}',              [VipController::class, 'supprimerPredictionVip']);
        Route::post  ('/admin/vip/predictions/{id}/confirmer',    [VipController::class, 'confirmerScoreVip']);
    });
});