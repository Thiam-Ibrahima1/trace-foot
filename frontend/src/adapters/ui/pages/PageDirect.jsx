// PageDirect.jsx — Matchs en direct, design premium
import { useState, useEffect, useCallback, useRef } from 'react'
import { getMatchsLive, trackerActivite } from '../../../adapters/api/ServiceApi.js'
import PanneauMatchDirect from './PanneauMatchDirect.jsx'
import './PageDirect.css'

// ── Config championnats ─────────────────────────────────────────
const L    = id   => `https://media.api-sports.io/football/leagues/${id}.png`

const COMP_CONFIG_DIRECT = {
  'Champions League':        { logo: L(2),    pays: 'UEFA',        ordre: 1  },
  'Europa League':           { logo: L(3),    pays: 'UEFA',        ordre: 2  },
  'Conference League':       { logo: L(848),  pays: 'UEFA',        ordre: 3  },
  'UEFA Super Cup':          { logo: L(531),  pays: 'UEFA',        ordre: 4  },
  'Premier League':          { logo: L(39),   pays: 'Angleterre',  ordre: 10 },
  'Championship':            { logo: L(40),   pays: 'Angleterre',  ordre: 11 },
  'FA Cup':                  { logo: L(45),   pays: 'Angleterre',  ordre: 12 },
  'League Cup':              { logo: L(48),   pays: 'Angleterre',  ordre: 13 },
  'La Liga':                 { logo: L(140),  pays: 'Espagne',     ordre: 20 },
  'Segunda División':        { logo: L(141),  pays: 'Espagne',     ordre: 21 },
  'Copa del Rey':            { logo: L(143),  pays: 'Espagne',     ordre: 22 },
  'Ligue 1':                 { logo: L(61),   pays: 'France',      ordre: 30 },
  'Ligue 2':                 { logo: L(62),   pays: 'France',      ordre: 31 },
  'Ligue 2 BKT':             { logo: L(62),   pays: 'France',      ordre: 31 },
  'Coupe de France':         { logo: L(66),   pays: 'France',      ordre: 32 },
  'Serie A':                 { logo: L(135),  pays: 'Italie',      ordre: 40 },
  'Serie B':                 { logo: L(136),  pays: 'Italie',      ordre: 41 },
  'Coppa Italia':            { logo: L(137),  pays: 'Italie',      ordre: 42 },
  'Bundesliga':              { logo: L(78),   pays: 'Allemagne',   ordre: 50 },
  '2. Bundesliga':           { logo: L(79),   pays: 'Allemagne',   ordre: 51 },
  'DFB Pokal':               { logo: L(81),   pays: 'Allemagne',   ordre: 52 },
  'Liga Portugal':           { logo: L(94),   pays: 'Portugal',    ordre: 60 },
  'Primeira Liga':           { logo: L(94),   pays: 'Portugal',    ordre: 60 },
  'Liga Portugal 2':         { logo: L(95),   pays: 'Portugal',    ordre: 61 },
  'Pro League':              { logo: L(144),  pays: 'Belgique',    ordre: 70 },
  'Eredivisie':              { logo: L(88),   pays: 'Pays-Bas',    ordre: 80 },
  'Super Lig':               { logo: L(203),  pays: 'Turquie',     ordre: 90 },
  'Süper Lig':               { logo: L(203),  pays: 'Turquie',     ordre: 90 },
  'Super League':            { logo: L(197),  pays: 'Grèce',       ordre: 100 },
  'Premiership':             { logo: L(179),  pays: 'Écosse',      ordre: 105 },
  'MLS':                     { logo: L(253),  pays: 'États-Unis',  ordre: 110 },
  'Major League Soccer':     { logo: L(253),  pays: 'États-Unis',  ordre: 110 },
  'USL Championship':        { logo: L(265),  pays: 'États-Unis',  ordre: 111 },
  'Brasileirao Série A':     { logo: L(71),   pays: 'Brésil',      ordre: 115 },
  'Saudi Pro League':        { logo: L(307),  pays: 'Arabie S.',   ordre: 120 },
  'Copa Libertadores':       { logo: L(13),   pays: 'Amérique S.', ordre: 125 },
  'Copa Sudamericana':       { logo: L(11),   pays: 'Amérique S.', ordre: 126 },
  'Africa Cup of Nations':   { logo: L(6),    pays: 'Afrique',     ordre: 130 },
  'World Cup':               { logo: L(1),    pays: 'Monde',       ordre: 5   },
  'FIFA Club World Cup':     { logo: L(15),   pays: 'Monde',       ordre: 6   },
}
const getCfg = nom => COMP_CONFIG_DIRECT[nom] || { logo: null, pays: '', ordre: 999 }

