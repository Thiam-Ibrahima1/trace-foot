<?php
// PaiementVip.php — Modèle pour les paiements VIP (PayTech, Wave, Orange Money)
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaiementVip extends Model
{
    protected $table = 'paiements_vip';

    protected $fillable = [
        'user_id', 'prediction_vip_id', 'methode', 'telephone',
        'montant', 'reference', 'statut', 'external_id', 'paytech_data',
    ];

    protected $casts = [
        'paytech_data' => 'array', // données brutes retournées par PayTech
    ];

    // Relation vers l'utilisateur qui a payé
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relation vers le match VIP acheté
    public function predictionVip(): BelongsTo
    {
        return $this->belongsTo(PredictionVip::class, 'prediction_vip_id');
    }
}
