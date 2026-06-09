// ============================================================
// PagePrediction.jsx — Calendrier + Prédictions (ancienne "Tous")
// Navbar : 3 jours passés (résultats + combis colorées) + aujourd'hui + 7 jours futurs
// Logos officiels des championnats (api-sports.io CDN)
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getMatchsSemaine, obtenirPredictionsParDate, formaterDateAPI, getMatchsLive,
  trackerActivite,
} from '../../../adapters/api/ServiceApi.js'
import PanneauMatchDirect from './PanneauMatchDirect.jsx'
import './PagePrediction.css'

// ── Utilitaires date ─────────────────────────────────────────
function enDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const dateAujStr = () => enDateStr(new Date())

// Utilisateur : hier + aujourd'hui + demain = 3 jours uniquement
function genererJours() {
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + (i - 1))
    d.setHours(0, 0, 0, 0)
    return d
  })
}

const ABREV = ['DIM','LUN','MAR','MER','JEU','VEN','SAM']
function infoDate(d) {
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate()-1)
  if (d.toDateString() === auj.toDateString())  return { abbr: 'AJD',            num: `${d.getDate()}.${d.getMonth()+1}.` }
  if (d.toDateString() === hier.toDateString()) return { abbr: 'HIER',           num: `${d.getDate()}.${d.getMonth()+1}.` }
  // Tous les autres jours (demain et suivants) : abréviation réelle du jour
  return { abbr: ABREV[d.getDay()], num: `${d.getDate()}.${d.getMonth()+1}.` }
}

// ── Logos officiels des championnats (api-sports.io CDN) ─────
const L = id => `https://media.api-sports.io/football/leagues/${id}.png`

const LOGOS = {
  // Europe — UEFA
  'Champions League':       L(2),
  'Europa League':          L(3),
  'Conference League':      L(848),
  'UEFA Super Cup':         L(531),
  // Angleterre
  'Premier League':         L(39),
  'Championship':           L(40),
  'FA Cup':                 L(45),
  'League Cup':             L(48),
  'Community Shield':       L(528),
  // Espagne
  'La Liga':                L(140),
  'Segunda División':       L(141),
  'Segunda Division':       L(141),
  'Copa del Rey':           L(143),
  'Supercopa de España':    L(556),
  // France
  'Ligue 1':                L(61),
  'Ligue 2':                L(62),
  'Ligue 2 BKT':            L(62),
  'Coupe de France':        L(66),
  'Trophée des Champions':  L(526),
  // Italie
  'Serie A':                L(135),
  'Serie B':                L(136),
  'Serie BKT':              L(136),
  'Coppa Italia':           L(137),
  'Supercoppa Italiana':    L(547),
  // Allemagne
  'Bundesliga':             L(78),
  '2. Bundesliga':          L(79),
  'Bundesliga II':          L(79),
  'DFB Pokal':              L(81),
  'DFL Supercup':           L(529),
  // Portugal
  'Liga Portugal':          L(94),
  'Primeira Liga':          L(94),
  'Liga Portugal 2':        L(95),
  'Segunda Liga':           L(95),
  'Taça de Portugal':       L(96),
  // Belgique
  'Pro League':             L(144),
  'Challenger Pro League':  L(145),
  'Proximus League':        L(145),
  'Coupe de Belgique':      L(146),
  // Pays-Bas
  'Eredivisie':             L(88),
  'Eerste Divisie':         L(89),
  'Keuken Kampioen Divisie':L(89),
  'KNVB Cup':               L(90),
  // Turquie
  'Super Lig':              L(203),
  'Süper Lig':              L(203),
  'TFF 1. Lig':             L(204),
  'TFF First League':       L(204),
  '1. Lig':                 L(204),
  'Coupe de Turquie':       L(205),
  // Écosse
  'Premiership':            L(179),
  // Grèce
  'Super League':           L(197),
  'Super League 2':         L(198),
  // USA
  'MLS':                    L(253),
  'Major League Soccer':    L(253),
  'USL Championship':       L(265),
  // Brésil
  'Brasileirao Série A':    L(71),
  'Brasileirao Série B':    L(72),
  // Argentine
  'Argentine Primera':      L(130),
  // Croatie
  'HNL':                    L(210),
  // Arabie Saoudite
  'Saudi Pro League':       L(307),
}

