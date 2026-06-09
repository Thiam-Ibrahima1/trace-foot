<?php
// config/services.php — Clés des services de paiement
// Toutes les valeurs viennent du fichier .env — ne jamais mettre de clés ici directement.

return [
    // ── PayTech (agrégateur : Wave + Orange Money + Free Money) ──────
    // Recommandé pour simplifier l'intégration multi-opérateurs
    'paytech' => [
        'api_key'    => env('PAYTECH_API_KEY',    'PAYTECH_API_KEY_ICI'),
        'api_secret' => env('PAYTECH_API_SECRET', 'PAYTECH_API_SECRET_ICI'),
        'base_url'   => env('PAYTECH_BASE_URL',   'https://paytech.sn/api'),
    ],

    // ── Wave (accès direct, optionnel si PayTech est utilisé) ────────
    'wave' => [
        'api_key'        => env('WAVE_API_KEY',        'WAVE_KEY_ICI'),
        'webhook_secret' => env('WAVE_WEBHOOK_SECRET', 'WAVE_WEBHOOK_ICI'),
        'base_url'       => env('WAVE_BASE_URL',       'https://api.wave.com/v1'),
    ],

    // ── Orange Money (accès direct, optionnel si PayTech est utilisé) ─
    'orange_money' => [
        'api_key'      => env('ORANGE_MONEY_API_KEY',      'OM_CLIENT_ID_ICI'),
        'merchant_key' => env('ORANGE_MONEY_MERCHANT_KEY', 'OM_CLIENT_SECRET_ICI'),
        'base_url'     => env('ORANGE_MONEY_BASE_URL',     'https://api.orange.com/orange-money-webpay/sn/v1'),
        'token_url'    => env('ORANGE_MONEY_TOKEN_URL',    'https://api.orange.com/oauth/v3/token'),
    ],
];
