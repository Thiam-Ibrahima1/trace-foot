<?php
// ============================================================
// Migration principale — Toutes les tables de Trace FC
// Commande : php artisan migrate
// Crée les tables si elles n'existent pas encore (idempotente)
// ============================================================
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // ── Table users : comptes admin et utilisateurs ───────────────
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $t) {
                $t->id();
                $t->string('name', 60);
                $t->string('email', 100)->unique();
                $t->string('password');
                $t->enum('role', ['admin', 'user'])->default('user');
                $t->rememberToken();
                $t->timestamps();
            });
        } elseif (!Schema::hasColumn('users', 'role')) {
            // Ajouter la colonne role si la table existe déjà sans elle
            Schema::table('users', fn(Blueprint $t) =>
                $t->enum('role', ['admin', 'user'])->default('user')->after('password')
            );
        }

        // ── Table personal_access_tokens : tokens Sanctum (authentification API) ─
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $t) {
                $t->id();
                $t->morphs('tokenable'); // lie le token à n'importe quel modèle
                $t->string('name');
                $t->string('token', 64)->unique();
                $t->text('abilities')->nullable();
                $t->timestamp('last_used_at')->nullable();
                $t->timestamp('expires_at')->nullable();
                $t->timestamps();
            });
        }

        // ── Table predictions : tracés et prédictions de matchs ───────
        if (!Schema::hasTable('predictions')) {
            Schema::create('predictions', function (Blueprint $t) {
                $t->id();
                $t->string('match_id', 50)->unique();        // identifiant unique du match
                $t->string('competition', 80);               // ex: "Ligue 1"
                $t->string('domicile', 80);                  // équipe à domicile
                $t->string('exterieur', 80);                 // équipe à l'extérieur
                $t->string('date', 20)->nullable();          // format YYYY-MM-DD
                $t->string('heure', 10)->nullable();         // format HH:MM
                $t->string('score_prevu', 10);               // score prédit par le tracé ex: "2-1"
                $t->json('scores_alternatifs')->nullable();  // autres scores possibles
                $t->text('interpretation')->nullable();      // explication textuelle du tracé
                $t->json('combinaisons')->nullable();        // combinaisons de paris (V1, 2EQ, etc.)
                $t->json('maisons_placees')->nullable();     // les 16 maisons avec zones et puissances
                $t->json('verification')->nullable();        // résultat double vérification (V1+V2)
                $t->integer('essais')->nullable();           // nombre d'essais avant tracé valide
                $t->string('trace_status', 20)->nullable();  // 'valide' ou 'partiel'
                $t->string('score_reel', 10)->nullable();    // score final du vrai match
                // ── Confirmation admin du score exact ─────────────────
                $t->boolean('score_confirme')->default(false);           // admin a certifié le score réel
                $t->timestamp('score_confirme_le')->nullable();          // date de confirmation
                $t->foreignId('confirme_par')->nullable()->constrained('users')->nullOnDelete(); // qui a confirmé
                $t->text('note_confirmation')->nullable();               // note optionnelle de l'admin
                $t->timestamps();
                $t->index('competition');
                $t->index('date');
                $t->index('score_confirme'); // pour filtrer rapidement les matchs confirmés
            });
        } else {
            // Ajouter les colonnes de confirmation si elles manquent (mise à jour)
            if (!Schema::hasColumn('predictions', 'score_confirme')) {
                Schema::table('predictions', function (Blueprint $t) {
                    $t->boolean('score_confirme')->default(false)->after('score_reel');
                    $t->timestamp('score_confirme_le')->nullable()->after('score_confirme');
                    $t->foreignId('confirme_par')->nullable()->constrained('users')->nullOnDelete()->after('score_confirme_le');
                    $t->text('note_confirmation')->nullable()->after('confirme_par');
                });
            }
        }

        // ── Table logs_application : journal de toutes les actions ────
        if (!Schema::hasTable('logs_application')) {
            Schema::create('logs_application', function (Blueprint $t) {
                $t->id();
                $t->string('type_action', 60);   // ex: 'paiement_valide', 'confirmation_score'
                $t->text('message');             // description lisible
                $t->enum('niveau', ['info', 'succes', 'erreur', 'mise_a_jour'])->default('info');
                $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamps();
                $t->index('niveau');
                $t->index('created_at');
            });
        }

        // ── Table predictions_vip : matchs payants avec score exact ──
        if (!Schema::hasTable('predictions_vip')) {
            Schema::create('predictions_vip', function (Blueprint $t) {
                $t->id();
                $t->string('match_id', 50)->unique();       // ID unique du match VIP
                $t->string('competition', 80);
                $t->string('domicile', 80);
                $t->string('exterieur', 80);
                $t->string('date', 20);
                $t->string('heure', 10);
                $t->string('score_exact_predit', 10);       // score exact prédit (ex: "2-1")
                $t->string('score_reel', 10)->nullable();   // score final réel du match
                $t->boolean('publie')->default(false);      // visible aux utilisateurs ?
                // ── Confirmation admin du score exact VIP ─────────────
                $t->boolean('score_confirme')->default(false);
                $t->timestamp('score_confirme_le')->nullable();
                $t->foreignId('confirme_par')->nullable()->constrained('users')->nullOnDelete();
                $t->text('note_confirmation')->nullable();
                $t->timestamps();
                $t->index('date');
                $t->index('score_confirme');
            });
        } else {
            if (!Schema::hasColumn('predictions_vip', 'score_confirme')) {
                Schema::table('predictions_vip', function (Blueprint $t) {
                    $t->boolean('score_confirme')->default(false)->after('score_reel');
                    $t->timestamp('score_confirme_le')->nullable()->after('score_confirme');
                    $t->foreignId('confirme_par')->nullable()->constrained('users')->nullOnDelete()->after('score_confirme_le');
                    $t->text('note_confirmation')->nullable()->after('confirme_par');
                });
            }
        }

        // ── Table paiements_vip : historique de tous les paiements ───
        if (!Schema::hasTable('paiements_vip')) {
            Schema::create('paiements_vip', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $t->foreignId('prediction_vip_id')->constrained('predictions_vip')->onDelete('cascade');
                // methode inclut paytech en plus de wave et orange_money
                $t->enum('methode', ['paytech', 'wave', 'orange_money'])->default('paytech');
                $t->string('telephone', 15);          // numéro de l'acheteur
                $t->integer('montant')->default(10000); // en FCFA
                $t->string('reference', 50)->unique(); // référence interne unique
                $t->enum('statut', ['en_attente', 'valide', 'echec'])->default('en_attente');
                $t->string('external_id', 100)->nullable(); // ID retourné par PayTech/Wave/OM
                $t->json('paytech_data')->nullable();   // données brutes retournées par PayTech
                $t->timestamps();
                $t->index(['user_id', 'statut']);
                $t->index('reference');
            });
        } else {
            // Ajouter le support PayTech si la table existe déjà
            if (!Schema::hasColumn('paiements_vip', 'paytech_data')) {
                Schema::table('paiements_vip', function (Blueprint $t) {
                    $t->json('paytech_data')->nullable()->after('external_id');
                    // Changer l'enum pour inclure paytech (nécessite de recréer l'enum en MySQL)
                });
            }
        }

        // ── Compte admin par défaut ────────────────────────────────────
        // Identifiants : admin@trace-fc.com / Admin@2024!
        DB::table('users')->insertOrIgnore([
            'name'       => 'Administrateur',
            'email'      => 'admin@trace-fc.com',
            'password'   => Hash::make('Admin@2024!'),
            'role'       => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Supprimer dans l'ordre inverse des dépendances (FK)
        Schema::dropIfExists('paiements_vip');
        Schema::dropIfExists('predictions_vip');
        Schema::dropIfExists('logs_application');
        Schema::dropIfExists('predictions');
        Schema::dropIfExists('personal_access_tokens');
        // Ne pas supprimer 'users' pour ne pas perdre les comptes
    }
};

// Note : colonnes téléphone + reset password ajoutées via migration séparée
