// PageHistoriqueComplet.jsx — Historique des combinaisons confirmées
import { useState, useEffect } from 'react'
import {
  obtenirHistorique, supprimerPrediction, getMatchsDuJour, mettreAJourScoreReel,
} from '../../../adapters/api/ServiceApi.js'
import { evaluerCombi } from '../utils/evaluerCombi.js'
import './PageHistoriqueComplet.css'

// ── Logos officiels des championnats ─────────────────────────
const L = id => `https://media.api-sports.io/football/leagues/${id}.png`
const LOGOS_PHC = {
  'Champions League': L(2),   'Europa League': L(3),
  'Conference League': L(848),'Premier League': L(39),
  'Championship': L(40),      'La Liga': L(140),
  'Segunda División': L(141), 'Ligue 1': L(61),
  'Ligue 2': L(62),           'Ligue 2 BKT': L(62),
  'Serie A': L(135),          'Serie B': L(136),
  'Bundesliga': L(78),        '2. Bundesliga': L(79),
  'Liga Portugal': L(94),     'Primeira Liga': L(94),
  'Pro League': L(144),       'Eredivisie': L(88),
  'Super Lig': L(203),        'Süper Lig': L(203),
  'Super League': L(197),     'Premiership': L(179),
  'MLS': L(253),              'Brasileirao Série A': L(71),
  'FA Cup': L(45),            'Copa del Rey': L(143),
  'Coupe de France': L(66),   'DFB Pokal': L(81),
}

function LogoChampHisto({ nom }) {
  const [ok, setOk] = useState(true)
  const src = LOGOS_PHC[nom]
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:20, height:20, borderRadius:'50%', background:'#f0f4f8',
      flexShrink:0, overflow:'hidden',
    }}>
      {src && ok
        ? <img src={src} alt="" style={{width:16,height:16,objectFit:'contain'}} onError={() => setOk(false)} />
        : <span style={{fontSize:'0.6rem'}}>🏆</span>}
    </span>
  )
}

function LogoEquipeHisto({ src, nom, taille = 24 }) {
  const [ok, setOk] = useState(true)
  const initiale = (nom || '?').charAt(0).toUpperCase()
  return src && ok
    ? <img src={src} alt={nom} onError={() => setOk(false)}
        style={{ width:taille, height:taille, objectFit:'contain', borderRadius:4, flexShrink:0 }} />
    : <span style={{
        width:taille, height:taille, borderRadius:'50%', background:'#e2e8f0',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        fontSize: taille * 0.45, fontWeight:800, color:'#475569', flexShrink:0,
      }}>{initiale}</span>
}

