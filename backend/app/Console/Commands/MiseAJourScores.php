<?php
// ============================================================
// MiseAJourScores.php — Commande automatique du scheduler
//
// NE PAS appeler manuellement — le système s'en charge seul.
// Déclenchement : tous les jours à 04:00 via le Kernel.php
//
// Ce que fait cette commande à 04:00 :
//   1. Cherche tous les tracés sans score réel (matchs passés)
//   2. Appelle l'API football pour chaque match
//   3. Enregistre le score réel en base (statut : en attente de confirmation)
//   4. Journalise le résultat dans storage/logs/mise-a-jour-4h.log
//
// L'admin voit ensuite les scores dans la section "Confirmer scores"
// pour certifier que le tracé a bien prédit le bon résultat.
// ============================================================
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Prediction;
use App\Models\PredictionVip;
use App\Models\LogApplication;
use Illuminate\Support\Facades\Http;

class MiseAJourScores extends Command
{
    protected $signature   = 'trace:mise-a-jour {--key= : Clé API football-data.org (optionnel, priorité sur .env)}';
    protected $description = 'Mise à jour automatique des scores à 04:00 ou déclenchement manuel admin';

    public function handle(): int
    {
        $heure = now()->format('H:i');
        $this->info("[{$heure}] Mise à jour automatique des tracés démarrée...");

        LogApplication::creer(
            'mise_a_jour_auto',
            "Démarrage automatique à {$heure} (planifié 04:00)",
            'info'
        );

        // Chercher les prédictions sans score réel pour les matchs passés
        $predictions = Prediction::whereNull('score_reel')
            ->where('date', '<=', now()->format('Y-m-d'))
            ->get();

        if ($predictions->isEmpty()) {
            $this->info('Aucun match à mettre à jour.');
            LogApplication::creer('mise_a_jour_auto', 'Aucun match sans score réel à traiter.', 'info');
            return Command::SUCCESS;
        }

        // Priorité : clé passée via --key (déclenchement manuel) sinon clé du .env (cron 4h)
        $cleApi    = $this->option('key') ?: env('FOOTBALL_API_KEY', '');
        $miseAJour = 0;
        $erreurs   = 0;

        foreach ($predictions as $pred) {
            if (empty($cleApi)) {
                $this->warn("  ⚠ Clé API manquante — configurez FOOTBALL_API_KEY dans .env ou renseignez-la dans l'interface admin");
                LogApplication::creer('erreur_api', 'Clé API manquante — mise à jour impossible', 'erreur');
                return Command::FAILURE;
            }

            try {
                // Appel à football-data.org pour récupérer le score du match
                // withoutVerifying() : contourne le problème SSL sur serveur Windows
                $r = Http::timeout(10)
                    ->withoutVerifying()
                    ->withHeaders(['X-Auth-Token' => $cleApi])
                    ->get("https://api.football-data.org/v4/matches/{$pred->match_id}");

                if ($r->successful()) {
                    $data  = $r->json();
                    $score = $data['score'] ?? null;

                    // Ne traiter que les matchs terminés
                    if (($data['status'] ?? '') === 'FINISHED' && $score) {
                        $dom = $score['fullTime']['home'] ?? null;
                        $ext = $score['fullTime']['away'] ?? null;

                        if ($dom !== null && $ext !== null) {
                            $scoreReel = "{$dom}-{$ext}";

                            // Extraire les moments des buts pour comparaison avec le tracé
                            $buts = [];
                            foreach ($data['goals'] ?? [] as $g) {
                                $buts[] = [
                                    'minute'  => $g['minute'] ?? null,
                                    'equipe'  => ($g['team']['name'] ?? ''),
                                    'buteur'  => ($g['scorer']['name'] ?? ''),
                                    'type'    => $g['type'] ?? 'Normal',
                                ];
                            }

                            // Préserver la vérification existante et ajouter les buts réels
                            $verification = is_array($pred->verification) ? $pred->verification : [];
                            $verification['buts_reel']   = $buts;
                            $verification['score_reel']  = $scoreReel;
                            $verification['recupere_4h'] = true;

                            // Auto-confirmer directement — pas besoin de validation manuelle
                            $pred->update([
                                'score_reel'        => $scoreReel,
                                'score_confirme'    => true,
                                'score_confirme_le' => now(),
                                'verification'      => $verification,
                            ]);

                            // Évaluer et sauvegarder l'état vert/rouge de chaque combinaison
                            $pred->mettreAJourEtatCombis($scoreReel);

                            // Mettre à jour le score VIP associé si existant et non encore renseigné
                            $vip = PredictionVip::where('match_id', $pred->match_id)->first();
                            if ($vip && !$vip->score_reel) {
                                $vip->update(['score_reel' => $scoreReel]);
                                $this->line("  🌟 VIP score mis à jour : {$pred->domicile} vs {$pred->exterieur} → {$scoreReel}");
                            }

                            $miseAJour++;

                            $nbButs = count($buts);
                            $this->line("  ✓ #{$pred->id} {$pred->domicile} vs {$pred->exterieur} → {$scoreReel} ({$nbButs} but(s))");

                            LogApplication::creer(
                                'score_recupere',
                                "{$pred->domicile} vs {$pred->exterieur} → {$scoreReel} — {$nbButs} but(s) enregistré(s) (auto 04h)",
                                'info'
                            );
                        }
                    }
                }

                // Respecter la limite de l'API gratuite (10 req/min)
                usleep(200000); // pause 200ms entre chaque appel

            } catch (\Exception $e) {
                $erreurs++;
                $this->error("  ✗ #{$pred->id} : " . $e->getMessage());
                LogApplication::creer('erreur_api', "Erreur match #{$pred->id} : " . $e->getMessage(), 'erreur');
            }
        }

        // Résumé dans le journal
        $msg = "{$miseAJour} score(s) récupéré(s) automatiquement à 04:00" .
               ($erreurs > 0 ? " — {$erreurs} erreur(s)" : '');

        $this->info($msg);
        LogApplication::creer('mise_a_jour_auto', $msg, $erreurs > 0 ? 'erreur' : 'succes');

        return Command::SUCCESS;
    }
}
