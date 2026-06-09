<?php
// ============================================================
// GenererTracesJour.php — Génération automatique à 03:55
//
// À 03:55 chaque jour (avant la mise à jour des scores à 04:00),
// ce script récupère tous les matchs du jour via l'API-Sports
// et génère un tracé complet pour chaque match sans prédiction.
//
// Les tracés sont auto-confirmés (score_confirme=true, trace_status='valide')
// → visibles immédiatement côté utilisateur.
// ============================================================
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Prediction;
use App\Models\PredictionVip;
use App\Models\LogApplication;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenererTracesJour extends Command
{
    protected $signature   = 'trace:generer-matchs {--date= : Date YYYY-MM-DD (défaut: aujourd\'hui Dakar)}';
    protected $description = 'Génère automatiquement les tracés pour les matchs du jour (planifié 03:55)';

    private const API_SPORTS = 'https://v3.football.api-sports.io';

    // 16 maisons avec témoins, positions puissantes et très puissantes
    private const MAISONS = [
        ['nom'=>'Youssou',        'temoin'=>'Makhdiyou',      'd'=>[1,1,2,1], 'p'=>[1,5,9,13],         'tp'=>[2,6,10,14]],
        ['nom'=>'Adama',          'temoin'=>'Idriss',         'd'=>[1,2,2,2], 'p'=>[1,5,9,13],         'tp'=>[2,6,10,14]],
        ['nom'=>'Makhdiyou',      'temoin'=>'Ibrahima',       'd'=>[2,1,1,1], 'p'=>[2,6,10,14],        'tp'=>[1,5,9,13]],
        ['nom'=>'Idriss',         'temoin'=>'Imsa',           'd'=>[2,2,1,2], 'p'=>[3,7,11,15],        'tp'=>[4,8,12,16]],
        ['nom'=>'Ibrahima',       'temoin'=>'Omar',           'd'=>[1,1,1,1], 'p'=>[3,5,7,11,15],      'tp'=>[4,8,12,16]],
        ['nom'=>'Imsa',           'temoin'=>'Ayouba',         'd'=>[1,2,1,2], 'p'=>[3,6,7,11,15],      'tp'=>[4,8,12,16]],
        ['nom'=>'Omar',           'temoin'=>'Allahou Talla',  'd'=>[2,1,2,2], 'p'=>[2,6,10,14],        'tp'=>[1,5,9,13]],
        ['nom'=>'Ayouba',         'temoin'=>'Souleymane',     'd'=>[2,2,2,1], 'p'=>[4,8,12,16],        'tp'=>[3,7,11,15]],
        ['nom'=>'Allahou Talla',  'temoin'=>'Alioune Badara', 'd'=>[1,1,2,2], 'p'=>[1,5,9,13],         'tp'=>[2,6,10,14]],
        ['nom'=>'Souleymane',     'temoin'=>'Noukh',          'd'=>[1,2,2,1], 'p'=>[4,8,10,12,16],     'tp'=>[3,7,11,15]],
        ['nom'=>'Alioune Badara', 'temoin'=>'Assane',         'd'=>[2,1,1,2], 'p'=>[2,6,10,14],        'tp'=>[1,5,9,13]],
        ['nom'=>'Noukh',          'temoin'=>'Younouss',       'd'=>[2,2,1,1], 'p'=>[4,8,12,16],        'tp'=>[3,7,11,15]],
        ['nom'=>'Assane',         'temoin'=>'Ousmane',        'd'=>[1,1,1,2], 'p'=>[3,7,11,15],        'tp'=>[4,8,12,16]],
        ['nom'=>'Younouss',       'temoin'=>'Moussa',         'd'=>[1,2,1,1], 'p'=>[4,8,12,16],        'tp'=>[3,7,11,15]],
        ['nom'=>'Ousmane',        'temoin'=>'Youssou',        'd'=>[2,1,2,1], 'p'=>[2,6,10,14],        'tp'=>[1,5,9,13]],
        ['nom'=>'Moussa',         'temoin'=>'Adama',          'd'=>[2,2,2,2], 'p'=>[1,5,9,13],         'tp'=>[2,6,10,14]],
    ];

    private const CAPS = [[11,16,21,26],[31,36,41,46],[51,56,61,66],[71,76,81,86]];
    private const ZONE_DOM = [1,2,3,4,9,10,13,15,16];

    // Ligues autorisées (grands championnats + UEFA)
    private const LIGUES = [2,3,39,40,45,48,61,62,66,78,79,81,88,89,90,94,95,135,136,137,140,141,143,144,145,146,197,198,203,204,253,307,848,531];

    // ════════════════════════════════════════════════════════════
    // ALGORITHME DU TRACÉ (port PHP fidèle du TraceUseCases.js)
    // ════════════════════════════════════════════════════════════

    private function calcReste(int $n): int { return $n % 2 === 0 ? 2 : 1; }
    private function addPts(int $a, int $b): int { return $a === $b ? 2 : 1; }

    private function addMaison(array $ma, array $mb): array {
        return [
            $this->addPts($ma[0], $mb[0]),
            $this->addPts($ma[1], $mb[1]),
            $this->addPts($ma[2], $mb[2]),
            $this->addPts($ma[3], $mb[3]),
        ];
    }

    private function genererTraceAlea(): array {
        $prev = 0; $pts = [];
        foreach (self::CAPS as $bi => $row) {
            foreach ($row as $li => $cap) {
                $min = max($prev + 1, ($bi === 0 && $li === 0) ? 7 : $prev + 1);
                $val = $min > $cap ? $min : rand($min, $cap);
                $pts[] = $val; $prev = $val;
            }
        }
        return $pts;
    }

    private function calculerDispositions(array $pts): array {
        $X = array_map(fn($n) => $this->calcReste($n), $pts);
        $M1 = [$X[0],$X[1],$X[2],$X[3]];
        $M2 = [$X[4],$X[5],$X[6],$X[7]];
        $M3 = [$X[8],$X[9],$X[10],$X[11]];
        $M4 = [$X[12],$X[13],$X[14],$X[15]];
        $M5 = [$X[0],$X[4],$X[8],$X[12]];
        $M6 = [$X[1],$X[5],$X[9],$X[13]];
        $M7 = [$X[2],$X[6],$X[10],$X[14]];
        $M8 = [$X[3],$X[7],$X[11],$X[15]];
        $M9  = $this->addMaison($M1, $M2);
        $M10 = $this->addMaison($M3, $M4);
        $M11 = $this->addMaison($M5, $M6);
        $M12 = $this->addMaison($M7, $M8);
        $M13 = $this->addMaison($M9, $M10);
        $M14 = $this->addMaison($M11, $M12);
        $M15 = $this->addMaison($M13, $M14);
        $M16 = $this->addMaison($M1, $M15);
        return [$M1,$M2,$M3,$M4,$M5,$M6,$M7,$M8,$M9,$M10,$M11,$M12,$M13,$M14,$M15,$M16];
    }

    private function identifierMaison(array $d): ?array {
        foreach (self::MAISONS as $m) {
            if ($m['d'] === $d) return $m;
        }
        return null;
    }

    private function zonePos(int $pos): string {
        return in_array($pos, self::ZONE_DOM) ? 'domicile' : 'exterieur';
    }

    private function niveauPuissance(array $m, int $pos): string {
        if (in_array($pos, $m['tp'])) return 'tres_puissant';
        if (in_array($pos, $m['p']))  return 'puissant';
        return 'normal';
    }

    private function verifierV1(array $disp): array {
        $toutes   = array_map(fn($d) => $this->identifierMaison($d), $disp);
        $maisonM1 = $toutes[0];
        if (!$maisonM1) return ['valide'=>false,'maisonM1'=>null,'temoin'=>null,'temoinPresent'=>false];
        $temoin   = $maisonM1['temoin'];
        $noms     = array_unique(array_filter(array_map(fn($m) => $m ? $m['nom'] : null, $toutes)));
        $present  = in_array($temoin, $noms);
        return ['valide'=>$present,'maisonM1'=>$maisonM1['nom'],'temoin'=>$temoin,'temoinPresent'=>$present];
    }

    private function verifierV2(array $disp): array {
        $MA = $this->addMaison($disp[2], $disp[4]);    // M3 + M5
        $MB = $this->addMaison($disp[10], $disp[14]);  // M11 + M15
        $MC = $this->addMaison($MA, $MB);
        $mcConnue = false;
        foreach ($disp as $d) {
            if ($d === $MC) { $mcConnue = true; break; }
        }
        return ['valide'=>$mcConnue,'MA'=>$MA,'MB'=>$MB,'MC'=>$MC,'mcConnue'=>$mcConnue];
    }

    private function analyserDispositions(array $disp): array {
        $placees = [];
        foreach ($disp as $idx => $d) {
            $pos     = $idx + 1;
            $maison  = $this->identifierMaison($d);
            $zone    = $this->zonePos($pos);
            $puis    = $maison ? $this->niveauPuissance($maison, $pos) : 'normal';
            $placees[] = ['position'=>$pos,'maison'=>$maison,'zone'=>$zone,'puissance'=>$puis,'disposition'=>$d];
        }

        $sols    = array_values(array_filter($placees, fn($mp) => $mp['maison']&&$mp['maison']['nom']==='Souleymane'));
        $imsas   = array_values(array_filter($placees, fn($mp) => $mp['maison']&&$mp['maison']['nom']==='Imsa'));
        $youssou = array_values(array_filter($placees, fn($mp) => $mp['maison']&&$mp['maison']['nom']==='Youssou'));
        $makhd   = array_values(array_filter($placees, fn($mp) => $mp['maison']&&$mp['maison']['nom']==='Makhdiyou'));

        // Score par Souleymane : DOM zone → ext marque; EXT zone → dom marque
        $dom = 0; $ext = 0;
        foreach ($sols as $mp) {
            if ($mp['zone'] === 'domicile') $ext++;
            else                            $dom++;
        }

        $imsaCount = count($imsas);
        $imsaDom   = count(array_filter($imsas, fn($im) => $im['zone']==='domicile'));
        $imsaExt   = count(array_filter($imsas, fn($im) => $im['zone']==='exterieur'));
        $youM1     = count(array_filter($youssou, fn($y) => $y['position']===1)) > 0;
        $mkPresent = count($makhd) > 0;

        // Youssou en M1 + Makhdiyou → minimum 1-1
        if ($youM1 && $mkPresent && count($sols) === 0) {
            $dom = max($dom, 1); $ext = max($ext, 1);
        }
        $solDom = count(array_filter($sols, fn($s) => $s['zone']==='domicile')) > 0;
        $solExt = count(array_filter($sols, fn($s) => $s['zone']==='exterieur')) > 0;
        if ($youM1 && $mkPresent && $solDom && $solExt) {
            $dom = max($dom, 1); $ext = max($ext, 1);
        }

        return [
            'maisonsPlacees'    => $placees,
            'souleymanes'       => $sols,
            'dom'               => $dom,
            'ext'               => $ext,
            'scorePrincipal'    => "{$dom}-{$ext}",
            'imsaCount'         => $imsaCount,
            'imsaDom'           => $imsaDom,
            'imsaExt'           => $imsaExt,
            'youssouEnM1'       => $youM1,
            'hasSouleymane'     => count($sols) > 0,
            'scoresAlternatifs' => [
                ($dom+1)."-{$ext}",
                "{$dom}-".($ext+1),
                max(0,$dom-1)."-{$ext}",
            ],
        ];
    }

    private function genererCombinaisons(array $a, bool $concordance = false): array {
        $dom   = $a['dom']; $ext = $a['ext']; $total = $dom + $ext;
        $imsaC = $a['imsaCount']; $iDom = $a['imsaDom']; $iExt = $a['imsaExt'];
        $you   = $a['youssouEnM1'];

        $seulDom  = $iDom > 0 && $iExt === 0;
        $seulExt  = $iExt > 0 && $iDom === 0;
        $deuxZ    = $iDom > 0 && $iExt > 0;
        $deuxEq   = $you || $deuxZ || ($dom > 0 && $ext > 0);

        $combis = [];

        if ($dom > $ext)
            $combis[] = ['label'=>'V1',   'desc'=>'Victoire équipe domicile',       'couleur'=>'#2e7d32', 'score'=>55+min(($dom-$ext)*12,30)+($seulDom?10:0)];
        if ($seulDom || $dom >= $ext)
            $combis[] = ['label'=>'1X',   'desc'=>'Domicile ne perd pas',           'couleur'=>'#43a047', 'score'=>$seulDom?70:45+min(($dom-$ext)*8,20)];
        if ($ext > $dom)
            $combis[] = ['label'=>'V2',   'desc'=>'Victoire équipe extérieur',      'couleur'=>'#1565c0', 'score'=>55+min(($ext-$dom)*12,30)+($seulExt?10:0)];
        if ($seulExt || $ext >= $dom)
            $combis[] = ['label'=>'2X',   'desc'=>'Extérieur ne perd pas',          'couleur'=>'#1976d2', 'score'=>$seulExt?70:45+min(($ext-$dom)*8,20)];
        if ($deuxEq)
            $combis[] = ['label'=>'2EM',  'desc'=>'Les deux équipes marquent',      'couleur'=>'#7b1fa2', 'score'=>65+($you?15:0)+($deuxZ?10:0)];
        if ($imsaC >= 3 || $total >= 3)
            $combis[] = ['label'=>'+2,5', 'desc'=>'Plus de 2,5 buts',              'couleur'=>'#e65100', 'score'=>60+min($imsaC*5,20)];
        if ($imsaC >= 2 || $total >= 2)
            $combis[] = ['label'=>'+1,5', 'desc'=>'Plus de 1,5 buts',              'couleur'=>'#f57c00', 'score'=>65+min($imsaC*5,20)];
        if ($imsaC === 0 && $total < 3)
            $combis[] = ['label'=>'-2,5', 'desc'=>'Moins de 3 buts (match fermé)', 'couleur'=>'#7c3aed', 'score'=>70];

        usort($combis, fn($a,$b) => $b['score'] - $a['score']);

        $result = []; $dcVu = false;
        foreach ($combis as $c) {
            if ($c['label'] === '1X' || $c['label'] === '2X') {
                if ($dcVu) continue; $dcVu = true;
            }
            unset($c['score']);
            $result[] = $c;
            if (count($result) >= 3) break;
        }

        if (empty($result))
            $result[] = ['label'=>$dom>=$ext?'1X':'2X', 'desc'=>'Signal tracé automatique', 'couleur'=>'#64748b'];

        return $result;
    }

    private function genererInterpretation(array $a): string {
        $dom = $a['dom']; $ext = $a['ext'];
        $lines = ["Tracé automatique 03h55 — score prédit : {$dom}-{$ext}"];
        if ($a['imsaCount'] > 0) $lines[] = "{$a['imsaCount']} Imsa — signal buts jubilé.";
        if ($a['youssouEnM1'])   $lines[] = "Youssou en M1 : les deux équipes marquent.";
        $nbSol = count($a['souleymanes']);
        if ($nbSol > 0)          $lines[] = "{$nbSol} Souleymane(s) — chaque un = 1 but.";
        return implode("\n", $lines);
    }

    // Génère un tracé unique (1 essai, accepté tel quel)
    private function genererUnTrace(): array {
        $pts  = $this->genererTraceAlea();
        $disp = $this->calculerDispositions($pts);
        $v1   = $this->verifierV1($disp);
        $v2   = $this->verifierV2($disp);
        $a    = $this->analyserDispositions($disp);
        return [
            'dispositions'   => $disp,
            'analyse'        => $a,
            'v1'             => $v1,
            'v2'             => $v2,
            'traceAcceptable'=> $v1['valide'],                    // V1 seul suffit
            'traceSolide'    => $v1['valide'] && $v2['valide'],   // V1+V2 renforcé
            'traceValide'    => $v1['valide'] && $v2['valide'],
        ];
    }

    // T1 + T2 : 1 essai chacun, sans boucle
    private function genererTraceComplet(): array {
        $t1 = $this->genererUnTrace();
        $t2 = $this->genererUnTrace();
        $concordance = $t1['analyse']['scorePrincipal'] === $t2['analyse']['scorePrincipal'];
        return ['t1' => $t1, 't2' => $t2, 'concordance' => $concordance];
    }

    // ════════════════════════════════════════════════════════════
    // COMMANDE PRINCIPALE
    // ════════════════════════════════════════════════════════════

    public function handle(): int
    {
        $heure = now('Africa/Dakar')->format('H:i');
        $date  = $this->option('date') ?: now('Africa/Dakar')->format('Y-m-d');

        $this->info("[{$heure}] Génération auto tracés pour le {$date}...");
        LogApplication::creer('generation_traces_auto', "Démarrage génération — {$date} à {$heure}", 'info');

        $matchs = $this->obtenirMatchsDuJour($date);

        if (empty($matchs)) {
            $msg = "Aucun match disponible pour le {$date}";
            $this->info($msg);
            LogApplication::creer('generation_traces_auto', $msg, 'info');
            return Command::SUCCESS;
        }

        // Exclure les matchs qui ont déjà un tracé
        $sans = array_values(array_filter($matchs, function ($m) {
            return !Prediction::where('match_id', (string)($m['id'] ?? ''))->exists();
        }));

        $this->info(count($matchs)." match(s) — ".count($sans)." sans tracé");

        if (empty($sans)) {
            $msg = "Tous les matchs du {$date} ont déjà un tracé.";
            $this->info($msg);
            LogApplication::creer('generation_traces_auto', $msg, 'info');
            return Command::SUCCESS;
        }

        $generes = 0; $erreurs = 0;

        foreach ($sans as $match) {
            try {
                $result      = $this->genererTraceComplet();
                $t1          = $result['t1'];
                $t2          = $result['t2'];
                $concordance = $result['concordance'];
                $traceAccept = $t1['traceAcceptable'];
                $a           = $t1['analyse'];
                $combis      = $this->genererCombinaisons($a, $concordance);
                $interp      = $this->genererInterpretation($a);

                Prediction::create([
                    'match_id'           => (string)($match['id'] ?? ''),
                    'competition'        => $match['competition'] ?? '',
                    'domicile'           => $match['domicile']   ?? '',
                    'exterieur'          => $match['exterieur']  ?? '',
                    'date'               => $match['date']       ?? $date,
                    'heure'              => $match['heure']      ?? '--:--',
                    'logo_dom'           => $match['logo_dom']   ?? null,
                    'logo_ext'           => $match['logo_ext']   ?? null,
                    'score_prevu'        => $a['scorePrincipal'],
                    'scores_alternatifs' => $a['scoresAlternatifs'],
                    'interpretation'     => $interp,
                    'combinaisons'       => $combis,
                    'maisons_placees'    => $a['maisonsPlacees'],
                    'verification'       => [
                        'trace1' => [
                            'v1'             => $t1['v1'],
                            'v2'             => $t1['v2'],
                            'traceValide'    => $t1['traceValide'],
                            'maisonsPlacees' => $a['maisonsPlacees'],
                        ],
                        'trace2' => [
                            'v1'             => $t2['v1'],
                            'v2'             => $t2['v2'],
                            'traceValide'    => $t2['traceValide'],
                            'maisonsPlacees' => $t2['analyse']['maisonsPlacees'],
                        ],
                        'concordance'    => $concordance,
                        'traceAcceptable'=> $traceAccept,
                        'statut'         => $concordance ? 'certifie' : 'a_confirmer',
                        'genere_auto_4h' => true,
                    ],
                    'trace_status'      => $concordance ? 'certifie' : 'trace1',
                    'score_confirme'    => $concordance,
                    'score_confirme_le' => $concordance ? now() : null,
                ]);

                $generes++;
                $tag = $concordance ? '✓✓' : '✓';
                $this->line("  {$tag} {$match['domicile']} vs {$match['exterieur']} → {$a['scorePrincipal']}");

            } catch (\Exception $e) {
                $erreurs++;
                $this->error("  ✗ {$match['domicile']} vs {$match['exterieur']} : {$e->getMessage()}");
                LogApplication::creer('erreur_generation', "Erreur {$match['domicile']} vs {$match['exterieur']} : {$e->getMessage()}", 'erreur');
            }

            usleep(30000); // 30ms entre tracés
        }

        // Générer les prédictions VIP automatiquement
        $vipGeneres = 0;
        if ($generes > 0) {
            $vipGeneres = $this->genererVipAutomatiques($date);
            if ($vipGeneres > 0) {
                $this->info("  🌟 {$vipGeneres} prédiction(s) VIP auto-générée(s).");
            }
        }

        $msg = "{$generes} tracé(s) généré(s) automatiquement pour le {$date}" .
               ($vipGeneres > 0 ? " — {$vipGeneres} VIP" : '') .
               ($erreurs > 0 ? " — {$erreurs} erreur(s)" : '');
        $this->info("✅ {$msg}");
        LogApplication::creer('generation_traces_auto', $msg, $erreurs > 0 ? 'erreur' : 'succes');

        return Command::SUCCESS;
    }

    // ── Génération automatique des prédictions VIP ────────────────
    // Règles : 1 match → 1 VIP | 2-5 matchs → 2 VIP | 6+ matchs → moitié
    // Priorité de sélection : concordance T1/T2 en premier
    private function genererVipAutomatiques(string $date): int
    {
        // Toutes les prédictions générées ce jour (avec flag genere_auto_4h)
        $toutes = Prediction::where('date', $date)
            ->where('verification', 'like', '%genere_auto_4h%')
            ->get();

        if ($toutes->isEmpty()) return 0;

        // Grouper par championnat
        $parChamp = [];
        foreach ($toutes as $pred) {
            $champ = $pred->competition ?: 'Autre';
            $parChamp[$champ][] = $pred;
        }

        $vipGeneres = 0;

        foreach ($parChamp as $champ => $preds) {
            $n = count($preds);

            // Règle de sélection du nombre de VIP par championnat
            if ($n === 1)    $nbVip = 1;
            elseif ($n <= 5) $nbVip = 2;
            else             $nbVip = (int) floor($n / 2);

            // Priorité : concordance T1/T2 d'abord, puis total buts décroissant
            usort($preds, function ($a, $b) {
                $ac = $a->verification['concordance'] ?? false;
                $bc = $b->verification['concordance'] ?? false;
                if ($ac !== $bc) return $bc <=> $ac;
                $ap = array_sum(array_map('intval', explode('-', $a->score_prevu ?? '0-0')));
                $bp = array_sum(array_map('intval', explode('-', $b->score_prevu ?? '0-0')));
                return $bp <=> $ap;
            });

            $selectionnes = array_slice($preds, 0, $nbVip);

            foreach ($selectionnes as $pred) {
                // Ne pas dupliquer si un VIP existe déjà pour ce match
                if (PredictionVip::where('match_id', $pred->match_id)->exists()) continue;

                PredictionVip::create([
                    'match_id'           => $pred->match_id,
                    'competition'        => $pred->competition,
                    'domicile'           => $pred->domicile,
                    'exterieur'          => $pred->exterieur,
                    'date'               => $pred->date,
                    'heure'              => $pred->heure,
                    'score_exact_predit' => $pred->score_prevu,
                    'publie'             => true,
                    'score_confirme'     => false,
                    'logo_dom'           => $pred->logo_dom,
                    'logo_ext'           => $pred->logo_ext,
                ]);

                $conc = ($pred->verification['concordance'] ?? false) ? ' [concordance]' : '';
                $this->line("  🌟 VIP {$champ} : {$pred->domicile} vs {$pred->exterieur} → {$pred->score_prevu}{$conc}");
                $vipGeneres++;
            }
        }

        if ($vipGeneres > 0) {
            LogApplication::creer(
                'generation_vip_auto',
                "{$vipGeneres} prédiction(s) VIP générée(s) automatiquement pour le {$date}",
                'succes'
            );
        }

        return $vipGeneres;
    }

    // ── Récupère les matchs du jour (cache prioritaire) ───────────
    private function obtenirMatchsDuJour(string $date): array
    {
        $cacheKey = "apisports_date_{$date}";
        $cached   = Cache::get($cacheKey);

        if ($cached !== null) {
            $this->info("  ".count($cached)." match(s) depuis le cache.");
            return $cached;
        }

        $cleApi = env('FOOTBALL_APISPORTS_KEY', '');
        if (empty($cleApi)) {
            $this->warn("  FOOTBALL_APISPORTS_KEY manquante dans .env");
            return [];
        }

        try {
            $rep = Http::timeout(20)
                ->withoutVerifying()
                ->withHeaders(['x-apisports-key' => $cleApi])
                ->get(self::API_SPORTS . '/fixtures', [
                    'date'     => $date,
                    'timezone' => 'Africa/Dakar',
                ]);

            if ($rep->status() === 429) {
                $this->warn("  Quota API-Sports épuisé.");
                return [];
            }
            if (!$rep->successful()) {
                $this->warn("  API-Sports: HTTP {$rep->status()}");
                return [];
            }

            $data     = $rep->json();
            $fixtures = $data['response'] ?? [];

            // Filtrer les ligues autorisées
            $fixtures = array_filter($fixtures, fn($f) => in_array((int)($f['league']['id']??0), self::LIGUES));
            // Exclure ligues féminines/jeunes
            $exclus   = ['women','femme','u17','u18','u19','u20','u21','u23','reserve','b team'];
            $fixtures = array_filter($fixtures, function ($f) use ($exclus) {
                $nom = strtolower($f['league']['name'] ?? '');
                foreach ($exclus as $x) { if (str_contains($nom, $x)) return false; }
                return true;
            });

            $matchs = array_values(array_map(fn($f) => $this->formaterMatch($f), $fixtures));
            Cache::put($cacheKey, $matchs, 86400);
            $this->info("  ".count($matchs)." match(s) récupérés via API.");
            return $matchs;

        } catch (\Exception $e) {
            Log::error('GenererTracesJour: ' . $e->getMessage());
            $this->error("  Erreur API: {$e->getMessage()}");
            return [];
        }
    }

    private function formaterMatch(array $f): array
    {
        $fix = $f['fixture'] ?? []; $league = $f['league'] ?? []; $teams = $f['teams'] ?? [];
        $heure = '--:--'; $dateM = '';
        if (!empty($fix['date'])) {
            $dt = new \DateTime($fix['date']);
            $dt->setTimezone(new \DateTimeZone('Africa/Dakar'));
            $heure = $dt->format('H:i');
            $dateM = $dt->format('Y-m-d');
        }
        return [
            'id'         => $fix['id'] ?? null,
            'competition'=> $league['name'] ?? '',
            'domicile'   => $teams['home']['name'] ?? '',
            'exterieur'  => $teams['away']['name'] ?? '',
            'heure'      => $heure,
            'date'       => $dateM,
            'logo_dom'   => $teams['home']['logo'] ?? null,
            'logo_ext'   => $teams['away']['logo'] ?? null,
        ];
    }
}
