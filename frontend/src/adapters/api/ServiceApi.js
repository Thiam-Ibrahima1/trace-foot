// ServiceApi.js — Couche API : tous les appels au backend Laravel
// Sécurité : tout retour 401 déclenche une déconnexion automatique
import { declencherDeconnexionGlobale } from '../../infrastructure/auth/AuthContexte.jsx'

const API     = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const getToken = () => localStorage.getItem('trace_token') || ''

// Headers standards JSON + token Bearer si disponible
const h = (auth = true) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

// Wrapper fetch sécurisé : intercepte les 401 et déconnecte automatiquement
async function appelSecurise(url, options = {}) {
  const rep = await fetch(url, options)

  // Token expiré ou invalide → déconnexion globale immédiate
  if (rep.status === 401) {
    declencherDeconnexionGlobale()
    throw new Error('Session expirée. Veuillez vous reconnecter.')
  }

  return rep
}

// Base URL des drapeaux (flagcdn.com — service gratuit)
const FLAG = (code) => `https://flagcdn.com/w40/${code}.png`

// ── Championnats avec vrais drapeaux (noms normalisés par le backend) ─
export const CHAMPIONNATS = {
  // Angleterre
  'Premier League':        { logo: FLAG('gb-eng'), fallback: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Championship':          { logo: FLAG('gb-eng'), fallback: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'FA Cup':                { logo: FLAG('gb-eng'), fallback: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Premiership':           { logo: FLAG('gb-sct'), fallback: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Espagne (backend normalise "Primera Division" → "La Liga")
  'La Liga':               { logo: FLAG('es'), fallback: '🇪🇸' },
  'Segunda Division':      { logo: FLAG('es'), fallback: '🇪🇸' },
  'Copa del Rey':          { logo: FLAG('es'), fallback: '🇪🇸' },
  // France
  'Ligue 1':               { logo: FLAG('fr'), fallback: '🇫🇷' },
  'Ligue 2':               { logo: FLAG('fr'), fallback: '🇫🇷' },
  // Italie
  'Serie A':               { logo: FLAG('it'), fallback: '🇮🇹' },
  'Serie B':               { logo: FLAG('it'), fallback: '🇮🇹' },
  // Allemagne
  'Bundesliga':            { logo: FLAG('de'), fallback: '🇩🇪' },
  'Bundesliga 2':          { logo: FLAG('de'), fallback: '🇩🇪' },
  // Portugal (backend normalise "Primeira Liga" → "Liga Portugal")
  'Liga Portugal':         { logo: FLAG('pt'), fallback: '🇵🇹' },
  'Primeira Liga':         { logo: FLAG('pt'), fallback: '🇵🇹' },
  // Turquie (backend normalise "Süper Lig" → "Super Lig")
  'Super Lig':             { logo: FLAG('tr'), fallback: '🇹🇷' },
  // Belgique (backend normalise "Belgian First Division A" → "Pro League")
  'Pro League':            { logo: FLAG('be'), fallback: '🇧🇪' },
  // Pays-Bas
  'Eredivisie':            { logo: FLAG('nl'), fallback: '🇳🇱' },
  // Europe (UEFA) — pas de drapeau national → logo UEFA emoji
  'Champions League':      { logo: null, fallback: '🏆' },
  'Europa League':         { logo: null, fallback: '🏆' },
  'Conference League':     { logo: null, fallback: '🏆' },
  // Amérique du Sud
  'Copa Libertadores':     { logo: null, fallback: '🌎' },
  'Copa Sudamericana':     { logo: null, fallback: '🌎' },
  'Brasileirao Série A':   { logo: FLAG('br'), fallback: '🇧🇷' },
  'Brasileirao Série B':   { logo: FLAG('br'), fallback: '🇧🇷' },
  // Monde
  'World Cup':             { logo: null, fallback: '🌍' },
  'European Championship': { logo: null, fallback: '🇪🇺' },
  // Autres pays
  'Coupe d\'Algérie':     { logo: FLAG('dz'), fallback: '🇩🇿' },
  'Saudi Pro League':      { logo: FLAG('sa'), fallback: '🇸🇦' },
  'Argentine Primera':     { logo: FLAG('ar'), fallback: '🇦🇷' },
  'MLS':                   { logo: FLAG('us'), fallback: '🇺🇸' },
}

// ── Utilitaires ───────────────────────────────────────────────
export const formaterDateAPI    = d => d.toISOString().split('T')[0]
export const sauvegarderCleApi  = c => localStorage.setItem('football_api_key', c)
export const recupererCleApi    = () => localStorage.getItem('football_api_key') || ''

// ── Matchs (routes publiques — pas d'auth nécessaire) ─────────

// Détail d'un match par section (chargement paresseux pour économiser les requêtes)
export const getMatchDetails = (fixtureId, section, params = {}) => {
  const qs = new URLSearchParams({ section, ...params }).toString()
  return fetch(`${API}/matchs/${fixtureId}/details?${qs}`, { headers: h(false) })
    .then(r => r.ok ? r.json() : {})
    .catch(() => ({}))
}

// Matchs strictement en direct — endpoint sans cache côté backend
export const getMatchsLive = () =>
  fetch(`${API}/matchs/live`, { headers: h(false) })
    .then(r => r.ok ? r.json() : { matchs: [], total: 0 })
    .catch(() => ({ matchs: [], total: 0 }))

// Matchs du jour depuis le backend
export const getMatchsDuJour = (date = null) => {
  const url = date ? `${API}/matchs/jour?date=${date}` : `${API}/matchs/jour`
  return fetch(url, { headers: h(false) })
    .then(r => r.ok ? r.json() : { matchs: [], total: 0 })
    .catch(() => ({ matchs: [], total: 0 }))
}

// Matchs de la semaine depuis le backend (plage de dates)
export const getMatchsSemaine = (dateFrom = null, dateTo = null) => {
  const params = []
  if (dateFrom) params.push(`dateFrom=${dateFrom}`)
  if (dateTo)   params.push(`dateTo=${dateTo}`)
  const url = `${API}/matchs/semaine${params.length ? '?' + params.join('&') : ''}`
  return fetch(url, { headers: h(false) })
    .then(r => r.ok ? r.json() : { matchs_par_date: {}, total: 0 })
    .catch(() => ({ matchs_par_date: {}, total: 0 }))
}

// ── Prédictions (authentifié) ─────────────────────────────────

export const sauvegarderPrediction = async (d) => {
  const rep  = await appelSecurise(`${API}/predictions`, { method: 'POST', headers: h(), body: JSON.stringify(d) })
  const json = await rep.json()
  if (!rep.ok) throw new Error(json.message || JSON.stringify(json.errors || json))
  return json
}

// Publie les combinaisons d'un tracé → visibles côté utilisateurs
export const publierCombinaisonsTrace = async (id, data = {}) => {
  const rep = await appelSecurise(`${API}/predictions/${id}/publier`, {
    method: 'POST', headers: h(), body: JSON.stringify(data),
  })
  const json = await rep.json()
  if (!rep.ok) throw new Error(json.message || JSON.stringify(json.errors || json))
  return json
}

export const mettreAJourScoreReel = (id, s) =>
  appelSecurise(`${API}/predictions/${id}/resultat`, { method: 'PATCH', headers: h(), body: JSON.stringify({ score_reel: s }) })
    .then(r => r.json())

export const obtenirPredictionsParDate = date =>
  appelSecurise(`${API}/predictions?date=${date}`, { headers: h() })
    .then(r => r.ok ? r.json().then(d => d.predictions || []) : [])
    .catch(() => [])

export const obtenirHistorique = (page = 1, perPage = 25) =>
  appelSecurise(`${API}/predictions?page=${page}&per_page=${perPage}`, { headers: h() })
    .then(r => r.json())

// Récupérer une prédiction précise par son match_id (pour PageVisualisationTrace)
export const obtenirPredictionParMatchId = (matchId) =>
  appelSecurise(`${API}/predictions?match_id=${encodeURIComponent(matchId)}`, { headers: h() })
    .then(r => r.json())

// ── Admin — Intelligence (endpoint dédié, champs filtrés, cache 5min) ──
export const obtenirDonneesIntelligence = () =>
  appelSecurise(`${API}/admin/intelligence`, { headers: h() })
    .then(r => r.json())

// ── Profil utilisateur ────────────────────────────────────────
export const modifierProfil = d =>
  appelSecurise(`${API}/auth/profil`, { method: 'PATCH', headers: h(), body: JSON.stringify(d) })
    .then(r => r.json())

// ── Admin — Badges sidebar (compteurs légers, 1 seul appel) ──
export const obtenirBadgesAdmin = () =>
  appelSecurise(`${API}/admin/badges`, { headers: h() })
    .then(r => r.json())
    .catch(() => null)

// ── Admin — Logs ──────────────────────────────────────────────
export const obtenirActivitesRecentes = () =>
  appelSecurise(`${API}/admin/activites`, { headers: h() }).then(r => r.json())

// Tracker silencieux — fire & forget, ne bloque jamais l'UI
export function trackerActivite(action, detail = '') {
  if (!getToken()) return
  fetch(`${API}/activites/tracker`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify({ action, detail }),
  }).catch(() => {}) // silencieux en cas d'erreur
}

export const obtenirLogs = (f = 'tous', since = null, limit = 300) => {
  const params = new URLSearchParams({ type: f, limit: String(limit) })
  if (since) params.set('since', since)
  return appelSecurise(`${API}/admin/logs?${params}`, { headers: h() }).then(r => r.json())
}

export const purgerLogs = () =>
  appelSecurise(`${API}/admin/logs/purger`, { method: 'DELETE', headers: h() }).then(r => r.json())

// ── Admin — Statistiques ──────────────────────────────────────
export const obtenirStatistiques = () =>
  appelSecurise(`${API}/admin/statistiques`, { headers: h() })
    .then(r => r.json())

export const obtenirStatsDetail = (d1, d2) =>
  appelSecurise(`${API}/admin/statistiques/detail?date_debut=${d1}&date_fin=${d2}`, { headers: h() })
    .then(r => r.json())

// ── Admin — Vider cache matchs ────────────────────────────────
export const viderCacheMatchs = () =>
  appelSecurise(`${API}/admin/matchs/vider-cache`, { method: 'POST', headers: h() })
    .then(r => r.json())

export const obtenirQuotaApi = () =>
  appelSecurise(`${API}/admin/matchs/quota`, { headers: h() })
    .then(r => r.json())
    .catch(() => null)

// ── Admin — Utilisateurs ──────────────────────────────────────
export const obtenirUtilisateurs  = () =>
  appelSecurise(`${API}/admin/utilisateurs`, { headers: h() }).then(r => r.json())

export const creerUtilisateur = d =>
  appelSecurise(`${API}/admin/utilisateurs`, { method: 'POST', headers: h(), body: JSON.stringify(d) })
    .then(r => r.json())

export const modifierUtilisateur = (id, d) =>
  appelSecurise(`${API}/admin/utilisateurs/${id}`, { method: 'PATCH', headers: h(), body: JSON.stringify(d) })
    .then(r => r.json())

export const supprimerUtilisateur = id =>
  appelSecurise(`${API}/admin/utilisateurs/${id}`, { method: 'DELETE', headers: h() })
    .then(r => r.json())

// ── Admin — Confirmation scores ───────────────────────────────
export const obtenirPredictionsAConfirmer = () =>
  appelSecurise(`${API}/admin/confirmations`, { headers: h() }).then(r => r.json())

export const confirmerScoreTrace = (id, data) =>
  appelSecurise(`${API}/admin/confirmations/${id}`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
    .then(r => r.json())

export const obtenirScoresConfirmes = () =>
  appelSecurise(`${API}/admin/confirmations/historique`, { headers: h() }).then(r => r.json())

export const confirmerScoreVip = (id, data) =>
  appelSecurise(`${API}/admin/vip/predictions/${id}/confirmer`, { method: 'POST', headers: h(), body: JSON.stringify(data) })
    .then(r => r.json())

// ── VIP utilisateur ───────────────────────────────────────────
export const obtenirMatchsVip = () =>
  appelSecurise(`${API}/vip/matchs`, { headers: h() }).then(r => r.json())

export const initierPaiementVip = d =>
  appelSecurise(`${API}/vip/paiement/initier`, { method: 'POST', headers: h(), body: JSON.stringify(d) })
    .then(r => r.json())

// Accepte soit un match_id, soit une référence de paiement (retour Wave/OM)
export const verifierPaiementVip = (param) => {
  const body = typeof param === 'string' && param.startsWith('TFC-')
    ? { ref: param }
    : { match_id: param }
  return appelSecurise(`${API}/vip/paiement/verifier`, { method: 'POST', headers: h(), body: JSON.stringify(body) })
    .then(r => r.json())
}

// ── Admin VIP ─────────────────────────────────────────────────
export const obtenirPredVipAdmin = date =>
  appelSecurise(`${API}/admin/vip/predictions?date=${date}`, { headers: h() }).then(r => r.json())

// Toutes les prédictions VIP (sans filtre de date) — pour l'Historique
export const obtenirToutesPredVipAdmin = () =>
  appelSecurise(`${API}/admin/vip/predictions?date=all`, { headers: h() }).then(r => r.json())

export const sauvegarderPredVip = async d => {
  const rep = await appelSecurise(`${API}/admin/vip/predictions`, {
    method: 'POST', headers: h(), body: JSON.stringify(d),
  })
  const json = await rep.json()
  if (!rep.ok) throw new Error(json.message || JSON.stringify(json.errors || json))
  return json
}

export const obtenirPaiementsAdmin = () =>
  appelSecurise(`${API}/admin/vip/paiements`, { headers: h() }).then(r => r.json())

export const supprimerPaiement = id =>
  appelSecurise(`${API}/admin/vip/paiements/${id}`, { method: 'DELETE', headers: h() })
    .then(r => r.json())

export const mettreAJourScoreVip = (id, score) =>
  appelSecurise(`${API}/admin/vip/predictions/${id}/score-reel`, { method: 'PATCH', headers: h(), body: JSON.stringify({ score_reel: score }) })
    .then(r => r.json())

// ── Compétitions — classement + matchs via notre backend ─────
// (Le backend appelle API-Sports, le frontend n'a pas besoin de clé)

// Matchs d'une compétition (saison 2024 — dernière saison complète sur plan gratuit)
export async function obtenirMatchsCompetition(leagueId, cleApi, params = {}) {
  if (!leagueId) return { matches: [], saison: 0 }
  try {
    const rep = await appelSecurise(`${API}/competitions/${leagueId}/matchs`, { headers: h() })
    return rep.json()
  } catch {
    return { matches: [], saison: 0 }
  }
}

// Prochains matchs d'une compétition (saison 2025/26 courante via dates)
export async function obtenirCalendrierCompetition(leagueId) {
  if (!leagueId) return { matches: [] }
  try {
    const rep = await fetch(`${API}/competitions/${leagueId}/calendrier`, { headers: h(false) })
    if (!rep.ok) return { matches: [] }
    return rep.json()
  } catch {
    return { matches: [] }
  }
}

// ── Détails match / classement (API externe football-data.org) ─
export async function obtenirDetailsMatch(matchId, cleApi) {
  if (!cleApi) throw new Error('Clé API manquante')
  const r = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { 'X-Auth-Token': cleApi },
  })
  if (r.status === 429) throw new Error('Limite de débit API atteinte. Veuillez patienter.')
  if (!r.ok) throw new Error('Match introuvable')
  return r.json()
}

