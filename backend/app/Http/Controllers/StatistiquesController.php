<?php
// StatistiquesController.php — Statistiques de performance du tracé
// Retourne les taux de réussite par championnat et par période

namespace App\Http\Controllers;

use App\Models\Prediction;
use App\Models\PaiementVip;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class StatistiquesController extends Controller
{
    // Statistiques globales — utilisées dans le dashboard admin
    public function index(): JsonResponse
    {
        $result = Cache::remember('stats_globales', 300, function () {
        // Tous les matchs générés (tracés créés) du début à la fin
        $totalGeneres = Prediction::count();

        // Nombre total de prédictions avec un score réel saisi
        $total     = Prediction::whereNotNull('score_reel')->count();
        $avecReel  = $total; // alias clair pour le frontend

        // Nombre de prédictions où le score prévu = score réel
        $corrects = Prediction::whereNotNull('score_reel')
            ->whereRaw('score_prevu = score_reel')
            ->count();

        // Prédictions certifiées par l'admin (score_confirme = true)
        $confirmes    = Prediction::where('score_confirme', true)->count();
        $confirmes_ok = Prediction::where('score_confirme', true)
            ->whereRaw('score_prevu = score_reel')
            ->count();

        // Taux de réussite par championnat (top 10)
        $parChampionnat = Prediction::whereNotNull('score_reel')
            ->select('competition', DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN score_prevu = score_reel THEN 1 ELSE 0 END) as corrects'))
            ->groupBy('competition')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($c) => [
                'competition' => $c->competition,
                'total'       => $c->total,
                'corrects'    => $c->corrects,
                'taux'        => $c->total > 0 ? round(($c->corrects / $c->total) * 100, 1) : 0,
            ]);

        // Évolution des 7 derniers jours
        $evolution = Prediction::whereNotNull('score_reel')
            ->where('date', '>=', now()->subDays(7)->format('Y-m-d'))
            ->select('date', DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN score_prevu = score_reel THEN 1 ELSE 0 END) as corrects'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Chiffre d'affaires total des paiements VIP validés
        $caPaiements = PaiementVip::where('statut', 'valide')->sum('montant');

        // Meilleures combinaisons — évaluation correcte via evaluerCombi
        $combis = Prediction::whereNotNull('score_reel')
            ->whereNotNull('combinaisons')
            ->get(['combinaisons', 'score_reel'])
            ->flatMap(function ($p) {
                $combis = is_array($p->combinaisons)
                    ? $p->combinaisons
                    : json_decode($p->combinaisons, true) ?? [];
                return collect($combis)->map(fn($c) => [
                    'label'   => $c['label'] ?? '?',
                    'couleur' => $c['couleur'] ?? '#888',
                    'correct' => Prediction::evaluerCombi($c['label'] ?? '', $p->score_reel ?? '') === 'ok',
                ]);
            })
            ->groupBy('label')
            ->map(fn($g, $lbl) => [
                'label'    => $lbl,
                'couleur'  => $g->first()['couleur'],
                'total'    => $g->count(),
                'corrects' => $g->filter(fn($i) => $i['correct'])->count(),
                'taux'     => $g->count() > 0
                    ? round($g->filter(fn($i) => $i['correct'])->count() / $g->count() * 100, 1)
                    : 0,
            ])
            ->sortByDesc('total')
            ->values()
            ->take(10);

        // Stats spécifiques aux prédictions VIP
        $vipTotal    = \App\Models\PredictionVip::whereNotNull('score_reel')->count();
        $vipPublies  = \App\Models\PredictionVip::where('publie', true)->count();
        $vipCorrects = \App\Models\PredictionVip::whereNotNull('score_reel')
            ->whereRaw('score_exact_predit = score_reel')->count();
        $tauxVip     = $vipTotal > 0 ? round(($vipCorrects / $vipTotal) * 100, 1) : 0;

        // Nombre total d'utilisateurs inscrits
        $utilisateurs = \App\Models\User::count();

        return [
            'global' => [
                'total_matchs_generes' => $totalGeneres,
                'predictions_total'   => $total,
                'total'               => $total,
                'corrects'            => $corrects,
                'avec_resultat'       => $avecReel,
                'score_exact_general' => $corrects,
                'taux_global'         => $total > 0 ? round(($corrects / $total) * 100, 1) : 0,
                'taux_general'        => $total > 0 ? round(($corrects / $total) * 100, 1) : 0,
                'confirmes'           => $confirmes,
                'confirmes_corrects'  => $confirmes_ok,
                'taux_confirmes'      => $confirmes > 0 ? round(($confirmes_ok / $confirmes) * 100, 1) : 0,
                'vip_total'           => $vipTotal,
                'vip_publies'         => $vipPublies,
                'vip_corrects'        => $vipCorrects,
                'taux_vip'            => $tauxVip,
                'ca_vip'              => number_format($caPaiements, 0, ',', ' ') . ' FCFA',
                'ca_formate'          => number_format($caPaiements, 0, ',', ' ') . ' FCFA',
                'utilisateurs'        => $utilisateurs,
            ],
            'par_championnat'         => $parChampionnat,
            'evolution_7j'            => $evolution,
            'meilleures_combinaisons' => $combis->values(),
        ];
        }); // fin Cache::remember

        return response()->json($result);
    }

    // Statistiques détaillées sur une période donnée
    public function detail(Request $request): JsonResponse
    {
        $debut = $request->get('date_debut', now()->subDays(30)->format('Y-m-d'));
        $fin   = $request->get('date_fin',   now()->format('Y-m-d'));

        $cacheKey = "stats_detail_{$debut}_{$fin}";
        $cached   = Cache::remember($cacheKey, 300, function () use ($debut, $fin) {
        $predictions = Prediction::whereNotNull('score_reel')
            ->whereBetween('date', [$debut, $fin])
            ->orderBy('date', 'desc')
            ->get(['id', 'competition', 'domicile', 'exterieur', 'date',
                   'score_prevu', 'score_reel', 'score_confirme', 'trace_status']);

        $total    = $predictions->count();
        $corrects = $predictions->filter(fn($p) => $p->score_prevu === $p->score_reel)->count();

        // Évolution jour par jour sur la période
        $evolution = Prediction::whereNotNull('score_reel')
            ->whereBetween('date', [$debut, $fin])
            ->select('date', DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN score_prevu = score_reel THEN 1 ELSE 0 END) as corrects'))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($e) => [
                'date'     => $e->date,
                'total'    => $e->total,
                'corrects' => $e->corrects,
                'taux'     => $e->total > 0 ? round(($e->corrects / $e->total) * 100, 1) : 0,
            ]);

        // Par championnat sur la période
        $parChamp = Prediction::whereNotNull('score_reel')
            ->whereBetween('date', [$debut, $fin])
            ->select('competition', DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN score_prevu = score_reel THEN 1 ELSE 0 END) as corrects'))
            ->groupBy('competition')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($c) => [
                'competition' => $c->competition,
                'total'       => $c->total,
                'corrects'    => $c->corrects,
                'taux'        => $c->total > 0 ? round(($c->corrects / $c->total) * 100, 1) : 0,
            ]);

        return [
            'predictions'     => $predictions->toArray(),
            'total'           => $total,
            'corrects'        => $corrects,
            'taux'            => $total > 0 ? round(($corrects / $total) * 100, 1) : 0,
            'periode'         => ['debut' => $debut, 'fin' => $fin],
            'evolution'       => $evolution->values()->toArray(),
            'par_championnat' => $parChamp->values()->toArray(),
        ];
        }); // fin Cache::remember

        return response()->json($cached);
    }
}