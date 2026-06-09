import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getMatchsSemaine, formaterDateAPI,
  obtenirPredictionsParDate, recupererCleApi,
  obtenirDetailsMatch, obtenirDerniersMatchsEquipe, CHAMPIONNATS,
  trackerActivite,
} from '../../../adapters/api/ServiceApi.js'
import './PageMatchs.css'

// ── Utilitaires de date ───────────────────────────────────────
const aujourdhui = () => { const d = new Date(); d.setHours(0,0,0,0); return d }

const labelDate = d => {
  const auj  = aujourdhui()
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  const dem  = new Date(auj); dem.setDate(auj.getDate() + 1)
  if (d.toDateString() === auj.toDateString())  return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  if (d.toDateString() === dem.toDateString())  return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const labelDateCourt = d => {
  const auj  = aujourdhui()
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  const dem  = new Date(auj); dem.setDate(auj.getDate() + 1)
  if (d.toDateString() === auj.toDateString())  return 'Auj.'
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  if (d.toDateString() === dem.toDateString())  return 'Dem.'
  return d.toLocaleDateString('fr-FR', { weekday: 'short' })
}

// ── Icônes SVG ────────────────────────────────────────────────
const IcoLive = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11}}>
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
)
const IcoDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IcoUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
    <polyline points="18 15 12 9 6 15"/>
  </svg>
)
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IcoStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{width:13,height:13}}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

