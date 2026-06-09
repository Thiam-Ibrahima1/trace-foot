<?php
// Migration : ajouter logo_dom et logo_ext à la table predictions
// Ces champs permettent de conserver les logos des équipes en base
// même après expiration du cache API (7 jours)
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('predictions', function (Blueprint $t) {
            if (!Schema::hasColumn('predictions', 'logo_dom')) {
                $t->string('logo_dom', 500)->nullable()->after('heure');
            }
            if (!Schema::hasColumn('predictions', 'logo_ext')) {
                $t->string('logo_ext', 500)->nullable()->after('logo_dom');
            }
        });
    }

    public function down(): void
    {
        Schema::table('predictions', function (Blueprint $t) {
            if (Schema::hasColumn('predictions', 'logo_dom')) $t->dropColumn('logo_dom');
            if (Schema::hasColumn('predictions', 'logo_ext')) $t->dropColumn('logo_ext');
        });
    }
};
