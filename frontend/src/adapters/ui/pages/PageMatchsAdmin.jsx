// ============================================================
// PageMatchsAdmin.jsx — Gestion des matchs côté admin
//
// Onglet 1 : "Voir les matchs" — même vue semaine que l'utilisateur
// Onglet 2 : "Saisir scores"   — saisir/corriger les scores réels
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  obtenirPredictionsParDate, mettreAJourScoreReel,
  corrigerScoreReel, reinitialiserScore, supprimerPrediction,
  formaterDateAPI, getMatchsSemaine, getMatchsDuJour, sauvegarderPrediction
} from '../../../adapters/api/ServiceApi.js'
import { genererTraceAlea, calculerDispositions, analyserDispositions, ajusterDoubleChanceDraw } from '../../../domain/usecases/TraceUseCases.js'
import { evaluerCombi } from '../utils/evaluerCombi.js'
import PanneauMatchDirect from './PanneauMatchDirect.jsx'
import './PageMatchsAdmin.css'

// ── Logos officiels des championnats (api-sports.io) ──────────
const L_ADM = id => `https://media.api-sports.io/football/leagues/${id}.png`
const LOGOS_ADM = {
  'Champions League': L_ADM(2),    'Europa League': L_ADM(3),
  'Conference League': L_ADM(848), 'Premier League': L_ADM(39),
  'Championship': L_ADM(40),        'La Liga': L_ADM(140),
  'Segunda División': L_ADM(141),   'Ligue 1': L_ADM(61),
  'Ligue 2': L_ADM(62),             'Ligue 2 BKT': L_ADM(62),
  'Serie A': L_ADM(135),            'Serie B': L_ADM(136),
  'Bundesliga': L_ADM(78),          '2. Bundesliga': L_ADM(79),
  'Liga Portugal': L_ADM(94),       'Primeira Liga': L_ADM(94),
  'Pro League': L_ADM(144),         'Eredivisie': L_ADM(88),
  'Super Lig': L_ADM(203),          'Süper Lig': L_ADM(203),
  'Super League': L_ADM(197),       'Premiership': L_ADM(179),
  'MLS': L_ADM(253),                'Brasileirao Série A': L_ADM(71),
  'FA Cup': L_ADM(45),              'Copa del Rey': L_ADM(143),
  'Coupe de France': L_ADM(66),     'DFB Pokal': L_ADM(81),
}

// Drapeaux de secours si le logo CDN ne charge pas
const FLAG_ADM = code => `https://flagcdn.com/w20/${code}.png`
const FLAGS_ADM = {
  'TFF 1. Lig': FLAG_ADM('tr'), 'Super Lig': FLAG_ADM('tr'), 'Süper Lig': FLAG_ADM('tr'),
  'Premier League': FLAG_ADM('gb-eng'), 'Championship': FLAG_ADM('gb-eng'),
  'La Liga': FLAG_ADM('es'), 'Segunda División': FLAG_ADM('es'),
  'Ligue 1': FLAG_ADM('fr'), 'Ligue 2': FLAG_ADM('fr'),
  'Serie A': FLAG_ADM('it'), 'Serie B': FLAG_ADM('it'),
  'Bundesliga': FLAG_ADM('de'), '2. Bundesliga': FLAG_ADM('de'),
  'Liga Portugal': FLAG_ADM('pt'), 'Pro League': FLAG_ADM('be'),
  'Eredivisie': FLAG_ADM('nl'), 'Super League': FLAG_ADM('gr'),
  'MLS': FLAG_ADM('us'), 'Premiership': FLAG_ADM('gb-sct'),
}

function LogoChampAdm({ nom }) {
  const [ok, setOk] = React.useState(true)
  const src = LOGOS_ADM[nom]
  const flag = FLAGS_ADM[nom]
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:24, height:24, borderRadius:'50%', background:'#f0fdf4',
      border:'1px solid #c8e6c9', flexShrink:0, overflow:'hidden',
    }}>
      {src && ok
        ? <img src={src} alt="" style={{width:20,height:20,objectFit:'contain'}}
            onError={() => setOk(false)} />
        : flag
          ? <img src={flag} alt="" style={{width:22,height:15,objectFit:'cover'}}/>
          : <span style={{fontSize:'0.8rem'}}>⚽</span>}
    </span>
  )
}

// Logo d'équipe avec fallback initiale
function LogoEquipeAdm({ src, nom, taille = 20 }) {
  const [ok, setOk] = React.useState(true)
  const init = (nom || '?').charAt(0).toUpperCase()
  if (src && ok) {
    return <img src={src} alt={nom} onError={() => setOk(false)}
      className="pma-logo" style={{ width: taille, height: taille }} />
  }
  return (
    <span style={{
      width: taille, height: taille, borderRadius: '50%', background: '#e2e8f0',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: taille * 0.45, fontWeight: 800, color: '#475569', flexShrink: 0,
    }}>{init}</span>
  )
}

// ── Utilitaires de date (identiques côté utilisateur) ─────────
const aujourdhuiStr = () => formaterDateAPI(new Date())

const labelDate = dateStr => {
  const d    = new Date(dateStr + 'T12:00:00')
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  const dem  = new Date(auj); dem.setDate(auj.getDate() + 1)
  if (d.toDateString() === auj.toDateString())  return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  if (d.toDateString() === dem.toDateString())  return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Labels courts — même logique que PagePrediction
const ABREV_ADM = ['DIM','LUN','MAR','MER','JEU','VEN','SAM']
function infoDateAdm(dateStr) {
  const d    = new Date(dateStr + 'T12:00:00')
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate()-1)
  const avh1 = new Date(auj); avh1.setDate(auj.getDate()-2)
  const avh2 = new Date(auj); avh2.setDate(auj.getDate()-3)
  const num  = `${d.getDate()}.${d.getMonth()+1}.`
  if (d.toDateString() === auj.toDateString())  return { abbr:'AJD',  num }
  if (d.toDateString() === hier.toDateString()) return { abbr:'HIER', num }
  if (d.toDateString() === avh1.toDateString()) return { abbr:'J-2',  num }
  if (d.toDateString() === avh2.toDateString()) return { abbr:'J-3',  num }
  return { abbr: ABREV_ADM[d.getDay()], num }
}

