// PageTous.jsx — Onglet "Tous"
// Chaque compétition a son propre accordéon avec le drapeau de son pays.
// Les 1res et 2es divisions sont affichées séparément.
import { useState, useEffect, useCallback, useRef } from 'react'
import { getMatchsSemaine, obtenirPredictionsParDate } from '../../../adapters/api/ServiceApi.js'
import { evaluerCombi } from '../utils/evaluerCombi.js'
import './PageTous.css'

// ── Utilitaires date ──────────────────────────────────────────

function enDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const aujourdhuiStr = () => enDateStr(new Date())

// avant-hier + hier + aujourd'hui + 7 jours futurs = 10 jours au total
function genererJours() {
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + (i - 2)); d.setHours(0,0,0,0); return d
  })
}

const ABREV = ['DIM','LUN','MAR','MER','JEU','VEN','SAM']
function infoDate(d) {
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate()-1)
  const avh  = new Date(auj); avh.setDate(auj.getDate()-2)
  const num  = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.`
  return {
    abbr:   d.toDateString()===auj.toDateString() ? 'AJD'
          : d.toDateString()===hier.toDateString() ? 'HIER'
          : d.toDateString()===avh.toDateString()  ? 'J-2'
          : ABREV[d.getDay()],
    date:   num,
    estAuj: d.toDateString()===auj.toDateString(),
  }
}

// ── Map compétition → { drapeau, emoji, pays, ordre } ────────
// Chaque compétition a son propre drapeau et son pays d'affichage.
// `ordre` sert à trier les compétitions dans la liste.
// Logos officiels (api-sports.io CDN) — priorité sur les drapeaux
const L    = id   => `https://media.api-sports.io/football/leagues/${id}.png`
const FLAG = code => `https://flagcdn.com/w40/${code}.png`

const E = (flag, emoji, pays, ordre) => ({ flag, emoji, pays, ordre })

