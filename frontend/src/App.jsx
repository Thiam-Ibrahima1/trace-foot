// ============================================================
// App.jsx — Routing principal Trace FC
// Navigation par hash URL → persistance sur refresh, retour navigateur,
// déconnexion/reconnexion (page mémorisée dans localStorage + hash)
// ============================================================
import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { AuthProvider, useAuth, estCheminAdmin } from './infrastructure/auth/AuthContexte.jsx'
import { trackerActivite } from './adapters/api/ServiceApi.js'

import HeaderUser          from './adapters/ui/composants/HeaderUser.jsx'
import NavbarUser          from './adapters/ui/composants/NavbarUser.jsx'
import AdminLayout         from './adapters/ui/composants/AdminLayout.jsx'

import PageConnexion       from './adapters/ui/pages/PageConnexion.jsx'
import PageConnexionAdmin  from './adapters/ui/pages/PageConnexionAdmin.jsx'

// ── Pages utilisateur — chargement différé ───────────────────
const PageDirect     = lazy(() => import('./adapters/ui/pages/PageDirect.jsx'))
const PageVIP        = lazy(() => import('./adapters/ui/pages/PageVIP.jsx'))
const PagePrediction = lazy(() => import('./adapters/ui/pages/PagePrediction.jsx'))

// ── Pages admin — chargement différé ─────────────────────────
const DashboardAdmin         = lazy(() => import('./adapters/ui/pages/DashboardAdmin.jsx'))
const PageTrace              = lazy(() => import('./adapters/ui/pages/PageTrace.jsx'))
const PageVisualisationTrace = lazy(() => import('./adapters/ui/pages/PageVisualisationTrace.jsx'))
const PageConfirmationScore  = lazy(() => import('./adapters/ui/pages/PageConfirmationScore.jsx'))
const PageMatchsAdmin        = lazy(() => import('./adapters/ui/pages/PageMatchsAdmin.jsx'))
const PageVIPAdmin           = lazy(() => import('./adapters/ui/pages/PageVIPAdmin.jsx'))
const PageStats              = lazy(() => import('./adapters/ui/pages/PageStats.jsx'))
const PageLogs               = lazy(() => import('./adapters/ui/pages/PageLogs.jsx'))
const PageHistoriqueComplet      = lazy(() => import('./adapters/ui/pages/PageHistoriqueComplet.jsx'))
const PageHistoriquePaiements    = lazy(() => import('./adapters/ui/pages/PageHistoriquePaiements.jsx'))
const PageIntelligence       = lazy(() => import('./adapters/ui/pages/PageIntelligence.jsx'))
const PageParametres         = lazy(() => import('./adapters/ui/pages/PageParametres.jsx'))
const PageSystemeApi         = lazy(() => import('./adapters/ui/pages/PageSystemeApi.jsx'))

import './adapters/ui/styles/App.css'

// ── Pages valides par interface ───────────────────────────────
const PAGES_USER  = new Set(['prediction', 'direct', 'vip'])
const PAGES_ADMIN = new Set([
  'dashboard', 'trace', 'visualisation', 'confirmation',
  'matchs', 'vip', 'historique_complet', 'historique', 'intelligence', 'stats', 'logs', 'parametres',
  'historique_paiements', 'systeme_api',
])

// Lecture du hash URL (sans le #)
const lireHash = () => window.location.hash.slice(1) || ''

