<?php
// ============================================================
// Kernel.php — Planificateur automatique Trace FC
//
// Mise à jour automatique tous les jours à 04:00.
// L'admin peut aussi déclencher une mise à jour depuis l'interface.
//
// INSTALLATION CRON (une seule fois sur le serveur) :
// * * * * * cd /chemin/backend && php artisan schedule:run >> /dev/null 2>&1
// ============================================================
namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // Tâches définies dans bootstrap/app.php (Laravel 11)
        // Ce fichier Kernel.php est conservé uniquement pour charger les commandes Artisan.
    }

    protected function commands(): void
    {
        $this->load(__DIR__ . '/Commands');
        require base_path('routes/console.php');
    }
}