// Pays et drapeau associés à chaque championnat
const PAYS_INFO = {
  // UEFA / Monde
  'Champions League':       { pays: 'UEFA',         flag: null,            emoji: '🏆' },
  'Europa League':          { pays: 'UEFA',         flag: null,            emoji: '🏆' },
  'Conference League':      { pays: 'UEFA',         flag: null,            emoji: '🏆' },
  'UEFA Super Cup':         { pays: 'UEFA',         flag: null,            emoji: '🏆' },
  'Coupe du Monde':         { pays: 'Monde',        flag: null,            emoji: '🌍' },
  'FIFA Club World Cup':    { pays: 'Monde',        flag: null,            emoji: '🌍' },
  'Club World Cup':         { pays: 'Monde',        flag: null,            emoji: '🌍' },
  // Angleterre
  'Premier League':         { pays: 'Angleterre',   flag: 'gb-eng', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Championship':           { pays: 'Angleterre',   flag: 'gb-eng', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'FA Cup':                 { pays: 'Angleterre',   flag: 'gb-eng', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'League Cup':             { pays: 'Angleterre',   flag: 'gb-eng', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Community Shield':       { pays: 'Angleterre',   flag: 'gb-eng', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  // Espagne
  'La Liga':                { pays: 'Espagne',      flag: 'es',     emoji: '🇪🇸' },
  'Segunda División':       { pays: 'Espagne',      flag: 'es',     emoji: '🇪🇸' },
  'Segunda Division':       { pays: 'Espagne',      flag: 'es',     emoji: '🇪🇸' },
  'Copa del Rey':           { pays: 'Espagne',      flag: 'es',     emoji: '🇪🇸' },
  'Supercopa de España':    { pays: 'Espagne',      flag: 'es',     emoji: '🇪🇸' },
  // France
  'Ligue 1':                { pays: 'France',       flag: 'fr',     emoji: '🇫🇷' },
  'Ligue 2':                { pays: 'France',       flag: 'fr',     emoji: '🇫🇷' },
  'Ligue 2 BKT':            { pays: 'France',       flag: 'fr',     emoji: '🇫🇷' },
  'Coupe de France':        { pays: 'France',       flag: 'fr',     emoji: '🇫🇷' },
  'Trophée des Champions':  { pays: 'France',       flag: 'fr',     emoji: '🇫🇷' },
  // Italie
  'Serie A':                { pays: 'Italie',       flag: 'it',     emoji: '🇮🇹' },
  'Serie B':                { pays: 'Italie',       flag: 'it',     emoji: '🇮🇹' },
  'Coppa Italia':           { pays: 'Italie',       flag: 'it',     emoji: '🇮🇹' },
  'Supercoppa Italiana':    { pays: 'Italie',       flag: 'it',     emoji: '🇮🇹' },
  // Allemagne
  'Bundesliga':             { pays: 'Allemagne',    flag: 'de',     emoji: '🇩🇪' },
  '2. Bundesliga':          { pays: 'Allemagne',    flag: 'de',     emoji: '🇩🇪' },
  'DFB Pokal':              { pays: 'Allemagne',    flag: 'de',     emoji: '🇩🇪' },
  'DFL Supercup':           { pays: 'Allemagne',    flag: 'de',     emoji: '🇩🇪' },
  // Portugal
  'Liga Portugal':          { pays: 'Portugal',     flag: 'pt',     emoji: '🇵🇹' },
  'Primeira Liga':          { pays: 'Portugal',     flag: 'pt',     emoji: '🇵🇹' },
  'Liga Portugal 2':        { pays: 'Portugal',     flag: 'pt',     emoji: '🇵🇹' },
  'Taça de Portugal':       { pays: 'Portugal',     flag: 'pt',     emoji: '🇵🇹' },
  // Belgique
  'Pro League':             { pays: 'Belgique',     flag: 'be',     emoji: '🇧🇪' },
  'Challenger Pro League':  { pays: 'Belgique',     flag: 'be',     emoji: '🇧🇪' },
  'Coupe de Belgique':      { pays: 'Belgique',     flag: 'be',     emoji: '🇧🇪' },
  // Pays-Bas
  'Eredivisie':             { pays: 'Pays-Bas',     flag: 'nl',     emoji: '🇳🇱' },
  'Eerste Divisie':         { pays: 'Pays-Bas',     flag: 'nl',     emoji: '🇳🇱' },
  'Keuken Kampioen Divisie':{ pays: 'Pays-Bas',     flag: 'nl',     emoji: '🇳🇱' },
  // Turquie
  'Super Lig':              { pays: 'Turquie',      flag: 'tr',     emoji: '🇹🇷' },
  'Süper Lig':              { pays: 'Turquie',      flag: 'tr',     emoji: '🇹🇷' },
  'TFF 1. Lig':             { pays: 'Turquie',      flag: 'tr',     emoji: '🇹🇷' },
  '1. Lig':                 { pays: 'Turquie',      flag: 'tr',     emoji: '🇹🇷' },
  // Écosse
  'Premiership':            { pays: 'Écosse',       flag: 'gb-sct', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Grèce
  'Super League':           { pays: 'Grèce',        flag: 'gr',     emoji: '🇬🇷' },
  'Super League 2':         { pays: 'Grèce',        flag: 'gr',     emoji: '🇬🇷' },
  // USA
  'MLS':                    { pays: 'États-Unis',   flag: 'us',     emoji: '' },
  'Major League Soccer':    { pays: 'États-Unis',   flag: 'us',     emoji: '' },
  'USL Championship':       { pays: 'États-Unis',   flag: 'us',     emoji: '' },
  // Brésil
  'Brasileirao Série A':    { pays: 'Brésil',       flag: 'br',     emoji: '🇧🇷' },
  'Brasileirao Série B':    { pays: 'Brésil',       flag: 'br',     emoji: '🇧🇷' },
  // Arabie Saoudite
  'Saudi Pro League':       { pays: 'Arabie S.',    flag: 'sa',     emoji: '🇸🇦' },
}
const getPays = nom => PAYS_INFO[nom] || { pays: '', flag: null, emoji: '⚽' }

// Couleur de fond par championnat pour le badge logo
const COULEURS = {
  'Champions League':  '#001f5b', 'Europa League': '#ff6900', 'Conference League': '#00a651',
  'Premier League':    '#38003c', 'Championship': '#1a1a1a', 'FA Cup': '#cc0000',
  'La Liga':           '#ee8707', 'Segunda División': '#c0392b', 'Copa del Rey': '#aa151b',
  'Ligue 1':           '#1e3a8a', 'Ligue 2': '#2563eb', 'Coupe de France': '#0f3460',
  'Serie A':           '#00529f', 'Serie B': '#2980b9', 'Coppa Italia': '#27ae60',
  'Bundesliga':        '#d20515', '2. Bundesliga': '#c0392b', 'DFB Pokal': '#2c3e50',
  'Liga Portugal':     '#006600', 'Primeira Liga': '#006600',
  'Pro League':        '#c0392b', 'Eredivisie': '#ff6b00',
  'Super Lig':         '#e30a17', 'Süper Lig': '#e30a17',
  'Premiership':       '#003865', 'Super League': '#0d5eaf',
  'MLS':               '#002d55', 'Major League Soccer': '#002d55', 'USL Championship': '#0a3d62',
  'Brasileirao Série A': '#009c3b',
}
const getCouleur = nom => COULEURS[nom] || '#1b5e20'

// ── Icônes ────────────────────────────────────────────────────
const IcoLive    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:9,height:9}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
const IcoCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11}}><polyline points="20 6 9 17 4 12"/></svg>
const IcoX       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoBas     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 12 15 18 9"/></svg>
const IcoRefresh = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>

