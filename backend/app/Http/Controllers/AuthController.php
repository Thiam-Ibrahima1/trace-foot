<?php
// ============================================================
// AuthController.php — Connexion, inscription, mot de passe oublié
// ============================================================
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\LogApplication;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    // ── Connexion utilisateur ─────────────────────────────────────
    public function connexion(Request $request): JsonResponse
    {
        $d   = $request->validate(['email' => 'required|email']);
        $mdp = $request->input('password') ?? $request->input('mot_de_passe', '');

        if (empty($mdp)) {
            return response()->json(['message' => 'Mot de passe requis.'], 422);
        }

        $user = User::where('email', $d['email'])->first();

        if (!$user || !Hash::check($mdp, $user->password)) {
            return response()->json(['message' => 'Email ou mot de passe incorrect.'], 401);
        }

        // Token utilisateur : valide 30 jours
        $token = $user->createToken('trace-fc-user', ['*'], now()->addDays(30))->plainTextToken;
        LogApplication::creer('connexion', "Connexion : {$user->email}", 'info', $user->id);

        return response()->json([
            'token'       => $token,
            'utilisateur' => $this->formaterUser($user),
        ]);
    }

    // ── Connexion admin ───────────────────────────────────────────
    public function connexionAdmin(Request $request): JsonResponse
    {
        $d   = $request->validate(['email' => 'required|email']);
        $mdp = $request->input('password') ?? $request->input('mot_de_passe', '');

        if (empty($mdp)) {
            return response()->json(['message' => 'Mot de passe requis.'], 422);
        }

        $user = User::where('email', $d['email'])->where('role', 'admin')->first();

        if (!$user || !Hash::check($mdp, $user->password)) {
            return response()->json(['message' => 'Identifiants admin incorrects.'], 401);
        }

        // Token admin : valide 12 heures (sécurité renforcée)
        $token = $user->createToken('trace-fc-admin', ['*'], now()->addHours(12))->plainTextToken;
        LogApplication::creer('connexion_admin', "Admin connecté : {$user->email}", 'info', $user->id);

        return response()->json([
            'token'       => $token,
            'utilisateur' => $this->formaterUser($user),
        ]);
    }

    // ── Inscription utilisateur ───────────────────────────────────
    // Champs requis : prenom, nom, email, telephone, password, password_confirmation
    public function inscription(Request $request): JsonResponse
    {
        $d = $request->validate([
            'prenom'                => 'required|string|max:60',
            'nom'                   => 'required|string|max:60',
            'email'                 => 'required|email|unique:users,email',
            'telephone'             => 'required|string|min:8|max:15',
            'password'              => 'required|string|min:6|confirmed',
            'password_confirmation' => 'required|string',
        ], [
            'prenom.required'    => 'Le prénom est requis.',
            'nom.required'       => 'Le nom est requis.',
            'email.required'     => 'L\'adresse email est requise.',
            'email.unique'       => 'Cette adresse email est déjà utilisée.',
            'telephone.required' => 'Le numéro de téléphone est requis.',
            'password.required'  => 'Le mot de passe est requis.',
            'password.min'       => 'Le mot de passe doit contenir au moins 6 caractères.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
        ]);

        $user = User::create([
            'name'      => "{$d['prenom']} {$d['nom']}",
            'prenom'    => $d['prenom'],
            'nom'       => $d['nom'],
            'email'     => $d['email'],
            'telephone' => $d['telephone'],
            'password'  => Hash::make($d['password']),
            'role'      => 'user',
        ]);

        // Token à l'inscription : valide 30 jours
        $token = $user->createToken('trace-fc-user', ['*'], now()->addDays(30))->plainTextToken;
        LogApplication::creer('inscription', "Nouveau compte : {$user->email} ({$user->name})", 'succes', $user->id);

        return response()->json([
            'token'       => $token,
            'utilisateur' => $this->formaterUser($user),
        ], 201);
    }

    // ── Mot de passe oublié — Étape 1 : demander la réinitialisation ─
    // Génère un code à 6 chiffres et le stocke en base
    // En production : envoyer par email ou SMS (Sendinblue, OrangeSMS, etc.)
    public function motDePasseOublie(Request $request): JsonResponse
    {
        $d = $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'Aucun compte trouvé avec cette adresse email.',
        ]);

        // Générer un code de réinitialisation à 6 chiffres
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Stocker le code en base (expire après 15 minutes)
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $d['email']],
            ['token' => Hash::make($code), 'created_at' => now()]
        );

        LogApplication::creer(
            'reset_password',
            "Demande réinitialisation MDP pour {$d['email']} — Code: {$code}",
            'info'
        );

        // ── En production, envoyer le code par email ou SMS ──────────
        // Exemple email : Mail::to($d['email'])->send(new ResetPasswordMail($code));
        // Exemple SMS   : Http::post('api-sms', ['to' => $user->telephone, 'msg' => "Code: {$code}"]);
        //
        // En développement : le code est retourné directement pour faciliter les tests
        $estDev = config('app.env') !== 'production';

        return response()->json([
            'message' => 'Un code de réinitialisation a été généré.',
            // Retourner le code en dev seulement (jamais en production)
            'code_dev' => $estDev ? $code : null,
            'info'     => $estDev
                ? "Mode développement : code visible ici. En production, il sera envoyé par email/SMS."
                : "Vérifiez votre email ou votre SMS.",
        ]);
    }

    // ── Mot de passe oublié — Étape 2 : vérifier le code + nouveau MDP ─
    public function reinitialiserMotDePasse(Request $request): JsonResponse
    {
        $d = $request->validate([
            'email'                 => 'required|email',
            'code'                  => 'required|string|size:6',
            'password'              => 'required|string|min:6|confirmed',
            'password_confirmation' => 'required|string',
        ], [
            'code.size'          => 'Le code doit contenir exactement 6 chiffres.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
        ]);

        // Vérifier le token en base
        $reset = DB::table('password_reset_tokens')
            ->where('email', $d['email'])
            ->first();

        if (!$reset) {
            return response()->json(['message' => 'Aucune demande de réinitialisation trouvée.'], 422);
        }

        // Vérifier que le code n'a pas expiré (15 minutes)
        $expiration = now()->subMinutes(15);
        if ($reset->created_at < $expiration) {
            DB::table('password_reset_tokens')->where('email', $d['email'])->delete();
            return response()->json(['message' => 'Le code a expiré. Faites une nouvelle demande.'], 422);
        }

        // Vérifier le code
        if (!Hash::check($d['code'], $reset->token)) {
            return response()->json(['message' => 'Code incorrect.'], 422);
        }

        // Mettre à jour le mot de passe
        $user = User::where('email', $d['email'])->first();
        $user->update(['password' => Hash::make($d['password'])]);

        // Invalider tous les tokens existants et supprimer le code de reset
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $d['email'])->delete();

        LogApplication::creer('reset_password', "MDP réinitialisé pour {$d['email']}", 'succes', $user->id);

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès. Connectez-vous.']);
    }

    // ── Infos utilisateur connecté ────────────────────────────────
    public function moi(Request $request): JsonResponse
    {
        return response()->json(['utilisateur' => $this->formaterUser($request->user())]);
    }

    // ── Modifier son propre profil ────────────────────────────────
    public function modifierProfil(Request $request): JsonResponse
    {
        $user = $request->user();
        $d = $request->validate([
            'prenom'    => 'sometimes|string|max:60',
            'nom'       => 'sometimes|string|max:60',
            'telephone' => 'sometimes|string|max:20',
            'email'     => "sometimes|email|unique:users,email,{$user->id}",
        ]);

        if (!empty($d)) {
            if (isset($d['prenom']) || isset($d['nom'])) {
                $d['name'] = trim(($d['prenom'] ?? $user->prenom) . ' ' . ($d['nom'] ?? $user->nom));
            }
            $user->update($d);
        }

        return response()->json(['utilisateur' => $this->formaterUser($user->fresh())]);
    }

    // ── Déconnexion ───────────────────────────────────────────────
    public function deconnexion(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    // ── Formater les données utilisateur retournées ───────────────
    private function formaterUser(User $user): array
    {
        return [
            'id'        => $user->id,
            'name'      => $user->name,
            'prenom'    => $user->prenom,
            'nom'       => $user->nom,
            'email'     => $user->email,
            'telephone' => $user->telephone,
            'role'      => $user->role,
        ];
    }
}
