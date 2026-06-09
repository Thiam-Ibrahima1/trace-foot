<?php
// config/database.php — Configuration MySQL pour Trace FC
return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        // Connexion MySQL principale
        'mysql' => [
            'driver'    => 'mysql',
            'host'      => env('DB_HOST', '127.0.0.1'),
            'port'      => env('DB_PORT', '3306'),
            'database'  => env('DB_DATABASE', 'trace_fc'),
            'username'  => env('DB_USERNAME', 'root'),
            'password'  => env('DB_PASSWORD', ''),
            'charset'   => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix'    => '',
            'strict'    => true,
            'engine'    => null,
            // Optimisation : connexion persistante pour réduire la latence
            'options'   => extension_loaded('pdo_mysql') ? array_filter([
                PDO::ATTR_PERSISTENT => false,
                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],
    ],
    'migrations' => [
        'table'  => 'migrations',
        'update_date_on_publish' => true,
    ],
];
