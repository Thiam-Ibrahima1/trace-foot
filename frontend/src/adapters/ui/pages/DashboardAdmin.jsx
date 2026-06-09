import { useState, useEffect } from 'react'
import {
  obtenirStatistiques, obtenirPaiementsAdmin,
  obtenirLogs, synchroniserPredictions,
  obtenirActivitesRecentes,
  obtenirStatutGeneration, genererMatchsJour,
  obtenirQuotaApi,
} from '../../../adapters/api/ServiceApi.js'
import './DashboardAdmin.css'

// ── Icônes SVG ─────────────────────────────────────────────────
const Ico = {
  trace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  maisons: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  confirmer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  vip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  matchs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  ),
  historique: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14"/>
      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
    </svg>
  ),
  logs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  paiement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  fleche: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  rafraichir: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  predictions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  taux: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  certifie: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  caisse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  utilisateurs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
}

// ── Accès rapide — configuration ───────────────────────────────
const ACCES_RAPIDE = [
  { ico: 'matchs',     label: 'Voir les matchs',      sous: 'Calendrier + générer tracés', page: 'matchs',              couleur: '#16a34a' },
  { ico: 'maisons',    label: 'Voir les maisons',      sous: 'Vérifier & certifier tracés', page: 'visualisation',       couleur: '#0ea5e9' },
  { ico: 'trace',      label: 'Générer un tracé',      sous: 'Tracé manuel A→Z',            page: 'trace',               couleur: '#8b5cf6' },
  { ico: 'confirmer',  label: 'Confirmer scores',       sous: 'Scores en attente + résultats', page: 'confirmation',      couleur: '#2e7d32' },
  { ico: 'vip',        label: 'VIP & Paiements',        sous: 'Scores exacts + revenus',     page: 'vip',                 couleur: '#d97706' },
  { ico: 'historique', label: 'Historique complet',     sous: 'Toutes les prédictions',      page: 'historique_complet',  couleur: '#64748b' },
  { ico: 'stats',      label: 'Statistiques',           sous: '% combinaisons & CA VIP',     page: 'stats',               couleur: '#c026d3' },
  { ico: 'logs',       label: 'Logs système',           sous: 'Journal des actions',         page: 'logs',                couleur: '#475569' },
]

