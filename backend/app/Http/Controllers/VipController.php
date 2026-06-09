<?php
// ============================================================
// VipController.php — Gestion des matchs VIP et paiements
// Supporte : PayTech (principal), Wave, Orange Money (direct)
// Mode simulation si les clés ne sont pas configurées (.env)
// ============================================================
namespace App\Http\Controllers;

use App\Models\PredictionVip;
use App\Models\PaiementVip;
use App\Models\LogApplication;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class VipController extends Controller
{
    // ── 1. Liste des matchs VIP du jour ──────────────────────────────
    // Retourne les matchs publiés + les scores débloqués si déjà payé
    public function matchsDuJour(Request $request): JsonResponse
    {
        $user = $request->user();

        // ── Partie partagée : liste des matchs (cachée 5 min) ──
        $matchsBase = Cache::remember('vip_matchs_du_jour', 300, function () {
            return PredictionVip::where('publie', true)
                ->where('updated_at', '>=', now()->subHours(24))
                ->orderBy('date')
                ->orderBy('heure')
                ->get(['id', 'match_id', 'competition', 'domicile', 'exterieur',
                       'heure', 'date', 'logo_dom', 'logo_ext', 'score_reel',
                       'score_confirme', 'score_exact_predit', 'updated_at']);
        });

        // Enrichir logos si manquants (sans écriture dans la closure cache)
        $matchs = $matchsBase->map(function ($m) {
            $logoDom = $m->logo_dom;
            $logoExt = $m->logo_ext;
            if ((!$logoDom || !$logoExt) && $m->date) {
                $cached  = Cache::get("apisports_date_{$m->date}", []);
                $fixture = collect($cached)->firstWhere('id', $m->match_id);
                if ($fixture) {
                    $logoDom = $logoDom ?: ($fixture['logo_dom'] ?? null);
                    $logoExt = $logoExt ?: ($fixture['logo_ext'] ?? null);
                }
            }
            return [
                'id'             => $m->id,
                'match_id'       => $m->match_id,
                'competition'    => $m->competition,
                'domicile'       => $m->domicile,
                'exterieur'      => $m->exterieur,
                'heure'          => $m->heure,
                'date'           => $m->date,
                'logo_dom'       => $logoDom,
                'logo_ext'       => $logoExt,
                'score_reel'     => $m->score_reel,
                'score_confirme' => $m->score_confirme,
                'publie_le'      => $m->updated_at?->toIso8601String(),
            ];
        });

        // ── Partie user-spécifique (non cachée) ──
        $ids = $matchsBase->pluck('id')->toArray();
        $dejaPayes = !empty($ids)
            ? PaiementVip::where('user_id', $user->id)
                ->where('statut', 'valide')
                ->whereIn('prediction_vip_id', $ids)
                ->pluck('prediction_vip_id')
                ->toArray()
            : [];

        // Charger scores en une seule requête batch (évite N+1)
        $scoresPayes = !empty($dejaPayes)
            ? PredictionVip::whereIn('id', $dejaPayes)->pluck('score_exact_predit', 'id')->toArray()
            : [];

        $avecScores = $matchs->map(function ($m) use ($dejaPayes, $scoresPayes) {
            if (in_array($m['id'], $dejaPayes)) {
                $m['score_exact_predit'] = $scoresPayes[$m['id']] ?? null;
            }
            return $m;
        });

        return response()->json(['matchs' => $avecScores, 'deja_payes' => $dejaPayes]);
    }

    // ── 2. Initier un paiement ────────────────────────────────────────
    // Décide automatiquement entre PayTech, Wave ou Orange Money
    public function initierPaiement(Request $request): JsonResponse
    {
        $user = $request->user();

        $d = $request->validate([
            'match_id'  => 'required|integer',
            'methode'   => 'required|in:paytech,wave,orange_money',
            'telephone' => 'required|string|min:9|max:12',
            'montant'   => 'required|integer|min:10000|max:10000',
        ]);

        $pred = PredictionVip::findOrFail($d['match_id']);

        // Vérifier si l'utilisateur a déjà payé ce match
        if (PaiementVip::where('user_id', $user->id)
            ->where('prediction_vip_id', $pred->id)
            ->where('statut', 'valide')
            ->exists()) {
            return response()->json(['statut' => 'succes', 'message' => 'Déjà payé. Score disponible.']);
        }

        // Générer une référence unique de paiement
        $ref = 'TFC-' . Str::upper(Str::random(10)) . '-' . $pred->id;

        $paiement = PaiementVip::create([
            'user_id'           => $user->id,
            'prediction_vip_id' => $pred->id,
            'methode'           => $d['methode'],
            'telephone'         => $d['telephone'],
            'montant'           => 10000,
            'reference'         => $ref,
            'statut'            => 'en_attente',
        ]);

        LogApplication::creer('paiement_initie', "Paiement {$ref} ({$d['methode']}) user#{$user->id}", 'info');

        // ── Mode simulation ─────────────────────────────────────────
        // Si aucune clé réelle n'est configurée → valider automatiquement (utile en dev)
        $clePaytech = config('services.paytech.api_key');
        $cleWave    = config('services.wave.api_key');
        $cleOm      = config('services.orange_money.api_key');

        $paytechSimule = $d['methode'] === 'paytech'       && (empty($clePaytech) || $clePaytech === 'PAYTECH_API_KEY_ICI');
        $waveSimule    = $d['methode'] === 'wave'          && (empty($cleWave)    || $cleWave    === 'WAVE_KEY_ICI');
        $omSimule      = $d['methode'] === 'orange_money'  && (empty($cleOm)      || $cleOm      === 'OM_CLIENT_ID_ICI');

        if ($paytechSimule || $waveSimule || $omSimule) {
            $paiement->update(['statut' => 'valide']);
            LogApplication::creer('paiement_simule', "Paiement {$ref} validé (simulation mode dev)", 'succes');
            return response()->json([
                'statut'    => 'succes',
                'message'   => 'Paiement simulé validé. Score disponible.',
                'reference' => $ref,
            ]);
        }

        // ── Appel au vrai service de paiement ──────────────────────
        return match ($d['methode']) {
            'paytech'      => $this->initierPaytech($paiement),
            'wave'         => $this->initierWave($paiement),
            'orange_money' => $this->initierOrangeMoney($paiement),
        };
    }

    // ── URL frontend (retour après paiement Wave / Orange Money) ────────
    private function urlFrontend(string $chemin): string
    {
        $base = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        return $base . $chemin;
    }

    // ── 3. PayTech — Agrégateur principal (Wave + Orange Money + Free Money) ─
    // PayTech simplifie l'intégration : une seule API pour tous les opérateurs SN
    private function initierPaytech(PaiementVip $p): JsonResponse
    {
        // ── INTÉGRATION PAYTECH ────────────────────────────────────────
        // Inscription : https://paytech.sn/
        // Dashboard PayTech > API Keys > copier api_key et api_secret dans .env
        // Documentation : https://paytech.sn/doc
        // PayTech gère Wave, Orange Money, Free Money automatiquement
        // ─────────────────────────────────────────────────────────────
        try {
            $rep = Http::withHeaders([
                'API_KEY'    => config('services.paytech.api_key'),
                'API_SECRET' => config('services.paytech.api_secret'),
                'Accept'     => 'application/json',
            ])->post(config('services.paytech.base_url') . '/payment/request-payment', [
                'item_name'       => "Score VIP : {$p->predictionVip?->domicile} vs {$p->predictionVip?->exterieur}",
                'item_price'      => 10000,
                'currency'        => 'XOF',
                'ref_command'     => $p->reference,
                'ipn_url'         => url('/api/vip/webhook/paytech'),
                'success_url'     => $this->urlFrontend('/?vip_payment=succes&ref=' . $p->reference . '#vip'),
                'cancel_url'      => $this->urlFrontend('/?vip_payment=echec#vip'),
                'env'             => config('app.env') === 'production' ? 'prod' : 'test',
            ]);

            if ($rep->successful()) {
                $data = $rep->json();
                $p->update([
                    'external_id'  => $data['token'] ?? null,
                    'paytech_data' => $data,
                ]);
                return response()->json([
                    'statut'       => 'en_attente',
                    'redirect_url' => $data['redirect_url'] ?? null, // URL de paiement PayTech
                    'reference'    => $p->reference,
                ]);
            }

            LogApplication::creer('erreur_paytech', 'Réponse PayTech : ' . $rep->body(), 'erreur');
        } catch (\Exception $e) {
            LogApplication::creer('erreur_paytech', $e->getMessage(), 'erreur');
        }

        return response()->json(['message' => 'Service PayTech indisponible. Réessayez.'], 503);
    }

    // ── 4. Wave — Accès direct (optionnel) ───────────────────────────
    private function initierWave(PaiementVip $p): JsonResponse
    {
        // ── INTÉGRATION WAVE ──────────────────────────────────────────
        // Inscription : https://wave.com/business
        // Dashboard > Intégrations > Clé API
        // Documentation : https://docs.wave.com/checkout
        // ─────────────────────────────────────────────────────────────
        try {
            $rep = Http::withHeaders(['Authorization' => 'Bearer ' . config('services.wave.api_key')])
                ->post(config('services.wave.base_url') . '/checkout/sessions', [
                    'amount'            => 10000,
                    'currency'          => 'XOF',
                    'error_url'         => $this->urlFrontend('/?vip_payment=echec#vip'),
                    'success_url'       => $this->urlFrontend('/?vip_payment=succes&ref=' . $p->reference . '#vip'),
                    'payment_reference' => $p->reference,
                    'client_reference'  => (string) $p->user_id,
                ]);

            if ($rep->successful()) {
                $data = $rep->json();
                $p->update(['external_id' => $data['id'] ?? null]);
                return response()->json([
                    'statut'       => 'en_attente',
                    'redirect_url' => $data['wave_launch_url'] ?? null,
                    'reference'    => $p->reference,
                ]);
            }
        } catch (\Exception $e) {
            LogApplication::creer('erreur_wave', $e->getMessage(), 'erreur');
        }
        return response()->json(['message' => 'Service Wave indisponible.'], 503);
    }

    // ── 5. Orange Money — Accès direct (optionnel) ───────────────────
    private function initierOrangeMoney(PaiementVip $p): JsonResponse
    {
        // ── INTÉGRATION ORANGE MONEY ─────────────────────────────────
        // Inscription : https://developer.orange.com
        // Créer une app > activer "Orange Money Payments SN" > récupérer Client ID / Secret
        // Documentation : https://developer.orange.com/apis/om-webpay-sn/overview
        // ─────────────────────────────────────────────────────────────
        try {
            // Étape 1 : obtenir un token OAuth
            $tokenRep = Http::withBasicAuth(
                config('services.orange_money.api_key'),
                config('services.orange_money.merchant_key')
            )->asForm()->post(config('services.orange_money.token_url'), [
                'grant_type' => 'client_credentials',
            ]);

            if (!$tokenRep->successful()) throw new \Exception('Token Orange Money impossible à obtenir');
            $token = $tokenRep->json('access_token');

            // Étape 2 : initier le paiement
            $rep = Http::withToken($token)->post(config('services.orange_money.base_url') . '/webpayment', [
                'merchant_key' => config('services.orange_money.merchant_key'),
                'currency'     => 'OUV',
                'order_id'     => $p->reference,
                'amount'       => 10000,
                'return_url'   => $this->urlFrontend('/?vip_payment=succes&ref=' . $p->reference . '#vip'),
                'cancel_url'   => $this->urlFrontend('/?vip_payment=echec#vip'),
                'notif_url'    => url('/api/vip/webhook/orange'),
                'lang'         => 'fr',
                'reference'    => $p->reference,
            ]);

            if ($rep->successful()) {
                $data = $rep->json();
                $p->update(['external_id' => $data['pay_token'] ?? null]);
                return response()->json([
                    'statut'       => 'en_attente',
                    'redirect_url' => $data['payment_url'] ?? null,
                    'reference'    => $p->reference,
                ]);
            }
        } catch (\Exception $e) {
            LogApplication::creer('erreur_om', $e->getMessage(), 'erreur');
        }
        return response()->json(['message' => 'Service Orange Money indisponible.'], 503);
    }

    // ── 6. Vérifier le statut d'un paiement ─────────────────────────
    // Accepte soit match_id (ancienne API) soit ref (retour Wave/OM)
    public function verifierPaiement(Request $request): JsonResponse
    {
        $user    = $request->user();
        $ref     = $request->input('ref');
        $matchId = $request->input('match_id');

        if ($ref) {
            $paiement = PaiementVip::where('reference', $ref)
                ->where('user_id', $user->id)
                ->latest()->first();
        } elseif ($matchId) {
            $paiement = PaiementVip::where('user_id', $user->id)
                ->where('prediction_vip_id', $matchId)
                ->latest()->first();
        } else {
            return response()->json(['statut' => 'non_trouve'], 404);
        }

        if (!$paiement) return response()->json(['statut' => 'non_trouve'], 404);
        if ($paiement->statut === 'valide') {
            return response()->json([
                'statut'   => 'valide',
                'match_id' => $paiement->prediction_vip_id,
            ]);
        }

        // Vérification active côté Wave si non encore validé via webhook
        if ($paiement->methode === 'wave' && $paiement->external_id && config('services.wave.api_key') !== 'WAVE_KEY_ICI') {
            try {
                $rep = Http::withHeaders(['Authorization' => 'Bearer ' . config('services.wave.api_key')])
                    ->get(config('services.wave.base_url') . '/checkout/sessions/' . $paiement->external_id);

                if ($rep->successful() && $rep->json('checkout_status') === 'complete') {
                    $paiement->update(['statut' => 'valide']);
                    LogApplication::creer('paiement_valide', "Paiement Wave {$paiement->reference} validé (retour URL)", 'succes');
                    return response()->json([
                        'statut'   => 'valide',
                        'match_id' => $paiement->prediction_vip_id,
                    ]);
                }
            } catch (\Exception $e) {
                LogApplication::creer('erreur_verification_wave', $e->getMessage(), 'erreur');
            }
        }

        return response()->json(['statut' => 'en_attente', 'match_id' => $paiement->prediction_vip_id]);
    }

    // ── 7. Webhook PayTech (IPN — Notification de paiement) ─────────
    // PayTech envoie une requête POST à cette URL quand un paiement est complété
    public function webhookPaytech(Request $request): JsonResponse
    {
        $apiKey    = config('services.paytech.api_key');
        $apiSecret = config('services.paytech.api_secret');

        // Vérifier la signature PayTech pour sécuriser le webhook
        if ($apiKey !== 'PAYTECH_API_KEY_ICI') {
            $hashRecu  = $request->input('custom_field') ?? '';
            $hashCalc  = hash('sha256', $apiKey . $apiSecret);
            if ($hashRecu && $hashRecu !== $hashCalc) {
                LogApplication::creer('erreur_paytech', 'Signature IPN invalide', 'erreur');
                return response()->json(['error' => 'Signature invalide'], 401);
            }
        }

        $ref = $request->input('ref_command');
        if ($ref) {
            $p = PaiementVip::where('reference', $ref)->first();
            if ($p && $p->statut !== 'valide') {
                $p->update([
                    'statut'       => 'valide',
                    'paytech_data' => $request->all(),
                ]);
                LogApplication::creer('webhook_paytech', "Paiement PayTech {$ref} validé via IPN", 'succes');
            }
        }

        return response()->json(['received' => true]);
    }

    // ── 8. Webhook Wave (direct) ─────────────────────────────────────
    public function webhookWave(Request $request): JsonResponse
    {
        $secret = config('services.wave.webhook_secret');
        if ($secret && $secret !== 'WAVE_WEBHOOK_ICI') {
            $sig = $request->header('Wave-Signature');
            if (!$sig || !hash_equals('sha256=' . hash_hmac('sha256', $request->getContent(), $secret), $sig)) {
                return response()->json(['error' => 'Signature invalide'], 401);
            }
        }

        $payload = $request->json()->all();
        $ref     = $payload['payment_reference'] ?? null;
        if ($ref && ($payload['checkout_status'] ?? '') === 'complete') {
            $p = PaiementVip::where('reference', $ref)->first();
            if ($p && $p->statut !== 'valide') {
                $p->update(['statut' => 'valide']);
                LogApplication::creer('webhook_wave', "Paiement Wave {$ref} validé", 'succes');
            }
        }
        return response()->json(['received' => true]);
    }

    // ── 9. Webhook Orange Money (direct) ─────────────────────────────
    public function webhookOrange(Request $request): JsonResponse
    {
        $ref = $request->input('reference') ?? $request->input('order_id');
        if ($ref) {
            $p = PaiementVip::where('reference', $ref)->first();
            if ($p && $request->input('status') === 'SUCCESS') {
                $p->update(['statut' => 'valide']);
                LogApplication::creer('webhook_om', "Paiement Orange Money {$ref} validé", 'succes');
            }
        }
        return response()->json(['received' => true]);
    }

    // ── 10. Liste des paiements (admin) ──────────────────────────────
    public function listePaiementsAdmin(Request $request): JsonResponse
    {
        return response()->json(Cache::remember('admin_paiements', 120, function () {
            $paiements = PaiementVip::with([
                'user:id,name,email',
                'predictionVip:id,competition,domicile,exterieur,heure,score_exact_predit,score_reel,score_confirme',
            ])->orderBy('created_at', 'desc')->paginate(30);

            $ca = PaiementVip::where('statut', 'valide')->sum('montant');

            return [
                'paiements' => $paiements->items(),
                'stats'     => [
                    'total_valides' => PaiementVip::where('statut', 'valide')->count(),
                    'ca_formate'    => number_format($ca, 0, ',', ' ') . ' FCFA',
                ],
            ];
        }));
    }

    // ── 11b. Supprimer un paiement VIP ────────────────────────────────
    public function supprimerPaiement(Request $request, int $id): JsonResponse
    {
        $paiement = PaiementVip::findOrFail($id);
        $info     = "Paiement #{$id} — {$paiement->statut} — {$paiement->montant} FCFA";
        $paiement->delete();

        LogApplication::creer(
            'paiement_supprime',
            $info,
            'info',
            $request->user()->id
        );

        Cache::forget('admin_paiements');
        Cache::forget('admin_badges');

        return response()->json(['message' => 'Paiement supprimé.']);
    }

    // ── 11. Gérer les prédictions VIP (admin) ────────────────────────
    public function gererPredictionsVip(Request $request): JsonResponse
    {
        if ($request->isMethod('GET')) {
            $date = $request->get('date');
            $q    = PredictionVip::orderBy('date', 'desc')->orderBy('heure');
            // date absent ou 'all' → retourner toutes les prédictions VIP
            if ($date && $date !== 'all') {
                $q->where('date', $date);
            }
            return response()->json(['predictions' => $q->get()]);
        }

        $d = $request->validate([
            'match_id'           => 'required',           // accepte string ou integer
            'competition'        => 'required|string',
            'domicile'           => 'required|string',
            'exterieur'          => 'required|string',
            'heure'              => 'nullable|string',    // peut être absent/vide
            'date'               => 'required|string',
            'score_exact_predit' => 'required|string|max:10',
            'publie'             => 'boolean',
            'logo_dom'           => 'nullable|string',
            'logo_ext'           => 'nullable|string',
        ]);
        // Normaliser match_id en string pour updateOrCreate cohérent
        $d['match_id'] = (string) $d['match_id'];

        // Auto-compléter les logos depuis le cache API si non fournis par l'admin
        if (empty($d['logo_dom']) || empty($d['logo_ext'])) {
            $date    = $d['date'] ?? now('Africa/Dakar')->format('Y-m-d');
            $cached  = Cache::get("apisports_date_{$date}", []);
            $fixture = collect($cached)->firstWhere('id', $d['match_id']);
            if ($fixture) {
                $d['logo_dom'] = $d['logo_dom'] ?: ($fixture['logo_dom'] ?? null);
                $d['logo_ext'] = $d['logo_ext'] ?: ($fixture['logo_ext'] ?? null);
            }
        }

        $pred = PredictionVip::updateOrCreate(['match_id' => $d['match_id']], $d);
        LogApplication::creer('vip_prediction', "VIP : {$d['domicile']} vs {$d['exterieur']} → {$d['score_exact_predit']}", 'succes');

        return response()->json(['prediction' => $pred], 201);
    }

    // ── 12. Mettre à jour le score réel VIP (admin) ──────────────────
    public function mettreAJourScoreReelVip(Request $request, int $id): JsonResponse
    {
        $d = $request->validate(['score_reel' => 'required|string|max:10']);
        PredictionVip::findOrFail($id)->update([
            'score_reel'      => $d['score_reel'],
            'score_confirme'  => false, // reset la confirmation quand le score change
            'score_confirme_le' => null,
        ]);
        return response()->json(['message' => 'Score réel VIP enregistré. En attente de confirmation.']);
    }

    // ── 13b. Réinitialiser le score réel VIP (effacer pour ressaisir) ───
    public function reinitialiserScoreVip(int $id): JsonResponse
    {
        $pred = PredictionVip::findOrFail($id);
        $pred->update([
            'score_reel'        => null,
            'score_confirme'    => false,
            'score_confirme_le' => null,
            'confirme_par'      => null,
            'note_confirmation' => null,
        ]);
        LogApplication::creer('score_reinitialise', "Score VIP réinitialisé #{$id}", 'mise_a_jour');
        return response()->json(['message' => 'Score VIP réinitialisé.']);
    }

    // ── 13c. Supprimer une prédiction VIP entièrement ─────────────────
    public function supprimerPredictionVip(Request $request, int $id): JsonResponse
    {
        $pred = PredictionVip::findOrFail($id);
        $info = "{$pred->domicile} vs {$pred->exterieur}";
        $pred->delete();
        LogApplication::creer('prediction_vip_supprimee', "VIP supprimée : {$info} (#{$id})", 'info', $request->user()->id);
        return response()->json(['message' => 'Prédiction VIP supprimée.']);
    }

    // ── 13. Confirmer le score exact (admin) — NOUVELLE SECTION ──────
    // L'admin certifie que le score réel correspond au score prédit par le tracé
    // Cette confirmation est la preuve de fiabilité du tracé
    public function confirmerScoreVip(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $d    = $request->validate([
            'score_reel'       => 'required|string|max:10',
            'note_confirmation'=> 'nullable|string|max:255',
        ]);

        $pred = PredictionVip::findOrFail($id);

        // Enregistrer le score réel et la confirmation
        $pred->update([
            'score_reel'         => $d['score_reel'],
            'score_confirme'     => true,
            'score_confirme_le'  => now(),
            'confirme_par'       => $user->id,
            'note_confirmation'  => $d['note_confirmation'] ?? null,
        ]);

        $scoreCorrect = $pred->score_exact_predit === $d['score_reel'];
        $statut = $scoreCorrect ? 'TRACÉ CORRECT ✓' : 'TRACÉ APPROCHÉ';

        LogApplication::creer(
            'confirmation_score',
            "Score VIP #{$id} confirmé par admin#{$user->id} : Prédit={$pred->score_exact_predit} / Réel={$d['score_reel']} → {$statut}",
            'succes'
        );

        return response()->json([
            'message'       => 'Score confirmé avec succès.',
            'score_correct' => $scoreCorrect,
            'statut'        => $statut,
        ]);
    }
}