// ── Interface utilisateur ─────────────────────────────────────
function AppUtilisateur() {
  const { estConnecte, chargement } = useAuth()

  const [page, setPage] = useState(() => {
    const h = lireHash()
    // Hash valide dans l'URL → respecter ; sinon toujours démarrer sur Prédictions
    return PAGES_USER.has(h) ? h : 'prediction'
  })

  const changerPage = useCallback((p) => {
    if (!PAGES_USER.has(p)) return
    // Prédictions = page par défaut → URL propre sans hash
    // Autres pages → hash dans l'URL pour permettre lien direct / bouton retour
    if (p === 'prediction') {
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      window.location.hash = p
    }
    setPage(p)
    const labels = { prediction:'Tous', direct:'Direct', vip:'VIP' }
    trackerActivite('page_' + p, labels[p] || p)
  }, [])

  // Bouton retour du navigateur : respecter le hash de navigation
  useEffect(() => {
    const handler = () => {
      const h = lireHash()
      setPage(PAGES_USER.has(h) ? h : 'prediction')
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  // Au chargement : si l'URL a un hash valide → l'utiliser,
  // sinon nettoyer l'URL (supprimer tout hash parasite comme #direct venant du localStorage)
  useEffect(() => {
    const h = lireHash()
    if (h && !PAGES_USER.has(h)) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, []) // eslint-disable-line

  if (chargement) return <Chargement />
  if (!estConnecte) return <PageConnexion />

  return (
    <div className="app-user">
      {page === 'prediction' && <HeaderUser />}
      <main className="app-user-contenu">
        <Suspense fallback={<Chargement />}>
          {page === 'direct' && <PageDirect />}
          {page === 'vip'    && <PageVIP />}
          {(!PAGES_USER.has(page) || page === 'prediction') && <PagePrediction />}
        </Suspense>
      </main>
      <NavbarUser pageActive={page} onChangerPage={changerPage} />
    </div>
  )
}

// ── Interface admin ───────────────────────────────────────────
function AppAdmin() {
  const { estConnecte, estAdmin, chargement } = useAuth()
  const [matchPrefill, setMatchPrefill]   = useState(null)
  const [matchVisuId, setMatchVisuId]     = useState(null)
  const [vipOnglet,   setVipOnglet]       = useState('predictions')
  const [champRetour, setChampRetour]     = useState(null)

  const [page, setPage] = useState(() => {
    const h = lireHash()
    // Toujours démarrer sur le tableau de bord à la (re)connexion
    // On respecte le hash uniquement s'il est valide et déjà dans l'URL
    return PAGES_ADMIN.has(h) ? h : 'dashboard'
  })

  // Accepte un 2e argument optionnel { vipOnglet: 'historique' | 'paiements' }
  const changerPage = useCallback((p, opts = {}) => {
    if (!PAGES_ADMIN.has(p)) return
    window.location.hash = p
    localStorage.setItem('admin_page', p)
    setPage(p)
    if (p === 'vip' && opts.vipOnglet) setVipOnglet(opts.vipOnglet)
  }, [])

  // Bouton retour du navigateur
  useEffect(() => {
    const handler = () => {
      const h = lireHash()
      if (PAGES_ADMIN.has(h)) { localStorage.setItem('admin_page', h); setPage(h) }
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  // Synchroniser le hash
  useEffect(() => {
    const h = lireHash()
    if (h !== page && PAGES_ADMIN.has(page)) window.location.hash = page
  }, [page])

  if (chargement)                return <Chargement />
  if (!estConnecte || !estAdmin) return <PageConnexionAdmin />

  const naviguerVersTrace = (matchData) => {
    setMatchPrefill(matchData)
    changerPage('trace')
  }

  const naviguerVersVisu = (matchId = null, competition = null) => {
    setMatchVisuId(matchId)
    setChampRetour(competition)
    changerPage('visualisation')
  }

  const retourVersMatchs = (competition = null) => {
    setChampRetour(competition)
    changerPage('matchs')
  }

  const contenu = {
    dashboard:          <DashboardAdmin onChangerPage={changerPage} />,
    trace:              <PageTrace key={matchPrefill?.match_id || 'trace'} matchPrefill={matchPrefill} />,
    visualisation:      <PageVisualisationTrace matchIdInitial={matchVisuId} onRetour={retourVersMatchs} />,
    confirmation:       <PageConfirmationScore />,
    matchs:             <PageMatchsAdmin onNaviguerVisu={naviguerVersVisu} champOuvrirInitial={champRetour} />,
    vip:                <PageVIPAdmin key={vipOnglet} ongletInitial={vipOnglet} />,
    historique_complet:      <PageHistoriqueComplet onVoirTrace={naviguerVersVisu} />,
    historique:              <PageHistoriqueComplet onVoirTrace={naviguerVersVisu} />,
    historique_paiements:    <PageHistoriquePaiements />,
    intelligence:       <PageIntelligence />,
    stats:              <PageStats />,
    logs:               <PageLogs />,
    parametres:         <PageParametres />,
    systeme_api:        <PageSystemeApi />,
  }

  return (
    <AdminLayout pageActive={page} onChangerPage={changerPage}>
      <Suspense fallback={<Chargement />}>
        {contenu[page] || <DashboardAdmin onChangerPage={changerPage} />}
      </Suspense>
    </AdminLayout>
  )
}

// ── Spinner de chargement global ─────────────────────────────
function Chargement() {
  return (
    <div className="app-chargement">
      <div className="charg-spinner" />
      <p>Chargement...</p>
    </div>
  )
}

// ── Point d'entrée ────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      {estCheminAdmin() ? <AppAdmin /> : <AppUtilisateur />}
    </AuthProvider>
  )
}