// ── Composant principal ─────────────────────────────────────────
export default function DashboardAdmin({ onChangerPage }) {
  const [stats,         setStats]        = useState(null)
  const [paiements,     setPaiements]    = useState([])
  const [activites,     setActivites]    = useState([])
  const [dernierLog,    setDernierLog]   = useState(null)
  const [quota,         setQuota]        = useState(null)
  const [charg,         setCharg]        = useState(true)
  const [majEnCours,    setMajEnCours]   = useState(false)
  const [majMsg,        setMajMsg]       = useState('')
  const [genStatus,     setGenStatus]    = useState(null)
  const [genEnCours,    setGenEnCours]   = useState(false)
  const [genMsg,        setGenMsg]       = useState('')
  const [actExpand,     setActExpand]    = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    setCharg(true)

    // ── Phase 1 : données rapides (toutes en cache backend) ──
    // stats=5min · activites=60s · logs=10 enregistrements
    // La page s'affiche dès que ces 3 appels répondent.
    try {
      const [s, act, logs] = await Promise.all([
        obtenirStatistiques().catch(() => null),
        obtenirActivitesRecentes().catch(() => null),
        obtenirLogs('tous', null, 10).catch(() => null),
      ])
      if (s) setStats(s)
      if (act) setActivites(act.activites || [])
      if (logs) {
        const logMaj = (logs.logs || []).find(l =>
          l.action === 'synchronisation_matchs' ||
          l.action === 'mise_a_jour_auto'       ||
          l.action === 'score_recupere'
        )
        setDernierLog(logMaj || null)
      }
    } catch {}

    setCharg(false) // Affiche la page immédiatement

    // ── Phase 2 : données secondaires (en arrière-plan) ──
    // paiements=120s cache · quota=10min cache · generation=lecture fichier
    Promise.all([
      obtenirPaiementsAdmin().catch(() => null),
      obtenirStatutGeneration().catch(() => null),
      obtenirQuotaApi().catch(() => null),
    ]).then(([p, gen, q]) => {
      if (p)   setPaiements(p.paiements || [])
      if (gen) setGenStatus(gen)
      if (q && !q.erreur) setQuota(q)
    }).catch(() => {})
  }

  async function lancerMaj() {
    setMajEnCours(true); setMajMsg('')
    try {
      const r = await synchroniserPredictions()

      if (!r || typeof r !== 'object') throw new Error('Réponse invalide')

      // Message résultat
      setMajMsg(r.message || '✅ Synchronisation effectuée.')

      // Mettre à jour immédiatement la date/heure
      const dateSync = r.date_sync || new Date().toISOString()
      setDernierLog({
        date:       dateSync,
        created_at: dateSync,
        action:     'synchronisation_matchs',
        message:    r.message,
      })

      // Recharger les stats (silencieux si échec)
      try {
        const s = await obtenirStatistiques()
        setStats(s)
      } catch { /* silencieux */ }

    } catch (e) {
      setMajMsg(' Erreur : ' + (e?.message || 'Vérifiez que le serveur backend est démarré.'))
    }
    setMajEnCours(false)
  }

  async function lancerGeneration() {
    setGenEnCours(true); setGenMsg('')
    try {
      const r = await genererMatchsJour()
      // Synchroniser les combinaisons générées vers les utilisateurs
      try { await synchroniserPredictions() } catch {}
      const msgVip = r.nb_vip > 0 ? ` + ${r.nb_vip} VIP` : ''
      setGenMsg(r.message || `✅ Génération terminée${msgVip}.`)
      if (r.nb_traces !== undefined) {
        setGenStatus(prev => ({
          ...prev,
          generes_aujourd_hui: r.nb_traces,
          derniere_execution: {
            date: r.date_exec || new Date().toISOString(),
            message: r.message,
            statut: 'succes',
          },
        }))
      }
      try { const s = await obtenirStatistiques(); setStats(s) } catch {}
    } catch(e) {
      setGenMsg('❌ Erreur : ' + (e?.message || 'Vérifiez que le serveur backend est démarré.'))
    }
    setGenEnCours(false)
  }

  if (charg) return (
    <div className="dashboard dashboard-fixe">
      <div className="dash-skel-kpis">
        {[1, 2, 3].map(i => <div key={i} className="dash-skel-kpi" />)}
      </div>
      <div className="dash-skel-section" />
      <div className="dash-skel-section dash-skel-section--lg" />
    </div>
  )

  const g = stats?.global || {}

  return (
    <div className="dashboard dashboard-fixe">

      {/* ── Ligne 1 : 3 KPI ── */}
      <div className="dash-kpi-grille">

        <div className="dash-kpi-carte bleu">
          <div className="dash-kpi-haut">
            <div className="dash-kpi-ico">{Ico.matchs}</div>
            <div className="dash-kpi-corps">
              <div className="dash-kpi-lbl">Matchs Analysés</div>
              <div className="dash-kpi-val">{(g.total_matchs_generes ?? g.predictions_total ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <div className="dash-kpi-sep" />
          <button className="dash-kpi-voir" onClick={() => onChangerPage('historique_complet')}>
            Voir détails
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>

        <div className="dash-kpi-carte or">
          <div className="dash-kpi-haut">
            <div className="dash-kpi-ico">{Ico.vip}</div>
            <div className="dash-kpi-corps">
              <div className="dash-kpi-lbl">Matchs VIP</div>
              <div className="dash-kpi-val">{(g.vip_publies ?? g.vip_total ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <div className="dash-kpi-sep" />
          <button className="dash-kpi-voir" onClick={() => onChangerPage('vip', { vipOnglet: 'historique' })}>
            Voir détails
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>

        <div className="dash-kpi-carte vert">
          <div className="dash-kpi-haut">
            <div className="dash-kpi-ico">{Ico.caisse}</div>
            <div className="dash-kpi-corps">
              <div className="dash-kpi-lbl">Volume Total</div>
              <div className="dash-kpi-val dash-kpi-val-sm">{g.ca_vip ?? '0 FCFA'}</div>
            </div>
          </div>
          <div className="dash-kpi-sep" />
          <button className="dash-kpi-voir" onClick={() => onChangerPage('vip', { vipOnglet: 'paiements' })}>
            Voir détails
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>

      </div>

      {/* ── Mini-indicateur quota API-Sports ── */}
      {quota && !quota.erreur && <QuotaMini quota={quota} onChangerPage={onChangerPage} />}

      {/* Séparateur */}
      <div className="dash-separateur" />

      {/* ── Layout principal : Activités gauche / Paiements+MàJ droite ── */}
      <div className="dash-layout-principal">

        {/* Activités Récentes — colonne gauche (span 2 lignes) */}
        <section className="dash-section dash-activites">
          <div className="dash-section-header">
            <div className="dash-section-titre">
              <span className="dash-titre-ico" style={{color:'#8b5cf6'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                  <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
                </svg>
              </span>
              Activités Récentes
            </div>
            <span className="dash-act-compteur">
              {activites.length} activité{activites.length > 1 ? 's' : ''}
            </span>
          </div>

          {activites.length === 0 ? (
            <div className="dash-act-vide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:36,height:36,color:'#cbd5e1'}}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Aucune activité enregistrée.</span>
            </div>
          ) : (
            <div className="dash-act-liste">
              {(actExpand ? activites : activites.slice(0, 5)).map((act, i) => {
                const date  = new Date(act.date)
                const heure = date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
                const jour  = date.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
                const isAuj = date.toDateString() === new Date().toDateString()
                const IcoPaiement = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
                const IcoUser     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
                const IcoAction   = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
                const statutConfig = { valide:{label:'Validé',cls:'vert'}, en_attente:{label:'Attente',cls:'or'}, echec:{label:'Échec',cls:'rouge'}, succes:{label:'Succès',cls:'vert'}, info:{label:'Action',cls:'bleu'}, erreur:{label:'Erreur',cls:'rouge'} }
                const sc = statutConfig[act.statut] || { label: act.statut, cls: 'bleu' }
                return (
                  <div key={i} className={`dash-act-ligne ${act.statut}`}>
                    <div className={`dash-act-ico dash-act-ico--${act.type}`}>
                      {act.type === 'paiement'    && <IcoPaiement />}
                      {act.type === 'inscription' && <IcoUser />}
                      {act.type === 'action'      && <IcoAction />}
                    </div>
                    <div className="dash-act-corps">
                      <div className="dash-act-top">
                        <span className="dash-act-nom">{act.user_nom}</span>
                        {act.methode && <span className="dash-act-methode">{act.methode}</span>}
                      </div>
                      {act.user_email && <span className="dash-act-email">{act.user_email}</span>}
                      <span className="dash-act-desc">{act.description}</span>
                    </div>
                    <div className="dash-act-droite">
                      <span className="dash-act-date">{isAuj ? `Aujourd'hui · ${heure}` : `${jour} · ${heure}`}</span>
                      <span className={`dash-act-badge dash-act-badge--${sc.cls}`}>
                        {act.statut === 'valide' || act.statut === 'succes'
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:10,height:10}}><polyline points="20 6 9 17 4 12"/></svg>
                          : act.statut === 'echec' || act.statut === 'erreur'
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:10,height:10}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:10,height:10}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        {sc.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activites.length > 5 && (
            <button className="dash-act-voir-plus" onClick={() => setActExpand(v => !v)}>
              {actExpand ? '↑ Voir moins' : `↓ Voir plus (${activites.length - 5} de plus)`}
            </button>
          )}
        </section>

        {/* ── Colonne droite : 3 sections empilées en flex ── */}
        <div className="dash-droite-col">

          {/* 1. Historiques Paiements */}
          <section className="dash-section dash-droite-carte dash-droite-carte--or">
            <div className="dash-section-header">
              <div className="dash-section-titre">
                <span className="dash-titre-ico" style={{color:'#d97706'}}>{Ico.paiement}</span>
                Historiques Paiements
              </div>
              <button className="dash-voir-lien" onClick={() => onChangerPage('historique_paiements')}>
                Voir {Ico.fleche}
              </button>
            </div>
            <div className="dash-pai-resume">
              <span className="dash-pai-resume-nb">
                {paiements.length} paiement{paiements.length > 1 ? 's' : ''} au total
              </span>
              <span className="dash-pai-resume-ca">
                {paiements.filter(p => p.statut === 'valide').length} validé{paiements.filter(p => p.statut === 'valide').length > 1 ? 's' : ''}
              </span>
            </div>
          </section>

          {/* 2. Mise à jour des scores */}
          <section className="dash-section dash-droite-carte dash-droite-carte--vert">
            <div className="dash-section-header">
              <div className="dash-section-titre">
                <span className="dash-titre-ico" style={{color:'#16a34a'}}>{Ico.rafraichir}</span>
                Mise à jour scores
              </div>
            </div>
            <div className="dash-auto-info">
              <div className="dash-auto-badge dash-badge--vert">
                <span className="dash-auto-dot" />
                <span className="dash-auto-label" style={{color:'#15803d'}}>Auto · 04:00 Dakar</span>
              </div>
              <div className="dash-droite-ligne">
                <span className="dal-titre">Dernière exécution</span>
                {dernierLog ? (
                  <span className="dal-val ok" style={{fontSize:'0.72rem'}}>
                    {Ico.confirmer} {new Date(dernierLog.date || dernierLog.created_at).toLocaleString('fr-FR')}
                  </span>
                ) : (
                  <span className="dal-val gris">Aucune enregistrée</span>
                )}
              </div>
              <button className="btn-droite" onClick={lancerMaj} disabled={majEnCours}
                style={{background:'linear-gradient(135deg,#14532d,#15803d,#16a34a)'}}>
                <span className={majEnCours ? 'btn-ico spin' : 'btn-ico'}>{Ico.rafraichir}</span>
                {majEnCours ? 'Synchronisation...' : 'Synchroniser'}
              </button>
              {majMsg && <span className="dash-maj-msg">{majMsg}</span>}
            </div>
          </section>

          {/* 3. Génération automatique tracés */}
          <section className="dash-section dash-droite-carte dash-droite-carte--violet">
            <div className="dash-section-header">
              <div className="dash-section-titre">
                <span className="dash-titre-ico" style={{color:'#7c3aed',background:'#f3e8ff'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
                Génération Tracés
              </div>
              {genStatus?.generes_aujourd_hui > 0 && (
                <span className="dash-gen-nb-header">
                  {genStatus.generes_aujourd_hui} aujourd'hui
                </span>
              )}
            </div>
            <div className="dash-auto-info">
              <div className="dash-auto-badge dash-badge--violet">
                <span className="dash-auto-dot" style={{background:'#7c3aed'}}/>
                <span className="dash-auto-label" style={{color:'#6d28d9'}}>Auto · 03:55 Dakar</span>
              </div>
              <div className="dash-droite-ligne">
                <span className="dal-titre">Dernière génération</span>
                {genStatus?.derniere_execution ? (
                  <span className="dal-val ok" style={{fontSize:'0.72rem'}}>
                    {Ico.confirmer} {new Date(genStatus.derniere_execution.date).toLocaleString('fr-FR')}
                  </span>
                ) : (
                  <span className="dal-val gris">Aucune enregistrée</span>
                )}
              </div>
              <button className="btn-droite" onClick={lancerGeneration} disabled={genEnCours}
                style={{background:'linear-gradient(135deg,#5b21b6,#7c3aed,#9333ea)'}}>
                <span className={genEnCours ? 'btn-ico spin' : 'btn-ico'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
                {genEnCours ? 'Génération...' : 'Générer maintenant'}
              </button>
              {genMsg && <span className="dash-maj-msg">{genMsg}</span>}
            </div>
          </section>

        </div>{/* fin dash-droite-col */}

      </div>{/* fin dash-layout-principal */}

    </div>
  )
}

// ── Mini-indicateur quota (dashboard) ─────────────────────────
function QuotaMini({ quota, onChangerPage }) {
  const pct    = quota.pourcentage ?? 0
  const niveau = pct >= 80 ? 'rouge' : pct >= 50 ? 'jaune' : 'vert'
  const couleur = { vert:'#16a34a', jaune:'#d97706', rouge:'#dc2626' }[niveau]

  return (
    <div className="qmini-wrap">
      {/* Feux horizontaux */}
      <div className="qmini-feu">
        <div className={`qmini-dot rouge ${niveau === 'rouge' ? 'actif' : ''}`} title="Danger > 80%" />
        <div className={`qmini-dot jaune ${niveau === 'jaune' ? 'actif' : ''}`} title="Attention 50–80%" />
        <div className={`qmini-dot vert  ${niveau === 'vert'  ? 'actif' : ''}`} title="Normal < 50%" />
      </div>
      <div className="qmini-sep" />
      <div className="qmini-info">
        <span className="qmini-label">API-Sports</span>
        <span className="qmini-compte" style={{color: couleur}}>
          {quota.utilises}/{quota.limite_jour} req
        </span>
        <span className="qmini-restant">({quota.restants} restantes)</span>
      </div>
      <button className="qmini-voir" onClick={() => onChangerPage('systeme_api')}>
        Surveillance →
      </button>
    </div>
  )
}
