// PageLogs.jsx — Journaux système en temps réel (polling 3s)
import { useState, useEffect, useRef, useCallback } from 'react'
import { obtenirLogs, purgerLogs } from '../../../adapters/api/ServiceApi.js'
import './PageLogs.css'

// ── Config ────────────────────────────────────────────────────
const POLL_MS = 15000 // rafraîchissement toutes les 15 secondes

// ── Mapping types → labels / couleurs ─────────────────────────
const TYPE_CONFIG = {
  erreur:                { label: 'Erreur',       bg: '#fee2e2', bord: '#fca5a5', txt: '#dc2626', ico: '✗' },
  succes:                { label: 'Succès',        bg: '#f0fdf4', bord: '#86efac', txt: '#15803d', ico: '✓' },
  mise_a_jour:           { label: 'MAJ',           bg: '#eff6ff', bord: '#93c5fd', txt: '#1d4ed8', ico: '↺' },
  info:                  { label: 'Info',          bg: '#f8fafc', bord: '#e2e8f0', txt: '#475569', ico: 'ℹ' },
  // Actions spécifiques
  connexion:             { label: 'Connexion',     bg: '#f0fdf4', bord: '#86efac', txt: '#15803d', ico: '→' },
  connexion_admin:       { label: 'Admin',         bg: '#fdf4ff', bord: '#d8b4fe', txt: '#7c3aed', ico: '★' },
  deconnexion:           { label: 'Déco',          bg: '#f8fafc', bord: '#e2e8f0', txt: '#64748b', ico: '←' },
  inscription:           { label: 'Inscription',   bg: '#ecfdf5', bord: '#6ee7b7', txt: '#059669', ico: '+' },
  paiement_initie:       { label: 'Paiement',      bg: '#fefce8', bord: '#fde68a', txt: '#d97706', ico: '💳' },
  paiement_valide:       { label: 'Paiement ✓',   bg: '#f0fdf4', bord: '#86efac', txt: '#15803d', ico: '✓' },
  paiement_simule:       { label: 'Sim.',          bg: '#faf5ff', bord: '#d8b4fe', txt: '#7c3aed', ico: '⚡' },
  generation_traces_auto:{ label: 'Génération',    bg: '#faf5ff', bord: '#d8b4fe', txt: '#7c3aed', ico: '✦' },
  generation_vip_auto:   { label: 'VIP auto',      bg: '#fdf4ff', bord: '#f0abfc', txt: '#a21caf', ico: '★' },
  mise_a_jour_auto:      { label: 'Scores',        bg: '#eff6ff', bord: '#93c5fd', txt: '#1d4ed8', ico: '↺' },
  synchronisation_matchs:{ label: 'Synchro',       bg: '#ecfdf5', bord: '#6ee7b7', txt: '#059669', ico: '⇄' },
  score_recupere:        { label: 'Score',         bg: '#eff6ff', bord: '#93c5fd', txt: '#1d4ed8', ico: '⚽' },
  confirmation_score:    { label: 'Confirm.',      bg: '#f0fdf4', bord: '#86efac', txt: '#15803d', ico: '✓' },
  activite_utilisateur:  { label: 'Utilisateur',   bg: '#fafafa', bord: '#e2e8f0', txt: '#64748b', ico: '👤' },
  erreur_api:            { label: 'API Err.',      bg: '#fff1f2', bord: '#fca5a5', txt: '#dc2626', ico: '!' },
}