// Uniquement les compétitions autorisées — dans l'ordre d'importance
const COMP_CONFIG = {
  // ── COMPÉTITIONS UEFA / MONDE (en premier) ────────────────
  'Champions League':           E(L(2),           '🏆', 'UEFA',              1),
  'Europa League':              E(L(3),           '🏆', 'UEFA',              2),
  'Conference League':          E(L(848),         '🏆', 'UEFA',              3),
  'UEFA Super Cup':             E(L(531),         '🏆', 'UEFA',              4),
  'Coupe du Monde':             E(null,           '🌍', 'Monde',             5),
  'FIFA Club World Cup':        E(null,           '🌍', 'Monde',             6),
  'Club World Cup':             E(null,           '🌍', 'Monde',             6),
  "Coupe d'Afrique (CAN)":     E(null,           '🌍', 'Afrique',           7),
  // ── ANGLETERRE ────────────────────────────────────────────
  'Premier League':             E(L(39),          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Angleterre',     10),
  'Championship':               E(L(40),          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Angleterre',     11),
  'FA Cup':                     E(L(45),          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Angleterre',     12),
  'League Cup':                 E(L(48),          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Angleterre',     13),
  'Community Shield':           E(L(528),         '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Angleterre',     14),
  // ── ESPAGNE ───────────────────────────────────────────────
  'La Liga':                    E(L(140),         '🇪🇸', 'Espagne',          20),
  'Segunda División':           E(L(141),         '🇪🇸', 'Espagne',          21),
  'Segunda Division':           E(L(141),         '🇪🇸', 'Espagne',          21),
  'Copa del Rey':               E(L(143),         '🇪🇸', 'Espagne',          22),
  'Supercopa de España':        E(L(556),         '🇪🇸', 'Espagne',          23),
  // ── FRANCE ────────────────────────────────────────────────
  'Ligue 1':                    E(L(61),          '🇫🇷', 'France',           30),
  'Ligue 2':                    E(L(62),          '🇫🇷', 'France',           31),
  'Ligue 2 BKT':                E(L(62),          '🇫🇷', 'France',           31),
  'Coupe de France':            E(L(66),          '🇫🇷', 'France',           32),
  'Trophée des Champions':      E(L(526),         '🇫🇷', 'France',           33),
  // ── ITALIE ────────────────────────────────────────────────
  'Serie A':                    E(L(135),         '🇮🇹', 'Italie',           40),
  'Serie B':                    E(L(136),         '🇮🇹', 'Italie',           41),
  'Serie BKT':                  E(L(136),         '🇮🇹', 'Italie',           41),
  'Coppa Italia':               E(L(137),         '🇮🇹', 'Italie',           42),
  'Supercoppa Italiana':        E(L(547),         '🇮🇹', 'Italie',           43),
  // ── ALLEMAGNE ─────────────────────────────────────────────
  'Bundesliga':                 E(L(78),          '🇩🇪', 'Allemagne',        50),
  '2. Bundesliga':              E(L(79),          '🇩🇪', 'Allemagne',        51),
  'Bundesliga II':              E(L(79),          '🇩🇪', 'Allemagne',        51),
  'DFB Pokal':                  E(L(81),          '🇩🇪', 'Allemagne',        52),
  'DFL Supercup':               E(L(529),         '🇩🇪', 'Allemagne',        53),
  // ── PORTUGAL ──────────────────────────────────────────────
  'Liga Portugal':              E(L(94),          '🇵🇹', 'Portugal',         60),
  'Primeira Liga':              E(L(94),          '🇵🇹', 'Portugal',         60),
  'Liga Portugal 2':            E(L(95),          '🇵🇹', 'Portugal',         61),
  'Segunda Liga':               E(L(95),          '🇵🇹', 'Portugal',         61),
  'Taça de Portugal':           E(L(96),          '🇵🇹', 'Portugal',         62),
  'Supertaça':                  E(FLAG('pt'),     '🇵🇹', 'Portugal',         63),
  // ── BELGIQUE ──────────────────────────────────────────────
  'Pro League':                 E(L(144),         '🇧🇪', 'Belgique',         70),
  'Challenger Pro League':      E(L(145),         '🇧🇪', 'Belgique',         71),
  'Proximus League':            E(L(145),         '🇧🇪', 'Belgique',         71),
  'Coupe de Belgique':          E(L(146),         '🇧🇪', 'Belgique',         72),
  // ── PAYS-BAS ──────────────────────────────────────────────
  'Eredivisie':                 E(L(88),          '🇳🇱', 'Pays-Bas',         80),
  'Eerste Divisie':             E(L(89),          '🇳🇱', 'Pays-Bas',         81),
  'Keuken Kampioen Divisie':    E(L(89),          '🇳🇱', 'Pays-Bas',         81),
  'KNVB Cup':                   E(L(90),          '🇳🇱', 'Pays-Bas',         82),
  'Johan Cruyff Shield':        E(FLAG('nl'),     '🇳🇱', 'Pays-Bas',         83),
  // ── TURQUIE ───────────────────────────────────────────────
  'Super Lig':                  E(L(203),         '🇹🇷', 'Turquie',          90),
  'Süper Lig':                  E(L(203),         '🇹🇷', 'Turquie',          90),
  'TFF 1. Lig':                 E(L(204),         '🇹🇷', 'Turquie',          91),
  'TFF First League':           E(L(204),         '🇹🇷', 'Turquie',          91),
  '1. Lig':                     E(L(204),         '🇹🇷', 'Turquie',          91),
  'Coupe de Turquie':           E(L(205),         '🇹🇷', 'Turquie',          92),
  'Super Coupe Turquie':        E(FLAG('tr'),     '🇹🇷', 'Turquie',          93),
  // ── GRÈCE ─────────────────────────────────────────────────
  'Super League':               E(L(197),         '🇬🇷', 'Grèce',           100),
  'Super League 2':             E(L(198),         '🇬🇷', 'Grèce',           101),
  'Coupe de Grèce':             E(FLAG('gr'),     '🇬🇷', 'Grèce',           102),
  // ── ÉTATS-UNIS ────────────────────────────────────────────
  'MLS':                        E(L(253),         '🇺🇸', 'États-Unis',      110),
  'USL Championship':           E(FLAG('us'),     '🇺🇸', 'États-Unis',      111),
  // ── ÉCOSSE ────────────────────────────────────────────────
  'Premiership':                E(L(179),         '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Écosse',          120),
}

// Récupérer la config d'une compétition (avec fallback générique)
function getConfig(nomComp) {
  return COMP_CONFIG[nomComp] || { flag: null, emoji: '⚽', pays: '', ordre: 999 }
}

// ── Icônes SVG ────────────────────────────────────────────────
const IcoBas  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 12 15 18 9"/></svg>
const IcoHaut = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="18 15 12 9 6 15"/></svg>
const IcoLive = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:9,height:9}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
const IcoCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:10,height:10}}><polyline points="20 6 9 17 4 12"/></svg>
const IcoX    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:10,height:10}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoRefresh = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>

