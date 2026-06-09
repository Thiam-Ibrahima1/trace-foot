<?php
// PredictionVip.php — Modèle pour les matchs VIP avec score exact payant
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PredictionVip extends Model
{
    protected $table = 'predictions_vip';

    protected $fillable = [
        'match_id', 'competition', 'domicile', 'exterieur', 'date', 'heure',
        'score_exact_predit', 'score_reel', 'publie',
        'score_confirme', 'score_confirme_le', 'confirme_par', 'note_confirmation',
        'logo_dom', 'logo_ext',
    ];

    protected $casts = [
        'publie'            => 'boolean',
        'score_confirme'    => 'boolean',
        'score_confirme_le' => 'datetime',
    ];

    // Les paiements ne sont JAMAIS supprimés, même si le match VIP est supprimé.
    // Un match VIP peut avoir plusieurs paiements (différents utilisateurs)
    public function paiements(): HasMany
    {
        return $this->hasMany(PaiementVip::class);
    }

    public function confirmateurAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirme_par');
    }
}
