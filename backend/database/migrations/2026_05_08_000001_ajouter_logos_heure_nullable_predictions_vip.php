<?php
// Migration : ajouter logo_dom, logo_ext et rendre heure nullable dans predictions_vip

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('predictions_vip', function (Blueprint $t) {
            if (!Schema::hasColumn('predictions_vip', 'logo_dom')) {
                $t->string('logo_dom', 500)->nullable()->after('score_reel');
            }
            if (!Schema::hasColumn('predictions_vip', 'logo_ext')) {
                $t->string('logo_ext', 500)->nullable()->after('logo_dom');
            }
            // Rendre heure nullable (un match peut ne pas encore avoir d'heure confirmée)
            $t->string('heure', 10)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('predictions_vip', function (Blueprint $t) {
            if (Schema::hasColumn('predictions_vip', 'logo_dom')) {
                $t->dropColumn('logo_dom');
            }
            if (Schema::hasColumn('predictions_vip', 'logo_ext')) {
                $t->dropColumn('logo_ext');
            }
            $t->string('heure', 10)->nullable(false)->change();
        });
    }
};
