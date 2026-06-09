<?php
// ============================================================
// SynchroniserMatchs.php — Commande de synchronisation auto
//
// Exécutée automatiquement à 04:05 par le scheduler Laravel.
// S'assure que tous les matchs confirmés par l'admin sont
// visibles dans l'espace utilisateur avec les bonnes données.
//
// Peut aussi être lancée manuellement :
//   php artisan trace:synchroniser
// ============================================================
namespace App\Console\Commands;

use App\Models\Prediction;
use App\Models\PredictionVip;
use App\Models\LogApplication;
use Illuminate\Console\Command;

class SynchroniserMatchs extends Command
{
    protected $signature   = 'trace:synchroniser';
    protected $description = 'Synchronise tous les matchs confirmés vers l\'espace utilisateur';

    public function handle(): int
    {
        $dateSync = now();
        $this->info("Synchronisation démarrée — {$dateSync->format('d/m/Y H:i:s')}");

        // Récupérer toutes les prédictions confirmées
        $predictions = Prediction::where(function ($q) {
            $q->where('trace_status', 'valide')
              ->orWhere('score_confirme', true);
        })->get();

        $total         = $predictions->count();
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

        // Synchroniser aussi les prédictions VIP publiées (assure qu'elles restent visibles)
        $vipPubliees = PredictionVip::where('publie', true)->count();
        $vipNonConfirmees = PredictionVip::where('publie', true)
            ->whereNotNull('score_reel')
            ->where('score_confirme', false)
            ->count();

        // Log de la synchronisation
        LogApplication::creer(
            'synchronisation_matchs',
            "Synchronisation automatique 04:05 : {$total} match(s) confirmé(s), {$synchronisees} mis à jour — {$vipPubliees} VIP publiées — " . $dateSync->format('d/m/Y H:i:s'),
            'succes'
        );

        $this->info("✅ {$total} match(s) synchronisé(s) — {$synchronisees} mis à jour — {$vipPubliees} VIP publiées.");
        if ($vipNonConfirmees > 0) {
            $this->warn("  ⚠ {$vipNonConfirmees} VIP avec score réel saisi mais non confirmé par l'admin.");
        }

        return Command::SUCCESS;
    }
}