// ── Composant principal ────────────────────────────────────────
export default function PageMatchsAdmin({ onNaviguerVisu, champOuvrirInitial = null }) {
  return (
    <div className="page-matchs-admin">
      <VueMatchsSemaine onNaviguerVisu={onNaviguerVisu} champOuvrirInitial={champOuvrirInitial} />
    </div>
  )
}

// ── Génération d'un tracé unique (1 essai) ────────────────────
function genererUnTrace() {
  const pts   = genererTraceAlea()
  const disps = calculerDispositions(pts)
  return { ...analyserDispositions(disps), pts, dispositions: disps }
}

// Ajustement double chance avec poids Imsa cumulés (T1 + T2)
function ajusterDCPondere(t1, t2) {
  const dom = (t1.imsaDomPoids || 0) + (t2?.imsaDomPoids || 0)
  const ext = (t1.imsaExtPoids || 0) + (t2?.imsaExtPoids || 0)
  return ajusterDoubleChanceDraw(t1.combinaisons, dom, ext)
}

// ── Génération batch : T1 puis T2 (1 essai chacun, sans boucle) ──
async function genererBatchChampionnat(matchsList, dateStr, nomChamp, onProgres) {
  const resultats = []
  for (let i = 0; i < matchsList.length; i++) {
    const m = matchsList[i]
    const info = {
      match_id:    String(m.id || m.fixture_id),
      competition: nomChamp,
      domicile:    m.domicile  || '',
      exterieur:   m.exterieur || '',
      date:        dateStr,
      heure:       m.heure     || '',
      logo_dom:    m.logo_dom  || null,
      logo_ext:    m.logo_ext  || null,
    }
    try {
      // ── Tracé 1 : 1 génération (accepté tel quel) ─────────────
      onProgres({ idx: i, total: matchsList.length, match: m, phase: 'trace1' })
      await new Promise(r => setTimeout(r, 10))
      const t1 = genererUnTrace()

      // ── Tracé 2 : 1 génération pour confirmation ───────────────
      onProgres({ idx: i, total: matchsList.length, match: m, phase: 'trace2', score1: t1.scorePrincipal })
      await new Promise(r => setTimeout(r, 10))
      const t2 = genererUnTrace()

      // ── Niveaux du tracé ───────────────────────────────────────
      const traceAcceptable = t1.verification.traceAcceptable // V1 seul
      const traceSolide     = t1.verification.traceSolide     // V1 + V2

      // ── Concordance : T1 et T2 ont le même score → VIP confirmé
      const concordance = t1.scorePrincipal === t2.scorePrincipal

      // ── Combinaisons toujours depuis T1, ajustées avec T2 Imsa ─
      const combinaisonsFinales = ajusterDCPondere(t1, t2)

      onProgres({ idx: i, total: matchsList.length, match: m, phase: 'sauvegarde', score1: t1.scorePrincipal })
      await sauvegarderPrediction({
        ...info,
        score_prevu:        t1.scorePrincipal,
        scores_alternatifs: t1.scoresAlternatifs,
        interpretation:     t1.interpretation,
        combinaisons:       combinaisonsFinales,
        maisons_placees:    t1.maisonsPlacees,
        verification: {
          trace1:          { ...t1.verification, maisonsPlacees: t1.maisonsPlacees || [] },
          trace2:          { ...t2.verification, maisonsPlacees: t2.maisonsPlacees || [] },
          concordance,
          traceAcceptable,
          traceSolide,
          statut:          concordance ? 'certifie' : 'a_confirmer',
        },
        trace_status:  concordance ? 'certifie' : 'trace1',
        score_confirme: concordance,
      })
      resultats.push({
        ...info,
        statut: concordance ? 'certifie' : 'trace1',
        score:  t1.scorePrincipal,
        concordance,
        traceAcceptable,
      })
    } catch(e) {
      resultats.push({ ...info, statut: 'erreur', raison: e.message })
    }
    await new Promise(r => setTimeout(r, 10))
  }
  return resultats
}

