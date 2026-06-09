<?php
// Prediction.php — Modèle pour les prédictions de matchs (tracés)
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prediction extends Model
{
    protected $table = 'predictions';

    // Colonnes qu'on peut remplir depuis les contrôleurs
    protected $fillable = [
        'match_id', 'competition', 'domicile', 'exterieur', 'date', 'heure',
        'logo_dom', 'logo_ext',
        'score_prevu', 'scores_alternatifs', 'interpretation',
        'combinaisons', 'maisons_placees', 'verification',
        'essais', 'trace_status', 'score_reel',
        // Colonnes de confirmation admin
        'score_confirme', 'score_confirme_le', 'confirme_par', 'note_confirmation',
    ];

    // Colonnes stockées en JSON → converties automatiquement en tableau PHP
    protected $casts = [
        'scores_alternatifs' => 'array',
        'combinaisons'       => 'array',
        'maisons_placees'    => 'array',
        'verification'       => 'array',
        'score_confirme'     => 'boolean',
        'score_confirme_le'  => 'datetime',
    ];

    // Relation : qui a confirmé ce score (admin)
    public function confirmateurAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirme_par');
    }

    // ── Évaluation des combinaisons ───────────────────────────────
    // Même logique que evaluerCombi.js côté frontend — à garder synchronisé

    public static function evaluerCombi(string $label, string $scoreReel): string
    {
        if (!preg_match('/^\d+-\d+$/', $scoreReel)) return 'pending';
        [$dom, $ext] = array_map('intval', explode('-', $scoreReel));
        $total = $dom + $ext;

        return match($label) {
            'V1'   => $dom > $ext             ? 'ok' : 'nok',
            'V2'   => $ext > $dom             ? 'ok' : 'nok',
            '1X'   => $dom >= $ext            ? 'ok' : 'nok',
            '2X'   => $ext >= $dom            ? 'ok' : 'nok',
            '+2,5' => $total >= 3             ? 'ok' : 'nok',
            '-2,5' => $total < 3              ? 'ok' : 'nok',
            '2EM'  => $dom > 0 && $ext > 0   ? 'ok' : 'nok',
            '+1,5' => $total >= 2             ? 'ok' : 'nok',
            '-3,5' => $total < 4              ? 'ok' : 'nok',
            '+3,5' => $total >= 4             ? 'ok' : 'nok',
            default => 'pending',
        };
    }

    // Met à jour les combinaisons avec leur etat vert/rouge en base
    public function mettreAJourEtatCombis(string $scoreReel): void
    {
        $combis = is_array($this->combinaisons) ? $this->combinaisons : [];
        if (empty($combis)) return;

        $this->update([
            'combinaisons' => array_map(function ($c) use ($scoreReel) {
                $c['etat'] = self::evaluerCombi($c['label'] ?? '', $scoreReel);
                return $c;
            }, $combis),
        ]);
    }

    // Remet toutes les combinaisons à 'pending' (quand score réinitialisé)
    public function reinitialiserEtatCombis(): void
    {
        $combis = is_array($this->combinaisons) ? $this->combinaisons : [];
        if (empty($combis)) return;

        $this->update([
            'combinaisons' => array_map(function ($c) {
                $c['etat'] = 'pending';
                return $c;
            }, $combis),
        ]);
    }
}
/*
 * Structure de la colonne verification (JSON) après mise à jour :
 * {
 *   "trace1": { "v1": { "valide": true, "taux": 75 }, "v2": { "mcConnue": true }, "traceValide": true },
 *   "trace2": { "v1": { "valide": true, "taux": 80 }, "v2": { "mcConnue": true }, "traceValide": true },
 *   "concordance": true,
 *   "score_confirme_double": "2-1"   ← score certifié par les deux tracés
 * }
 */
