<?php
// User.php — Modèle utilisateur avec prénom, nom, téléphone
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'prenom', 'nom', 'email', 'telephone', 'password', 'role'
    ];

    protected $hidden = ['password', 'remember_token'];
    protected $casts  = ['password' => 'hashed'];

    public function estAdmin(): bool
    {
        return $this->role === 'admin';
    }

    // Nom complet : prénom + nom si disponibles, sinon name
    public function getNomCompletAttribute(): string
    {
        if ($this->prenom && $this->nom) return "{$this->prenom} {$this->nom}";
        return $this->name;
    }
}
