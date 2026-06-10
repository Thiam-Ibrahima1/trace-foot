<?php
return [
    'default' => env('CACHE_DRIVER', 'file'),
    'stores' => [
        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
        ],
        'database' => [
            'driver' => 'database',
            'table' => 'cache',
            'connection' => null,
        ],
        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],
    ],
    'prefix' => env('CACHE_PREFIX', 'trace_fc_cache'),
];