// ── Vue Semaine / Mois : matchs avec navigation ────────────────
function VueMatchsSemaine({ onNaviguerVisu, champOuvrirInitial = null }) {
  const dateAuj = aujourdhuiStr()

  const [matchsParDate, setMatchsParDate] = useState({})
  const [predictions, setPreds]           = useState({})
  const [datesDisponibles, setDates]      = useState([])
  const [charg, setCharg]                 = useState(true)
  const [erreur, setErreur]               = useState('')
  const [dateFiltree, setDateFiltree]     = useState(dateAuj)
  const [champsOuverts, setChampsOuverts] = useState({})
  const [generation, setGeneration]       = useState(null)
  const [offset, setOffset]               = useState(0)
  const [vueTrie, setVueTrie]             = useState(false)
  const [matchDetail, setMatchDetail]     = useState(null)

  // Ouvrir le championnat de retour automatiquement
  useEffect(() => {
    if (champOuvrirInitial) {
      const cle = `${dateAuj}||${champOuvrirInitial}`
      setChampsOuverts(prev => ({ ...prev, [cle]: true }))
    }
  }, [champOuvrirInitial])

  const toggleChamp = (dateStr, nomChamp) => {
    const cle = `${dateStr}||${nomChamp}`
    setChampsOuverts(prev => ({ ...prev, [cle]: !prev[cle] }))
  }
  const champOuvert = (dateStr, nomChamp) => !!champsOuverts[`${dateStr}||${nomChamp}`]

  const dateBarRef     = useRef(null)
  const dateBarBtnRefs = useRef({})
  const sectionsRef    = useRef({})
  const inputDateRef   = useRef(null)
  const dateCibleRef   = useRef(null)
  const offsetRef      = useRef(0)  // miroir de offset pour être lu dans allerADate

  function allerADate(dateStr) {
    if (!dateStr) return
    const cible   = new Date(dateStr + 'T12:00:00')
    const aujDate = new Date(); aujDate.setHours(0, 0, 0, 0)
    const diff    = Math.round((cible - aujDate) / 86400_000)

    // Toujours afficher la date choisie immédiatement, sans attendre l'API
    setDateFiltree(dateStr)

    // La fenêtre chargée va de (offsetCourant - 1) à (offsetCourant + 4)
    // Si la date demandée est hors de cette fenêtre → charger une nouvelle fenêtre
    const ofs   = offsetRef.current
    const debut = ofs - 1
    const fin   = ofs + 4
    if (diff < debut || diff > fin) {
      dateCibleRef.current = dateStr
      setOffset(diff)
      offsetRef.current = diff
    }
  }

  const charger = useCallback(async () => {
    setCharg(true); setErreur('')
    try {
      const auj  = new Date()
      const base = new Date(auj.getTime() + offset * 86400_000)

      const dateFrom = formaterDateAPI(new Date(base.getTime() - 1 * 86400_000))
      const dateTo   = formaterDateAPI(new Date(base.getTime() + 4 * 86400_000))

      const data        = await getMatchsSemaine(dateFrom, dateTo)
      const parDateBrut = data.matchs_par_date || {}
      const limiteApi   = data.limite_quotidienne || data.limite_atteinte || false

      // ── Génère toutes les dates de la fenêtre ────────────────
      const toutesLesDates = []
      const cur = new Date(dateFrom + 'T12:00:00')
      const fin = new Date(dateTo   + 'T12:00:00')
      while (cur <= fin) { toutesLesDates.push(formaterDateAPI(cur)); cur.setDate(cur.getDate() + 1) }

      // ── Fallback DB si API vide ou limite atteinte ────────────
      const apiVide = Object.keys(parDateBrut).length === 0 || limiteApi
      let datesList   = []
      let predsMapAll = {}
      let parDateParChamp = {}

      if (apiVide) {
        // Charger les prédictions depuis la base pour toute la fenêtre
        const predsParDate = await Promise.all(
          toutesLesDates.map(d => obtenirPredictionsParDate(d).catch(() => []))
        )
        predsParDate.forEach(liste => {
          ;(liste || []).forEach(p => { predsMapAll[String(p.match_id)] = p })
        })

        // Construire les matchs depuis les prédictions DB
        toutesLesDates.forEach((date, idx) => {
          const preds = predsParDate[idx] || []
          if (!preds.length) return
          const parChamp = {}
          preds.forEach(p => {
            const c   = p.competition || 'Autre'
            const dom = p.score_reel ? parseInt(p.score_reel.split('-')[0]) : null
            const ext = p.score_reel ? parseInt(p.score_reel.split('-')[1]) : null
            if (!parChamp[c]) parChamp[c] = []
            parChamp[c].push({
              id:          p.match_id,
              competition: p.competition,
              domicile:    p.domicile,
              exterieur:   p.exterieur,
              date:        p.date,
              heure:       p.heure,
              logo_dom:    p.logo_dom  || null,
              logo_ext:    p.logo_ext  || null,
              statut_code: p.score_reel ? 'FINISHED' : 'SCHEDULED',
              score_dom:   dom,
              score_ext:   ext,
              comp_id:     null,
              home_id:     null,
              away_id:     null,
              _pred:       p,
            })
          })
          if (Object.keys(parChamp).length) parDateParChamp[date] = parChamp
        })
        datesList = Object.keys(parDateParChamp).sort((a, b) => new Date(a) - new Date(b))

      } else {
        // Données API disponibles — flow normal
        datesList = Object.keys(parDateBrut)
          .filter(d => Array.isArray(parDateBrut[d]) && parDateBrut[d].length > 0)
          .sort((a, b) => new Date(a) - new Date(b))

        const predsParDate = await Promise.all(
          datesList.map(d => obtenirPredictionsParDate(d).catch(() => []))
        )
        predsParDate.forEach(liste => {
          ;(liste || []).forEach(p => { predsMapAll[String(p.match_id)] = p })
        })

        datesList.forEach(date => {
          const parChamp = {}
          ;(parDateBrut[date] || []).forEach(m => {
            const c = m.competition || 'Autre'
            if (!parChamp[c]) parChamp[c] = []
            if (!parChamp[c].find(x => x.id === m.id)) parChamp[c].push(m)
          })
          if (Object.keys(parChamp).length > 0) parDateParChamp[date] = parChamp
        })
        datesList = Object.keys(parDateParChamp).sort((a, b) => new Date(a) - new Date(b))
      }

      setMatchsParDate(parDateParChamp)
      setPreds(predsMapAll)
      setDates(datesList)

      // Choisir la date à afficher
      const cible       = dateCibleRef.current
      dateCibleRef.current = null
      const baseDateStr = formaterDateAPI(base)

      let dateChoisie
      if (cible) {
        dateChoisie = cible
      } else if (offset === 0) {
        dateChoisie = datesList.includes(dateAuj)
          ? dateAuj
          : datesList.find(d => d >= dateAuj) || datesList[0] || dateAuj
      } else {
        dateChoisie = datesList.includes(baseDateStr)
          ? baseDateStr
          : datesList.find(d => d >= baseDateStr) || datesList[0] || dateAuj
      }
      setDateFiltree(dateChoisie)

    } catch(e) {
      setErreur(e.message || 'Erreur lors du chargement.')
    }
    setCharg(false)
  }, [offset, dateAuj])

  useEffect(() => { charger() }, [charger])

  // Recharge uniquement les prédictions (sans spinner de chargement des matchs)
  async function rechargerPredictions() {
    try {
      const predsParDate = await Promise.all(
        datesDisponibles.map(d => obtenirPredictionsParDate(d).catch(() => []))
      )
      const predsMap = {}
      predsParDate.forEach(liste => {
        ;(liste || []).forEach(p => { predsMap[String(p.match_id)] = p })
      })
      setPreds(predsMap)
    } catch {}
  }

  async function lancerGeneration(nomChamp, matchsList, dateStr) {
    setGeneration({ champ: nomChamp, dateStr, progres: null, resultats: null })
    const resultats = await genererBatchChampionnat(matchsList, dateStr, nomChamp, progres => {
      setGeneration(g => ({ ...g, progres }))
    })
    setGeneration(g => ({ ...g, progres: null, resultats }))
    rechargerPredictions()
  }

  const allerVersDate = dateStr => {
    const btn   = dateBarBtnRefs.current[dateStr]
    const barre = dateBarRef.current
    if (btn && barre) {
      barre.scrollLeft = btn.offsetLeft - barre.offsetWidth / 2 + btn.offsetWidth / 2
    }
    sectionsRef.current[dateStr]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const nbTotal = datesDisponibles.reduce((t, d) =>
    t + Object.values(matchsParDate[d] || {}).reduce((s, m) => s + m.length, 0), 0)

  return (
    <div className="pma-vue-matchs">

      {/* Panneau détail match (clic sur n'importe quel match) */}
      {matchDetail && (
        <PanneauMatchDirect match={matchDetail} onFermer={() => setMatchDetail(null)} modeAdmin={true} />
      )}

      {/* Input date natif caché — déclenché par le bouton calendrier */}
      <input
        ref={inputDateRef}
        type="date"
        style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0 }}
        onChange={e => allerADate(e.target.value)}
      />

      {/* Barre de dates */}
      <div className="pma-cal-wrap">
        {/* ← Semaine précédente */}
        <button className="pma-cal-nav" disabled={charg}
          onClick={() => { offsetRef.current -= 7; setOffset(o => o - 7) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        {/* Bouton calendrier — ouvre le sélecteur de date natif */}
        <button
          className="pma-cal-picker-btn"
          title="Choisir une date"
          onClick={() => inputDateRef.current?.showPicker?.() ?? inputDateRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </button>

        <div className="pma-cal-barre" ref={dateBarRef}>
          {datesDisponibles.map(dateStr => {
            const info     = infoDateAdm(dateStr)
            const estPasse = dateStr < dateAuj
            const estSelec = dateStr === dateFiltree
            const aMatchs  = Object.keys(matchsParDate[dateStr] || {}).length > 0
            const predsJ   = estPasse
              ? Object.values(matchsParDate[dateStr] || {}).flat()
                  .map(m => predictions[String(m.id)]).filter(Boolean)
              : []
            const nbOk  = predsJ.filter(p => p.score_reel && p.score_prevu === p.score_reel).length
            const nbNok = predsJ.filter(p => p.score_reel && p.score_prevu && p.score_prevu !== p.score_reel).length
            return (
              <button key={dateStr}
                ref={el => { dateBarBtnRefs.current[dateStr] = el }}
                className={`pma-cal-btn ${estSelec ? 'actif' : ''} ${estPasse ? 'passe' : ''}`}
                onClick={() => setDateFiltree(dateStr)}>
                <span className="pma-cal-abbr">{info.abbr}</span>
                <span className="pma-cal-num">{info.num}</span>
                {!estPasse && aMatchs && !estSelec && <span className="pma-cal-dot" />}
              </button>
            )
          })}
        </div>

        {/* → Semaine suivante */}
        <button className="pma-cal-nav" disabled={offset >= 28 || charg}
          onClick={() => { offsetRef.current += 7; setOffset(o => o + 7) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Indicateur de période + boutons retour */}
      <div className="pma-cal-semaine-barre">
        <span className="pma-cal-semaine-lbl">
          {offset === 0
            ? 'Période actuelle'
            : offset < 0
              ? `Il y a ${Math.abs(offset)} j`
              : `Dans ${offset} j`}
        </span>
        {offset !== 0 && (
          <button className="pma-cal-retour-auj" onClick={() => { offsetRef.current = 0; setOffset(0); setDateFiltree(dateAuj) }}>
            Aujourd'hui
          </button>
        )}
        <button
          className="pma-cal-retour-auj pma-cal-retour-date"
          title="Choisir une date"
          onClick={() => inputDateRef.current?.showPicker?.() ?? inputDateRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12,flexShrink:0}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          Date
        </button>
      </div>

      {/* Résumé de la date sélectionnée */}
      {!charg && dateFiltree && (
        <div className="pma-cal-resume">
          <span className="pma-cal-label">{labelDate(dateFiltree)}</span>
          <span className="pma-cal-nb">
            {Object.values(matchsParDate[dateFiltree] || {}).reduce((s, m) => s + m.length, 0)} match(s)
          </span>
        </div>
      )}

      {charg && <div className="pma-charg">Chargement des matchs de la semaine...</div>}
      {erreur && <div className="pma-erreur-msg">{erreur}</div>}

      {!charg && !matchsParDate[dateFiltree] && !erreur && (
        <div className="pma-vide-msg">Aucun match pour cette date.</div>
      )}

      {/* Section de la date sélectionnée uniquement */}
      {!charg && datesDisponibles.filter(d => d === dateFiltree).map(dateStr => {
        const estAuj   = dateStr === dateAuj
        const estPasse = dateStr < dateAuj
        const parChamp = matchsParDate[dateStr] || {}
        const nbJour   = Object.values(parChamp).reduce((s, m) => s + m.length, 0)

        return (
          <div key={dateStr}
            className={`pma-section-date ${estAuj ? 'aujourd-hui' : estPasse ? 'passe' : 'futur'}`}
          >
            <div className="pma-section-header">
              <span className="pma-section-label">{labelDate(dateStr)}</span>
              <span className="pma-section-nb">{nbJour} match{nbJour > 1 ? 's' : ''}</span>
              {nbJour > 0 && (
                <button
                  className={`pma-btn-trier-cal ${vueTrie ? 'actif' : ''}`}
                  onClick={() => setVueTrie(v => !v)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
                    <line x1="21" y1="10" x2="7"  y2="10"/>
                    <line x1="21" y1="6"  x2="3"  y2="6"/>
                    <line x1="21" y1="14" x2="3"  y2="14"/>
                    <line x1="21" y1="18" x2="7"  y2="18"/>
                  </svg>
                  {vueTrie ? 'Par championnat' : 'Trier'}
                </button>
              )}
            </div>

            {/* Vue triée par statut */}
            {vueTrie && (
              <VueTrieeAdmin
                tousMatchs={Object.values(parChamp).flat()}
                predictions={predictions}
                estPasse={estPasse}
                onNaviguerVisu={onNaviguerVisu}
                onOuvrirDetail={m => setMatchDetail({ ...m, _pred: predictions[String(m.id)] || null })}
              />
            )}

            {/* Vue accordéon par championnat */}
            {!vueTrie && Object.entries(parChamp).map(([nomChamp, matchs]) => {
              const enGen  = generation?.champ === nomChamp && generation?.dateStr === dateStr
              const res    = enGen ? generation?.resultats : null
              const prog   = enGen ? generation?.progres  : null
              const ouvert = champOuvert(dateStr, nomChamp) || !!(prog || res)

              return (
              <div key={nomChamp} className={`pma-champ-bloc ${ouvert ? 'ouvert' : ''}`}>

                {/* En-tête cliquable (accordéon) */}
                <button
                  className="pma-champ-header pma-champ-accordeon"
                  onClick={() => toggleChamp(dateStr, nomChamp)}
                >
                  <LogoChampAdm nom={nomChamp} />
                  <span className="pma-champ-nom">{nomChamp}</span>
                  <span className="pma-champ-nb">{matchs.length}</span>
                  {/* Chevron indiquant l'état ouvert/fermé */}
                  <span className="pma-champ-chevron" style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                  {/* Bouton Générer (stoppe la propagation du clic) */}
                  <button
                    className={`pma-btn-generer ${enGen && !res ? 'en-cours' : ''}`}
                    disabled={!!(generation && !generation.resultats)}
                    onClick={e => { e.stopPropagation(); lancerGeneration(nomChamp, matchs, dateStr) }}
                    title={`Générer les tracés pour tous les matchs de ${nomChamp}`}
                  >
                    {enGen && !res ? '⏳' : '🔮 Générer'}
                  </button>
                </button>

                {/* Contenu accordéon : seulement si ouvert */}
                {ouvert && (
                  <>
                    {/* Barre de progression — affiche la phase et les essais Tracé 2 */}
                    {prog && (
                      <div className="pma-gen-progres">
                        <div className="pma-gen-bar" style={{ width: `${((prog.idx + 1) / prog.total) * 100}%` }} />
                        <span className="pma-gen-txt">
                          {prog.idx + 1}/{prog.total} — {prog.match?.domicile} vs {prog.match?.exterieur}
                          {prog.phase === 'trace1'    && ` · Tracé 1 (cycle ${prog.essais})...`}
                          {prog.phase === 'trace2'    && ` · Tracé 2 — cible ${prog.score1}`}
                          {prog.phase === 'trace3'    && ` · Tracé 3 — cible ${prog.score1}`}
                          {prog.phase === 'sauvegarde'&& ` · Sauvegarde (${prog.essais} essai(s))`}
                        </span>
                      </div>
                    )}

                    {/* Bilan génération (résumé uniquement — les détails sont dans la liste ci-dessous) */}
                    {res && (
                      <div className="pma-gen-bilan">
                        <span className="pgr-cert">{res.filter(r => r.statut === 'certifie').length} Certifiés</span>
                        <span className="pgr-partiel">{res.filter(r => r.statut === 'trace1').length} 🟡 Partiels</span>
                        {res.filter(r => r.statut === 'invalide' || r.statut === 'erreur').length > 0 &&
                          <span className="pgr-erreur">{res.filter(r => r.statut === 'invalide' || r.statut === 'erreur').length} ❌</span>}
                        <span className="pgr-info">Consultez les matchs ci-dessous ↓</span>
                      </div>
                    )}

                    {/* Liste des matchs */}
                    {matchs.map(m => {
                      const pred       = predictions[String(m.id)]
                      const enCours    = m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED'
                      const termine    = m.statut_code === 'FINISHED'
                      const estPasse   = dateStr < dateAuj
                      const scoreReelAPI = termine && m.score_dom !== null ? `${m.score_dom}-${m.score_ext}` : null
                      const scoreReel    = pred?.score_reel || scoreReelAPI
                      const couleurScore = !scoreReel ? 'jaune'
                        : pred?.score_prevu === scoreReel ? 'vert' : 'rouge'
                      const scoreCorrect = scoreReel && pred?.score_prevu === scoreReel

                      return (
                        <div key={m.id}
                          className={`pma-match-ligne ${enCours ? 'en-cours' : ''} ${scoreCorrect ? 'resultat-ok' : scoreReel && pred?.score_prevu ? 'resultat-nok' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setMatchDetail({ ...m, _pred: pred || m._pred || null })}>

                          {/* Heure / statut + ID copiable */}
                          <div className="pma-match-heure">
                            {enCours ? <span className="pma-live">LIVE</span>
                              : (termine || (estPasse && scoreReel)) ? <span className="pma-fin">FIN</span>
                              : <span>{m.heure}</span>}
                            <span
                              className="pma-match-id"
                              title="Cliquez pour copier l'ID"
                              onClick={e => {
                                e.stopPropagation()
                                navigator.clipboard?.writeText(String(m.id))
                                  .then(() => {
                                    e.target.textContent = '✓ Copié'
                                    setTimeout(() => { e.target.textContent = `#${m.id}` }, 1500)
                                  }).catch(() => {})
                              }}>
                              #{m.id}
                            </span>
                          </div>

                          {/* Équipes + scores */}
                          <div className="pma-match-equipes">
                            <div className="pma-equipe">
                              <LogoEquipeAdm src={m.logo_dom} nom={m.domicile} />
                              <span>{m.domicile}</span>
                            </div>
                            <div className="pma-score-centre">
                              {pred?.score_prevu ? (
                                <div className="pma-score-predit-bloc">
                                  <span className="pma-score-predit-lbl">SCORE</span>
                                  <span className="pma-score-predit">{pred.score_prevu}</span>
                                  {scoreReel ? (
                                    <span className={`pma-score-reel-final ${couleurScore}`}>
                                      {scoreReel}
                                    </span>
                                  ) : (
                                    <span className="pma-score-attente">⏳</span>
                                  )}
                                </div>
                              ) : (
                                termine || enCours
                                  ? <span className="pma-score-reel">{m.score_dom ?? '–'}–{m.score_ext ?? '–'}</span>
                                  : <span className="pma-vs">vs</span>
                              )}
                            </div>
                            <div className="pma-equipe droite">
                              <span>{m.exterieur}</span>
                              <LogoEquipeAdm src={m.logo_ext} nom={m.exterieur} />
                            </div>
                          </div>

                          {/* Marqueurs tracé */}
                          {pred?.score_prevu && (
                            <div className="pma-trace-marqueurs">
                              {pred.verification?.concordance
                                ? <span className="pma-marq pma-marq-vip" title="T1=T2 — Score VIP">⭐ VIP</span>
                                : pred.verification?.traceSolide
                                  ? <span className="pma-marq pma-marq-solide" title="Solide — V1+V2 validés">✓✓ Solide</span>
                                  : pred.verification?.traceAcceptable
                                    ? <span className="pma-marq pma-marq-ok" title="Acceptable — V1 validé">✓ Acceptable</span>
                                    : <span className="pma-marq pma-marq-nok" title="Non Acceptable — V1 absent">✗</span>}
                            </div>
                          )}

                          {/* Combinaisons + bouton œil (seulement si combinaisons générées) */}
                          {pred?.combinaisons?.length > 0 && (
                            <div className="pma-pred-zone">
                              <div className="pma-pred-badge">
                                {pred.combinaisons.map((c, i) => {
                                  const etat = evaluerCombi(c.label, scoreReel)
                                  return (
                                    <span key={i}
                                      className={`pma-combi ${etat === 'ok' ? 'pma-combi-ok' : etat === 'nok' ? 'pma-combi-nok' : 'pma-combi-pending'}`}>
                                      {c.label}
                                    </span>
                                  )
                                })}
                              </div>
                              <button className="pma-btn-oeil"
                                onClick={e => { e.stopPropagation(); onNaviguerVisu(String(m.id), nomChamp) }}
                                title="Voir le tracé de ce match">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )})}
          </div>
        )
      })}

      {/* POINT 15 : Le bouton global est supprimé — utiliser le bouton 👁 par match */}
    </div>
  )
}

// ── Vue triée par statut (admin) ─────────────────────────────
function VueTrieeAdmin({ tousMatchs, predictions, estPasse, onNaviguerVisu, onOuvrirDetail }) {
  const enCours  = tousMatchs.filter(m => m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED')
  const aVenir   = tousMatchs.filter(m => !['IN_PLAY','PAUSED','FINISHED'].includes(m.statut_code))
  const termines = tousMatchs.filter(m => m.statut_code === 'FINISHED')

  const Section = ({ titre, couleur, icone, matchs }) => matchs.length === 0 ? null : (
    <div style={{ marginTop: 8, background:'#fff', borderRadius:10, overflow:'hidden',
      boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
        borderLeft:`3px solid ${couleur}`, borderBottom:'1px solid #f4f4f4' }}>
        <span style={{ fontSize:'0.78rem' }}>{icone}</span>
        <span style={{ flex:1, fontSize:'0.82rem', fontWeight:800, color: couleur }}>{titre}</span>
        <span style={{ fontSize:'0.68rem', fontWeight:800, background: couleur+'18',
          color: couleur, padding:'2px 8px', borderRadius:10 }}>{matchs.length}</span>
      </div>
      {matchs.map(m => {
        const pred = predictions[String(m.id)]
        const scoreReelAPI = m.statut_code === 'FINISHED' && m.score_dom !== null
          ? `${m.score_dom}-${m.score_ext}` : null
        const scoreReel = pred?.score_reel || scoreReelAPI
        const couleurS  = !scoreReel ? 'jaune' : pred?.score_prevu === scoreReel ? 'vert' : 'rouge'
        return (
          <div key={m.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
            <div style={{ fontSize:'0.62rem', color:'#94a3b8', padding:'4px 12px 0',
              textTransform:'uppercase', letterSpacing:'.3px' }}>
              <LogoChampAdm nom={m.competition} />
              <span style={{ marginLeft:5 }}>{m.competition}</span>
            </div>
            <div className={`pma-match-ligne ${m.statut_code==='IN_PLAY'?'en-cours':''} ${scoreReel&&pred?.score_prevu===scoreReel?'resultat-ok':scoreReel&&pred?.score_prevu?'resultat-nok':''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onOuvrirDetail?.(m)}>
              <div className="pma-match-heure">
                {m.statut_code==='IN_PLAY'||m.statut_code==='PAUSED'
                  ? <span className="pma-live">{m.minute?`${m.minute}'`:'LIVE'}</span>
                  : m.statut_code==='FINISHED'
                    ? <span className="pma-fin">FIN</span>
                    : <span>{m.heure}</span>}
              </div>
              <div className="pma-match-equipes">
                <div className="pma-equipe">
                  <LogoEquipeAdm src={m.logo_dom} nom={m.domicile} />
                  <span>{m.domicile}</span>
                </div>
                <div className="pma-score-centre">
                  {pred?.score_prevu ? (
                    <div className="pma-score-predit-bloc">
                      <span className="pma-score-predit">{pred.score_prevu}</span>
                      {scoreReel ? (
                        <span className={`pma-score-reel-final ${couleurS}`}>{scoreReel}</span>
                      ) : (
                        <span className="pma-score-attente">⏳</span>
                      )}
                    </div>
                  ) : (
                    m.score_dom !== null
                      ? <span className="pma-score-reel">{m.score_dom}–{m.score_ext}</span>
                      : <span className="pma-vs">vs</span>
                  )}
                </div>
                <div className="pma-equipe droite">
                  <span>{m.exterieur}</span>
                  <LogoEquipeAdm src={m.logo_ext} nom={m.exterieur} />
                </div>
              </div>
              {pred?.combinaisons?.length > 0 && (
                <div className="pma-pred-zone">
                  <div className="pma-pred-badge">
                    {pred.combinaisons.map((c,i) => {
                      const etat = evaluerCombi(c.label, scoreReel)
                      return (
                        <span key={i}
                          className={`pma-combi ${etat==='ok'?'pma-combi-ok':etat==='nok'?'pma-combi-nok':'pma-combi-pending'}`}>
                          {c.label}
                        </span>
                      )
                    })}
                  </div>
                  <button className="pma-btn-oeil"
                    onClick={e => { e.stopPropagation(); onNaviguerVisu?.(String(m.id)) }}
                    title="Voir le tracé de ce match">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ padding:'4px 8px 12px' }}>
      <Section titre="En cours" couleur="#16a34a" icone="🔴" matchs={enCours} />
      <Section titre="À venir"  couleur="#2563eb" icone="🕐" matchs={aVenir} />
      <Section titre="Terminés" couleur="#64748b" icone="✓"  matchs={termines} />
    </div>
  )
}

// ── [Supprimé] SaisieScores — géré via PageConfirmationScore ──
function _SaisieScores_REMOVED() {
  const [date, setDate]                 = useState(aujourdhuiStr())
  const [matchs, setMatchs]             = useState([])
  const [charg, setCharg]               = useState(false)
  const [scoreEdit, setScoreEdit]       = useState({})
  const [raisonEdit, setRaisonEdit]     = useState({})
  const [msgs, setMsgs]                 = useState({})
  const [confirmerSup, setConfirmerSup] = useState(null) // id en attente de confirmation suppression

  useEffect(() => { charger() }, [date])

  async function charger() {
    setCharg(true)
    try {
      const liste = await obtenirPredictionsParDate(date)
      setMatchs(liste)
    } catch {}
    setCharg(false)
  }

  // ── Enregistrer le score réel pour la première fois ──────────
  async function saisirScore(id) {
    const score = scoreEdit[id]?.trim()
    if (!score?.match(/^\d+-\d+$/)) {
      setMsgs(m => ({ ...m, [id]: '⚠️ Format invalide. Ex: 2-1' }))
      return
    }
    try {
      await mettreAJourScoreReel(id, score)
      setMsgs(m => ({ ...m, [id]: 'Score enregistré. En attente de confirmation.' }))
      charger()
    } catch {
      setMsgs(m => ({ ...m, [id]: '❌ Erreur de sauvegarde.' }))
    }
  }

  // ── Corriger un score déjà saisi ─────────────────────────────
  async function corrigerScore(id, dejaCon) {
    const score  = scoreEdit[id]?.trim()
    const raison = raisonEdit[id]?.trim()
    if (!score?.match(/^\d+-\d+$/)) {
      setMsgs(m => ({ ...m, [id]: '⚠️ Format invalide. Ex: 2-1' }))
      return
    }
    if (dejaCon && !raison) {
      setMsgs(m => ({ ...m, [id]: '⚠️ Raison obligatoire pour corriger un score certifié.' }))
      return
    }
    try {
      await corrigerScoreReel(id, { score_reel: score, raison: raison || '' })
      setMsgs(m => ({ ...m, [id]: 'Score corrigé. Re-confirmation requise.' }))
      charger()
    } catch {
      setMsgs(m => ({ ...m, [id]: '❌ Erreur de correction.' }))
    }
  }

  // ── Réinitialiser le score (effacer pour ressaisir après le match) ──
  async function reinitialiser(id) {
    try {
      await reinitialiserScore(id)
      setMsgs(m => ({ ...m, [id]: '🔄 Score effacé. Vous pouvez saisir le score final.' }))
      setScoreEdit(s => ({ ...s, [id]: '' }))
      setRaisonEdit(r => ({ ...r, [id]: '' }))
      charger()
    } catch {
      setMsgs(m => ({ ...m, [id]: '❌ Erreur lors de la réinitialisation.' }))
    }
  }

  // ── Supprimer la prédiction entièrement ──────────────────────
  async function supprimer(id) {
    try {
      await supprimerPrediction(id)
      setConfirmerSup(null)
      charger()
    } catch {
      setMsgs(m => ({ ...m, [id]: '❌ Erreur lors de la suppression.' }))
    }
  }

  return (
    <div className="pma-saisie">
      {/* Sélecteur de date */}
      <div className="pma-date-bar">
        <label className="pma-date-lbl">Date :</label>
        <input
          type="date"
          className="pma-date-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button className="pma-refresh" onClick={charger} title="Rafraîchir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
        <span className="pma-nb">{matchs.length} prédiction(s)</span>
      </div>

      {charg && <p className="pma-charg">Chargement...</p>}

      {matchs.length === 0 && !charg && (
        <div className="pma-vide">
          Aucune prédiction pour cette date.<br/>
          <small>Générez des tracés dans la section "Tracé".</small>
        </div>
      )}

      <div className="pma-liste">
        {matchs.map(p => {
          const aScore   = !!p.score_reel
          const confirme = p.score_confirme
          const correct  = aScore && p.score_prevu === p.score_reel
          const enSuppression = confirmerSup === p.id

          return (
            <div key={p.id} className={`pma-carte ${confirme ? 'confirme' : aScore ? 'avec-score' : ''}`}>

              {/* En-tête de la carte */}
              <div className="pma-carte-top">
                <span className="pma-comp">{p.competition}</span>
                <span className="pma-date-match">{p.date} {p.heure}</span>
                {confirme && <span className="pma-badge-conf">Certifié</span>}
                {/* Bouton supprimer */}
                <button
                  className="pma-btn-suppr"
                  onClick={() => setConfirmerSup(enSuppression ? null : p.id)}
                  title="Supprimer cette prédiction"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                  Supprimer
                </button>
              </div>

              {/* Confirmation de suppression */}
              {enSuppression && (
                <div className="pma-confirm-suppr">
                  <span>Supprimer définitivement cette prédiction ?</span>
                  <div className="pma-confirm-actions">
                    <button className="pma-btn-conf-oui" onClick={() => supprimer(p.id)}>
                      Oui, supprimer
                    </button>
                    <button className="pma-btn-conf-non" onClick={() => setConfirmerSup(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <div className="pma-match-nom">
                <strong>{p.domicile}</strong>
                <span className="pma-vs">vs</span>
                <strong>{p.exterieur}</strong>
              </div>

              {/* Scores */}
              <div className="pma-scores">
                <div className="pma-score-bloc prevu">
                  <span className="pma-score-lbl">Prédit par tracé</span>
                  <span className="pma-score-val">{p.score_prevu}</span>
                </div>
                {aScore && (
                  <div className={`pma-score-bloc reel ${correct ? 'correct' : 'incorrect'}`}>
                    <span className="pma-score-lbl">Score réel</span>
                    <span className="pma-score-val">{p.score_reel}</span>
                    <span className="pma-correct-badge">{correct ? '✓ Correct' : '✗ Écart'}</span>
                  </div>
                )}
              </div>

              {/* Formulaire saisie / correction / réinitialisation */}
              <div className="pma-form-score">
                <div className="pma-form-ligne">
                  <input
                    type="text"
                    className="pma-input-score"
                    placeholder={aScore ? `Corriger (${p.score_reel})` : 'Score réel ex: 2-1'}
                    value={scoreEdit[p.id] || ''}
                    onChange={e => setScoreEdit(s => ({ ...s, [p.id]: e.target.value }))}
                    pattern="\d+-\d+"
                  />
                  {!aScore ? (
                    <button className="pma-btn-saisir" onClick={() => saisirScore(p.id)}>
                      Enregistrer
                    </button>
                  ) : (
                    <button className="pma-btn-corriger" onClick={() => corrigerScore(p.id, confirme)}>
                      Corriger
                    </button>
                  )}
                </div>

                {/* Raison de correction si score déjà saisi */}
                {aScore && (
                  <input
                    type="text"
                    className="pma-input-raison"
                    placeholder={confirme ? 'Raison de correction (obligatoire)' : 'Raison (optionnel)'}
                    value={raisonEdit[p.id] || ''}
                    onChange={e => setRaisonEdit(r => ({ ...r, [p.id]: e.target.value }))}
                  />
                )}

                {/* Bouton Réinitialiser — efface le score pour le ressaisir après le match */}
                {aScore && (
                  <button className="pma-btn-reinit" onClick={() => reinitialiser(p.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 .49-3.95"/>
                    </svg>
                    Réinitialiser le score (ressaisir après le match)
                  </button>
                )}
              </div>

              {msgs[p.id] && (
                <p className={`pma-msg ${!msgs[p.id].includes('Erreur') && !msgs[p.id].includes('❌') && msgs[p.id].length > 0 || msgs[p.id].includes('🔄') ? 'ok' : msgs[p.id].includes('⚠️') ? 'warn' : 'erreur'}`}>
                  {msgs[p.id]}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