function Checkbox({ etat, onChange }) {
  return (
    <button className="phc-checkbox" onClick={e => { e.stopPropagation(); onChange() }} title="Sélectionner">
      <svg viewBox="0 0 18 18" fill="none" width="16" height="16">
        <rect x="1" y="1" width="16" height="16" rx="3"
          stroke={etat === 'vide' ? '#cbd5e1' : '#1b5e20'} strokeWidth="1.5"
          fill={etat === 'coche' ? '#1b5e20' : etat === 'partiel' ? '#f0fdf4' : '#fff'} />
        {etat === 'coche' && <polyline points="4,9 7.5,13 14,5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
        {etat === 'partiel' && <line x1="4.5" y1="9" x2="13.5" y2="9" stroke="#1b5e20" strokeWidth="2" strokeLinecap="round"/>}
      </svg>
    </button>
  )
}

// Icône œil — voir le tracé
const IcoOeil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const labelDate = dateStr => {
  if (!dateStr) return 'Date inconnue'
  const d   = new Date(dateStr + 'T12:00:00')
  const auj = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  if (d.toDateString() === auj.toDateString())  return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Évaluation du résultat d'une ligne basée sur les combinaisons ─
function evaluerLigne(pred, sr) {
  if (!sr) return { correct: false, incorrect: false, nbOk: 0, nbNok: 0 }
  const labels = (pred.combinaisons || [])
    .map(c => typeof c === 'string' ? c : (c?.label || ''))
    .filter(Boolean)
  const nbOk  = labels.filter(l => evaluerCombi(l, sr) === 'ok').length
  const nbNok = labels.filter(l => evaluerCombi(l, sr) === 'nok').length
  return {
    correct:   nbOk > 0,
    incorrect: nbOk === 0 && nbNok > 0,
    nbOk,
    nbNok,
  }
}

export default function PageHistoriqueComplet({ onVoirTrace }) {
  const [toutesLespreds, setToutesPreds] = useState([])
  const [totalTous, setTotalTous] = useState(0)
  const [stats, setStats]   = useState({})
  const [page, setPage]     = useState(1)
  const [pages, setPages]   = useState(1)
  const [charg, setCharg]   = useState(true)
  const [erreur, setErreur] = useState('')
  const [suppEnCours, setSuppEnCours]     = useState(false)
  const [triMode, setTriMode]             = useState('date') 
  const [triMenuOuvert, setTriMenuOuvert] = useState(false)
  const [dateCalendrier, setDateCal]      = useState('')   
  const [champsOuverts, setChampsOuverts] = useState({})
  const [selectionnes, setSelectionnes]   = useState(new Set())
  const [matchMap, setMatchMap]           = useState({})

  const toggle = cle => setChampsOuverts(p => ({ ...p, [cle]: !p[cle] }))
  const ouvert = cle => !!champsOuverts[cle]

  const toggleSelect = id => setSelectionnes(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const selectTout = ids => setSelectionnes(prev => {
    const n = new Set(prev)
    const tousDedans = ids.every(id => n.has(id))
    tousDedans ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id))
    return n
  })
  const etatChamp = ids => {
    const nb = ids.filter(id => selectionnes.has(id)).length
    if (nb === 0) return 'vide'; if (nb === ids.length) return 'coche'; return 'partiel'
  }

  useEffect(() => { charger(page) }, [page])
  useEffect(() => {
    if (!triMenuOuvert) return
    const fermer = () => setTriMenuOuvert(false)
    document.addEventListener('click', fermer)
    return () => document.removeEventListener('click', fermer)
  }, [triMenuOuvert])
  useEffect(() => {
    const id = setInterval(() => rafraichirSilencieux(page), 30000)
    return () => clearInterval(id)
  }, [page])

  async function charger(p) {
    setCharg(true); setErreur('')
    try {
      const r = await obtenirHistorique(p)
      const confirmes = (r.predictions || []).filter(pred =>
        pred.trace_status === 'valide' ||
        pred.verification?.concordance === true ||
        pred.score_confirme === true ||
        pred.score_reel !== null
      )
      setToutesPreds(confirmes)
      setTotalTous(r.total || confirmes.length)
      setStats(r.stats || {})
      setPages(r.pages || 1)
      chargerMatchMap(confirmes)
    } catch(e) { setErreur(e.message || 'Erreur de chargement.') }
    setCharg(false)
  }

  async function chargerMatchMap(preds) {
    const liste = preds ?? []
    if (!liste.length) return
    try {
      // Récupérer les scores pour TOUS les matchs sans score_reel
      const datesAFaire = [...new Set(
        liste.filter(p => !p.score_reel && p.date).map(p => p.date)
      )]
      if (!datesAFaire.length) return

      const map = {}
      await Promise.all(datesAFaire.map(async date => {
        try {
          const r = await getMatchsDuJour(date)
          ;(r.matchs || []).forEach(m => {
            const scoreReelAPI = m.statut_code === 'FINISHED' && m.score_dom !== null
              ? `${m.score_dom}-${m.score_ext}` : null
            map[String(m.id)] = {
              score:    scoreReelAPI,
              logo_dom: m.logo_dom || null,
              logo_ext: m.logo_ext || null,
            }
          })
        } catch { /* silencieux */ }
      }))

      setMatchMap(prev => ({ ...prev, ...map }))

      // Mettre à jour le score ET évaluer automatiquement les combinaisons
      let modifie = false
      const miseAJour = liste.map(pred => {
        const scoreApi = map[String(pred.match_id)]?.score
        if (!pred.score_reel && scoreApi) {
          mettreAJourScoreReel(pred.id, scoreApi).catch(() => {})
          modifie = true
          // Évaluer automatiquement chaque combinaison avec le score réel
          const combisEvaluees = (pred.combinaisons || []).map(c => ({
            ...c,
            etat: evaluerCombi(c.label, scoreApi),
          }))
          return { ...pred, score_reel: scoreApi, combinaisons: combisEvaluees }
        }
        return pred
      })
      if (modifie) setToutesPreds(miseAJour)
    } catch { /* silencieux */ }
  }

  async function rafraichirSilencieux(p) {
    try {
      const r = await obtenirHistorique(p)
      const confirmes = (r.predictions || []).filter(pred =>
        pred.trace_status === 'valide' ||
        pred.verification?.concordance === true ||
        pred.score_confirme === true ||
        pred.score_reel !== null
      )
      setToutesPreds(confirmes)
      setStats(r.stats || {})
      setPages(r.pages || 1)
      // Re-vérifier les scores manquants à chaque rafraîchissement
      chargerMatchMap(confirmes)
    } catch { /* silencieux */ }
  }

  const mData    = pred => matchMap[String(pred.match_id)] || {}
  const scoreEff = pred => pred.score_reel || mData(pred).score || null
  const logoDom  = pred => mData(pred).logo_dom || null
  const logoExt  = pred => mData(pred).logo_ext || null

  async function supprimer(id) {
    setSuppEnCours(true)
    try {
      await supprimerPrediction(id)
      setToutesPreds(prev => prev.filter(p => p.id !== id))
      setSelectionnes(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch { setErreur('Erreur lors de la suppression.') }
    setSuppEnCours(false)
  }

  async function supprimerSelection(ids) {
    const liste = ids || [...selectionnes]
    if (!liste.length) return
    setSuppEnCours(true)
    try {
      await Promise.all(liste.map(id => supprimerPrediction(id)))
      setToutesPreds(prev => prev.filter(p => !liste.includes(p.id)))
      setSelectionnes(prev => { const n = new Set(prev); liste.forEach(id => n.delete(id)); return n })
    } catch { setErreur('Erreur lors de la suppression groupée.') }
    setSuppEnCours(false)
  }

  // ── Rendu d'une ligne prédiction (factorisé pour les deux vues) ──
  function LignePred({ pred, showDate = false }) {
    const sr              = scoreEff(pred)
    const { correct, incorrect, nbOk, nbNok } = evaluerLigne(pred, sr)
    const sel             = selectionnes.has(pred.id)
    const termine         = !!sr

    const statutLabel = !termine
      ? '⏳ En attente'
      : correct
        ? `✓ Validé (${nbOk}/${nbOk + nbNok})`
        : `✗ Perdu (0/${nbNok})`

    const statutClasse = !termine ? 'attente' : correct ? 'correct' : 'incorrect'

    return (
      <div
        className={`phc-pred-ligne ${correct ? 'correct' : incorrect ? 'incorrect' : ''} ${sel ? 'selectionnee' : ''}`}
      >
        <Checkbox etat={sel ? 'coche' : 'vide'} onChange={() => toggleSelect(pred.id)} />

        {/* Match */}
        <div className="phc-pred-match">
          <LogoEquipeHisto src={logoDom(pred)} nom={pred.domicile} taille={22} />
          <span className="phc-dom">{pred.domicile}</span>
          <span className="phc-vs">{showDate ? (pred.date || '—') : (pred.heure || '—')}</span>
          <span className="phc-ext">{pred.exterieur}</span>
          <LogoEquipeHisto src={logoExt(pred)} nom={pred.exterieur} taille={22} />
        </div>

        {/* Scores + statut */}
        <div className="phc-pred-scores">
          {termine && (
            <div className="phc-score-bloc">
              <span className="phc-score-lbl">Score final</span>
              <span className={`phc-score-val ${correct ? 'correct' : 'incorrect'}`}>{sr}</span>
            </div>
          )}
          <span className={`phc-statut ${statutClasse}`}>{statutLabel}</span>
        </div>

        {/* Combinaisons */}
        {pred.combinaisons?.length > 0 && (
          <div className="phc-combis">
            {pred.combinaisons.map((c, j) => {
              const label = typeof c === 'string' ? c : (c?.label || '')
              if (!label) return null
              const etat = evaluerCombi(label, sr)
              return (
                <span key={j} className={`phc-combi ${etat === 'ok' ? 'combi-ok' : etat === 'nok' ? 'combi-nok' : 'combi-pending'}`}>
                  {label}
                </span>
              )
            })}
          </div>
        )}

        {/* Bouton œil — voir le tracé */}
        {onVoirTrace && (
          <button
            className="phc-btn-voir-trace"
            title="Voir le tracé de ce match"
            onClick={e => { e.stopPropagation(); onVoirTrace(pred.match_id) }}
          >
            <IcoOeil />
            <span>Tracé</span>
          </button>
        )}
      </div>
    )
  }

  // ── Vue par date ─────────────────────────────────────────────
  const parDate = toutesLespreds.reduce((acc, p) => {
    const d = p.date || 'Inconnue'
    if (!acc[d]) acc[d] = {}
    const c = p.competition || 'Autre'
    if (!acc[d][c]) acc[d][c] = []
    acc[d][c].push(p)
    return acc
  }, {})
  const dates = Object.keys(parDate).sort().reverse()

  // ── Vue calendrier — filtrée par date choisie ─────────────────
  const predsCalendrier = dateCalendrier
    ? toutesLespreds.filter(p => p.date === dateCalendrier)
    : []
  const parChampCal = predsCalendrier.reduce((acc, p) => {
    const c = p.competition || 'Autre'
    if (!acc[c]) acc[c] = []
    acc[c].push(p)
    return acc
  }, {})
  const champsCal = Object.keys(parChampCal).sort()
  // Toutes les dates disponibles pour le datepicker (min/max)
  const datesDispos = dates.filter(d => d !== 'Inconnue').sort()
  const dateMin = datesDispos[datesDispos.length - 1] || ''
  const dateMax = datesDispos[0] || ''

  // Stats globales — comptées par COMBINAISON individuelle
  // Ex: match avec 3 combis dont 2 ok + 1 nok → +2 validés, +1 perdu
  let combisValides = 0
  let combisPerdus  = 0
  toutesLespreds.forEach(p => {
    const sr = scoreEff(p)
    if (!sr) return
    ;(p.combinaisons || []).forEach(c => {
      const l = typeof c === 'string' ? c : (c?.label || '')
      if (!l) return
      const etat = evaluerCombi(l, sr)
      if (etat === 'ok')  combisValides++
      if (etat === 'nok') combisPerdus++
    })
  })
  const taux = (combisValides + combisPerdus) > 0
    ? Math.round(combisValides / (combisValides + combisPerdus) * 100) : 0

  // ── Barre de sélection réutilisable ─────────────────────────
  function BarreSelection({ preds }) {
    const ids = preds.map(p => p.id)
    const nbSel = ids.filter(id => selectionnes.has(id)).length
    return (
      <div className="phc-select-barre">
        <div className="phc-select-tout-wrap" onClick={e => { e.stopPropagation(); selectTout(ids) }}>
          <Checkbox etat={etatChamp(ids)} onChange={() => selectTout(ids)} />
          <span className="phc-select-tout-lbl">Tout sélectionner</span>
        </div>
        {nbSel > 0 && (
          <button className="phc-btn-suppr-champ" disabled={suppEnCours}
            onClick={() => supprimerSelection(ids.filter(id => selectionnes.has(id)))}>
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <polyline points="2 4 4 4 14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 4l-1 9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 13L3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 4V3h4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {suppEnCours ? '...' : `Supprimer (${nbSel})`}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="phc-page">

      {/* Stats globales */}
      <div className="phc-stats">
        <div className="phc-stat">
          <span className="phc-stat-val">{totalTous || toutesLespreds.length}</span>
          <span className="phc-stat-lbl">Confirmés</span>
        </div>
        <div className="phc-stat vert">
          <span className="phc-stat-val">{combisValides}</span>
          <span className="phc-stat-lbl">✓ Validés</span>
        </div>
        <div className="phc-stat rouge">
          <span className="phc-stat-val">{combisPerdus}</span>
          <span className="phc-stat-lbl">✗ Perdus</span>
        </div>
        <div className="phc-stat bleu">
          <span className="phc-stat-val">{taux}%</span>
          <span className="phc-stat-lbl">Réussite</span>
        </div>
      </div>

      {/* Barre de tri */}
      <div className="phc-tri-barre">
        <span className="phc-tri-nb">{toutesLespreds.length} match{toutesLespreds.length > 1 ? 's' : ''}</span>

        {/* Sélecteur de date — visible uniquement en mode calendrier */}
        {triMode === 'calendrier' && (
          <div className="phc-cal-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0,color:'#64748b'}}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              className="phc-cal-input"
              value={dateCalendrier}
              min={dateMin}
              max={dateMax}
              onChange={e => setDateCal(e.target.value)}
            />
            {dateCalendrier && (
              <button className="phc-cal-reset" onClick={() => setDateCal('')} title="Effacer">✕</button>
            )}
          </div>
        )}

        <div className="phc-tri-wrap" style={{ position:'relative', marginLeft: triMode === 'calendrier' ? 0 : 'auto' }}
          onClick={e => e.stopPropagation()}>
          <button className="phc-tri-btn-principal" onClick={() => setTriMenuOuvert(o => !o)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="7" y1="12" x2="17" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Trier
            <span className="phc-tri-mode-actif">
              {triMode === 'date' ? 'Par date' : 'Calendrier'}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{width:11,height:11,flexShrink:0,transform: triMenuOuvert ? 'rotate(180deg)':'none',transition:'transform .2s'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {triMenuOuvert && (
            <div className="phc-tri-menu">
              {[
                {
                  id: 'date',
                  label: 'Par date',
                  ico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
                },
                {
                  id: 'calendrier',
                  label: 'Calendrier (choisir un jour)',
                  ico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                },
              ].map(opt => (
                <button key={opt.id} className={`phc-tri-option ${triMode === opt.id ? 'actif' : ''}`}
                  onClick={() => { setTriMode(opt.id); setTriMenuOuvert(false) }}>
                  {opt.ico}{opt.label}
                  {triMode === opt.id && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12,marginLeft:'auto'}}><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {charg && <div className="phc-charg">Chargement de l'historique...</div>}
      {erreur && <div className="phc-erreur">{erreur}</div>}

      {/* ══ VUE CALENDRIER ═══════════════════════════════════════ */}
      {!charg && triMode === 'calendrier' && (
        <>
          {!dateCalendrier && (
            <div className="phc-cal-aide">
              Choisissez un jour dans le sélecteur ci-dessus pour afficher les matchs de cette journée.
            </div>
          )}
          {dateCalendrier && predsCalendrier.length === 0 && (
            <div className="phc-vide">Aucun match confirmé le {labelDate(dateCalendrier)}.</div>
          )}
          {dateCalendrier && predsCalendrier.length > 0 && (
            <div className="phc-date-section">
              <div className="phc-date-header">
                <span className="phc-date-label">{labelDate(dateCalendrier)}</span>
                <span className="phc-date-raw">{dateCalendrier}</span>
                <span className="phc-date-nb">{predsCalendrier.length} match{predsCalendrier.length > 1 ? 's' : ''}</span>
              </div>
              {champsCal.map(champ => {
                const preds = parChampCal[champ]
                const cle   = `cal||${dateCalendrier}||${champ}`
                const est   = ouvert(cle) !== false ? ouvert(cle) : true
                return (
                  <div key={champ} className={`phc-champ-bloc ${est ? 'ouvert' : ''}`}>
                    <div className="phc-champ-header-wrap">
                      <button className="phc-champ-header" onClick={() => toggle(cle)}>
                        <LogoChampHisto nom={champ} />
                        <span className="phc-champ-nom">{champ}</span>
                        <span className="phc-champ-nb">{preds.length}</span>
                        <span className="phc-chevron" style={{ transform: est ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                      </button>
                    </div>
                    {est && <BarreSelection preds={preds} />}
                    {est && preds.map(pred => <LignePred key={pred.id} pred={pred} />)}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══ VUE PAR DATE ════════════════════════════════════════ */}
      {!charg && triMode === 'date' && dates.map(dateStr => {
        const parChamp  = parDate[dateStr]
        const totalJour = Object.values(parChamp).reduce((s, l) => s + l.length, 0)
        return (
          <div key={dateStr} className="phc-date-section">
            <div className="phc-date-header">
              <span className="phc-date-label">{labelDate(dateStr)}</span>
              <span className="phc-date-raw">{dateStr}</span>
              <span className="phc-date-nb">{totalJour} match{totalJour > 1 ? 's' : ''}</span>
            </div>

            {Object.entries(parChamp).map(([champ, preds]) => {
              const cle = `${dateStr}||${champ}`
              const est = ouvert(cle)
              return (
                <div key={champ} className={`phc-champ-bloc ${est ? 'ouvert' : ''}`}>
                  <div className="phc-champ-header-wrap">
                    <button className="phc-champ-header" onClick={() => toggle(cle)}>
                      <LogoChampHisto nom={champ} />
                      <span className="phc-champ-nom">{champ}</span>
                      <span className="phc-champ-nb">{preds.length}</span>
                      <span className="phc-chevron" style={{ transform: est ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 12 15 18 9"/></svg>
                      </span>
                    </button>
                  </div>
                  {est && <BarreSelection preds={preds} />}
                  {est && preds.map(pred => <LignePred key={pred.id} pred={pred} />)}
                </div>
              )
            })}
          </div>
        )
      })}

      {!charg && toutesLespreds.length === 0 && !erreur && (
        <div className="phc-vide">
          Aucune prédiction confirmée. Générez et confirmez des tracés pour les voir ici.
        </div>
      )}

      {pages > 1 && (
        <div className="phc-pagination">
          <button className="phc-btn-page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
          <span className="phc-page-num">Page {page} / {pages}</span>
          <button className="phc-btn-page" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  )
}