// Classement via backend (API-Sports) — plus besoin de clé côté frontend
export async function obtenirClassementChampionnat(leagueId) {
  if (!leagueId) return null
  try {
    const r = await fetch(`${API}/competitions/${leagueId}/classement`, { headers: h(false) })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

// Derniers matchs d'une équipe (API-Sports direct, optionnel)
export async function obtenirDerniersMatchsEquipe(equipeId, cleApi) {
  if (!cleApi || !equipeId) return []
  try {
    const r = await fetch(
      `https://v3.football.api-sports.io/fixtures?team=${equipeId}&last=5`,
      { headers: { 'x-apisports-key': cleApi } }
    )
    if (!r.ok) return []
    const d = await r.json()
    return d.response || []
  } catch { return [] }
}

// ── Admin — Génération automatique tracés (03:55) ─────────────
export const obtenirStatutGeneration = () =>
  appelSecurise(`${API}/admin/generation/statut`, { headers: h() }).then(r => r.json())

export const genererMatchsJour = (date = null) =>
  appelSecurise(`${API}/admin/generation/declencher`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify(date ? { date } : {}),
  }).then(r => r.json())

// ── Admin — Statut mise à jour automatique ────────────────────
export const obtenirStatutMiseAJour = () =>
  appelSecurise(`${API}/admin/mise-a-jour/statut`, { headers: h() }).then(r => r.json())

// Déclenche la mise à jour — passe la clé API stockée côté frontend
// pour ne pas dépendre exclusivement du .env backend
export const declencherMiseAJour = (cleApi = '') =>
  appelSecurise(`${API}/admin/mise-a-jour/declencher`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify({ football_api_key: cleApi || recupererCleApi() }),
  }).then(r => r.json())