// ── Composants ──────────────────────────────────────────────────
function LogoComp({ nom, taille = 32 }) {
  const [ok, setOk] = useState(true)
  const cfg = getCfg(nom)
  return (
    <div style={{
      width: taille, height: taille, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {cfg.logo && ok
        ? <img src={cfg.logo} alt="" style={{width: taille - 8, height: taille - 8, objectFit:'contain'}}
            onError={() => setOk(false)} />
        : <span style={{fontSize: Math.round(taille * 0.4) + 'px'}}>⚽</span>}
    </div>
  )
}

function LogoEquipe({ src, nom, taille = 28 }) {
  const [ok, setOk] = useState(true)
  const init = (nom || '?').charAt(0).toUpperCase()
  if (src && ok) return <img src={src} alt="" style={{width:taille,height:taille,objectFit:'contain',borderRadius:'50%',flexShrink:0}} onError={() => setOk(false)} />
  return (
    <div style={{width:taille,height:taille,borderRadius:'50%',background:'rgba(255,255,255,.15)',
      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
      fontSize:Math.round(taille*.45)+'px',fontWeight:800,color:'rgba(255,255,255,.8)'}}>
      {init}
    </div>
  )
}

function tempDepuis(ts) {
  if (!ts) return ''
  const sec = Math.floor((Date.now() - ts) / 1000)
  return sec < 60 ? `${sec}s` : `${Math.floor(sec/60)}min`
}

// ── Composant principal ─────────────────────────────────────────
export default function PageDirect() {
  const [parComp, setParComp]           = useState({})
  const [charg, setCharg]               = useState(true)
  const [erreur, setErreur]             = useState('')
  const [dernierMAJ, setDernierMAJ]     = useState(null)
  const [compteur, setCompteur]         = useState('')
  const [compsOuvertes, setCompsOuvertes] = useState({})
  const [limiteApi, setLimiteApi]       = useState(false)
  const [matchSel, setMatchSel]         = useState(null)
  const scoresRef = useRef({})

  const charger = useCallback(async () => {
    try {
      const dataLive = await getMatchsLive()

      if (dataLive.limite_quotidienne) {
        setLimiteApi(true)
        setCharg(false)
        return
      }
      setLimiteApi(false)

      const parC = {}
      ;(dataLive.matchs || []).forEach(m => {
        const comp = m.competition || 'Autre'
        if (!parC[comp]) parC[comp] = []
        parC[comp].push(m)
      })

      setParComp(parC)
      setDernierMAJ(Date.now())

      // Ouvrir toutes les compétitions
      setCompsOuvertes(prev => {
        const next = { ...prev }
        Object.keys(parC).forEach(c => { if (!(c in next)) next[c] = true })
        return next
      })
      setErreur('')
    } catch(e) {
      setErreur(e.message || 'Erreur de chargement.')
    } finally {
      // Toujours arrêter le spinner, quelle que soit la situation
      setCharg(false)
    }
  }, [])

  // Calculs dérivés — AVANT les useEffects qui en dépendent
  const tousMatchs  = Object.values(parComp).flat()
  const nbTotal     = tousMatchs.length
  const nbEnMT      = tousMatchs.filter(m => m.statut_code === 'PAUSED').length
  const compsTriees = Object.keys(parComp).sort((a, b) => getCfg(a).ordre - getCfg(b).ordre)

  useEffect(() => { charger() }, [charger])
  useEffect(() => {
    if (limiteApi) return
    const interval = nbTotal > 0 ? 3 * 60_000 : 10 * 60_000
    const t = setInterval(charger, interval)
    return () => clearInterval(t)
  }, [charger, limiteApi, nbTotal])
  useEffect(() => {
    if (!dernierMAJ) return
    const t = setInterval(() => setCompteur(tempDepuis(dernierMAJ)), 1000)
    return () => clearInterval(t)
  }, [dernierMAJ])

  function toggleComp(nom) {
    setCompsOuvertes(prev => ({ ...prev, [nom]: !prev[nom] }))
  }

  return (
    <div className="page-direct">

      {matchSel && (
        <PanneauMatchDirect match={matchSel} onFermer={() => setMatchSel(null)} />
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="pd-header">
        <div className="pd-header-gauche">
          <span className="pd-live-dot" />
          <h2 className="pd-titre">En direct</h2>
        </div>
        <div className="pd-header-droite">
          {nbTotal > 0 && (
            <div className="pd-header-stats">
              <span className="pd-compteur-matchs">{nbTotal} match{nbTotal>1?'s':''}</span>
              {nbEnMT > 0 && <span className="pd-badge-mt">Mi-temps : {nbEnMT}</span>}
            </div>
          )}
          {compteur && <span className="pd-maj-badge">↻ {compteur}</span>}
        </div>
      </div>

      {/* ── Chargement ────────────────────────────────────────── */}
      {charg && (
        <div className="pd-charg">
          <span className="pd-spinner" />
          Recherche des matchs en direct...
        </div>
      )}

      {erreur && <div className="pd-erreur">{erreur}</div>}

      {limiteApi && (
        <div className="pd-quota-msg">
          <div className="pd-quota-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p className="pd-quota-titre">Données live en pause</p>
          <span className="pd-quota-sous">Reprise automatique à <strong>00h00</strong></span>
          <span className="pd-quota-note">Les prédictions restent disponibles</span>
        </div>
      )}

      {/* ── Vide ──────────────────────────────────────────────── */}
      {!charg && !limiteApi && nbTotal === 0 && !erreur && (
        <div className="pd-vide">
          <div className="pd-vide-orbe" />
          <p className="pd-vide-titre">Aucun match en direct</p>
          <span className="pd-vide-sous">Vérification toutes les 10 minutes</span>
          {compteur && <span className="pd-vide-ts">Dernière vérification il y a {compteur}</span>}
        </div>
      )}

      {/* ── Compétitions ──────────────────────────────────────── */}
      <div className="pd-competitions">
        {compsTriees.map(nomComp => {
          const cfg    = getCfg(nomComp)
          const matchs = parComp[nomComp] || []
          const ouvert = !!compsOuvertes[nomComp]
          const nbMT   = matchs.filter(m => m.statut_code === 'PAUSED').length

          return (
            <div key={nomComp} className="pd-champ-bloc">

              {/* En-tête championnat */}
              <button className={`pd-champ-header ${ouvert ? 'ouvert' : ''}`}
                onClick={() => toggleComp(nomComp)}>
                <LogoComp nom={nomComp} taille={34} />
                <div className="pd-champ-infos">
                  {cfg.pays && <span className="pd-champ-pays">{cfg.pays}</span>}
                  <span className="pd-champ-nom">{nomComp}</span>
                </div>
                <div className="pd-champ-droite">
                  {nbMT > 0 && <span className="pd-badge-mi-temps">MI-T</span>}
                  <span className="pd-comp-count">{matchs.length}</span>
                  <span className="pd-chevron" style={{transform: ouvert ? 'rotate(180deg)' : 'none', transition:'transform .2s'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                </div>
              </button>

              {/* Liste des matchs */}
              {ouvert && (
                <div className="pd-matchs-liste">
                  {matchs.map(m => {
                    const estPause   = m.statut_code === 'PAUSED'
                    // Détecter nouveau but
                    const ancien     = scoresRef.current[m.id]
                    const nouveauBut = ancien && (m.score_dom !== ancien.dom || m.score_ext !== ancien.ext)
                    scoresRef.current[m.id] = { dom: m.score_dom, ext: m.score_ext }

                    return (
                      <div key={m.id}
                        className={`pd-match pd-match-cliquable ${estPause ? 'pause' : ''} ${nouveauBut ? 'nouveau-but' : ''}`}
                        onClick={() => {
                          setMatchSel(m)
                          trackerActivite('direct_ouvert', `${m.domicile} vs ${m.exterieur}`)
                        }}>

                        {/* ── Statut + Minute ── */}
                        <div className="pd-m-statut">
                          {estPause ? (
                            <span className="pd-m-mi-temps">MI-T</span>
                          ) : (
                            <>
                              <span className="pd-m-minute">{m.minute ? `${m.minute}'` : 'LIVE'}</span>
                              <span className="pd-pulse-point" />
                            </>
                          )}
                        </div>

                        {/* ── Corps : Équipes + Score ── */}
                        <div className="pd-m-corps">

                          {/* Ligne domicile */}
                          <div className="pd-m-equipe">
                            <LogoEquipe src={m.logo_dom} nom={m.domicile} taille={22} />
                            <span className="pd-m-nom">{m.domicile}</span>
                            <span className={`pd-m-score ${nouveauBut ? 'but' : ''}`}>
                              {m.score_dom ?? '0'}
                            </span>
                          </div>

                          {/* Ligne extérieur */}
                          <div className="pd-m-equipe">
                            <LogoEquipe src={m.logo_ext} nom={m.exterieur} taille={22} />
                            <span className="pd-m-nom">{m.exterieur}</span>
                            <span className={`pd-m-score ${nouveauBut ? 'but' : ''}`}>
                              {m.score_ext ?? '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!charg && nbTotal > 0 && (
        <p className="pd-note-refresh">
          ↻ Actualisation automatique toutes les 3 minutes
          {compteur && ` · il y a ${compteur}`}
        </p>
      )}
    </div>
  )
}