// ── Badge logo championnat ────────────────────────────────────
function LogoChamp({ nom, taille = 36 }) {
  const [ok, setOk] = useState(true)
  const src = LOGOS[nom]
  const couleur = getCouleur(nom)
  return (
    <div style={{
      width: taille, height: taille, borderRadius: '50%',
      background: couleur + '15', border: `2px solid ${couleur}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {src && ok ? (
        <img src={src} alt={nom} style={{ width: taille - 6, height: taille - 6, objectFit: 'contain' }}
          onError={() => setOk(false)} />
      ) : (
        <span style={{ fontSize: Math.round(taille * 0.42) + 'px' }}>⚽</span>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function PagePrediction() {
  const jours   = genererJours()
  const dateAuj = dateAujStr()
  const dateMin = enDateStr(jours[0])
  const dateMax = enDateStr(jours[jours.length - 1])

  const [donnees, setDonnees]         = useState({})
  const [predictions, setPredictions] = useState({})
  const [liveOverlay, setLiveOverlay] = useState({})
  const [dateSelect, setDateSelect]   = useState(dateAuj)
  const [compsOuvertes, setCompsO]    = useState({})
  const [charg, setCharg]             = useState(true)
  const [chargPred, setChargPred]     = useState(false)
  const [erreur, setErreur]           = useState('')
  const [vueTrie, setVueTrie]         = useState(false)
  const [limiteApi, setLimiteApi]     = useState(false)
  const [matchSel, setMatchSel]       = useState(null)
  const dateBarRef = useRef(null)

  // ── Charger tous les matchs de la plage ──────────────────────
  const chargerMatchs = useCallback(async () => {
    setCharg(true); setErreur('')
    try {
      const data = await getMatchsSemaine(dateMin, dateMax)
      const matchsParDate = data.matchs_par_date || {}
      const aDesDonnees = Object.keys(matchsParDate).length > 0

      if (!aDesDonnees && (data.limite_quotidienne || data.limite_atteinte)) {
        // API indisponible → fallback : construire les matchs depuis les tracés en base
        const datesJours = [dateMin, dateAuj, dateMax].filter((v, i, a) => a.indexOf(v) === i)
        const predsParDate = await Promise.all(
          datesJours.map(d => obtenirPredictionsParDate(d).catch(() => []))
        )
        const parDateComp = {}
        datesJours.forEach((dateStr, idx) => {
          const preds = predsParDate[idx] || []
          if (!preds.length) return
          const parComp = {}
          preds.forEach(p => {
            const comp = p.competition || 'Autre'
            if (!parComp[comp]) parComp[comp] = []
            // Reconstituer un objet match depuis la prédiction DB
            const dom = p.score_reel ? parseInt(p.score_reel.split('-')[0]) : null
            const ext = p.score_reel ? parseInt(p.score_reel.split('-')[1]) : null
            parComp[comp].push({
              id:           p.match_id,
              competition:  p.competition,
              domicile:     p.domicile,
              exterieur:    p.exterieur,
              date:         p.date,
              heure:        p.heure,
              logo_dom:     p.logo_dom || null,
              logo_ext:     p.logo_ext || null,
              statut_code:  p.score_reel ? 'FINISHED' : 'SCHEDULED',
              score_dom:    dom,
              score_ext:    ext,
              minute:       null,
            })
          })
          if (Object.keys(parComp).length) parDateComp[dateStr] = parComp
        })
        setDonnees(parDateComp)
        setLimiteApi(Object.keys(parDateComp).length === 0)
        setCharg(false)
        return
      }

      setLimiteApi(false)
      const parDateComp = {}
      Object.entries(matchsParDate).forEach(([date, liste]) => {
        if (!liste?.length) return
        const parComp = {}
        liste.forEach(m => {
          const nom = m.competition || 'Autre'
          if (!parComp[nom]) parComp[nom] = []
          parComp[nom].push(m)
        })
        if (Object.keys(parComp).length) parDateComp[date] = parComp
      })
      setDonnees(parDateComp)
    } catch(e) { setErreur(e.message || 'Erreur de chargement.') }
    setCharg(false)
  }, [dateMin, dateMax, dateAuj])

  // ── Charger prédictions pour la date sélectionnée ────────────
  const chargerPreds = useCallback(async (date) => {
    setChargPred(true)
    try {
      const preds = await obtenirPredictionsParDate(date)
      const map = {}
      preds.forEach(p => { map[String(p.match_id)] = p })
      setPredictions(prev => ({ ...prev, ...map }))
    } catch {}
    setChargPred(false)
  }, [])

  // Overlay live : minute exacte + score en temps réel (cache backend 60s)
  const chargerLive = useCallback(async () => {
    if (dateSelect !== dateAuj) return
    try {
      const data = await getMatchsLive()
      const overlay = {}
      ;(data.matchs || []).forEach(m => {
        overlay[String(m.id)] = {
          minute:      m.minute,
          statut_code: m.statut_code,
          score_dom:   m.score_dom,
          score_ext:   m.score_ext,
        }
      })
      setLiveOverlay(overlay)
    } catch {}
  }, [dateSelect, dateAuj])

  useEffect(() => {
    chargerMatchs().then(() => {
      // Précharger prédictions pour hier + aujourd'hui
      jours.filter(j => enDateStr(j) <= dateAuj).forEach(j => chargerPreds(enDateStr(j)))
    })
    // Centrer la barre de dates sur "Aujourd'hui" au premier rendu
    setTimeout(() => {
      const bar = dateBarRef.current
      const btn = bar?.querySelector(`[data-date="${dateAuj}"]`)
      if (bar && btn) bar.scrollLeft = btn.offsetLeft - bar.offsetWidth / 2 + btn.offsetWidth / 2
    }, 100)
  }, []) // eslint-disable-line

  useEffect(() => { chargerPreds(dateSelect) }, [dateSelect, chargerPreds])

  // Refresh calé sur le TTL backend :
  // - live overlay (matchs en cours) : 3 min — synchronisé avec cache serveur 3 min
  // - rafraîchissement général       : 10 min — suffisant pour calendrier et prédictions
  useEffect(() => {
    if (charg) return
    const aLive = Object.values(donnees[dateAuj] || {}).flat()
      .some(m => m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED')
    if (aLive && dateSelect === dateAuj) {
      chargerLive()
      const t = setInterval(chargerLive, 3 * 60_000)
      return () => clearInterval(t)
    }
    const t = setInterval(() => { chargerMatchs(); chargerPreds(dateSelect) }, 10 * 60_000)
    return () => clearInterval(t)
  }, [charg, donnees, dateAuj, dateSelect, chargerMatchs, chargerPreds, chargerLive])

  function changerDate(str) {
    setDateSelect(str)
    setCompsO({})
    setVueTrie(false)
    // Centrer le bouton dans la barre
    setTimeout(() => {
      const bar = dateBarRef.current
      const btn = bar?.querySelector(`[data-date="${str}"]`)
      if (bar && btn) bar.scrollLeft = btn.offsetLeft - bar.offsetWidth / 2 + btn.offsetWidth / 2
    }, 50)
  }

  function toggleComp(cle) {
    setCompsO(p => ({ ...p, [cle]: !p[cle] }))
  }

  const parComp    = donnees[dateSelect] || {}
  const tousMatchs = Object.values(parComp).flat()
  const nbTotal    = tousMatchs.length
  const nbLive     = tousMatchs.filter(m => m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED').length
  const nbPred = tousMatchs.filter(m => {
    const p = predictions[String(m.id)]
    return p?.combinaisons?.length > 0 && (p?.score_confirme === true || p?.trace_status === 'valide')
  }).length

  const estPasse = dateSelect < dateAuj
  const estFutur = dateSelect > dateAuj

  const compsTriees = Object.keys(parComp).sort((a, b) => {
    // Champions League + UEFA en premier, puis alphabétique
    const prio = ['Champions League', 'Europa League', 'Conference League', 'Premier League',
                  'La Liga', 'Ligue 1', 'Serie A', 'Bundesliga', 'Liga Portugal']
    const ia = prio.indexOf(a), ib = prio.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return a.localeCompare(b, 'fr')
  })

  const labelDateSelect = (() => {
    const d = new Date(dateSelect + 'T12:00:00')
    if (dateSelect === dateAuj) return "Aujourd'hui"
    if (dateSelect < dateAuj)   return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' (résultats)'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  })()

  return (
    <div className="pp-page">

      {/* Panneau détail match (cliquable depuis n'importe quel match) */}
      {matchSel && (
        <PanneauMatchDirect match={matchSel} onFermer={() => {
          trackerActivite('match_ferme', `${matchSel.domicile} vs ${matchSel.exterieur}`)
          setMatchSel(null)
        }} />
      )}

      {/* ── Barre de dates ─────────────────────────────────────── */}
      <div className="pp-dates-wrap">
        <div className="pp-dates-barre" ref={dateBarRef}>
          {jours.map(j => {
            const str    = enDateStr(j)
            const info   = infoDate(j)
            const actif  = str === dateSelect
            const passe  = str < dateAuj
            const futur  = str > dateAuj
            const aMatchs = Object.keys(donnees[str] || {}).length > 0
            // Compter les combis validées/perdues pour les jours passés
            const predsJour = passe ? Object.values(donnees[str] || {}).flat().map(m => predictions[String(m.id)]).filter(Boolean) : []
            const nbOk  = predsJour.filter(p => p.score_reel && p.score_prevu === p.score_reel).length
            const nbNok = predsJour.filter(p => p.score_reel && p.score_prevu !== p.score_reel && p.score_prevu).length

            return (
              <button key={str} data-date={str}
                className={`pp-date-btn ${actif ? 'actif' : ''} ${passe ? 'passe' : ''} ${futur ? 'futur' : ''}`}
                onClick={() => changerDate(str)}>
                <span className="pp-date-abbr">{info.abbr}</span>
                <span className="pp-date-num">{info.num}</span>
                {!passe && aMatchs && !actif && <span className="pp-date-dot" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Résumé du jour + bouton Trier ──────────────────────── */}
      <div className="pp-resume-jour">
        <span className="pp-resume-label">{labelDateSelect}</span>
        <div className="pp-resume-badges">
          {nbLive > 0 && <span className="pp-badge-live"><IcoLive /> {nbLive}</span>}
          <span className="pp-badge-total">{nbTotal} match{nbTotal !== 1 ? 's' : ''}</span>
          {chargPred && <span className="pp-badge-charg"><span className="pp-mini-spinner" /></span>}
          {/* Bouton Trier */}
          {nbTotal > 0 && (
            <button className={`pp-btn-trier ${vueTrie ? 'actif' : ''}`}
              onClick={() => setVueTrie(v => !v)}
              title={vueTrie ? 'Vue par championnat' : 'Trier par statut'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
                <line x1="21" y1="10" x2="7" y2="10"/>
                <line x1="21" y1="6"  x2="3" y2="6"/>
                <line x1="21" y1="14" x2="3" y2="14"/>
                <line x1="21" y1="18" x2="7" y2="18"/>
              </svg>
              {vueTrie ? 'Par championnat' : 'Trier'}
            </button>
          )}
        </div>
      </div>

      {/* ── Contenu scrollable ────────────────────────────────────── */}
      <div className="pp-liste-scroll">

      {/* ── Données temporairement indisponibles ──────────────────── */}
      {limiteApi && (
        <div className="pp-vide">
          <span style={{fontSize:'2rem'}}>📅</span>
          <p style={{margin:0,fontWeight:700,color:'#475569',fontSize:'0.9rem'}}>Calendrier temporairement indisponible</p>
          <span>Les données seront à nouveau disponibles demain matin</span>
        </div>
      )}

      {/* ── États ─────────────────────────────────────────────────── */}
      {charg && (
        <div className="pp-skeletons">
          {[1,2,3].map(i => (
            <div key={i} className="pp-skeleton-bloc">
              <div className="pp-skeleton-header"/>
              <div className="pp-skeleton-match"/>
              <div className="pp-skeleton-match" style={{width:'82%'}}/>
            </div>
          ))}
        </div>
      )}
      {erreur && <div className="pp-erreur">{erreur}<button className="pp-btn-retry" onClick={chargerMatchs}>↺</button></div>}
      {!charg && !limiteApi && nbTotal === 0 && !erreur && (
        <div className="pp-vide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:44,height:44,color:'#c8e6c9',marginBottom:12}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <p>Aucun match pour cette date</p>
        </div>
      )}

      {/* ── Vue triée par statut ─────────────────────────────────── */}
      {vueTrie && !charg && <VueTriee tousMatchs={tousMatchs} predictions={predictions} liveOverlay={liveOverlay} estPasse={estPasse} onOuvrir={m => setMatchSel(m)} />}

      {/* ── Championnats du jour (vue accordéon normale) ─────────── */}
      {!vueTrie && compsTriees.map(nomComp => {
        const matchs  = parComp[nomComp]
        const cle     = `${dateSelect}||${nomComp}`
        const ouvert  = !!compsOuvertes[cle]
        const couleur = getCouleur(nomComp)
        const nbLiveC = matchs.filter(m => m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED').length

        // Stats résultats si jour passé
        const nbOkC  = estPasse ? matchs.filter(m => {
          const p = predictions[String(m.id)]
          return p?.score_reel && p.score_prevu === p.score_reel
        }).length : 0
        const nbNokC = estPasse ? matchs.filter(m => {
          const p = predictions[String(m.id)]
          return p?.score_reel && p.score_prevu && p.score_prevu !== p.score_reel
        }).length : 0

        return (
          <div key={cle} className={`pp-champ-bloc ${ouvert ? 'ouvert' : ''}`}
            style={{ '--champ-couleur': couleur }}>

            <button className="pp-champ-header" onClick={() => toggleComp(cle)}>
              {/* GAUCHE : logo + nom */}
              <div className="pp-champ-gauche">
                <LogoChamp nom={nomComp} taille={38} />
                <div className="pp-champ-textes">
                  {getPays(nomComp).pays && (
                    <div className="pp-champ-pays-row">
                      {getPays(nomComp).flag
                        ? <img src={`https://flagcdn.com/w20/${getPays(nomComp).flag}.png`}
                            alt="" className="pp-pays-flag"
                            onError={e => { e.target.style.display='none' }} />
                        : <span style={{fontSize:'0.75rem'}}>{getPays(nomComp).emoji}</span>}
                      <span className="pp-champ-pays">{getPays(nomComp).pays}</span>
                    </div>
                  )}
                  <span className="pp-champ-nom">{nomComp}</span>
                </div>
              </div>
              {/* DROITE : nombre de matchs + flèche */}
              <div className="pp-champ-droite">
                {nbLiveC > 0 && <span className="pp-live-mini"><IcoLive /> {nbLiveC}</span>}
                <span className="pp-champ-count" style={{background: couleur + '20', color: couleur}}>{matchs.length}</span>
                <span className="pp-champ-chevron" style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <IcoBas />
                </span>
              </div>
            </button>

            {ouvert && (
              <div className="pp-matchs-liste" style={{ borderTop: `2px solid ${couleur}30` }}>
                {matchs.map(m => (
                  <MatchCard key={m.id} m={m} pred={predictions[String(m.id)]}
                    estPasse={estPasse} liveData={liveOverlay[String(m.id)] || null}
                    onOuvrir={() => {
                      trackerActivite('match_ouvert', `${m.domicile} vs ${m.exterieur}`)
                      setMatchSel({ ...m, _pred: predictions[String(m.id)] || null })
                    }} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      </div>{/* fin pp-liste-scroll */}
    </div>
  )
}

// ── Vue triée par statut : EN COURS · À VENIR · TERMINÉS ─────
function VueTriee({ tousMatchs, predictions, liveOverlay, estPasse, onOuvrir }) {
  // Appliquer l'overlay live sur chaque match
  const matchsAvecLive = tousMatchs.map(m => {
    const live = liveOverlay[String(m.id)]
    return live ? { ...m, ...live } : m
  })

  const enCours  = matchsAvecLive.filter(m => m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED')
  const aVenir   = matchsAvecLive.filter(m => m.statut_code !== 'IN_PLAY' && m.statut_code !== 'PAUSED' && m.statut_code !== 'FINISHED')
  const termines = matchsAvecLive.filter(m => m.statut_code === 'FINISHED')

  const Section = ({ titre, couleur, icone, matchs }) => (
    matchs.length === 0 ? null : (
      <div className="pp-trie-section">
        <div className="pp-trie-header" style={{ borderLeftColor: couleur }}>
          <span className="pp-trie-ico" style={{ color: couleur }}>{icone}</span>
          <span className="pp-trie-titre" style={{ color: couleur }}>{titre}</span>
          <span className="pp-trie-nb" style={{ background: couleur + '18', color: couleur }}>{matchs.length}</span>
        </div>
        {matchs.map(m => (
          <div key={m.id} className="pp-trie-match-wrap">
            {/* Nom du championnat + logo */}
            <div className="pp-trie-comp">
              <LogoChamp nom={m.competition || ''} taille={18} />
              <span>{m.competition || 'Autre'}</span>
            </div>
            <MatchCard m={m} pred={predictions[String(m.id)]}
              estPasse={estPasse} liveData={liveOverlay[String(m.id)] || null}
              onOuvrir={() => onOuvrir?.({ ...m, _pred: predictions[String(m.id)] || null })} />
          </div>
        ))}
      </div>
    )
  )

  return (
    <div className="pp-trie-wrap">
      <Section titre="En cours"  couleur="#16a34a" icone="🔴" matchs={enCours} />
      <Section titre="À venir"   couleur="#2563eb" icone="🕐" matchs={aVenir} />
      <Section titre="Terminés"  couleur="#64748b" icone="✓"  matchs={termines} />
      {enCours.length === 0 && aVenir.length === 0 && termines.length === 0 && (
        <div className="pp-vide"><p>Aucun match disponible</p></div>
      )}
    </div>
  )
}

// ── Carte match ───────────────────────────────────────────────
function MatchCard({ m, pred, estPasse, liveData, onOuvrir }) {
  // Données live en priorité (minute exacte + score en temps réel)
  const statut   = liveData?.statut_code ?? m.statut_code
  const minute   = liveData?.minute     ?? m.minute
  const scoreDom = liveData?.score_dom  ?? m.score_dom
  const scoreExt = liveData?.score_ext  ?? m.score_ext

  const enCours = statut === 'IN_PLAY' || statut === 'PAUSED'
  const estMT   = statut === 'PAUSED'
  const termine = statut === 'FINISHED'

  // Score réel — priorité : live API → score BD → API scores null pour passé
  // Pour les matchs passés : l'API peut renvoyer SCHEDULED avec score_dom null si le cache est stale
  // Dans ce cas, on utilise pred.score_reel comme source de vérité
  const scoreApiStr = (enCours || termine) && scoreDom !== null
    ? `${scoreDom}-${scoreExt}` : null
  const scoreReel = scoreApiStr || pred?.score_reel || null

  // Pour les matchs passés avec score, extraire dom/ext
  const [sdStr, seStr] = scoreReel ? scoreReel.split('-') : [null, null]
  const sd = scoreDom !== null ? scoreDom : (sdStr ?? '–')
  const se = scoreExt !== null ? scoreExt : (seStr ?? '–')

  // Un match passé avec un score dispo = terminé visuellement
  const vraimentTermine = termine || (estPasse && !!scoreReel)
  const montrerScore    = enCours || vraimentTermine || !!scoreReel

  return (
    <div className={`pp-match ${enCours ? 'en-cours' : ''} ${vraimentTermine ? 'termine' : ''} pp-match-cliquable`}
      onClick={onOuvrir} style={{ cursor: 'pointer' }}>

      {/* ── Ligne unique : heure | dom | score/vs | ext | chips ── */}
      <div className="pp-match-row">

        {/* Heure / statut / minute exacte */}
        <div className="pp-m-heure">
          {enCours ? (
            estMT
              ? <span className="pp-mt-badge">MI-T</span>
              : <span className="pp-live-tag">
                  <IcoLive />
                  <span className="pp-live-min">{minute ? `${minute}'` : 'LIVE'}</span>
                </span>
          ) : vraimentTermine ? (
            <span className="pp-fin-tag">FIN</span>
          ) : (
            <span className="pp-heure-txt">{m.heure}</span>
          )}
        </div>

        {/* Équipe domicile */}
        <div className="pp-m-team dom">
          {m.logo_dom
            ? <img src={m.logo_dom} alt="" className="pp-m-logo" />
            : <span className="pp-m-logo-ph">⚽</span>}
          <span className="pp-m-nom">{m.domicile}</span>
        </div>

        {/* Score central — permanent une fois connu */}
        <div className="pp-m-centre">
          {montrerScore ? (
            <div className="pp-m-score-live">
              <span className={enCours ? 'live' : ''}>{sd}</span>
              <span className="pp-m-score-sep">:</span>
              <span className={enCours ? 'live' : ''}>{se}</span>
            </div>
          ) : (
            <span className="pp-m-vs-badge">VS</span>
          )}
        </div>

        {/* Équipe extérieure */}
        <div className="pp-m-team ext">
          <span className="pp-m-nom">{m.exterieur}</span>
          {m.logo_ext
            ? <img src={m.logo_ext} alt="" className="pp-m-logo" />
            : <span className="pp-m-logo-ph">⚽</span>}
        </div>


      </div>

    </div>
  )
}
