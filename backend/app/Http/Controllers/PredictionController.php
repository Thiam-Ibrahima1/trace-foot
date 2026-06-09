<?php
// PredictionController.php — Créer et gérer les prédictions de matchs
// Reçoit les données du tracé depuis le frontend et les sauvegarde en MySQL

namespace App\Http\Controllers;

use App\Models\Prediction;
use App\Models\LogApplication;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PredictionController extends Controller
{
    // Lister les prédictions avec filtrage par date
    public function lister(Request $request): JsonResponse
    {
        $date = $request->get('date', now()->format('Y-m-d'));
        $page = max(1, (int) $request->get('page', 1));

        // Lookup direct par match_id (recherche exacte — une seule prédiction)
        if ($request->has('match_id')) {
            $matchId = $request->get('match_id');
            $pred    = Prediction::where('match_id', $matchId)->first();
            return response()->json(['predictions' => $pred ? [$pred] : [], 'total' => $pred ? 1 : 0]);
        }

        // Si une date est fournie, filtrer par date — cache 2 min
        if ($request->has('date')) {
            $predictions = \Illuminate\Support\Facades\Cache::remember(
                "predictions_date_{$date}", 120,
                fn () => Prediction::where('date', $date)->orderBy('heure')->get()
            );
            return response()->json(['predictions' => $predictions]);
        }

        // Historique paginé — les plus récents en premier (max 50/page)
        $perPage = min(50, max(1, (int) $request->get('per_page', 25)));
        $pagine  = Prediction::orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        // Stats globales — cache 5 min (évite 2 COUNT full-scan à chaque appel)
        $statsCache = \Illuminate\Support\Facades\Cache::remember('predictions_lister_stats', 300, function () {
            $avecResultat = Prediction::whereNotNull('score_reel')->count();
            $corrects     = Prediction::whereNotNull('score_reel')
                ->whereRaw('score_prevu = score_reel')->count();
            return compact('avecResultat', 'corrects');
        });

        return response()->json([
            'predictions' => $pagine->items(),
            'total'       => $pagine->total(),
            'page'        => $pagine->currentPage(),
            'pages'       => $pagine->lastPage(),
            'stats' => [
                'total'         => $pagine->total(),
                'avec_resultat' => $statsCache['avecResultat'],
                'corrects'      => $statsCache['corrects'],
                'taux_reussite' => $statsCache['avecResultat'] > 0
                    ? round(($statsCache['corrects'] / $statsCache['avecResultat']) * 100, 1)
                    : 0,
            ],
        ]);
    }

    // Créer une prédiction depuis le tracé généré côté frontend
    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'match_id'           => 'required|string|max:50',
            'competition'        => 'required|string|max:80',
            'domicile'           => 'required|string|max:80',
            'exterieur'          => 'required|string|max:80',
            'date'               => 'nullable|string|max:20',
            'heure'              => 'nullable|string|max:10',
            'logo_dom'           => 'nullable|string|max:500',
            'logo_ext'           => 'nullable|string|max:500',
            'score_prevu'        => 'required|string|max:10',
            'scores_alternatifs' => 'nullable|array',
            'interpretation'     => 'nullable|string',
            'combinaisons'       => 'nullable|array',
            'maisons_placees'    => 'nullable|array',
            'verification'       => 'nullable|array',
            'essais'             => 'nullable|integer',
            'trace_status'       => 'nullable|string|max:20',
        ]);

        // Créer ou mettre à jour si le match_id existe déjà
        $pred = Prediction::updateOrCreate(['match_id' => $d['match_id']], $d);

        LogApplication::creer(
            'prediction_creee',
            "Tracé : {$d['domicile']} vs {$d['exterieur']} → {$d['score_prevu']} ({$d['competition']})",
            'succes'
        );

        return response()->json(['prediction' => $pred], 201);
    }

    // Mettre à jour le score réel après le match (saisie admin)
    public function mettreAJourResultat(Request $request, int $id): JsonResponse
    {
        $d    = $request->validate(['score_reel' => 'required|string|max:10']);
        $pred = Prediction::findOrFail($id);

        $pred->update([
            'score_reel'        => $d['score_reel'],
            'score_confirme'    => false,
            'score_confirme_le' => null,
        ]);

        // Évaluer automatiquement chaque combinaison et sauvegarder vert/rouge en base
        $pred->mettreAJourEtatCombis($d['score_reel']);

        $correct = $pred->score_prevu === $d['score_reel'];
        LogApplication::creer(
            'score_reel_saisi',
            "Score réel : {$pred->domicile} vs {$pred->exterieur} → Prévu: {$pred->score_prevu} / Réel: {$d['score_reel']} | " . ($correct ? 'CORRECT' : 'Non exact'),
            $correct ? 'succes' : 'info'
        );

        \Illuminate\Support\Facades\Cache::forget('predictions_lister_stats');
        \Illuminate\Support\Facades\Cache::forget("predictions_date_{$pred->date}");
        \Illuminate\Support\Facades\Cache::forget('admin_intelligence_data');
        \Illuminate\Support\Facades\Cache::forget('admin_confirmations_pending');

        return response()->json([
            'message'       => 'Score réel enregistré. Confirmation admin requise.',
            'score_correct' => $correct,
        ]);
    }

    // Réinitialiser le score réel (effacer la saisie pour pouvoir la refaire)
    public function reinitialiserScore(int $id): JsonResponse
    {
        $pred = Prediction::findOrFail($id);

        $pred->update([
            'score_reel'        => null,
            'score_confirme'    => false,
            'score_confirme_le' => null,
            'confirme_par'      => null,
            'note_confirmation' => null,
        ]);

        // Remettre toutes les combinaisons à 'pending' (score effacé)
        $pred->reinitialiserEtatCombis();

        LogApplication::creer(
            'score_reinitialise',
            "Score réinitialisé : {$pred->domicile} vs {$pred->exterieur} (#{$id})",
            'mise_a_jour'
        );

        return response()->json(['message' => 'Score réinitialisé. Vous pouvez saisir le score final.']);
    }

    // Publier les combinaisons d'un tracé → visibles côté utilisateurs
    public function publierCombinaisons(Request $request, int $id): JsonResponse
    {
        $pred = Prediction::findOrFail($id);

        $update = [
            'score_confirme'    => true,
            'score_confirme_le' => now(),
            'confirme_par'      => $request->user()->id,
            'trace_status'      => 'valide',
        ];

        // Sauvegarder les combinaisons recalculées depuis PageVisualisationTrace
        if ($request->has('combinaisons') && is_array($request->input('combinaisons'))) {
            $update['combinaisons'] = $request->input('combinaisons');
        }
        // Mettre à jour le score prévu si recalculé
        if ($request->filled('score_prevu')) {
            $update['score_prevu'] = $request->input('score_prevu');
        }

        $pred->update($update);
        LogApplication::creer(
            'combinaisons_publiees',
            "Combinaisons publiées : {$pred->domicile} vs {$pred->exterieur} → {$pred->score_prevu} (#{$id})",
            'succes',
            $request->user()->id
        );
        return response()->json(['message' => 'Combinaisons publiées et visibles côté utilisateurs.']);
    }

    // Récupérer les scores réels des matchs terminés (via mise à jour artisan)
    // Appelé par le bouton "Actualiser scores" dans PageHistoriqueComplet
    public function recupererScores(Request $request): JsonResponse
    {
        $sans = Prediction::whereNull('score_reel')
            ->where('date', '<', now()->format('Y-m-d'))
            ->count();

        if ($sans === 0) {
            return response()->json([
                'message' => 'Tous les scores sont déjà à jour.',
                'mis_a_jour' => 0,
            ]);
        }

        try {
            \Illuminate\Support\Facades\Artisan::call('trace:mise-a-jour');
            $output = \Illuminate\Support\Facades\Artisan::output();

            // Compter combien ont été mis à jour
            $restants = Prediction::whereNull('score_reel')
                ->where('date', '<', now()->format('Y-m-d'))
                ->count();

            $mis_a_jour = $sans - $restants;

            LogApplication::creer(
                'score_recupere',
                "Récupération scores via historique : {$mis_a_jour} score(s) mis à jour",
                'succes',
                $request->user()->id
            );

            return response()->json([
                'message'    => "{$mis_a_jour} score(s) récupéré(s) avec succès.",
                'mis_a_jour' => $mis_a_jour,
                'en_attente' => $restants,
                'details'    => trim($output),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message'    => 'Impossible de récupérer automatiquement. Vérifiez la clé API dans Paramètres.',
                'erreur'     => $e->getMessage(),
                'mis_a_jour' => 0,
            ], 422);
        }
    }

    // Supprimer une prédiction entièrement
    public function supprimer(Request $request, int $id): JsonResponse
    {
        $pred = Prediction::findOrFail($id);
        $info = "{$pred->domicile} vs {$pred->exterieur} — {$pred->date}";

        $pred->delete();

        LogApplication::creer(
            'prediction_supprimee',
            "Prédiction supprimée : {$info} (#{$id})",
            'info',
            $request->user()->id
        );

        return response()->json(['message' => 'Prédiction supprimée avec succès.']);
    }

    // Corriger un score erroné (admin) — remet la confirmation à zéro
    public function corrigerScore(Request $request, int $id): JsonResponse
    {
        $d = $request->validate([
            'score_reel' => 'required|string|max:10|regex:/^\d+-\d+$/',
            'raison'     => 'nullable|string|max:255',
        ]);

        $pred        = Prediction::findOrFail($id);
        $ancienScore = $pred->score_reel;

        $pred->update([
            'score_reel'        => $d['score_reel'],
            'score_confirme'    => false,
            'score_confirme_le' => null,
            'confirme_par'      => null,
        ]);

        // Réévaluer les combinaisons avec le score corrigé
        $pred->mettreAJourEtatCombis($d['score_reel']);

        LogApplication::creer(
            'correction_score',
            "Score corrigé #{$id} : {$ancienScore} → {$d['score_reel']}" . ($d['raison'] ? " | Raison : {$d['raison']}" : ''),
            'mise_a_jour',
            $request->user()->id
        );

        return response()->json(['message' => 'Score corrigé. Confirmation requise à nouveau.']);
    }
}