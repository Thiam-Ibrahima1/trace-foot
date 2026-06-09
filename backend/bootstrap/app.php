<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// Point d'entrée de Laravel — configure l'application
return Application::configure(basePath: dirname(__DIR__))

    // Déclare les routes API (préfixe /api)
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api',
    )

    ->withMiddleware(function (Middleware $middleware) {

        // Enregistre le middleware qui protège les routes admin
        $middleware->alias([
            'admin.seulement' => \App\Http\Middleware\AdminSeulement::class,
        ]);

        // Supprime le middleware de session Sanctum
        // On utilise Bearer tokens, pas les cookies de session
        
        $middleware->api(remove: [
            \Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        ]);
    })

    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule) {
        // 03:55 Dakar — Génère les tracés + VIP pour tous les matchs du jour
        $schedule->command('trace:generer-matchs')
            ->dailyAt('03:55')
            ->timezone('Africa/Dakar')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/generation-3h55.log'));

        // 04:00 Dakar — Récupère les scores réels des matchs terminés
        $schedule->command('trace:mise-a-jour')
            ->dailyAt('04:00')
            ->timezone('Africa/Dakar')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/mise-a-jour-4h.log'));

        // 04:05 Dakar — Synchronise les matchs confirmés vers l'espace utilisateur
        $schedule->command('trace:synchroniser')
            ->dailyAt('04:05')
            ->timezone('Africa/Dakar')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/synchronisation-4h05.log'));

        // 04:10 Dakar — Supprime les tokens expirés (nettoyage base de données)
        $schedule->command('sanctum:prune-expired', ['--hours' => 0])
            ->dailyAt('04:10')
            ->timezone('Africa/Dakar');
    })

    ->withExceptions(function (Exceptions $exceptions) {

        // Retourne du JSON propre pour les erreurs d'authentification
        // Sans ça, Laravel retourne du HTML qui casse le frontend
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Non authentifie.'], 401);
            }
        });
    })

    ->create();