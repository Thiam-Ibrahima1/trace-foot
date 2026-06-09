<?php
// Migration : ajouter téléphone + token de réinitialisation de mot de passe
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Ajouter téléphone à la table users
        if (!Schema::hasColumn('users', 'telephone')) {
            Schema::table('users', function (Blueprint $t) {
                $t->string('telephone', 20)->nullable()->after('email');
            });
        }
        // Ajouter prénom et nom séparés
        if (!Schema::hasColumn('users', 'prenom')) {
            Schema::table('users', function (Blueprint $t) {
                $t->string('prenom', 60)->nullable()->after('name');
                $t->string('nom',    60)->nullable()->after('prenom');
            });
        }

        // Table pour les tokens de réinitialisation de mot de passe
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $t) {
                $t->string('email')->primary();
                $t->string('token');
                $t->timestamp('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropColumnIfExists('telephone');
            $t->dropColumnIfExists('prenom');
            $t->dropColumnIfExists('nom');
        });
        Schema::dropIfExists('password_reset_tokens');
    }
};
