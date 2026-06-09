<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

App\Models\User::where('email', 'admin@trace-fc.com')->delete();
App\Models\User::where('email', 'admin@trace.com')->delete();

App\Models\User::create([
    'name'      => 'IBRAHIMA THIAM',
    'prenom'    => 'IBRAHIMA',
    'nom'       => 'THIAM',
    'email'     => 'admin@trace.com',
    'telephone' => '776533170',
    'password'  => password_hash('Admin@2026!', PASSWORD_BCRYPT),
    'role'      => 'admin',
]);

echo 'Compte admin cree avec succes' . PHP_EOL;