// Drapeau réel ou emoji dans boîte de même taille
function Drapeau({ flag, emoji, taille = 36 }) {
  const h = Math.round(taille * 0.67)
  const base = { width: taille, height: h, borderRadius: 3, flexShrink: 0 }
  if (flag) {
    return (
      <>
        <img src={flag} alt="" style={{ ...base, objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }}
          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
        <span style={{ ...base, display:'none', alignItems:'center', justifyContent:'center', background:'#f1f5f9', fontSize: Math.round(taille*.5)+'px', lineHeight:1 }}>{emoji}</span>
      </>
    )
  }
  return <span style={{ ...base, display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9', fontSize: Math.round(taille*.5)+'px', lineHeight:1 }}>{emoji}</span>
}

// ── Composant principal ───────────────────────────────────────
export default function PageTous() {
  const jours   = genererJours()
  const dateAuj = aujourdhuiStr()
  const dateMin = enDateStr(jours[0])
  const dateMax = enDateStr(jours[jours.length-1])

  // { 'YYYY-MM-DD': { 'CompétitionNom': [...matchs] } }
  const [donnees, setDonnees]         = useState({})
  const [predictions, setPredictions] = useState({})
  const [dateSelect, setDateSelect]   = useState(dateAuj)
  // Compétitions ouvertes dans l'accordéon (Set de noms)
  const [compsOuvertes, setCompsOuvertes] = useState({})

  const [charg, setCharg]         = useState(true)
  const [chargPred, setChargPred] = useState(false)
  const [erreur, setErreur]       = useState('')
  const dateBarRef = useRef(null)

  // ── Charger matchs (groupés par compétition, pas par pays) ───
  const chargerMatchs = useCallback(async () => {
    setCharg(true); setErreur('')
    try {
      const data = await getMatchsSemaine(dateMin, dateMax)

      // Limite quotidienne API atteinte et aucun cache disponible
      if (data.limite_atteinte && data.total === 0) {
        // Calculer l'heure de reset (minuit UTC)
        const maintenant = new Date()
        const resetUTC = new Date(Date.UTC(
          maintenant.getUTCFullYear(),
          maintenant.getUTCMonth(),
          maintenant.getUTCDate() + 1, 0, 0, 0
        ))
        const heuresRestantes = Math.ceil((resetUTC - maintenant) / 3600000)
        setErreur(`Quota API atteint (100 req/jour - plan gratuit). Réinitialisation dans ~${heuresRestantes}h (minuit UTC). Les matchs déjà en cache restent visibles.`)
        setCharg(false)
        return
      }

      const matchsParDate = data.matchs_par_date || {}

      // Organiser : date → compétition → matchs
      // Seules les compétitions de COMP_CONFIG sont affichées (double filtre de sécurité)
      const parDateComp = {}
      Object.entries(matchsParDate).forEach(([date, matchsBruts]) => {
        if (!matchsBruts.length) return
        const parComp = {}
        matchsBruts.forEach(m => {
          const nom = m.competition || 'Autre'
          if (!COMP_CONFIG[nom]) return // Ignorer les compétitions non autorisées
          if (!parComp[nom]) parComp[nom] = []
          parComp[nom].push(m)
        })
        if (Object.keys(parComp).length > 0) parDateComp[date] = parComp
      })

      setDonnees(parDateComp)
      // Aucune compétition ne s'ouvre automatiquement — l'utilisateur clique
    } catch(e) { setErreur(e.message || 'Erreur de chargement.') }
    setCharg(false)
  }, [dateMin, dateMax, dateSelect])

  // ── Charger prédictions en arrière-plan ──────────────────────
  const chargerPreds = useCallback(async (date) => {
    setChargPred(true)
    try {
      const preds = await obtenirPredictionsParDate(date)
      const map = {}
      preds.forEach(p => { map[String(p.match_id)] = p })
      setPredictions(map)
    } catch { /* non critique */ }
    setChargPred(false)
  }, [])

  useEffect(() => { chargerMatchs().then(() => chargerPreds(dateAuj)) }, []) // eslint-disable-line

  useEffect(() => { chargerPreds(dateSelect) }, [dateSelect, chargerPreds])

  // Rafraîchissement auto live
  useEffect(() => {
    if (charg) return
    const live = Object.values(donnees[dateAuj] || {}).flat()
      .some(m => m.statut_code==='IN_PLAY'||m.statut_code==='PAUSED')
    const t = setInterval(chargerMatchs, live ? 30_000 : 120_000)
    return () => clearInterval(t)
  }, [charg, donnees, dateAuj, chargerMatchs])

  function changerDate(str) {
    setDateSelect(str)
    // Fermer tous les accordéons — l'utilisateur choisit lui-même ce qu'il ouvre
    setCompsOuvertes({})
  }

  function toggleComp(nom) {
    setCompsOuvertes(prev => ({ ...prev, [nom]: !prev[nom] }))
  }

  // Compétitions de la date sélectionnée, triées par `ordre`
  const parComp    = donnees[dateSelect] || {}
  const tousMatchs = Object.values(parComp).flat()
  const nbTotal    = tousMatchs.length
  const nbLive     = tousMatchs.filter(m => m.statut_code==='IN_PLAY'||m.statut_code==='PAUSED').length

  const compsTriees = Object.keys(parComp).sort((a, b) => {
    const oa = getConfig(a).ordre
    const ob = getConfig(b).ordre
    return oa !== ob ? oa - ob : a.localeCompare(b, 'fr')
  })

  return (
    <div className="page-tous">

      {/* Barre de dates */}
      <div className="pt-dates-wrap">
        <div className="pt-dates" ref={dateBarRef}>
          {jours.map(j => {
            const str   = enDateStr(j)
            const info  = infoDate(j)
            const actif = str === dateSelect
            const aMatchs = Object.keys(donnees[str]||{}).length > 0
            return (
              <button key={str}
                className={`pt-date-btn ${actif?'actif':''} ${aMatchs?'avec-matchs':''}`}
                onClick={() => changerDate(str)}>
                <span className="pt-date-abbr">{info.abbr}</span>
                <span className="pt-date-num">{info.date}</span>
                {info.estAuj && !actif && <span className="pt-date-dot"/>}
                {aMatchs && !actif && <span className="pt-date-point-vert"/>}
              </button>
            )
          })}
        </div>
        <button className="pt-btn-actualiser" onClick={() => chargerMatchs().then(()=>chargerPreds(dateSelect))}
          disabled={charg} title="Actualiser"><IcoRefresh /></button>
      </div>

      {/* Ligne "Tous les matchs" */}
      <div className="pt-tous-ligne">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pt-tous-ico">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <span className="pt-tous-label">Tous les matchs</span>
        {nbLive > 0 && <span className="pt-badge-live">{nbLive}</span>}
        <span className="pt-badge-total">{nbTotal}</span>
        {chargPred && <span className="pt-pred-charg" title="Chargement des prédictions">⏳</span>}
      </div>

      {/* Skeleton chargement */}
      {charg && Object.keys(donnees).length === 0 && (
        <div className="pt-skeletons">
          {[1,2,3,4].map(i => (
            <div key={i} className="pt-skeleton-bloc">
              <div className="pt-skeleton-header"/>
              <div className="pt-skeleton-match"/>
              <div className="pt-skeleton-match" style={{width:'88%'}}/>
            </div>
          ))}
        </div>
      )}

      {erreur && <div className="pt-erreur">{erreur}<button className="pt-btn-retry" onClick={chargerMatchs}>Réessayer</button></div>}

      {!charg && nbTotal===0 && !erreur && (
        <div className="pt-vide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:40,height:40,color:'#c8e6c9',marginBottom:10}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <p>Aucun match disponible pour cette date</p>
          <span>Les championnats n'ont pas tous des matchs chaque jour.</span>
          <span style={{fontSize:'.72rem',color:'#cbd5e1',marginTop:4}}>
            Ligue 2, 2. Bundesliga, Serie B, Segunda División nécessitent un plan API supérieur.
          </span>
          <button className="pt-btn-retry-vide" onClick={chargerMatchs} style={{marginTop:12}}><IcoRefresh /> Actualiser</button>
        </div>
      )}

      {/* ── Une compétition = un accordéon avec son drapeau ── */}
      {compsTriees.map(nomComp => {
        const cfg    = getConfig(nomComp)
        const matchs = parComp[nomComp]
        const ouvert = !!compsOuvertes[nomComp]
        const nbLiveComp = matchs.filter(m => m.statut_code==='IN_PLAY'||m.statut_code==='PAUSED').length

        return (
          <div key={nomComp} className="pt-champ-bloc">

            {/* En-tête de la compétition */}
            <button
              className={`pt-champ-header ${ouvert ? 'ouvert' : ''}`}
              onClick={() => toggleComp(nomComp)}
            >
              {/* Drapeau du pays de la compétition */}
              <div className="pt-champ-flag-wrap">
                <Drapeau flag={cfg.flag} emoji={cfg.emoji} taille={36}/>
              </div>

              {/* Pays (petit) + nom de la compétition */}
              <div className="pt-champ-infos">
                {cfg.pays && <span className="pt-champ-pays">{cfg.pays.toUpperCase()}</span>}
                <span className="pt-champ-nom">{nomComp}</span>
              </div>

              {/* Badges + chevron */}
              <div className="pt-champ-droite">
                {nbLiveComp > 0 && <span className="pt-badge-live-mini">{nbLiveComp}</span>}
                <span className="pt-champ-count">{matchs.length}</span>
                <span className="pt-champ-chevron">{ouvert ? <IcoHaut/> : <IcoBas/>}</span>
              </div>
            </button>

            {/* Matchs de cette compétition */}
            {ouvert && (
              <div className="pt-matchs-liste">
                {matchs.map(m => (
                  <CarteMatch key={m.id} match={m} prediction={predictions[String(m.id)]}/>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Carte d'un match ──────────────────────────────────────────
function CarteMatch({ match: m, prediction }) {
  const enCours   = m.statut_code==='IN_PLAY'||m.statut_code==='PAUSED'
  const termine   = m.statut_code==='FINISHED'
  const scoreReel = termine && m.score_dom!==null ? `${m.score_dom}-${m.score_ext}` : null
  const combis    = prediction?.combinaisons?.slice(0,3) || []

  return (
    <div className={`pt-match ${enCours?'en-cours':''} ${termine?'termine':''}`}>
      {/* Heure / statut */}
      <div className="pt-m-heure">
        {enCours ? (
          <span className="pt-live-tag"><IcoLive />{m.minute ? `${m.minute}'` : 'LIVE'}</span>
        ) : termine ? (
          <span className="pt-fin-tag">FIN</span>
        ) : (
          <span className="pt-heure-tag">{m.heure}</span>
        )}
        {m.statut_code==='PAUSED' && <span className="pt-mt-tag">MT</span>}
      </div>

      {/* Équipes + scores */}
      <div className="pt-m-corps">
        <div className="pt-m-equipe">
          {m.logo_dom ? <img src={m.logo_dom} alt="" className="pt-m-logo"/> : <span className="pt-m-logo-ph">⚽</span>}
          <span className="pt-m-nom">{m.domicile}</span>
          {(enCours||termine) && <span className={`pt-m-score ${enCours?'live':''}`}>{m.score_dom??'–'}</span>}
        </div>
        <div className="pt-m-equipe">
          {m.logo_ext ? <img src={m.logo_ext} alt="" className="pt-m-logo"/> : <span className="pt-m-logo-ph">⚽</span>}
          <span className="pt-m-nom">{m.exterieur}</span>
          {(enCours||termine) && <span className={`pt-m-score ${enCours?'live':''}`}>{m.score_ext??'–'}</span>}
        </div>
      </div>

      {/* Combinaisons prédites */}
      {combis.length > 0 && (
        <div className="pt-m-combis">
          {combis.map((c,i) => {
            const etat = evaluerCombi(c.label, scoreReel)
            return (
              <span key={i} className={`pt-combi ${etat === 'ok' ? 'ok' : etat === 'nok' ? 'nok' : 'pending'}`}>
                {etat === 'ok' && <IcoCheck/>}{etat === 'nok' && <IcoX/>}{c.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