const getCfg = (type, action) => {
  if (TYPE_CONFIG[action]) return TYPE_CONFIG[action]
  if (TYPE_CONFIG[type])   return TYPE_CONFIG[type]
  return { label: type || 'Info', bg: '#f8fafc', bord: '#e2e8f0', txt: '#475569', ico: 'ℹ' }
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ── Composant principal ───────────────────────────────────────
export default function PageLogs() {
  const [logs,    setLogs]    = useState([])
  const [stats,   setStats]   = useState({})
  const [filtre,  setFiltre]  = useState('tous')
  const [charg,   setCharg]   = useState(true)
  const [live,    setLive]    = useState(true)      // polling actif
  const [nbNouv,  setNbNouv]  = useState(0)         // nouveaux logs depuis last poll
  const [purgeMsg,setPurgeMsg]= useState('')
  const [recherche, setRecherche] = useState('')

  const sinceRef     = useRef(null)  // timestamp du dernier log reçu
  const logsRef      = useRef([])    // miroir de logs pour la closure du polling
  const listeRef     = useRef(null)  // ref sur le conteneur scrollable
  const filtreRef    = useRef(filtre)
  filtreRef.current  = filtre

  // ── Chargement initial (sans since) ──────────────────────────
  const chargerInitial = useCallback(async () => {
    setCharg(true)
    try {
      const d = await obtenirLogs(filtreRef.current)
      const liste = d.logs || []
      setLogs(liste)
      setStats(d.stats || {})
      logsRef.current = liste
      // Mémoriser le timestamp du log le plus récent
      if (liste.length > 0) sinceRef.current = liste[0].date
      if (d.serveur_ts) sinceRef.current = d.serveur_ts
    } catch {}
    setCharg(false)
  }, [])

  // ── Polling : ne récupère que les nouveaux logs ───────────────
  const pollNouveaux = useCallback(async () => {
    if (!live) return
    try {
      const d    = await obtenirLogs(filtreRef.current, sinceRef.current)
      const nouv = d.logs || []
      if (d.serveur_ts) sinceRef.current = d.serveur_ts

      if (nouv.length > 0) {
        setLogs(prev => {
          const ids  = new Set(prev.map(l => l.id))
          const vrNouv = nouv.filter(l => !ids.has(l.id))
          if (!vrNouv.length) return prev
          const combined = [...vrNouv, ...prev].slice(0, 500)
          logsRef.current = combined
          setNbNouv(n => n + vrNouv.length)
          return combined
        })
        setStats(d.stats || {})
        // Scroll vers le haut pour voir les nouveaux logs
        if (listeRef.current) listeRef.current.scrollTop = 0
      }
    } catch {}
  }, [live])

  // Charger au montage + quand le filtre change
  useEffect(() => {
    sinceRef.current = null
    setNbNouv(0)
    chargerInitial()
  }, [filtre, chargerInitial])

  // Polling toutes les 3 secondes
  useEffect(() => {
    if (!live) return
    const id = setInterval(pollNouveaux, POLL_MS)
    return () => clearInterval(id)
  }, [live, pollNouveaux])

  // Réinitialiser compteur nouveaux logs quand l'utilisateur fait défiler
  function onScroll() {
    if (listeRef.current?.scrollTop === 0) setNbNouv(0)
  }

  async function purger() {
    try {
      await purgerLogs()
      setPurgeMsg('Logs purgés.')
      setTimeout(() => setPurgeMsg(''), 3000)
      chargerInitial()
    } catch { setPurgeMsg('Erreur lors de la purge.') }
  }

  // Logs filtrés par recherche
  const logsFiltres = recherche
    ? logs.filter(l =>
        l.message?.toLowerCase().includes(recherche.toLowerCase()) ||
        l.action?.toLowerCase().includes(recherche.toLowerCase()) ||
        l.user?.name?.toLowerCase().includes(recherche.toLowerCase())
      )
    : logs

  const FILTRES = [
    { id: 'tous',        label: 'Tous' },
    { id: 'succes',      label: 'Succès' },
    { id: 'info',        label: 'Info' },
    { id: 'erreur',      label: 'Erreurs' },
    { id: 'mise_a_jour', label: 'MAJ' },
  ]

  return (
    <div className="page-logs">

      {/* ── En-tête ── */}
      <div className="logs-header">
        <div className="logs-header-gauche">
          <h2 className="logs-titre">Journaux système</h2>
          <div className={`logs-live-badge ${live ? 'actif' : 'pause'}`}>
            <span className="logs-live-dot" />
            {live ? 'En direct' : 'Pause'}
          </div>
          {nbNouv > 0 && (
            <span className="logs-nouv-badge">{nbNouv} nouveau{nbNouv>1?'x':''}</span>
          )}
        </div>
        <div className="logs-header-droite">
          <button className={`logs-btn-live ${live?'actif':'off'}`} onClick={() => { setLive(v => !v); setNbNouv(0) }}>
            {live ? '⏸ Pause' : '▶ Reprendre'}
          </button>
          <button className="logs-btn-refresh" onClick={chargerInitial} title="Recharger tout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <button className="logs-btn-purge" onClick={purger} title="Supprimer logs > 30j">
            Purger
          </button>
        </div>
      </div>

      {purgeMsg && <div className="logs-purge-msg">{purgeMsg}</div>}

      {/* ── KPI stats ── */}
      <div className="logs-stats">
        <div className="lstat total">
          <span className="lstat-v">{stats.total||0}</span>
          <span className="lstat-l">Total</span>
        </div>
        <div className="lstat vert">
          <span className="lstat-v">{stats.succes||0}</span>
          <span className="lstat-l">Succès</span>
        </div>
        <div className="lstat bleu">
          <span className="lstat-v">{stats.info||0}</span>
          <span className="lstat-l">Info</span>
        </div>
        <div className="lstat rouge">
          <span className="lstat-v">{stats.erreurs||0}</span>
          <span className="lstat-l">Erreurs</span>
        </div>
        <div className="lstat or">
          <span className="lstat-v">{stats.mise_a_jour||0}</span>
          <span className="lstat-l">MAJ</span>
        </div>
      </div>

      {/* ── Filtres + recherche ── */}
      <div className="logs-toolbar">
        <div className="logs-filtres">
          {FILTRES.map(f => (
            <button key={f.id} className={`lf-btn ${filtre===f.id?'actif':''}`}
              onClick={() => setFiltre(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="logs-search"
          placeholder="Rechercher dans les logs..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
      </div>

      {/* ── Indicateur chargement ── */}
      {charg && (
        <div className="logs-charg-bar">
          <div className="logs-charg-progress" />
        </div>
      )}

      {/* ── Liste des logs ── */}
      <div className="logs-liste" ref={listeRef} onScroll={onScroll}>
        {logsFiltres.length === 0 && !charg && (
          <div className="logs-vide">Aucun log{recherche ? ' pour cette recherche' : ' pour ce filtre'}.</div>
        )}
        {logsFiltres.map((log, i) => {
          const cfg   = getCfg(log.type, log.action)
          const estNouv = i < nbNouv
          return (
            <div key={log.id || i}
              className={`log-ligne ${estNouv ? 'nouveau' : ''}`}
              style={{ borderLeft: `3px solid ${cfg.bord}`, background: cfg.bg }}>

              {/* Badge type */}
              <span className="log-badge" style={{ background: cfg.bord, color: cfg.txt }}>
                {cfg.ico} {cfg.label}
              </span>

              {/* Date */}
              <span className="log-date">{formatDate(log.date)}</span>

              {/* Action */}
              {log.action && (
                <code className="log-action">{log.action}</code>
              )}

              {/* Message */}
              <span className="log-msg" style={{ color: cfg.txt }}>{log.message}</span>

              {/* Utilisateur si présent */}
              {log.user && (
                <span className={`log-user ${log.user.role === 'admin' ? 'admin' : 'user'}`}>
                  {log.user.role === 'admin' ? '★' : '👤'} {log.user.name}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Compte ── */}
      <div className="logs-footer">
        {logsFiltres.length} log{logsFiltres.length > 1 ? 's' : ''} affiché{logsFiltres.length > 1 ? 's' : ''}
        {live && <span className="logs-footer-live">• Mise à jour toutes les {POLL_MS/1000}s</span>}
      </div>
    </div>
  )
}
