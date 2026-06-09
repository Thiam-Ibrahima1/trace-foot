<?php
// LogApplication.php — Modèle pour le journal des actions
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogApplication extends Model
{
    protected $table = 'logs_application';

    protected $fillable = ['type_action', 'message', 'niveau', 'user_id'];

    // Méthode statique utilitaire pour créer un log facilement
    // Utilisation : LogApplication::creer('type', 'message', 'succes')
    public static function creer(string $typeAction, string $message, string $niveau = 'info', ?int $userId = null): self
    {
        return self::create([
            'type_action' => $typeAction,
            'message'     => $message,
            'niveau'      => $niveau,
            'user_id'     => $userId,
        ]);
    }

    // Relation vers l'utilisateur qui a déclenché cette action
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
