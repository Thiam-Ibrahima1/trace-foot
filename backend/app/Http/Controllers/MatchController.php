<?php
namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class MatchController extends Controller
{
    private const API = 'https://v3.football.api-sports.io';

    // ── IDs des ligues autorisées (API-Sports) ────────────────
    // Uniquement les grands championnats européens + coupes + compétitions mondiales
    private const LIGUES_AUTORISEES = [
        // ── Angleterre ──────────────────────────────────────
        39,  // Premier League
        40,  // Championship (D2)
        45,  // FA Cup
        48,  // League Cup (Carabao Cup)
        528, // Community Shield
        // ── Espagne ──────────────────────────────────────────
        140, // La Liga
        141, // Segunda División (D2)
        143, // Copa del Rey
        556, // Supercopa de España
        // ── France ───────────────────────────────────────────
        61,  // Ligue 1
        62,  // Ligue 2 (D2)
        66,  // Coupe de France
        526, // Trophée des Champions
        // ── Italie ───────────────────────────────────────────
        135, // Serie A
        136, // Serie B (D2)
        137, // Coppa Italia
        547, // Supercoppa Italiana
        // ── Allemagne ────────────────────────────────────────
        78,  // Bundesliga
        79,  // 2. Bundesliga (D2)
        81,  // DFB Pokal
        529, // DFL Supercup
        // ── Portugal ─────────────────────────────────────────
        94,  // Liga Portugal
        95,  // Liga Portugal 2 (D2)
        96,  // Taça de Portugal
        527, // Supertaça
        // ── Belgique ─────────────────────────────────────────
        144, // Pro League (Jupiler)
        145, // Challenger Pro League (D2)
        146, // Coupe de Belgique
        // ── Pays-Bas ─────────────────────────────────────────
        88,  // Eredivisie
        89,  // Eerste Divisie (D2)
        90,  // KNVB Cup
        533, // Johan Cruyff Shield
        // ── Turquie ──────────────────────────────────────────
        203, // Süper Lig
        204, // TFF 1. Lig (D2)
        205, // Turkish Cup
        540, // Turkish Super Cup
        // ── Grèce ────────────────────────────────────────────
        197, // Super League
        198, // Super League 2 (D2)
        199, // Greek Cup
        // ── États-Unis ───────────────────────────────────────
        253, // MLS
        265, // USL Championship (D2)
        // ── UEFA ─────────────────────────────────────────────
        2,   // Champions League
        3,   // Europa League
        848, // Conference League
        531, // UEFA Super Cup
        // ── Monde ────────────────────────────────────────────
        1,   // World Cup (Coupe du Monde)
        15,  // FIFA Club World Cup (Coupe du Monde des Clubs)
        // ── Afrique ──────────────────────────────────────────
        6,   // Africa Cup of Nations (CAN)
    ];

    // En-têtes d'authentification API-Sports
    private function headers(): array
    {
        return ['x-apisports-key' => env('FOOTBALL_APISPORTS_KEY', '')];
    }

    // Quota journalier API-Sports épuisé → on mémorise jusqu'à minuit Dakar
    private function estLimiteAtteinte(): bool
    {
        return Cache::get('apisports_limite_quotidienne', false) === true;
    }

    private function marquerLimiteAtteinte(): void
    {
        $secondesAvantMinuit = max(60, (int) now('Africa/Dakar')->diffInSeconds(now('Africa/Dakar')->endOfDay()) + 10);
        Cache::put('apisports_limite_quotidienne', true, $secondesAvantMinuit);
        Log::warning('API-Sports: quota journalier épuisé — marqué jusqu\'à minuit Dakar');
    }

    // TTL du cache live selon présence de matchs et heure Dakar
    // Objectif : rester sous 100 req/jour (plan gratuit API-Sports)
    //   → matchs actifs  : 3 min (fraîcheur acceptable en direct)
    //   → heure football (13h-00h) sans matchs : 10 min (économie quota)
    //   → hors heures (00h-13h) : 30 min (quasi pas de matchs la nuit)
    private function ttlLive(array $matchs): int
    {
        if (!empty($matchs)) return 180;  // 3 min — matchs en cours
        $heure = (int) now('Africa/Dakar')->format('H');
        return ($heure >= 13) ? 600 : 1800;
    }

    // Durée de cache intelligente selon la date et l'heure Dakar
    private function ttl(string $date): int
    {
        $auj   = now('Africa/Dakar')->format('Y-m-d');
        $heure = (int) now('Africa/Dakar')->format('H');

        if ($date < $auj) return 86400;            // passé : 24h (scores définitifs)
        if ($date > $auj) return 3600;             // futur : 1h
        if ($heure >= 14 && $heure <= 23) return 300; // live window : 5 min
        return 1800;                               // aujourd'hui hors live : 30 min
    }

    // ─── GET /api/matchs/semaine ─────────────────────────────────
    // API-Sports : from/to nécessite league → on appelle date par date
    public function matchsSemaine(Request $request): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['matchs_par_date' => [], 'total' => 0, 'erreur' => 'Clé API manquante']);
        }

        $auj  = now('Africa/Dakar')->format('Y-m-d');
        // Défaut : hier → demain (3 jours utilisateur). Admin envoie ses propres dates.
        $from = $request->get('dateFrom', now('Africa/Dakar')->subDays(1)->format('Y-m-d'));
        $to   = $request->get('dateTo',   now('Africa/Dakar')->addDays(1)->format('Y-m-d'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) $from = now('Africa/Dakar')->subDays(1)->format('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $to))   $to   = now('Africa/Dakar')->addDays(1)->format('Y-m-d');

        // Max 10 jours pour économiser les requêtes API (100/jour plan gratuit)
        $debut = new \DateTime($from);
        $fin   = new \DateTime($to);
        if ($fin->diff($debut)->days > 10) {
            $to = (clone $debut)->modify('+10 days')->format('Y-m-d');
        }

        // Générer la liste des dates de la plage
        $dates   = [];
        $courant = clone $debut;
        $finDate = new \DateTime($to);
        while ($courant <= $finDate) {
            $dates[] = $courant->format('Y-m-d');
            $courant->modify('+1 day');
        }

        // Priorité : hier → aujourd'hui → demain → autres futurs → autres passés
        $hier   = now('Africa/Dakar')->subDay()->format('Y-m-d');
        $demain = now('Africa/Dakar')->addDay()->format('Y-m-d');
        usort($dates, function($a, $b) use ($auj, $hier, $demain) {
            $priorite = fn($d) => match(true) {
                $d === $hier   => 0,
                $d === $auj    => 1,
                $d === $demain => 2,
                $d > $auj      => 3,
                default        => 4,
            };
            $pA = $priorite($a); $pB = $priorite($b);
            return $pA !== $pB ? $pA - $pB : strcmp($a, $b);
        });

        $parDate    = [];
        $heure      = (int) now('Africa/Dakar')->format('H');
        $limiteAtteinte = false;
        $quotaAtteintAvantBoucle = $this->estLimiteAtteinte();

        foreach ($dates as $date) {
            // TTL agressif : minimiser les appels API (100/jour plan gratuit)
            // Chaque date = 1 appel API. On peut en faire ~8/jour en réserve pour les détails de match.
            if ($date < $auj) {
                $ttl = 604800; // passé : 7 jours (résultats immuables)
            } elseif ($date === $auj) {
                $ttl = ($heure >= 14 && $heure <= 22) ? 1800 : 7200; // live window: 30min, sinon: 2h
            } else {
                $ttl = 86400;  // futur : 24h (programme ne change pas souvent)
            }

            $cacheKey   = "apisports_date_{$date}";
            $matchsDate = Cache::get($cacheKey);

            // ── Invalider le cache des dates passées UNIQUEMENT si un match était en cours ──
            // On re-fetch seulement pour les matchs qui ont démarré (IN_PLAY/PAUSED) mais
            // dont le score final n'est pas encore enregistré.
            // POSTPONED / CANCELLED / SCHEDULED sont des états finals pour le passé → pas de re-fetch.
            if ($matchsDate !== null && $date < $auj) {
                $aDesEnCours = !empty(array_filter(
                    is_array($matchsDate) ? $matchsDate : [],
                    fn($m) => in_array($m['statut_code'] ?? '', ['IN_PLAY', 'PAUSED'])
                ));
                if ($aDesEnCours) {
                    Cache::forget($cacheKey);
                    $matchsDate = null; // Force le re-fetch uniquement pour matchs bloqués en live
                }
            }

            if ($matchsDate === null) {
                // Si quota déjà atteint avant la boucle, ne pas appeler l'API pour cette date
                if ($quotaAtteintAvantBoucle) {
                    $limiteAtteinte = true;
                    continue;
                }

                $fresh = $this->fetchJour($cleApi, $date);

                if ($fresh === null) {
                    // null = limite atteinte ou erreur réseau → NE PAS écraser le cache
                    $limiteAtteinte = true;
                    $quotaAtteintAvantBoucle = true; // stopper les appels suivants
                    continue;
                }

                Cache::put($cacheKey, $fresh, $ttl);
                $matchsDate = $fresh;
            }

            if (!empty($matchsDate)) {
                $parDate[$date] = $matchsDate;
            }
        }

        ksort($parDate);

        return response()->json([
            'matchs_par_date'  => $parDate,
            'total'            => array_sum(array_map('count', $parDate)),
            'date_from'        => $from,
            'date_to'          => $to,
            'limite_atteinte'  => $limiteAtteinte,
        ]);
    }

    // ─── GET /api/matchs/jour ────────────────────────────────────
    public function matchsDuJour(Request $request): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['matchs' => [], 'total' => 0]);
        }

        $date = $request->get('date', now('Africa/Dakar')->format('Y-m-d'));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = now('Africa/Dakar')->format('Y-m-d');
        }

        // Réutiliser le cache de matchsSemaine (même clé)
        $cacheKey = "apisports_date_{$date}";
        $matchs   = Cache::get($cacheKey);
        if ($matchs === null) {
            $matchs = $this->fetchJour($cleApi, $date);
            Cache::put($cacheKey, $matchs ?? [], $this->ttl($date));
        }

        return response()->json(['matchs' => $matchs ?? [], 'total' => count($matchs ?? []), 'date' => $date]);
    }

    // ─── GET /api/matchs/live — Jamais en cache partagé long ────
    public function matchsEnDirect(): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['matchs' => [], 'total' => 0]);
        }

        // Toujours vérifier le cache EN PREMIER — même si quota atteint, on sert ce qu'on a
        $cacheKey = 'apisports_live';
        $matchs   = Cache::get($cacheKey);

        if ($matchs === null) {
            // Cache vide : vérifier le quota avant d'appeler l'API
            if ($this->estLimiteAtteinte()) {
                return response()->json(['matchs' => [], 'total' => 0, 'limite_quotidienne' => true]);
            }

            $matchs  = $this->fetchLive($cleApi);
            $ttlLive = $this->ttlLive($matchs ?? []);
            Cache::put($cacheKey, $matchs ?? [], $ttlLive);
        }

        // Filtrer strictement les statuts live
        $live = array_values(array_filter(
            $matchs ?? [],
            fn($m) => in_array($m['statut_code'], ['IN_PLAY', 'PAUSED'])
        ));

        return response()->json(['matchs' => $live, 'total' => count($live)]);
    }

    // ─── GET /api/competitions/{leagueId}/classement ─────────────
    public function classement(Request $request, int $leagueId): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['response' => []]);
        }

        // Plan gratuit : standings disponibles 2022-2024 seulement
        $saisonCourante = now()->month >= 7 ? now()->year : now()->year - 1;
        $saison   = $request->get('season', min($saisonCourante, 2024));
        $cacheKey = "apisports_classement_{$leagueId}_{$saison}";

        $data = Cache::remember($cacheKey, 1800, function () use ($cleApi, $leagueId, $saison) {
            $rep = Http::timeout(20)
                ->withoutVerifying()
                ->withHeaders($this->headers())
                ->get(self::API . '/standings', ['league' => $leagueId, 'season' => $saison]);

            if (!$rep->successful()) {
                Log::warning("Classement {$leagueId}/{$saison}: " . $rep->status());
                return null;
            }
            return $rep->json();
        });

        return response()->json($data ?? ['response' => []]);
    }

    // ─── GET /api/competitions/{leagueId}/matchs ─────────────────
    // ─── GET /api/competitions/{leagueId}/matchs ─────────────────
    // Retourne les matchs de la dernière saison disponible sur le plan gratuit.
    // Plan gratuit API-Sports : fixtures accessibles via league+season jusqu'à 2024.
    // La saison courante (2025/26) est accessible uniquement via date.
    public function matchsCompetition(Request $request, int $leagueId): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['matches' => [], 'saison' => 0]);
        }

        // Saison courante = 2025 (2025/26) ; plan gratuit limite à 2024 pour league+season
        $saisonCourante = now()->month >= 7 ? now()->year : now()->year - 1;
        // Essayer la saison courante, tomber sur 2024 si indisponible
        $saison   = min($saisonCourante, 2024);
        $cacheKey = "apisports_comp_{$leagueId}_{$saison}";

        $matchs = Cache::remember($cacheKey, 7200, function () use ($cleApi, $leagueId, $saison) {
            $rep = Http::timeout(30)
                ->withoutVerifying()
                ->withHeaders($this->headers())
                ->get(self::API . '/fixtures', [
                    'league'   => $leagueId,
                    'season'   => $saison,
                    'timezone' => 'Africa/Dakar',
                ]);

            if ($rep->status() === 429) {
                Log::warning("Matchs compét. {$leagueId}: rate limit");
                return [];
            }
            if (!$rep->successful()) {
                Log::warning("Matchs compét. {$leagueId}/{$saison}: " . $rep->status());
                return [];
            }

            $fixtures = $rep->json()['response'] ?? [];
            if (empty($fixtures)) return [];

            // Trier par date croissante
            usort($fixtures, fn($a, $b) => strcmp($a['fixture']['date'] ?? '', $b['fixture']['date'] ?? ''));
            return array_map(fn($f) => $this->formater($f), $fixtures);
        });

        return response()->json(['matches' => $matchs ?? [], 'saison' => $saison]);
    }

    // ─── GET /api/competitions/{leagueId}/calendrier ─────────────
    // Prochains matchs via requête par date (saison 2025/26 courante)
    // Pas de restriction plan gratuit pour les requêtes par date
    public function calendrierCompetition(Request $request, int $leagueId): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['matches' => []]);
        }

        $dateFrom = now('Africa/Dakar')->format('Y-m-d');
        $dateTo   = now('Africa/Dakar')->addDays(30)->format('Y-m-d');
        $cacheKey = "apisports_cal_{$leagueId}_{$dateFrom}";

        $matchs = Cache::remember($cacheKey, 1800, function () use ($cleApi, $leagueId, $dateFrom, $dateTo) {
            $rep = Http::timeout(25)
                ->withoutVerifying()
                ->withHeaders($this->headers())
                ->get(self::API . '/fixtures', [
                    'league'   => $leagueId,
                    'season'   => 2025,  // saison courante 2025/26
                    'from'     => $dateFrom,
                    'to'       => $dateTo,
                    'timezone' => 'Africa/Dakar',
                ]);

            if ($rep->status() === 429 || !$rep->successful()) return [];
            $fixtures = $rep->json()['response'] ?? [];
            if (empty($fixtures)) return []; // Plan gratuit : chercher via date

            usort($fixtures, fn($a, $b) => strcmp($a['fixture']['date'] ?? '', $b['fixture']['date'] ?? ''));
            return array_map(fn($f) => $this->formater($f), $fixtures);
        });

        return response()->json(['matches' => $matchs ?? []]);
    }

    // ─── GET /api/matchs/{fixtureId}/details ─────────────────────
    // Chargement paresseux par section pour économiser les requêtes API
    // section : resume | compositions | statistiques | forme | h2h | classement
    public function details(Request $request, int $fixtureId): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['erreur' => 'Clé API manquante']);
        }

        $section  = $request->get('section', 'resume');
        $homeId   = (int)$request->get('homeId',   0);
        $awayId   = (int)$request->get('awayId',   0);
        $leagueId = (int)$request->get('leagueId', 0);
        $estLive  = $request->get('live', false);

        // Cache plus court si le match est en direct
        $ttl = $estLive ? 30 : 86400;

        switch ($section) {

            // ── Résumé : événements + statistiques ───────────────
            case 'resume':
                $cacheKey = "det_resume_{$fixtureId}";
                return response()->json(Cache::remember($cacheKey, $ttl, function () use ($fixtureId) {
                    [$ev, $st] = [
                        $this->apiGet("/fixtures/events",     ['fixture' => $fixtureId]),
                        $this->apiGet("/fixtures/statistics", ['fixture' => $fixtureId]),
                    ];
                    return [
                        'evenements'   => $ev['response']  ?? [],
                        'statistiques' => $st['response']  ?? [],
                    ];
                }));

            // ── Statistiques du match (Match + 1ère / 2ème mi-temps) ──
            case 'stats':
                $cacheKey = "det_stats_{$fixtureId}";
                return response()->json(Cache::remember($cacheKey, $ttl, function () use ($fixtureId) {
                    // Récupérer stats globales + événements en parallèle
                    $stats  = $this->apiGet('/fixtures/statistics', ['fixture' => $fixtureId]);
                    $events = $this->apiGet('/fixtures/events',     ['fixture' => $fixtureId]);

                    $statsReponse  = $stats['response']  ?? [];
                    $eventsReponse = $events['response'] ?? [];

                    // Séparer les événements par mi-temps
                    $mi1Evts = array_values(array_filter($eventsReponse, function ($e) {
                        $min   = (int)($e['time']['elapsed'] ?? 0);
                        $extra = (int)($e['time']['extra']   ?? 0);
                        return $min <= 45 && $extra === 0;
                    }));
                    $mi2Evts = array_values(array_filter($eventsReponse, function ($e) {
                        $min   = (int)($e['time']['elapsed'] ?? 0);
                        $extra = (int)($e['time']['extra']   ?? 0);
                        return $min > 45 || ($min === 45 && $extra > 0);
                    }));

                    return [
                        'statistiques' => $statsReponse,  // Stats complètes (possession, tirs, etc.)
                        'evenements'   => $eventsReponse, // Tous les événements
                        'mi1'          => $mi1Evts,       // Événements 1ère mi-temps
                        'mi2'          => $mi2Evts,       // Événements 2ème mi-temps
                    ];
                }));

            // ── Compositions des deux équipes ─────────────────────
            case 'compositions':
                $cacheKey = "det_compo_{$fixtureId}";
                return response()->json(Cache::remember($cacheKey, $ttl, function () use ($fixtureId) {
                    $rep = $this->apiGet("/fixtures/lineups", ['fixture' => $fixtureId]);
                    return ['compositions' => $rep['response'] ?? []];
                }));

            // ── Forme récente des deux équipes ────────────────────
            case 'forme':
                if (!$homeId || !$awayId) return response()->json(['forme_dom' => [], 'forme_ext' => []]);
                $cacheKey = "det_forme_{$homeId}_{$awayId}";
                return response()->json(Cache::remember($cacheKey, 3600, function () use ($homeId, $awayId) {
                    $domFixtures = $this->apiGet('/fixtures', ['team' => $homeId, 'season' => 2024, 'status' => 'FT']);
                    $extFixtures = $this->apiGet('/fixtures', ['team' => $awayId, 'season' => 2024, 'status' => 'FT']);
                    $dom = array_slice($domFixtures['response'] ?? [], -6);
                    $ext = array_slice($extFixtures['response'] ?? [], -6);
                    return [
                        'forme_dom' => array_map(fn($f) => $this->formaterBref($f, $homeId), $dom),
                        'forme_ext' => array_map(fn($f) => $this->formaterBref($f, $awayId), $ext),
                    ];
                }));

            // ── Confrontations directes (H2H) ─────────────────────
            case 'h2h':
                if (!$homeId || !$awayId) return response()->json(['h2h' => []]);
                $cacheKey = "det_h2h_{$homeId}_{$awayId}";
                return response()->json(Cache::remember($cacheKey, 86400, function () use ($homeId, $awayId) {
                    $dateFrom = date('Y-m-d', strtotime('-4 years'));
                    $rep = $this->apiGet('/fixtures/headtohead', [
                        'h2h'    => "{$homeId}-{$awayId}",
                        'from'   => $dateFrom,
                        'to'     => date('Y-m-d'),
                        'status' => 'FT',
                    ]);
                    $matchs = array_slice($rep['response'] ?? [], -6);
                    return ['h2h' => array_map(fn($f) => $this->formaterBref($f, $homeId), $matchs)];
                }));

            // ── Classement du championnat ─────────────────────────
            case 'classement':
                if (!$leagueId) return response()->json(['classement' => []]);
                $cacheKey = "apisports_classement_{$leagueId}_2024";
                return response()->json(Cache::remember($cacheKey, 1800, function () use ($leagueId) {
                    $rep = $this->apiGet('/standings', ['league' => $leagueId, 'season' => 2024]);
                    return ['classement' => $rep['response'] ?? []];
                }));

            default:
                return response()->json(['erreur' => 'Section inconnue']);
        }
    }

    // Appel API générique avec gestion d'erreurs
    private function apiGet(string $endpoint, array $params): array
    {
        try {
            $rep = Http::timeout(12)
                ->withoutVerifying()
                ->withHeaders($this->headers())
                ->get(self::API . $endpoint, $params);

            if ($rep->status() === 429) { Log::warning('API-Sports: rate limit'); return []; }
            if (!$rep->successful())     { return []; }
            return $rep->json();
        } catch (\Exception $e) {
            Log::error('API details: ' . $e->getMessage());
            return [];
        }
    }

    // Formater un match de forme récente / H2H de façon compacte
    private function formaterBref(array $f, int $equipeRef = 0): array
    {
        $dom = $f['teams']['home']['name']   ?? '';
        $ext = $f['teams']['away']['name']   ?? '';
        $sd  = $f['goals']['home']           ?? null;
        $se  = $f['goals']['away']           ?? null;
        $winnerDom = $f['teams']['home']['winner'] ?? null;
        $perdu = $equipeRef > 0 && (
            ($f['teams']['home']['id'] == $equipeRef && $winnerDom === false) ||
            ($f['teams']['away']['id'] == $equipeRef && $winnerDom === true)
        );
        $gagne = $equipeRef > 0 && (
            ($f['teams']['home']['id'] == $equipeRef && $winnerDom === true) ||
            ($f['teams']['away']['id'] == $equipeRef && $winnerDom === false)
        );
        $nul = $winnerDom === null && $sd !== null;

        return [
            'date'     => substr($f['fixture']['date'] ?? '', 0, 10),
            'dom'      => $dom,
            'dom_logo' => $f['teams']['home']['logo'] ?? null,
            'ext'      => $ext,
            'ext_logo' => $f['teams']['away']['logo'] ?? null,
            'sd'       => $sd,
            'se'       => $se,
            'res'      => $gagne ? 'V' : ($nul ? 'N' : 'D'),
        ];
    }

    // ─── GET /api/admin/matchs/quota ─────────────────────────────
    // Affiche le quota API-Sports sans gaspiller de requêtes :
    // - les données du compte (current, limit, plan…) sont en cache 10 min
    // - les calculs de temps (minutes avant reset, projection…) sont toujours frais
    // → 1 seule requête API toutes les 10 min, quel que soit le nombre de rechargements du Dashboard
    public function quotaApi(): JsonResponse
    {
        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            return response()->json(['erreur' => 'Clé API manquante'], 422);
        }

        $limiteAtteinte = $this->estLimiteAtteinte();

        // ── Données API mises en cache 10 min (1 appel /status = 1 requête décomptée) ──
        $donneesBrutes = Cache::remember('apisports_quota_status', 600, function () {
            try {
                $rep = Http::timeout(10)
                    ->withoutVerifying()
                    ->withHeaders($this->headers())
                    ->get(self::API . '/status');

                if (!$rep->successful()) return null;

                $data         = $rep->json();
                $response     = $data['response'] ?? [];
                $subscription = $response['subscription'] ?? [];
                $account      = $response['account']      ?? [];
                $requests     = $response['requests']     ?? [];

                $expiration = null;
                if (!empty($subscription['end'])) {
                    $expiration = (new \DateTime($subscription['end']))->format('d/m/Y');
                }

                return [
                    'current'       => $requests['current']    ?? null,
                    'limit_day'     => $requests['limit_day']   ?? 100,
                    'plan'          => $subscription['plan']    ?? 'Free',
                    'actif'         => $subscription['active']  ?? true,
                    'expire_le'     => $expiration,
                    'compte_nom'    => trim(($account['firstname'] ?? '') . ' ' . ($account['lastname'] ?? '')),
                    'compte_email'  => $account['email'] ?? '',
                    'lu_a'          => now('Africa/Dakar')->format('H:i'), // heure de la dernière lecture réelle
                ];
            } catch (\Exception $e) {
                return null;
            }
        });

        if (!$donneesBrutes) {
            return response()->json([
                'erreur'          => 'Impossible de joindre API-Sports',
                'limite_atteinte' => $limiteAtteinte,
            ], 502);
        }

        // ── Calculs temporels — toujours frais (pas d'appel API) ──
        $current  = $donneesBrutes['current'];
        $limitDay = $donneesBrutes['limit_day'];
        $remaining = $current !== null ? max(0, $limitDay - $current) : null;

        $maintenant          = now('Africa/Dakar');
        $minuit              = $maintenant->copy()->endOfDay()->addSecond();
        $debutJour           = $maintenant->copy()->startOfDay();
        $minutesEcoulees     = (int) $debutJour->diffInMinutes($maintenant);
        $minutesAvantReset   = (int) $maintenant->diffInMinutes($minuit);
        $heuresEcoulees      = $minutesEcoulees / 60;
        $heuresRestantes     = $minutesAvantReset / 60;

        $rythmeParHeure = $heuresEcoulees > 0 && $current !== null
            ? round($current / $heuresEcoulees, 1) : 0;

        $projectionFin = $current !== null
            ? (int) round($current + ($rythmeParHeure * $heuresRestantes)) : null;

        $rythmeMaxConseille = $heuresRestantes > 0 && $remaining !== null
            ? round($remaining / $heuresRestantes, 1) : 0;

        // ── Génération automatique des conseils ──────────────────────
        $heure    = (int) $maintenant->format('H');
        $conseils = $this->genererConseils(
            $heure, $current, $limitDay, $remaining, $projectionFin,
            $minutesAvantReset, $rythmeMaxConseille, $limiteAtteinte
        );

        return response()->json([
            'utilises'               => $current,
            'limite_jour'            => $limitDay,
            'restants'               => $remaining,
            'pourcentage'            => $current !== null ? round(($current / $limitDay) * 100, 1) : null,
            'limite_atteinte'        => $limiteAtteinte || ($remaining !== null && $remaining <= 0),
            'plan'                   => $donneesBrutes['plan'],
            'actif'                  => $donneesBrutes['actif'],
            'expire_le'              => $donneesBrutes['expire_le'],
            'compte_nom'             => $donneesBrutes['compte_nom'],
            'compte_email'           => $donneesBrutes['compte_email'],
            'lu_a'                   => $donneesBrutes['lu_a'],
            'heure_actuelle_dakar'   => $maintenant->format('H:i'),
            'reset_a'                => '00:00',
            'minutes_avant_reset'    => $minutesAvantReset,
            'minutes_ecoulees'       => $minutesEcoulees,
            'rythme_par_heure'       => $rythmeParHeure,
            'rythme_max_conseille'   => $rythmeMaxConseille,
            'projection_fin_journee' => $projectionFin,
            'conseils'               => $conseils,
        ]);
    }

    // ── Génère des conseils précis selon l'état du quota ─────────
    private function genererConseils(
        int $heure, ?int $current, int $limitDay,
        ?int $remaining, ?int $projectionFin,
        int $minutesAvantReset, float $rythmeMaxConseille, bool $limiteAtteinte
    ): array {
        $conseils = [];
        $pct      = $current !== null ? round(($current / $limitDay) * 100) : 0;
        $hh       = intdiv($minutesAvantReset, 60);
        $mm       = $minutesAvantReset % 60;
        $resetStr = $hh > 0 ? "{$hh}h " . str_pad($mm, 2, '0', STR_PAD_LEFT) . "min" : "{$mm}min";

        // Intervalle conseillé entre 2 actions
        $intervalleMin = $rythmeMaxConseille > 0 ? (int) round(60 / $rythmeMaxConseille) : null;
        $intervalleStr = $intervalleMin
            ? ($intervalleMin >= 60
                ? intdiv($intervalleMin, 60) . 'h' . str_pad($intervalleMin % 60, 2, '0', STR_PAD_LEFT) . 'min'
                : "{$intervalleMin} min")
            : null;

        // ── Quota épuisé ──────────────────────────────────────────
        if ($limiteAtteinte || $remaining <= 0) {
            $conseils[] = [
                'niveau'  => 'rouge',
                'titre'   => 'Quota épuisé',
                'message' => "Ne touchez plus rien. Toutes les données s'affichent depuis le cache. Le quota se remet à zéro dans {$resetStr} (à 00:00 heure Dakar). Attendez avant toute action.",
            ];
            return $conseils;
        }

        // ── Zone auto 00h–04h ─────────────────────────────────────
        if ($heure < 4) {
            $conseils[] = [
                'niveau'  => 'vert',
                'titre'   => 'Zone automatique',
                'message' => "Le système génère les tracés (03h55) et récupère les scores (04h00) automatiquement. Ne déclenchez aucune action manuelle. Revenez après 04h00.",
            ];
            return $conseils;
        }

        // ── Projection dépassement ────────────────────────────────
        if ($projectionFin !== null && $projectionFin > $limitDay) {
            $depasse = $projectionFin - $limitDay;
            $conseils[] = [
                'niveau'  => 'rouge',
                'titre'   => 'Dépassement prévu',
                'message' => "Au rythme actuel vous dépasserez le quota de {$depasse} requête(s) avant minuit. Stoppez toute action sur l'API maintenant et laissez le cache fonctionner.",
            ];
        }

        // ── Zone live 14h–22h ─────────────────────────────────────
        if ($heure >= 14 && $heure < 22) {
            if ($pct >= 80) {
                $conseils[] = [
                    'niveau'  => 'rouge',
                    'titre'   => 'Danger — matchs en cours',
                    'message' => "Il vous reste seulement {$remaining} requête(s) pendant les matchs. N'ouvrez plus de détails de match, ne videz pas le cache. Le cache 30 min gère l'affichage automatiquement.",
                ];
            } elseif ($pct >= 60) {
                $conseils[] = [
                    'niveau'  => 'jaune',
                    'titre'   => 'Attention — matchs en cours',
                    'message' => "Vous êtes à {$pct}% pendant les heures de match." . ($intervalleStr ? " Attendez au moins {$intervalleStr} entre chaque action." : " Limitez vos actions au strict nécessaire."),
                ];
            } else {
                $conseils[] = [
                    'niveau'  => 'jaune',
                    'titre'   => 'Matchs en cours',
                    'message' => "Le cache se renouvelle toutes les 30 min automatiquement. Évitez de vider le cache ou d'ouvrir des sections de détail (Forme, H2H) pour les matchs non prioritaires.",
                ];
            }
        }

        // ── Transition 13h–14h ────────────────────────────────────
        elseif ($heure === 13) {
            $conseils[] = [
                'niveau'  => 'jaune',
                'titre'   => 'Matchs dans moins d\'1h',
                'message' => "Les matchs européens débutent à 14h00. Terminez vos actions admin maintenant et évitez d'utiliser des requêtes entre 14h et 22h sauf en cas de nécessité.",
            ];
        }

        // ── Zone réserve 22h–00h ──────────────────────────────────
        elseif ($heure >= 22) {
            if ($remaining < 10) {
                $conseils[] = [
                    'niveau'  => 'rouge',
                    'titre'   => 'Réserve insuffisante',
                    'message' => "Il vous reste {$remaining} requête(s). Les tâches automatiques de demain matin (génération 03h55 + scores 04h00) ont besoin d'au moins 10 requêtes. Ne faites plus rien.",
                ];
            } else {
                $conseils[] = [
                    'niveau'  => 'jaune',
                    'titre'   => 'Zone de réserve',
                    'message' => "Gardez au moins 10 requêtes pour les tâches automatiques de demain matin. Il vous en reste {$remaining} — vous avez une marge de " . ($remaining - 10) . " requête(s) utilisables ce soir.",
                ];
            }
        }

        // ── Zone sûre 04h–13h ─────────────────────────────────────
        else {
            if ($pct >= 70) {
                $conseils[] = [
                    'niveau'  => 'rouge',
                    'titre'   => 'Utilisation élevée avant les matchs',
                    'message' => "Vous avez consommé {$pct}% de votre quota avant même les matchs de l'après-midi (14h–22h). Arrêtez toute action non urgente et économisez les {$remaining} requêtes restantes pour les matchs.",
                ];
            } elseif ($pct >= 50) {
                $conseils[] = [
                    'niveau'  => 'jaune',
                    'titre'   => 'Rythme à surveiller',
                    'message' => "Vous avez utilisé {$pct}% avant les matchs." . ($intervalleStr ? " Espacez vos actions d'au moins {$intervalleStr} pour terminer la journée sans dépasser le quota." : " Ralentissez pour garder de la marge cet après-midi."),
                ];
            } else {
                $conseils[] = [
                    'niveau'  => 'vert',
                    'titre'   => 'Bon rythme',
                    'message' => "Vous êtes en zone sûre ({$pct}% utilisé)." . ($intervalleStr ? " Au rythme conseillé, attendez {$intervalleStr} entre chaque action pour conserver de la réserve pour les matchs de 14h–22h." : " Continuez normalement."),
                ];
            }
        }

        // ── Conseil général sur les détails de match ──────────────
        if ($pct >= 50 && $heure >= 4 && $heure < 22 && !$limiteAtteinte) {
            $conseils[] = [
                'niveau'  => 'info',
                'titre'   => 'Rappel économie',
                'message' => "Chaque section de détail de match (Résumé, Compositions, Forme, H2H) consomme 1 à 2 requêtes. Ouvrez uniquement les matchs vraiment importants pour vous.",
            ];
        }

        return $conseils;
    }

    // ─── POST /api/admin/matchs/vider-cache ──────────────────────
    public function viderCache(): JsonResponse
    {
        // Vider uniquement le cache live (forcer rechargement des données temps réel)
        // NE PAS utiliser Cache::flush() qui efface aussi les données des matchs
        // et le flag quota — ce qui provoquerait des appels API inutiles
        Cache::forget('apisports_live');

        // Vider aussi le cache d'aujourd'hui et des 2 jours suivants
        // pour forcer le rechargement des matchs récents
        $auj = now('Africa/Dakar');
        for ($i = 0; $i <= 2; $i++) {
            Cache::forget('apisports_date_' . $auj->copy()->addDays($i)->format('Y-m-d'));
        }

        Log::info('Cache live + jours récents vidé par admin');
        return response()->json(['message' => 'Cache actualisé. Les matchs du jour seront rechargés.']);
    }

    // ════════════════════════════════════════════════════════════
    // MÉTHODES PRIVÉES — Appels API-Sports
    // ════════════════════════════════════════════════════════════

    // Retourne null si limite atteinte (ne pas écraser le cache)
    // Retourne [] si vraiment aucun match
    // Retourne [...] si matchs trouvés
    private function fetchJour(string $cleApi, string $date): ?array
    {
        try {
            $rep = Http::timeout(15)
                ->withoutVerifying()
                ->withHeaders($this->headers())
                ->get(self::API . '/fixtures', [
                    'date'     => $date,
                    'timezone' => 'Africa/Dakar',
                ]);

            if ($rep->status() === 429) {
                $this->marquerLimiteAtteinte();
                return null;
            }

            if (!$rep->successful()) {
                Log::error("API-Sports: erreur {$rep->status()} pour $date");
                return null;
            }

            $data = $rep->json();

            // Détecter la limite quotidienne dans le corps de la réponse
            if (!empty($data['errors']['requests'])) {
                $this->marquerLimiteAtteinte();
                return null;
            }

            $fixtures = $data['response'] ?? [];
            $fixtures = $this->filtrerLigues($fixtures);
            usort($fixtures, fn($a, $b) => strcmp($a['fixture']['date'] ?? '', $b['fixture']['date'] ?? ''));
            return array_values(array_map(fn($f) => $this->formater($f), $fixtures));

        } catch (\Exception $e) {
            Log::error('API-Sports jour exception: ' . $e->getMessage());
            return null;
        }
    }

    private function fetchLive(string $cleApi): array
    {
        try {
            $rep = Http::timeout(15)
                ->withoutVerifying()
                ->withHeaders($this->headers())
                ->get(self::API . '/fixtures', [
                    'live'     => 'all',
                    'timezone' => 'Africa/Dakar',
                ]);

            if ($rep->status() === 429) {
                $this->marquerLimiteAtteinte();
                return [];
            }
            if (!$rep->successful()) return [];

            $data = $rep->json();
            if (!empty($data['errors']['requests'])) {
                $this->marquerLimiteAtteinte();
                return [];
            }

            $fixtures = $data['response'] ?? [];
            $fixtures = $this->filtrerLigues($fixtures);
            return array_values(array_map(fn($f) => $this->formater($f), $fixtures));

        } catch (\Exception $e) {
            Log::error('API-Sports live exception: ' . $e->getMessage());
            return [];
        }
    }

    // Filtrer les fixtures : uniquement ligues autorisées, exclure ligues féminines/jeunes
    private function filtrerLigues(array $fixtures): array
    {
        return array_filter($fixtures, function ($f) {
            $id  = (int)($f['league']['id'] ?? 0);
            $nom = strtolower($f['league']['name'] ?? '');

            // Exclure les ligues féminines et catégories jeunes
            $exclusions = ['women', 'femme', 'féminin', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23', 'reserve', 'b team'];
            foreach ($exclusions as $exclu) {
                if (str_contains($nom, $exclu)) return false;
            }

            return in_array($id, self::LIGUES_AUTORISEES);
        });
    }

    // Formater un fixture API-Sports vers notre structure frontend
    private function formater(array $f): array
    {
        $fix    = $f['fixture'] ?? [];
        $league = $f['league']  ?? [];
        $teams  = $f['teams']   ?? [];
        $goals  = $f['goals']   ?? [];
        $score  = $f['score']   ?? [];
        $status = $fix['status'] ?? [];

        $heure     = '--:--';
        $dateMatch = '';
        if (!empty($fix['date'])) {
            $dt = new \DateTime($fix['date']);
            $dt->setTimezone(new \DateTimeZone('Africa/Dakar'));
            $heure     = $dt->format('H:i');
            $dateMatch = $dt->format('Y-m-d');
        }

        $codeApi    = $status['short'] ?? '';
        $codeIntern = $this->mapStatut($codeApi);
        $minute     = null;
        if (in_array($codeIntern, ['IN_PLAY', 'PAUSED'])) {
            $minute = $status['elapsed'] ?? null;
        }

        return [
            'id'          => $fix['id'],
            'competition' => $this->normaliserNom($league['name'] ?? '', $league['country'] ?? ''),
            'comp_id'     => $league['id']      ?? null,
            'comp_logo'   => $league['logo']    ?? null,
            'comp_flag'   => $league['flag']    ?? null,
            'pays'        => $league['country'] ?? '',
            'domicile'    => $teams['home']['name'] ?? '',
            'exterieur'   => $teams['away']['name'] ?? '',
            'home_id'     => $teams['home']['id']   ?? null,
            'away_id'     => $teams['away']['id']   ?? null,
            'logo_dom'    => $teams['home']['logo']  ?? null,
            'logo_ext'    => $teams['away']['logo']  ?? null,
            'heure'       => $heure,
            'date'        => $dateMatch,
            'statut'      => $this->libelleStatut($codeApi),
            'statut_code' => $codeIntern,
            'minute'      => $minute,
            'score_dom'   => $goals['home'] ?? null,
            'score_ext'   => $goals['away'] ?? null,
            'mi_dom'      => $score['halftime']['home'] ?? null,
            'mi_ext'      => $score['halftime']['away'] ?? null,
        ];
    }

    // Codes API-Sports → codes internes frontend
    private function mapStatut(string $s): string
    {
        return match($s) {
            '1H','2H','ET','BT','P','LIVE' => 'IN_PLAY',
            'HT'                           => 'PAUSED',
            'FT','AET','PEN','AWD','WO'    => 'FINISHED',
            'NS','TBD'                     => 'SCHEDULED',
            'PST'                          => 'POSTPONED',
            'CANC','ABD','SUSP','INT'      => 'CANCELLED',
            default                        => 'SCHEDULED',
        };
    }

    // Libellés français des statuts
    private function libelleStatut(string $s): string
    {
        return match($s) {
            'NS','TBD'   => 'Prévu',
            '1H'         => '1ère mi-temps',
            'HT'         => 'Mi-temps',
            '2H'         => '2ème mi-temps',
            'ET'         => 'Prolongations',
            'BT'         => 'Avant prolongations',
            'P'          => 'Tirs au but',
            'FT'         => 'Terminé',
            'AET'        => 'Terminé (prol.)',
            'PEN'        => 'Terminé (t.a.b.)',
            'PST'        => 'Reporté',
            'CANC','ABD','SUSP','INT' => 'Annulé',
            'AWD','WO'   => 'Forfait',
            default      => $s,
        };
    }

    // Normalisation des noms de ligues API-Sports → noms d'affichage
    // $pays = country retourné par l'API (ex: "England", "France"…)
    private function normaliserNom(string $nom, string $pays = ''): string
    {
        $nom = trim($nom);

        // ── Règles basées sur le pays pour éviter les homonymes ──────
        // "Premier League" existe dans 50+ pays — on ne garde le nom court que pour l'Angleterre
        if ($nom === 'Premier League' && $pays !== 'England') {
            return "{$pays} Premier League";
        }
        // "Championship" : Angleterre seulement
        if ($nom === 'Championship' && $pays !== 'England') {
            return "{$pays} Championship";
        }
        // "Super League" : Grèce seulement (sinon homonymes avec Suisse, Chine…)
        if ($nom === 'Super League' && !in_array($pays, ['Greece', 'Grèce'])) {
            return "{$pays} Super League";
        }
        // "Primera División" — Espagne uniquement → La Liga, sinon préfixer
        if (in_array($nom, ['Primera División', 'Primera Division']) && $pays !== 'Spain') {
            return "{$pays} Primera División";
        }
        // "Premiership" : Écosse seulement
        if ($nom === 'Premiership' && $pays !== 'Scotland') {
            return "{$pays} Premiership";
        }
        // "Liga 1" : plusieurs pays (Roumanie, Pérou…) — on les laisse tels quels car non configurés
        // "Pro League" : Belgique seulement
        if ($nom === 'Pro League' && !in_array($pays, ['Belgium', 'Belgique'])) {
            return "{$pays} Pro League";
        }
        // "Serie A" : Italie seulement
        if ($nom === 'Serie A' && $pays !== 'Italy') {
            return "{$pays} Serie A";
        }
        // "Serie B" : Italie seulement
        if ($nom === 'Serie B' && $pays !== 'Italy') {
            return "{$pays} Serie B";
        }
        // "Bundesliga" : Allemagne seulement
        if ($nom === 'Bundesliga' && !in_array($pays, ['Germany', 'Allemagne'])) {
            return "{$pays} Bundesliga";
        }
        // "1. Liga" / "2. Liga" : générique → préfixer avec pays
        if (in_array($nom, ['1. Liga', '2. Liga']) && !in_array($pays, ['Germany', 'Austria', 'Switzerland'])) {
            return "{$pays} {$nom}";
        }

        return match($nom) {
            // Angleterre
            'Premier League'                               => 'Premier League',
            'Championship'                                 => 'Championship',
            'League One'                                   => 'League One',
            'League Two'                                   => 'League Two',
            'FA Cup'                                       => 'FA Cup',
            'League Cup', 'EFL Cup', 'Carabao Cup'        => 'League Cup',
            'Community Shield'                             => 'Community Shield',
            // Espagne
            'La Liga', 'Primera Division', 'Primera División' => 'La Liga',
            'Segunda División', 'Segunda Division',
            'LaLiga Hypermotion', 'LaLiga SmartBank'       => 'Segunda División',
            'Copa del Rey'                                 => 'Copa del Rey',
            'Supercopa de España'                          => 'Supercopa de España',
            // France
            'Ligue 1', 'Ligue 1 - Uber Eats'             => 'Ligue 1',
            'Ligue 2', 'Ligue 2 BKT'                     => 'Ligue 2',
            'Coupe De France', 'Coupe de France'          => 'Coupe de France',
            'Trophée Des Champions', 'Trophée des Champions' => 'Trophée des Champions',
            // Italie
            'Serie A'                                      => 'Serie A',
            'Serie B', 'Serie BKT'                        => 'Serie B',
            'Coppa Italia'                                 => 'Coppa Italia',
            'Supercoppa Italiana'                          => 'Supercoppa Italiana',
            // Allemagne
            'Bundesliga', '1. Bundesliga'                  => 'Bundesliga',
            '2. Bundesliga', 'Bundesliga II'               => '2. Bundesliga',
            'DFB Pokal'                                    => 'DFB Pokal',
            'DFL Supercup'                                 => 'DFL Supercup',
            // Portugal
            'Primeira Liga', 'Liga Portugal',
            'Liga Portugal Betclic'                        => 'Liga Portugal',
            'Liga Portugal 2', 'Segunda Liga'              => 'Liga Portugal 2',
            'Taça de Portugal', 'Taca de Portugal'        => 'Taça de Portugal',
            // Turquie
            'Süper Lig', 'Super Lig'                      => 'Super Lig',
            'TFF 1. Lig', '1. Lig', 'TFF First League'   => 'TFF 1. Lig',
            // Belgique
            'Belgian First Division A', 'Jupiler Pro League',
            'Pro League'                                   => 'Pro League',
            'Challenger Pro League', 'Proximus League'    => 'Challenger Pro League',
            // Pays-Bas
            'Eredivisie'                                   => 'Eredivisie',
            'Eerste Divisie', 'Keuken Kampioen Divisie'   => 'Eerste Divisie',
            // Grèce
            'Super League 1', 'Super League'              => 'Super League',
            'Super League 2'                              => 'Super League 2',
            // Écosse
            'Scottish Premiership', 'Premiership'         => 'Premiership',
            'Scottish Championship'                        => 'Scottish Championship',
            // UEFA
            'UEFA Champions League', 'Champions League'   => 'Champions League',
            'UEFA Europa League', 'Europa League'         => 'Europa League',
            'UEFA Europa Conference League',
            'Conference League'                            => 'Conference League',
            'UEFA Super Cup'                               => 'UEFA Super Cup',
            // Monde
            'World Cup'                                    => 'Coupe du Monde',
            'African Cup of Nations', 'Africa Cup of Nations',
            'AFCON'                                        => "Coupe d'Afrique (CAN)",
            // Brésil
            'Campeonato Brasileiro Série A',
            'Brasileiro Série A', 'Serie A'               => 'Brasileirao Série A',
            'Campeonato Brasileiro Série B',
            'Brasileiro Série B', 'Serie B'               => 'Brasileirao Série B',
            'Copa Do Brasil', 'Copa do Brasil'            => 'Copa do Brasil',
            // Amérique du Sud (API-Sports utilise "CONMEBOL" comme préfixe)
            'Copa Libertadores','CONMEBOL Libertadores'    => 'Copa Libertadores',
            'Copa Sudamericana','CONMEBOL Sudamericana'    => 'Copa Sudamericana',
            // États-Unis
            'Major League Soccer'                          => 'MLS',
            // Arabie Saoudite
            'Saudi Professional League',
            'Saudi Premier League'                         => 'Saudi Pro League',
            // Autres
            default                                        => $nom,
        };
    }
}
