<?php
// routes/console.php — Commandes Artisan définies via closures (optionnel)
// Les vraies commandes sont dans app/Console/Commands/
use Illuminate\Support\Facades\Artisan;

// Exemple de commande rapide (pas de fichier dédié nécessaire)
Artisan::command('trace:version', function () {
    $this->info('Trace FC v2 — Backend Laravel 11');
})->purpose('Affiche la version de Trace FC');
