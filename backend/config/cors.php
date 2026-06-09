<?php
// config/cors.php — Autorise les requêtes du frontend React
// En production, remplacer '*' par votre vrai domaine frontend
return [
    'paths'                    => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods'          => ['*'],
    'allowed_origins'          => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')),
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => true, // nécessaire pour Sanctum avec cookies
];
