<?php
// ============================================================
// AdminController.php — Actions réservées à l'administrateur
// Sections : Logs, Stats, Mise à jour, Utilisateurs, Confirmation tracé
// ============================================================
namespace App\Http\Controllers;

use App\Models\LogApplication;
use App\Models\User;
use App\Models\Prediction;
use App\Models\PredictionVip;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    // ── SECTION 1 : LOGS ─────────────────────────────────────────────
    // Retourne les 200 derniers logs, filtrables par niveau
    public function logs(Request $request): JsonResponse
    {
        $type  = $request->get('type', 'tous');
        $since = $request->get('since'); // ISO timestamp — ne retourner que les logs après cette date
        $limit = $request->get('limit', 200);

        $q = LogApplication::with('user:id,name,role')
            ->orderBy('created_at', 'desc')
            ->limit((int)$limit);

        if ($type !== 'tous') $q->where('niveau', $type);
        if ($since) $q->where('created_at', '>', $since);

        $logs = $q->get()->map(fn($l) => [
            'id'      => $l->id,
            'type'    => $l->niveau,
            'message' => $l->message,
            'action'  => $l->type_action,
            'date'    => $l->created_at->toISOString(),
            'user'    => $l->user ? [
                'id'   => $l->user->id,
                'name' => $l->user->name,
                'role' => $l->user->role,
            ] : null,
        ]);

        $stats = Cache::remember('admin_logs_stats', 120, fn () => [
            'total'       => LogApplication::count(),
            'succes'      => LogApplication::where('niveau', 'succes')->count(),
            'erreurs'     => LogApplication::where('niveau', 'erreur')->count(),
            'mise_a_jour' => LogApplication::where('niveau', 'mise_a_jour')->count(),
            'info'        => LogApplication::where('niveau', 'info')->count(),
        ]);

        return response()->json([
            'logs'       => $logs,
            'stats'      => $stats,
            'serveur_ts' => now()->toISOString(), // timestamp serveur pour le prochain polling
        ]);
    }

    // ── SECTION 2 : STATISTIQUES GLOBALES ────────────────────────────
    // Taux de réussite général, VIP, CA, nombre d'utilisateurs
    public function stats(): JsonResponse
    {
        $data = Cache::remember('admin_stats_global', 300, function () {
            $total     = Prediction::count();
            $avecReel  = Prediction::whereNotNull('score_reel')->count();
            $corrects  = Prediction::whereNotNull('score_reel')
                ->whereRaw('score_prevu = score_reel')
                ->count();
            $confirmes         = Prediction::where('score_confirme', true)->count();
            $confirmes_correct = Prediction::where('score_confirme', true)
                ->whereRaw('score_prevu = score_reel')
                ->count();
            return [
                'global' => [
                    'predictions_total'        => $total,
                    'avec_resultat'            => $avecReel,
                    'score_exact_general'      => $corrects,
                    'taux_general'             => $avecReel > 0 ? round(($corrects / $avecReel) * 100, 1) : 0,
                    'utilisateurs'             => User::count(),
                    'admins'                   => User::where('role', 'admin')->count(),
                    'tracés_confirmés'         => $confirmes,
                    'tracés_correct_confirmés' => $confirmes_correct,
                    'taux_confirmation'        => $confirmes > 0 ? round(($confirmes_correct / $confirmes) * 100, 1) : 0,
                ],
            ];
        });
        return response()->json($data);
    }

    // ── SECTION 3 : MISE À JOUR (auto 04:00 + bouton admin) ─────────
    // Statut de la dernière mise à jour automatique
    public function statutMiseAJour(): JsonResponse
    {
        $dernierLog = LogApplication::where('type_action', 'mise_a_jour_auto')
            ->orWhere('type_action', 'score_recupere')
            ->latest()->first();
        $prochaine = now()->setTime(4, 0);
        if (now()->gte($prochaine)) $prochaine->addDay();
        return response()->json([
            'automatique'         => true,
            'heure_execution'     => '04:00 (Dakar — UTC+0)',
            'derniere_execution'  => $dernierLog ? [
                'date'    => $dernierLog->created_at->toISOString(),
                'message' => $dernierLog->message,
                'statut'  => $dernierLog->niveau,
            ] : null,
            'prochaine_execution' => $prochaine->toISOString(),
        ]);
    }

    // Déclencher manuellement depuis le bouton admin (en plus de l'auto 04:00)
    // Accepte football_api_key dans le body → priorité sur .env
    public function declencherMiseAJour(Request $request): JsonResponse
    {
        $cleApi = $request->input('football_api_key', '');

        if (empty($cleApi) && empty(env('FOOTBALL_API_KEY', ''))) {
            return response()->json([
                'message' => 'Clé API manquante. Renseignez votre clé football-data.org dans l\'interface admin (section Matchs → icône clé) puis réessayez.',
                'erreur'  => 'cle_api_manquante',
            ], 422);
        }

        try {
            $options = $cleApi ? ['--key' => $cleApi] : [];
            \Illuminate\Support\Facades\Artisan::call('trace:mise-a-jour', $options);
            $output = \Illuminate\Support\Facades\Artisan::output();
            LogApplication::creer('mise_a_jour_auto', 'Mise à jour déclenchée manuellement par admin', 'succes');
            return response()->json([
                'message' => 'Mise à jour lancée avec succès — scores récupérés et auto-confirmés.',
                'details' => trim($output),
            ]);
        } catch (\Exception $e) {
            LogApplication::creer('erreur_api', 'Erreur déclenchement manuel : ' . $e->getMessage(), 'erreur');
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    // ── SECTION 3b : SYNCHRONISATION DES MATCHS CONFIRMÉS ──────────────
    // Synchronise toutes les prédictions confirmées vers l'espace utilisateur
    public function synchroniserPredictions(Request $request): JsonResponse
    {
        $dateSync = now();

        // Récupérer toutes les prédictions confirmées
        $predictions = Prediction::where(function ($q) {
            $q->where('trace_status', 'valide')
              ->orWhere('score_confirme', true);
        })->get();

        $synchronisees = 0;
        foreach ($predictions as $pred) {
            $update = [];
            if ($pred->trace_status !== 'valide') {
                $update['trace_status'] = 'valide';
            }
            if (!$pred->score_confirme) {
                $update['score_confirme']    = true;
                $update['score_confirme_le'] = now();
            }
            if (!empty($update)) {
                $pred->update($update);
                $synchronisees++;
            }
        }

        $total = $predictions->count();

        LogApplication::creer(
            'synchronisation_matchs',
            "Synchronisation : {$total} match(s) confirmé(s), {$synchronisees} mis à jour — " . $dateSync->format('d/m/Y H:i:s'),
            'succes',
            $request->user()->id ?? null
        );

        Cache::forget('admin_stats_global');
        Cache::forget('stats_globales');
        Cache::forget('admin_activites_recentes');
        Cache::forget('admin_badges');
        Cache::forget('admin_confirmations_pending');

        return response()->json([
            'message'         => "✅ {$total} match(s) synchronisé(s) — utilisateurs à jour.",
            'total_confirmes' => $total,
            'synchronisees'   => $synchronisees,
            'date_sync'       => $dateSync->toIso8601String(),
        ]);
    }

    // ── SECTION 3a : TRACKER D'ACTIVITÉ UTILISATEUR ─────────────────────
    // Reçoit chaque action utilisateur depuis le frontend et la sauvegarde
    public function trackerActivite(Request $request): JsonResponse
    {
        $user   = $request->user();
        $action = $request->input('action', 'action_inconnue');
        $detail = $request->input('detail', '');

        $messages = [
            'page_prediction'  => "A consulté la page Prédictions",
            'page_direct'      => "A consulté les matchs en Direct",
            'page_vip'         => "A consulté la page VIP",
            'match_ouvert'     => "A ouvert le match : {$detail}",
            'match_ferme'      => "A fermé le détail du match : {$detail}",
            'vip_debloquer'    => "A tenté de débloquer un score VIP : {$detail}",
            'vip_detail'       => "A consulté le score VIP : {$detail}",
            'prediction_vue'   => "A consulté les prédictions du : {$detail}",
            'direct_ouvert'    => "A ouvert le direct : {$detail}",
            'connexion'        => "S'est connecté",
            'deconnexion'      => "S'est déconnecté",
        ];

        $message = isset($messages[$action])
            ? $messages[$action]
            : "{$action}" . ($detail ? " : {$detail}" : '');

        LogApplication::creer(
            'activite_utilisateur',
            "[{$user->name}] {$message}",
            'info',
            $user->id
        );

        return response()->json(['ok' => true]);
    }

    // ── SECTION 3c : ACTIVITÉS RÉCENTES ─────────────────────────────────
    // Retourne les 30 dernières activités utilisateurs traçables
    public function activitesRecentes(): JsonResponse
    {
        $toutes = Cache::remember('admin_activites_recentes', 60, function () {
        $activites = collect();

        // 1. Paiements VIP — actions utilisateur côté score exact
        $paiements = \App\Models\PaiementVip::with([
                'user:id,name,email',
                'predictionVip:id,domicile,exterieur,competition',
            ])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn($p) => [
                'type'        => 'paiement',
                'date'        => $p->created_at->toIso8601String(),
                'user_nom'    => $p->user?->name    ?? 'Utilisateur inconnu',
                'user_email'  => $p->user?->email   ?? '',
                'description' => $p->statut === 'valide'
                    ? "A débloqué le score exact de " .
                      ($p->predictionVip ? "{$p->predictionVip->domicile} vs {$p->predictionVip->exterieur}" : 'un match') .
                      " ({$p->montant} FCFA)"
                    : "A initié un paiement de {$p->montant} FCFA via " . strtoupper($p->methode ?? '') . " — " . $p->statut,
                'statut'      => $p->statut,
                'methode'     => strtoupper($p->methode ?? ''),
            ]);

        // 2. Nouvelles inscriptions utilisateurs
        $inscriptions = \App\Models\User::where('role', 'user')
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get()
            ->map(fn($u) => [
                'type'        => 'inscription',
                'date'        => $u->created_at->toIso8601String(),
                'user_nom'    => $u->name,
                'user_email'  => $u->email,
                'description' => 'A créé un nouveau compte utilisateur',
                'statut'      => 'valide',
                'methode'     => null,
            ]);

        // 3. Actions utilisateurs trackées en temps réel
        $actionsUsers = LogApplication::where('type_action', 'activite_utilisateur')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($l) {
                // Extraire nom depuis le message "[Nom] action"
                preg_match('/^\[([^\]]+)\]\s(.+)$/', $l->message, $m);
                return [
                    'type'        => 'action',
                    'date'        => $l->created_at->toIso8601String(),
                    'user_nom'    => $m[1] ?? 'Utilisateur',
                    'user_email'  => '',
                    'description' => $m[2] ?? $l->message,
                    'statut'      => 'info',
                    'methode'     => null,
                ];
            });

        // Fusionner et trier par date décroissante
        return $activites
            ->merge($paiements)
            ->merge($inscriptions)
            ->merge($actionsUsers)
            ->sortByDesc('date')
            ->values()
            ->take(200);
        }); // fin Cache::remember

        return response()->json(['activites' => $toutes]);
    }

    // ── SECTION 3d : STATUT GÉNÉRATION AUTOMATIQUE (03:55) ─────────────
    // Retourne le statut de la dernière génération automatique de tracés
    public function statutGeneration(): JsonResponse
    {
        $dernierLog = LogApplication::where('type_action', 'generation_traces_auto')
            ->latest()->first();
        $prochaine = now('Africa/Dakar')->setTime(3, 55);
        if (now('Africa/Dakar')->gte($prochaine)) $prochaine->addDay();

        $nbGeneres = \App\Models\Prediction::whereDate('created_at', now('Africa/Dakar')->format('Y-m-d'))
            ->where('verification', 'like', '%genere_auto_4h%')
            ->count();

        return response()->json([
            'automatique'         => true,
            'heure_execution'     => '03:55 (Dakar — UTC+0)',
            'derniere_execution'  => $dernierLog ? [
                'date'    => $dernierLog->created_at->toISOString(),
                'message' => $dernierLog->message,
                'statut'  => $dernierLog->niveau,
            ] : null,
            'prochaine_execution' => $prochaine->toISOString(),
            'generes_aujourd_hui' => $nbGeneres,
        ]);
    }

    // Déclencher manuellement la génération (bouton dashboard)
    public function declencherGeneration(Request $request): JsonResponse
    {
        $date = $request->input('date', now('Africa/Dakar')->format('Y-m-d'));

        try {
            $options = $date ? ['--date' => $date] : [];
            \Illuminate\Support\Facades\Artisan::call('trace:generer-matchs', $options);
            $output = trim(\Illuminate\Support\Facades\Artisan::output());

            LogApplication::creer('generation_traces_auto', "Génération manuelle déclenchée par admin pour le {$date}", 'succes',
                $request->user()?->id);

            // Compter les tracés et VIP générés pour cette date
            $nb = \App\Models\Prediction::whereDate('created_at', $date)
                ->where('verification', 'like', '%genere_auto_4h%')
                ->count();

            $nbVip = \App\Models\PredictionVip::whereDate('created_at', $date)
                ->where('publie', true)
                ->count();

            $msgVip = $nbVip > 0 ? " + {$nbVip} VIP" : '';

            return response()->json([
                'message'  => "✅ Génération terminée — {$nb} tracé(s){$msgVip} créé(s) pour le {$date}.",
                'details'  => $output,
                'nb_traces'=> $nb,
                'nb_vip'   => $nbVip,
                'date'     => $date,
                'date_exec'=> now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            LogApplication::creer('erreur_generation', 'Erreur génération manuelle : ' . $e->getMessage(), 'erreur');
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    // ── SECTION 4 : PURGE DES LOGS ───────────────────────────────────
    // Supprime les logs de plus de 30 jours pour libérer de la place
    public function purgerLogs(): JsonResponse
    {
        $nb = LogApplication::where('created_at', '<', now()->subDays(30))->delete();
        LogApplication::creer('purge_logs', "{$nb} logs supprimés (>30 jours)", 'info');
        return response()->json(['message' => "{$nb} logs supprimés."]);
    }

    // ── SECTION 5 : GESTION UTILISATEURS ─────────────────────────────
    public function listeUtilisateurs(): JsonResponse
    {
        return response()->json(Cache::remember('admin_utilisateurs', 60, fn () => [
            'utilisateurs' => User::select('id', 'name', 'email', 'role', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get()
                ->toArray(),
        ]));
    }

    public function creerUtilisateur(Request $request): JsonResponse
    {
        $d = $request->validate([
            'name'     => 'required|string|max:60',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role'     => 'required|in:admin,user',
        ]);

        $user = User::create([
            'name'     => $d['name'],
            'email'    => $d['email'],
            'password' => Hash::make($d['password']),
            'role'     => $d['role'],
        ]);

        LogApplication::creer('creation_user', "Nouvel utilisateur : {$user->email} (rôle: {$user->role})", 'succes');
        Cache::forget('admin_utilisateurs');
        return response()->json(['utilisateur' => $user], 201);
    }

    public function modifierUtilisateur(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $d    = $request->validate([
            'name'     => 'sometimes|string|max:60',
            'email'    => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'sometimes|string|min:8',
            'role'     => 'sometimes|in:admin,user',
        ]);

        if (isset($d['password'])) $d['password'] = Hash::make($d['password']);
        $user->update($d);

        Cache::forget('admin_utilisateurs');
        return response()->json(['utilisateur' => $user]);
    }

    public function supprimerUtilisateur(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Empêcher la suppression du dernier admin
        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Impossible de supprimer le dernier administrateur.'], 422);
        }

        $user->tokens()->delete();
        $email = $user->email;
        $user->delete();

        LogApplication::creer('suppression_user', "Utilisateur supprimé : {$email}", 'info');
        Cache::forget('admin_utilisateurs');
        return response()->json(['message' => 'Utilisateur supprimé avec succès.']);
    }

    // ── SECTION 6 : CONFIRMATION DU SCORE EXACT (TRACÉ) ─────────────
    // Liste les prédictions en attente de confirmation de score
    public function predictionsAConfirmer(): JsonResponse
    {
        [$predictions, $predictionsVip] = Cache::remember('admin_confirmations_pending', 60, function () {
            $preds    = Prediction::whereNotNull('score_reel')
                ->where('score_confirme', false)
                ->orderBy('date', 'desc')
                ->get(['id', 'match_id', 'competition', 'domicile', 'exterieur', 'date', 'heure',
                       'score_prevu', 'score_reel', 'score_confirme', 'score_confirme_le', 'trace_status'])
                ->toArray();
            $predsVip = PredictionVip::whereNotNull('score_reel')
                ->where('score_confirme', false)
                ->orderBy('date', 'desc')
                ->get(['id', 'match_id', 'competition', 'domicile', 'exterieur', 'date', 'heure',
                       'score_exact_predit', 'score_reel', 'score_confirme', 'score_confirme_le'])
                ->toArray();
            return [$preds, $predsVip];
        });

        return response()->json([
            'predictions'     => $predictions,
            'predictions_vip' => $predictionsVip,
            'total'           => count($predictions) + count($predictionsVip),
        ]);
    }

    // ── Badges légers (sidebar) ──────────────────────────────────────
    // Endpoint dédié : 4 COUNT rapides pour les badges de navigation
    public function badges(): JsonResponse
    {
        return response()->json(Cache::remember('admin_badges', 60, function () {
            $logStats = Cache::get('admin_logs_stats');
            $logsErreurs = is_array($logStats)
                ? ($logStats['erreurs'] ?? LogApplication::where('niveau', 'erreur')->count())
                : LogApplication::where('niveau', 'erreur')->count();

            return [
                'confirmation'     => Prediction::where('score_confirme', true)->count(),
                'vip_attente'      => \App\Models\PaiementVip::where('statut', 'en_attente')->count(),
                'historique_total' => Prediction::count(),
                'logs_erreurs'     => $logsErreurs,
            ];
        }));
    }

    // Confirmer le score d'une prédiction normale
    public function confirmerScoreTrace(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $d    = $request->validate([
            'score_reel'        => 'required|string|max:10',
            'note_confirmation' => 'nullable|string|max:255',
        ]);

        $pred = Prediction::findOrFail($id);

        $pred->update([
            'score_reel'         => $d['score_reel'],
            'score_confirme'     => true,
            'score_confirme_le'  => now(),
            'confirme_par'       => $user->id,
            'note_confirmation'  => $d['note_confirmation'] ?? null,
        ]);

        // Vérifier si le tracé a prédit le bon score
        $scoreCorrect = $pred->score_prevu === $d['score_reel'];
        $statut = $scoreCorrect ? 'TRACÉ CORRECT ✓' : 'TRACÉ APPROCHÉ';

        LogApplication::creer(
            'confirmation_score_trace',
            "Tracé #{$id} confirmé par admin#{$user->id} : Prédit={$pred->score_prevu} / Réel={$d['score_reel']} → {$statut}",
            'succes'
        );

        Cache::forget('admin_stats_global');
        Cache::forget('stats_globales');
        Cache::forget('admin_badges');
        Cache::forget('admin_confirmations_pending');
        Cache::forget('admin_scores_confirmes');
        Cache::forget('admin_intelligence_data');
        Cache::forget('predictions_lister_stats');

        return response()->json([
            'message'       => 'Score du tracé confirmé.',
            'score_correct' => $scoreCorrect,
            'statut'        => $statut,
        ]);
    }

    // Liste des scores déjà confirmés avec leur résultat — cache 2 min
    public function scoresConfirmes(): JsonResponse
    {
        return response()->json(Cache::remember('admin_scores_confirmes', 120, function () {
            $confirmes = Prediction::where('score_confirme', true)
                ->orderBy('score_confirme_le', 'desc')
                ->with('confirmateurAdmin:id,name')
                ->get(['id', 'competition', 'domicile', 'exterieur', 'date',
                       'score_prevu', 'score_reel', 'score_confirme_le', 'confirme_par', 'note_confirmation']);

            $confirmesVip = PredictionVip::where('score_confirme', true)
                ->orderBy('score_confirme_le', 'desc')
                ->get(['id', 'competition', 'domicile', 'exterieur', 'date',
                       'score_exact_predit', 'score_reel', 'score_confirme_le', 'note_confirmation']);

            $total   = $confirmes->count();
            $correct = $confirmes->filter(fn($p) => $p->score_prevu === $p->score_reel)->count();
            $tauxVip = $confirmesVip->count() > 0
                ? round($confirmesVip->filter(fn($p) => $p->score_exact_predit === $p->score_reel)->count() / $confirmesVip->count() * 100, 1)
                : 0;

            return [
                'confirmes'     => $confirmes->toArray(),
                'confirmes_vip' => $confirmesVip->toArray(),
                'taux_tracé'    => $total > 0 ? round(($correct / $total) * 100, 1) : 0,
                'taux_vip'      => $tauxVip,
            ];
        }));
    }

    // Données pré-agrégées pour PageIntelligence
    // Pas de cache : maisons_placees trop volumineuses pour le cache DB (~2MB/requête)
    // La requête SQL est simple et rapide (< 100ms)
    public function intelligenceData(): JsonResponse
    {
        $preds = Prediction::whereNotNull('score_reel')
            ->where(function ($q) {
                $q->where('trace_status', 'valide')
                  ->orWhere('score_confirme', true);
            })
            ->get([
                'id', 'match_id', 'score_reel', 'score_prevu',
                'combinaisons', 'maisons_placees', 'verification',
                'trace_status', 'score_confirme',
            ]);

        return response()->json(['predictions' => $preds, 'total' => $preds->count()]);
    }
}