// ── Composant principal ───────────────────────────────────────
export default function PageMatchs() {
  const [matchsParDate, setMatchsParDate] = useState({})  // { 'YYYY-MM-DD': { 'Championnat': [matchs] } }
  const [predictions, setPreds]           = useState({})  // { 'match_id': prediction }
  const [datesDisponibles, setDates]      = useState([])  // dates qui ont des matchs
  const [charg, setCharg]                 = useState(true)
  const [erreur, setErreur]               = useState('')
  const [matchOuvert, setMatchOuvert]     = useState(null)

  const cleApi      = recupererCleApi()
  const dateBarRef  = useRef(null)
  const dateBarBtnRefs = useRef({}) // ref par date pour la barre
  const sectionsRef = useRef({})    // ref par date pour le scroll dans la page

  const charger = useCallback(async () => {
    setCharg(true); setErreur('')
    try {
      const auj      = new Date()
      const dateFrom = formaterDateAPI(new Date(auj.getTime() - 7 * 86400_000))
      const dateTo   = formaterDateAPI(new Date(auj.getTime() + 7 * 86400_000))

      const data = await getMatchsSemaine(dateFrom, dateTo)
      const parDateBrut = data.matchs_par_date || {}

      // Charger les prédictions pour toutes les dates en parallèle
      const datesList = Object.keys(parDateBrut).sort()
      const predsParDate = await Promise.all(datesList.map(d => obtenirPredictionsParDate(d).catch(() => [])))

      // Construire la map match_id → prédiction
      const predsMap = {}
      predsParDate.forEach(liste => {
        liste.forEach(p => { predsMap[String(p.match_id)] = p })
      })

      // Grouper chaque date par championnat
      const parDateParChamp = {}
      datesList.forEach(date => {
        const parChamp = {}
        ;(parDateBrut[date] || []).forEach(m => {
          const c = m.competition || 'Autre'
          if (!parChamp[c]) parChamp[c] = []
          parChamp[c].push(m)
        })
        if (Object.keys(parChamp).length > 0) parDateParChamp[date] = parChamp
      })

      setMatchsParDate(parDateParChamp)
      setPreds(predsMap)
      setDates(Object.keys(parDateParChamp).sort())
    } catch(e) {
      setErreur(e.message || 'Erreur lors du chargement des matchs.')
    }
    setCharg(false)
  }, [])

  // Chargement initial
  useEffect(() => { charger() }, [charger])

  // Rafraîchissement intelligent
  useEffect(() => {
    const tousMatchs = Object.values(matchsParDate).flatMap(parChamp => Object.values(parChamp).flat())
    const aMatchEnCours = tousMatchs.some(m => m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED')
    const delai = aMatchEnCours ? 30_000 : 300_000
    const t = setInterval(charger, delai)
    return () => clearInterval(t)
  }, [charger, matchsParDate])

  // Scroll automatique vers aujourd'hui au montage
  const dateAujourdhuiStr = formaterDateAPI(new Date())
  useEffect(() => {
    if (!charg && sectionsRef.current[dateAujourdhuiStr]) {
      sectionsRef.current[dateAujourdhuiStr].scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [charg, dateAujourdhuiStr])

  // Centrer le bouton actif dans la barre de dates
  const scrollerBarreVersBouton = (dateStr) => {
    const btn  = dateBarBtnRefs.current[dateStr]
    const barre = dateBarRef.current
    if (btn && barre) {
      barre.scrollLeft = btn.offsetLeft - barre.offsetWidth / 2 + btn.offsetWidth / 2
    }
  }

  // Clic sur une date dans la barre → scroll vers la section
  const allerVersDate = (dateStr) => {
    scrollerBarreVersBouton(dateStr)
    const section = sectionsRef.current[dateStr]
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const nbTotalMatchs = datesDisponibles.reduce((total, d) => {
    return total + Object.values(matchsParDate[d] || {}).reduce((s, matchs) => s + matchs.length, 0)
  }, 0)

  return (
    <div className="page-matchs">

      {/* ── Barre de dates ── */}
      <div className="pm-dates-wrap">
        <div className="pm-dates" ref={dateBarRef}>
          {datesDisponibles.map(dateStr => {
            const d       = new Date(dateStr + 'T12:00:00')
            const estAuj  = dateStr === dateAujourdhuiStr
            const estPasse = dateStr < dateAujourdhuiStr
            return (
              <button key={dateStr}
                ref={el => { dateBarBtnRefs.current[dateStr] = el }}
                className={`pm-date-btn ${estAuj ? 'actif' : ''} ${estPasse ? 'passe' : ''}`}
                onClick={() => allerVersDate(dateStr)}
              >
                <span className="pm-date-label">{labelDateCourt(d)}</span>
                <span className="pm-date-num">
                  {d.getDate()} {d.toLocaleDateString('fr-FR', { month: 'short' })}
                </span>
                {estAuj && <span className="pm-date-dot" />}
              </button>
            )
          })}
        </div>
        {!charg && nbTotalMatchs > 0 && (
          <div className="pm-resume">
            {nbTotalMatchs} match{nbTotalMatchs > 1 ? 's' : ''} sur {datesDisponibles.length} jour{datesDisponibles.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── État chargement ── */}
      {charg && (
        <div className="pm-charg">
          <span className="pm-spinner"/>
          Chargement des matchs de la semaine...
        </div>
      )}
      {erreur && <div className="pm-erreur">{erreur}</div>}
      {!charg && nbTotalMatchs === 0 && !erreur && (
        <div className="pm-vide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:44,height:44,color:'#c8e6c9',marginBottom:12}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <p>Aucun match disponible sur la période</p>
          <span>7 jours passés · Aujourd'hui · 7 jours à venir</span>
        </div>
      )}

      {/* ── Sections par date ── */}
      {!charg && datesDisponibles.map(dateStr => {
        const d           = new Date(dateStr + 'T12:00:00')
        const estAuj      = dateStr === dateAujourdhuiStr
        const estPasse    = dateStr < dateAujourdhuiStr
        const parChamp    = matchsParDate[dateStr] || {}
        const nbMatchsJour = Object.values(parChamp).reduce((s, m) => s + m.length, 0)

        return (
          <div key={dateStr}
            ref={el => { sectionsRef.current[dateStr] = el }}
            className={`pm-section-date ${estAuj ? 'aujourd-hui' : estPasse ? 'passe' : 'futur'}`}
          >
            {/* En-tête de la date */}
            <div className="pm-section-header">
              <span className="pm-section-label">{labelDate(d)}</span>
              <span className="pm-section-nb">{nbMatchsJour} match{nbMatchsJour > 1 ? 's' : ''}</span>
              {estPasse && <span className="pm-section-badge resultats">Résultats</span>}
              {estAuj   && <span className="pm-section-badge aujourd-hui">Aujourd'hui</span>}
              {!estPasse && !estAuj && <span className="pm-section-badge programme">À venir</span>}
            </div>

            {/* Matchs groupés par championnat */}
            {Object.entries(parChamp).map(([nomChamp, matchs]) => (
              <section key={nomChamp} className="pm-championnat">
                <div className="pm-champ-header">
                  <span className="pm-champ-flag">{CHAMPIONNATS[nomChamp]?.drapeau || '⚽'}</span>
                  <span className="pm-champ-nom">{nomChamp}</span>
                  <span className="pm-champ-nb">{matchs.length}</span>
                </div>

                {matchs.map(m => {
                  const pred         = predictions[String(m.id)]
                  const enCours      = m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED'
                  const termine      = m.statut_code === 'FINISHED'
                  const aVenir       = !enCours && !termine
                  const combinaisons = pred?.combinaisons || []
                  const scoreReel    = m.score_dom !== null && m.score_ext !== null
                    ? `${m.score_dom}-${m.score_ext}` : null
                  const predOk  = termine && scoreReel && combinaisons.some(c =>
                    c.scores?.includes(scoreReel) || c.label === scoreReel)
                  const predNok = termine && scoreReel && combinaisons.length > 0 && !predOk
                  const ouvert  = matchOuvert?.id === m.id

                  return (
                    <div key={m.id}
                      className={`pm-match ${enCours ? 'en-cours' : ''} ${predOk ? 'correct' : ''} ${predNok ? 'incorrect' : ''} ${ouvert ? 'ouvert' : ''}`}
                      onClick={() => {
                        const suivant = ouvert ? null : { ...m, scoreReel }
                        setMatchOuvert(suivant)
                        if (suivant) trackerActivite('match_ouvert', `${m.domicile} vs ${m.exterieur} (${m.competition})`)
                      }}
                    >
                      <div className="pm-match-ligne">

                        {/* Heure / Statut */}
                        <div className="pm-col-heure">
                          {enCours ? (
                            <span className="pm-live"><IcoLive/> LIVE</span>
                          ) : termine ? (
                            <span className="pm-fin">FIN</span>
                          ) : (
                            <span className="pm-heure">{m.heure}</span>
                          )}
                          {m.statut_code === 'PAUSED' && <span className="pm-mt">MT</span>}
                        </div>

                        {/* Équipes + scores */}
                        <div className="pm-col-match">
                          <div className="pm-equipe-row">
                            <div className="pm-equipe-gauche">
                              {m.logo_dom
                                ? <img src={m.logo_dom} alt="" className="pm-logo"/>
                                : <span className="pm-logo-ph">⚽</span>}
                              <span className="pm-equipe-nom">{m.domicile}</span>
                            </div>
                            <span className={`pm-score-num ${termine || enCours ? 'visible' : ''}`}>
                              {termine || enCours ? (m.score_dom ?? '–') : ''}
                            </span>
                          </div>
                          <div className="pm-equipe-row">
                            <div className="pm-equipe-gauche">
                              {m.logo_ext
                                ? <img src={m.logo_ext} alt="" className="pm-logo"/>
                                : <span className="pm-logo-ph">⚽</span>}
                              <span className="pm-equipe-nom">{m.exterieur}</span>
                            </div>
                            <span className={`pm-score-num ${termine || enCours ? 'visible' : ''}`}>
                              {termine || enCours ? (m.score_ext ?? '–') : ''}
                            </span>
                          </div>
                        </div>

                        {/* Combinaisons + chevron */}
                        <div className="pm-col-droite">
                          {combinaisons.length > 0 && (
                            <div className="pm-combis">
                              {combinaisons.slice(0, 3).map((c, i) => {
                                const ok  = termine && scoreReel &&
                                  (c.scores?.includes(scoreReel) || c.label === scoreReel)
                                const nok = termine && scoreReel && !ok
                                return (
                                  <span key={i}
                                    className={`pm-combi ${ok ? 'ok' : nok ? 'nok' : 'neutre'}`}
                                    style={aVenir ? { borderColor: c.couleur, color: c.couleur } : {}}>
                                    {ok ? <IcoCheck/> : nok ? <IcoX/> : null}
                                    {c.label}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          <span className="pm-chevron">{ouvert ? <IcoUp/> : <IcoDown/>}</span>
                        </div>
                      </div>

                      {/* Panneau détails */}
                      {ouvert && (
                        <PanneauDetails
                          match={{ ...m, scoreReel, statutLabel: m.statut }}
                          prediction={pred}
                          cleApi={cleApi}
                        />
                      )}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Panneau détails ───────────────────────────────────────────
function PanneauDetails({ match, prediction, cleApi }) {
  const [onglet, setOnglet]   = useState('apercu')
  const [details, setDetails] = useState(null)
  const [matchsDom, setMDom]  = useState([])
  const [matchsExt, setMExt]  = useState([])
  const [charg, setCharg]     = useState(true)

  useEffect(() => {
    let annule = false
    async function charger() {
      setCharg(true)
      try {
        if (cleApi) {
          const det = await obtenirDetailsMatch(match.id, cleApi)
          if (!annule) {
            setDetails(det)
            const [mDom, mExt] = await Promise.all([
              det?.homeTeam?.id ? obtenirDerniersMatchsEquipe(det.homeTeam.id, cleApi) : [],
              det?.awayTeam?.id ? obtenirDerniersMatchsEquipe(det.awayTeam.id, cleApi) : [],
            ])
            if (!annule) { setMDom(mDom); setMExt(mExt) }
          }
        }
      } catch {}
      if (!annule) setCharg(false)
    }
    charger()
    return () => { annule = true }
  }, [match.id, cleApi])

  const onglets = [
    { id: 'apercu',     label: 'Aperçu'     },
    { id: 'forme',      label: 'Forme'      },
    { id: 'prediction', label: 'Prédiction' },
  ]

  return (
    <div className="det-panneau" onClick={e => e.stopPropagation()}>
      <div className="det-onglets">
        {onglets.map(o => (
          <button key={o.id}
            className={`det-onglet ${onglet === o.id ? 'actif' : ''}`}
            onClick={() => setOnglet(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {charg ? (
        <div className="det-charg"><span className="pm-spinner"/> Chargement...</div>
      ) : (
        <div className="det-corps">

          {/* Aperçu */}
          {onglet === 'apercu' && (
            <div>
              {[
                ['Compétition', match.competition],
                ['Heure (Dakar)', match.heure],
                ['Statut', match.statutLabel],
                details?.venue         ? ['Stade',   details.venue]            : null,
                details?.referees?.[0] ? ['Arbitre', details.referees[0].name] : null,
              ].filter(Boolean).map(([lbl, val]) => (
                <div key={lbl} className="det-info-ligne">
                  <span className="det-lbl">{lbl}</span>
                  <span className="det-val">{val}</span>
                </div>
              ))}
              {match.scoreReel && (
                <div className="det-score-bloc">
                  <div className="det-score-equipe">
                    {match.logo_dom &&
                      <img src={match.logo_dom} alt="" style={{width:28,height:28,objectFit:'contain'}}/>}
                    <span>{match.domicile}</span>
                  </div>
                  <span className="det-score-txt">{match.scoreReel}</span>
                  <div className="det-score-equipe" style={{flexDirection:'row-reverse'}}>
                    {match.logo_ext &&
                      <img src={match.logo_ext} alt="" style={{width:28,height:28,objectFit:'contain'}}/>}
                    <span>{match.exterieur}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Forme */}
          {onglet === 'forme' && (
            <div className="det-forme">
              <FormeEquipe equipe={match.domicile}  matchs={matchsDom}/>
              <FormeEquipe equipe={match.exterieur} matchs={matchsExt}/>
            </div>
          )}

          {/* Prédiction */}
          {onglet === 'prediction' && (
            <div>
              {!prediction ? (
                <p className="det-vide">Aucune prédiction du tracé pour ce match.</p>
              ) : (
                <>
                  <p className="det-sous-titre">Combinaisons prédites par le tracé</p>
                  {(prediction.combinaisons || []).slice(0, 3).map((c, i) => (
                    <div key={i} className="det-combi"
                      style={{borderLeft: `4px solid ${c.couleur}`}}>
                      <span style={{color: c.couleur, fontWeight: 700, fontSize: '0.95rem'}}>
                        {c.label}
                      </span>
                      {c.desc && <span className="det-combi-desc">{c.desc}</span>}
                    </div>
                  ))}
                  {prediction.interpretation && (
                    <p className="det-interp">{prediction.interpretation}</p>
                  )}
                  <div className="det-vip-note">
                    <IcoStar/>
                    Score exact disponible en <strong>VIP</strong>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Forme d'une équipe ────────────────────────────────────────
function FormeEquipe({ equipe, matchs }) {
  return (
    <div className="forme-bloc">
      <p className="forme-titre">{equipe}</p>
      {matchs.length === 0
        ? <p className="det-vide">Aucun match récent disponible.</p>
        : matchs.slice(0, 5).map((m, i) => {
            const dom   = m.homeTeam?.name || ''
            const ext   = m.awayTeam?.name || ''
            const sd    = m.score?.fullTime?.home ?? '?'
            const se    = m.score?.fullTime?.away ?? '?'
            const estDom = dom.includes(equipe.split(' ')[0])
            const gagne  = estDom ? sd > se : se > sd
            const nul    = String(sd) === String(se)
            return (
              <div key={i} className="forme-match">
                <span className={`forme-res ${gagne ? 'v' : nul ? 'n' : 'd'}`}>
                  {gagne ? 'V' : nul ? 'N' : 'D'}
                </span>
                <span className="forme-noms">{dom} {sd}–{se} {ext}</span>
              </div>
            )
          })
      }
    </div>
  )
}