// Synchronise toutes les prédictions confirmées → utilisateurs voient les bonnes combinaisons
export const synchroniserPredictions = () =>
  appelSecurise(`${API}/admin/mise-a-jour/synchroniser`, { method: 'POST', headers: h() })
    .then(r => r.json())

// ── Admin — Corrections scores ────────────────────────────────
// Récupère automatiquement les scores des matchs terminés sans résultat
export const recupererScoresHistorique = async () => {
  const rep = await appelSecurise(`${API}/predictions/recuperer-scores`, { method: 'POST', headers: h() })
  const json = await rep.json()
  if (!rep.ok) throw new Error(json.message || 'Erreur de récupération')
  return json
}

export const corrigerScoreReel = (id, data) =>
  appelSecurise(`${API}/predictions/${id}/corriger`, { method: 'PATCH', headers: h(), body: JSON.stringify(data) })
    .then(r => r.json())

export const reinitialiserScore = id =>
  appelSecurise(`${API}/predictions/${id}/reinitialiser`, { method: 'PATCH', headers: h() })
    .then(r => r.json())

export const supprimerPrediction = id =>
  appelSecurise(`${API}/predictions/${id}`, { method: 'DELETE', headers: h() })
    .then(r => r.json())

export const corrigerScoreVip = (id, data) =>
  appelSecurise(`${API}/admin/vip/predictions/${id}/score-reel`, { method: 'PATCH', headers: h(), body: JSON.stringify(data) })
    .then(r => r.json())

export const reinitialiserScoreVip = id =>
  appelSecurise(`${API}/admin/vip/predictions/${id}/reinitialiser`, { method: 'PATCH', headers: h() })
    .then(r => r.json())

export const supprimerPredictionVip = id =>
  appelSecurise(`${API}/admin/vip/predictions/${id}`, { method: 'DELETE', headers: h() })
    .then(r => r.json())
