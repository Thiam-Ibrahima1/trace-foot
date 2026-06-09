<?php
// AdminSeulement.php — Middleware : bloque les non-admins
// Utilisé sur toutes les routes de la section admin
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminSeulement
{
    public function handle(Request $request, Closure $next)
    {
        // Vérifier que l'utilisateur est connecté ET a le rôle admin
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Accès réservé aux administrateurs.'], 403);
        }
        return $next($request);
    }
}
