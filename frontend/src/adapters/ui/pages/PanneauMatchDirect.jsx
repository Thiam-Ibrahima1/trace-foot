// PanneauMatchDirect.jsx — Page plein écran détail d'un match en direct
import { useState, useEffect, useCallback } from 'react'
import { getMatchDetails } from '../../../adapters/api/ServiceApi.js'
import './PanneauMatchDirect.css'

// ── Icônes SVG ────────────────────────────────────────────────
const IcoRetour = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IcoBall = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:13,height:13,flexShrink:0}}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2 a10 10 0 0 1 6.7 2.6 L15 9l-3-1-3 1-3.7-4.4A10 10 0 0 1 12 2z" fill="currentColor"/>
    <path d="M2.3 7.6 L6 12l-1 4 4 1.5 3-2.5 3 2.5 4-1.5-1-4 3.7-4.4" fill="none" stroke="currentColor" strokeWidth="1"/>
  </svg>
)
const IcoCartonJ = () => (
  <svg viewBox="0 0 24 24" style={{width:13,height:16,flexShrink:0}}>
    <rect x="4" y="3" width="16" height="20" rx="2" fill="#fbbf24"/>
  </svg>
)
const IcoCartonR = () => (
  <svg viewBox="0 0 24 24" style={{width:13,height:16,flexShrink:0}}>
    <rect x="4" y="3" width="16" height="20" rx="2" fill="#ef4444"/>
  </svg>
)
const IcoChange = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13,flexShrink:0}}>
    <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
  </svg>
)
const IcoVar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13,flexShrink:0}}>
    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
  </svg>
)
const IcoEvenement = (type, detail) => {
  const t = (type || '').toLowerCase()
  if (t === 'goal') {
    if ((detail||'').toLowerCase().includes('own'))     return { ico: <IcoBall />,    classe: 'but-csc', label: 'C.S.C.' }
    if ((detail||'').toLowerCase().includes('penalty')) return { ico: <IcoBall />,    classe: 'but-pen', label: 'Penalty' }
    return { ico: <IcoBall />, classe: 'but', label: 'But' }
  }
  if (t === 'card') {
    if ((detail||'').toLowerCase().includes('yellow')) return { ico: <IcoCartonJ />, classe: 'carton-j', label: 'Jaune' }
    return { ico: <IcoCartonR />, classe: 'carton-r', label: 'Rouge' }
  }
  if (t === 'subst') return { ico: <IcoChange />, classe: 'change', label: 'Changement' }
  if (t === 'var')   return { ico: <IcoVar />,    classe: 'var',    label: 'VAR' }
  return { ico: null, classe: '', label: type || '' }
}

const Spinner = () => (
  <div className="pmd-spinner-wrap"><span className="pmd-spinner" /></div>
)

// ── Composant principal ───────────────────────────────────────
export default function PanneauMatchDirect({ match: m, onFermer, modeAdmin = false }) {
  const [onglet, setOnglet] = useState('resume')

  const [resume,       setResume]   = useState(null)
  const [stats,        setStats]    = useState(null)
  const [compositions, setCompos]   = useState(null)
  const [forme,        setForme]    = useState(null)
  const [h2h,          setH2H]      = useState(null)
  const [classement,   setClass]    = useState(null)
  const [chargS,       setChargS]   = useState({})

  const estLive    = m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED'
  const estPause   = m.statut_code === 'PAUSED'
  const estTermine = m.statut_code === 'FINISHED'
    || (!estLive && m.score_dom !== null && m.score_dom !== undefined)
    || (!estLive && !!m._pred?.score_reel)

  // Formater la date en jj.MM.AA
  const dateFormatee = m.date
    ? (() => { const [y, mo, d] = m.date.split('-'); return `${d}.${mo}.${y.slice(2)}` })()
    : ''

  const chargerSection = useCallback(async (section) => {
    if (chargS[section]) return
    setChargS(p => ({ ...p, [section]: true }))
    const params = { homeId: m.home_id||'', awayId: m.away_id||'', leagueId: m.comp_id||'', live: estLive ? '1' : '0' }
    const data = await getMatchDetails(m.id, section, params)
    switch (section) {
      case 'resume':       setResume(data);  break
      case 'stats':        setStats(data);   break
      case 'compositions': setCompos(data);  break
      case 'forme':        setForme(data);   break
      case 'h2h':          setH2H(data);     break
      case 'classement':   setClass(data);   break
    }
    setChargS(p => ({ ...p, [section]: false }))
  }, [m.id, m.comp_id, m.home_id, m.away_id, estLive, chargS])

  useEffect(() => { chargerSection('resume') }, []) // eslint-disable-line
  useEffect(() => {
    if (onglet === 'stats'        && !stats)        chargerSection('stats')
    if (onglet === 'compositions' && !compositions) chargerSection('compositions')
    if (onglet === 'forme') {
      if (!forme) chargerSection('forme')
      if (!h2h)   chargerSection('h2h')   // H2H chargé dans Forme
    }
    if (onglet === 'classement'   && !classement)   chargerSection('classement')
  }, [onglet]) // eslint-disable-line

  const onglets = [
    { id: 'resume',       label: 'Résumé'     },
    { id: 'stats',        label: 'Stats'      },
    { id: 'compositions', label: 'Compos'     },
    { id: 'forme',        label: 'Forme'      },
    { id: 'codes',        label: 'Prédictions'},
    { id: 'classement',   label: 'Classement' },
  ]

  return (
    <div className={`pmd-page${modeAdmin ? ' pmd-admin' : ''}`}>
      {/* ── Barre de navigation haut ── */}
      <div className="pmd-topbar">
        <button className="pmd-btn-retour" onClick={onFermer}>
          <IcoRetour />
          <span>Retour</span>
        </button>
        <div className="pmd-topbar-comp-pill">
          {m.comp_logo && (
            <img src={m.comp_logo} alt="" className="pmd-topbar-comp-logo"
              onError={e => { e.target.style.display = 'none' }} />
          )}
          <span className="pmd-topbar-comp-nom">{m.competition}</span>
        </div>
        {estLive && !estPause && (
          <span className="pmd-topbar-live">
            <span className="pmd-live-dot" />
            {m.minute ? `${m.minute}'` : 'LIVE'}
          </span>
        )}
        {estPause && <span className="pmd-topbar-mt">Mi-T</span>}
      </div>

      {/* ── Hero match ── */}
      <div className="pmd-hero">
        {/* Date + heure de démarrage */}
        <div className="pmd-hero-heure-ligne">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11,opacity:.5}}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="pmd-hero-heure-txt">
            {dateFormatee && <>{dateFormatee} · </>}Coup d'envoi {m.heure}
          </span>
        </div>

        {/* Équipes + score */}
        <div className="pmd-hero-corps">
          <div className="pmd-hero-equipe">
            {m.logo_dom
              ? <img src={m.logo_dom} alt="" className="pmd-hero-logo" />
              : <div className="pmd-hero-logo-ph">{(m.domicile||'?')[0]}</div>}
            <span className="pmd-hero-nom">{m.domicile}</span>
          </div>

          <div className="pmd-hero-score">
            <div className="pmd-score-row">
              <span className={`pmd-score-n ${estLive && !estPause ? 'live' : ''}`}>{m.score_dom ?? '–'}</span>
              <span className="pmd-score-sep">–</span>
              <span className={`pmd-score-n ${estLive && !estPause ? 'live' : ''}`}>{m.score_ext ?? '–'}</span>
            </div>
            <span className="pmd-score-statut">
              {estPause ? 'Mi-temps' : estLive ? 'En cours' : estTermine ? 'Terminé' : 'À venir'}
            </span>
          </div>

          <div className="pmd-hero-equipe">
            {m.logo_ext
              ? <img src={m.logo_ext} alt="" className="pmd-hero-logo" />
              : <div className="pmd-hero-logo-ph">{(m.exterieur||'?')[0]}</div>}
            <span className="pmd-hero-nom">{m.exterieur}</span>
          </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="pmd-onglets">
        {onglets.map(o => (
          <button key={o.id}
            className={`pmd-onglet ${onglet === o.id ? 'actif' : ''}`}
            onClick={() => setOnglet(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="pmd-corps">
        {onglet === 'resume'       && (chargS.resume       ? <Spinner /> : <SectionResume data={resume} />)}
        {onglet === 'stats'        && (chargS.stats        ? <Spinner /> : <SectionStats data={stats} match={m} />)}
        {onglet === 'compositions' && (chargS.compositions ? <Spinner /> : <SectionCompositions data={compositions} match={m} />)}
        {onglet === 'forme'        && ((chargS.forme || chargS.h2h) ? <Spinner /> : <SectionForme data={forme} h2h={h2h} match={m} />)}
        {onglet === 'codes'        && <SectionCodes pred={m._pred} match={m} modeAdmin={modeAdmin} />}
        {onglet === 'classement'   && (chargS.classement   ? <Spinner /> : <SectionClassement data={classement} match={m} />)}
      </div>
    </div>
  )
}

// ── Traduction des types d'événements en français ────────────
const EVT_FR = type => {
  switch ((type || '').toLowerCase()) {
    case 'goal':  return 'But'
    case 'card':  return 'Carton'
    case 'subst': return 'Remplacement'
    case 'var':   return 'VAR'
    case 'penalty missed': return 'Penalty manqué'
    default:      return type || ''
  }
}
const DET_FR = det => {
  const d = (det || '').toLowerCase()
  if (d.includes('yellow')) return 'Carton jaune'
  if (d.includes('red'))    return 'Carton rouge'
  if (d.includes('own'))    return 'But contre son camp'
  if (d.includes('penalty'))return 'Penalty'
  if (d.includes('missed')) return 'Penalty manqué'
  if (d.includes('cancel')) return 'But annulé (VAR)'
  if (d.includes('offside'))return 'Hors-jeu (VAR)'
  if (d.includes('foul'))   return 'Faute (VAR)'
  return det || ''
}

// ── Section Résumé — événements uniquement ────────────────────
function SectionResume({ data }) {
  if (!data) return <div className="pmd-vide">Résumé non disponible</div>
  const evenements = data.evenements || []
  if (!evenements.length)
    return <div className="pmd-vide">Aucun événement pour le moment</div>

  return (
    <div className="pmd-section">
      <div className="pmd-bloc">
        <h3 className="pmd-bloc-titre">Événements du match</h3>
        {evenements.map((ev, i) => {
          const { ico, classe } = IcoEvenement(ev.type, ev.detail)
          const min   = ev.time?.elapsed ?? '?'
          const extra = ev.time?.extra   ?? 0
          const label = DET_FR(ev.detail) || EVT_FR(ev.type)
          return (
            <div key={i} className={`pmd-evenement ${classe}`}>
              <span className="pmd-ev-min">
                {min}{extra > 0 ? `+${extra}` : ''}'
              </span>
              <span className="pmd-ev-ico">{ico}</span>
              <div className="pmd-ev-info">
                <span className="pmd-ev-joueur">{ev.player?.name || '–'}</span>
                {ev.type === 'subst' && ev.assist?.name && (
                  <span className="pmd-ev-detail">↑ {ev.assist.name}</span>
                )}
                <span className="pmd-ev-equipe">{ev.team?.name}</span>
              </div>
              <span className="pmd-ev-label">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Traduction des noms de statistiques ──────────────────────
const STAT_FR = {
  'Shots on Goal':         'Tirs cadrés',
  'Shots off Goal':        'Tirs non cadrés',
  'Total Shots':           'Total tirs',
  'Blocked Shots':         'Tirs bloqués',
  'Shots insidebox':       'Tirs dans la surface',
  'Shots outsidebox':      'Tirs hors surface',
  'Fouls':                 'Fautes commises',
  'Corner Kicks':          'Corners',
  'Offsides':              'Hors-jeu',
  'Ball Possession':       'Possession (%)',
  'Yellow Cards':          'Cartons jaunes',
  'Red Cards':             'Cartons rouges',
  'Yellow Cards Red':      'Double avertissement',
  'Goalkeeper Saves':      'Arrêts du gardien',
  'Total passes':          'Total passes',
  'Passes accurate':       'Passes réussies',
  'Passes %':              'Précision passes (%)',
  'expected_goals':        'Buts attendus (xG)',
  'goals_prevented':       'Buts évités',
  'Penalty Scored':        'Penalty marqué',
  'Penalty Missed':        'Penalty manqué',
}
const statFr = type => STAT_FR[type] || type

// Calcul des stats d'une mi-temps depuis les événements
function calcStatsMi(evts, domNom) {
  const dom = { buts: 0, csc: 0, jaunes: 0, rouges: 0, subs: 0 }
  const ext = { buts: 0, csc: 0, jaunes: 0, rouges: 0, subs: 0 }
  evts.forEach(ev => {
    const isDom = ev.team?.name === domNom
    const t     = isDom ? dom : ext
    const type  = (ev.type   || '').toLowerCase()
    const det   = (ev.detail || '').toLowerCase()
    if (type === 'goal') {
      if (det.includes('own')) { (isDom ? ext : dom).buts++; t.csc++ }
      else t.buts++
    }
    if (type === 'card') {
      if (det.includes('yellow')) t.jaunes++
      else t.rouges++
    }
    if (type === 'subst') t.subs++
  })
  return { dom, ext }
}

// Rendu d'un tableau de stats
function LignesStat({ lignes }) {
  return (
    <>
      {lignes.map((l, i) => {
        const dv    = l.dom ?? '0'
        const ev    = l.ext ?? '0'
        const isPct = typeof dv === 'string' && dv.includes('%')
        const dvNum = isPct ? parseFloat(dv) : null
        const evNum = isPct ? parseFloat(ev)  : null
        return (
          <div key={i} className="pmd-stat-ligne">
            <span className="pmd-stat-val dom">{dv}</span>
            <div className="pmd-stat-barre-wrap">
              <span className="pmd-stat-nom">{statFr(l.type || l.label || '')}</span>
              {isPct && dvNum !== null && (
                <div className="pmd-stat-barre">
                  <div className="pmd-stat-barre-dom" style={{ width: `${dvNum}%` }} />
                  <div className="pmd-stat-barre-ext" style={{ width: `${evNum}%` }} />
                </div>
              )}
            </div>
            <span className="pmd-stat-val ext">{ev}</span>
          </div>
        )
      })}
    </>
  )
}

// ── Section Stats — sous-onglets Match / 1.Mi-temps / 2.Mi-temps ──
function SectionStats({ data, match: m }) {
  const [sous, setSous] = useState('match')

  if (!data) return <div className="pmd-vide">Statistiques non disponibles</div>

  const sousTabs = [
    { id: 'match', label: 'Match'       },
    { id: 'mi1',   label: '1. Mi-temps' },
    { id: 'mi2',   label: '2. Mi-temps' },
  ]

  const statsAPI = data.statistiques || []
  const evtsMi1  = data.mi1          || []
  const evtsMi2  = data.mi2          || []

  // En-tête avec logos des deux équipes
  const EnteteEquipes = () => (
    <div className="pmd-stats-header">
      <div className="pmd-stats-eq dom">
        {statsAPI[0]?.team?.logo && <img src={statsAPI[0].team.logo} alt="" className="pmd-stats-logo" />}
        <span>{m.domicile}</span>
      </div>
      <span className="pmd-stats-vs">VS</span>
      <div className="pmd-stats-eq ext">
        <span>{m.exterieur}</span>
        {statsAPI[1]?.team?.logo && <img src={statsAPI[1].team.logo} alt="" className="pmd-stats-logo" />}
      </div>
    </div>
  )

  // Onglet Match — stats complètes de l'API
  const StatsMatch = () => {
    if (!statsAPI.length) return <div className="pmd-vide-mini">Statistiques non disponibles</div>
    const domStats = statsAPI[0]?.statistics || []
    const extStats = statsAPI[1]?.statistics || []
    const lignes   = domStats.map((s, i) => ({
      type: s.type,
      dom:  s.value ?? '0',
      ext:  extStats[i]?.value ?? '0',
    }))
    return (
      <div className="pmd-stats-complete">
        <EnteteEquipes />
        <LignesStat lignes={lignes} />
      </div>
    )
  }

  // Onglet Mi-temps — stats calculées depuis les événements
  const StatsMiTemps = ({ evts, periode }) => {
    const { dom, ext } = calcStatsMi(evts, m.domicile)
    const lignes = [
      { type: 'Buts marqués',    dom: dom.buts,    ext: ext.buts    },
      { type: 'Buts contre son camp', dom: dom.csc, ext: ext.csc   },
      { type: 'Yellow Cards',    dom: dom.jaunes,  ext: ext.jaunes  },
      { type: 'Red Cards',       dom: dom.rouges,  ext: ext.rouges  },
      { type: 'Remplacements',   dom: dom.subs,    ext: ext.subs    },
    ]
    return (
      <div className="pmd-stats-complete">
        <EnteteEquipes />
        <div className="pmd-stats-mi-titre">{periode}</div>
        <LignesStat lignes={lignes} />
        {evts.length === 0 && (
          <div className="pmd-vide-mini" style={{marginTop:8}}>Aucun événement pour cette période</div>
        )}
      </div>
    )
  }

  return (
    <div className="pmd-section">
      <div className="pmd-sous-onglets">
        {sousTabs.map(t => (
          <button key={t.id}
            className={`pmd-sous-onglet ${sous === t.id ? 'actif' : ''}`}
            onClick={() => setSous(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="pmd-bloc" style={{ padding: 0 }}>
        {sous === 'match' && <StatsMatch />}
        {sous === 'mi1'   && <StatsMiTemps evts={evtsMi1} periode="1ère Mi-temps" />}
        {sous === 'mi2'   && <StatsMiTemps evts={evtsMi2} periode="2ème Mi-temps" />}
      </div>
    </div>
  )
}

// ── Terrain combiné — les deux équipes face à face sur un seul terrain ──
function TerrainCombine({ dom, ext }) {
  const nomCourt = nom => {
    if (!nom) return '?'
    const p = nom.split(' ')
    return p[p.length - 1]
  }

  const getRangees = equipe => {
    const tit  = equipe?.startXI || []
    const form = equipe?.formation || ''
    const lgns = form.split('-').map(Number).filter(n => !isNaN(n) && n > 0)
    const gk   = tit[0] || null
    let idx    = 1
    const rgs  = lgns.map(n => { const r = tit.slice(idx, idx + n); idx += n; return r })
    return { gk, rangees: rgs }
  }

  const coulPos = (pos, col) => {
    switch ((pos || '').toUpperCase()) {
      case 'GK': return '#fbbf24'
      case 'D':  return col
      case 'M':  return '#1976d2'
      case 'F':  return '#c62828'
      default:   return col
    }
  }

  const Badge = ({ j, col }) => (
    <div className="terrain-joueur">
      <div className="terrain-cercle" style={{ background: coulPos(j?.player?.pos, col) }}>
        {j?.player?.number}
      </div>
      <span className="terrain-poste">{j?.player?.pos}</span>
      <span className="terrain-nom-j">{nomCourt(j?.player?.name)}</span>
    </div>
  )

  const { gk: gkD, rangees: rgsD } = getRangees(dom)
  const { gk: gkE, rangees: rgsE } = getRangees(ext)

  return (
    <div className="tc-wrap">
      {/* En-tête équipe extérieure (haut — bleu) */}
      <div className="tc-header tc-header-ext">
        {ext?.team?.logo && <img src={ext.team.logo} alt="" className="tc-logo" />}
        <span className="tc-nom">{ext?.team?.name}</span>
        {ext?.formation && <span className="tc-form tc-form-ext">{ext.formation}</span>}
        {ext?.coach?.name && <span className="tc-coach">{ext.coach.name}</span>}
      </div>

      {/* Terrain unique — les deux équipes face à face */}
      <div className="tc-pitch">

        {/* Demi-terrain extérieur — GK en haut, attaque vers le centre */}
        <div className="tc-demi">
          {gkE && (
            <div className="terrain-rangee">
              <Badge j={gkE} col="#1565c0" />
            </div>
          )}
          {rgsE.map((rg, ri) => (
            <div key={ri} className="terrain-rangee">
              {rg.map((j, ji) => <Badge key={ji} j={j} col="#1565c0" />)}
            </div>
          ))}
        </div>

        {/* Ligne + rond médian */}
        <div className="tc-milieu">
          <div className="tc-milieu-cercle" />
        </div>

        {/* Demi-terrain domicile — attaque vers le centre, GK en bas */}
        <div className="tc-demi">
          {[...rgsD].reverse().map((rg, ri) => (
            <div key={ri} className="terrain-rangee">
              {rg.map((j, ji) => <Badge key={ji} j={j} col="#1b5e20" />)}
            </div>
          ))}
          {gkD && (
            <div className="terrain-rangee">
              <Badge j={gkD} col="#1b5e20" />
            </div>
          )}
        </div>

      </div>

      {/* En-tête équipe domicile (bas — vert) */}
      <div className="tc-header tc-header-dom">
        {dom?.team?.logo && <img src={dom.team.logo} alt="" className="tc-logo" />}
        <span className="tc-nom">{dom?.team?.name}</span>
        {dom?.formation && <span className="tc-form tc-form-dom">{dom.formation}</span>}
        {dom?.coach?.name && <span className="tc-coach">{dom.coach.name}</span>}
      </div>
    </div>
  )
}

// ── Section Compositions (Compos) ─────────────────────────────
function SectionCompositions({ data, match: m }) {
  if (!data?.compositions?.length)
    return <div className="pmd-vide">Compositions non disponibles</div>

  const dom = data.compositions[0]
  const ext = data.compositions[1]
  const nomCourt = nom => { if (!nom) return '?'; const p = nom.split(' '); return p[p.length - 1] }
  const rempDom   = dom?.substitutes || []
  const rempExt   = ext?.substitutes || []

  // Motif indisponibilité en français
  const motifFr = raison => {
    const r = (raison || '').toLowerCase()
    if (r.includes('red card')    || r.includes('suspended')) return '🟥 Suspendu'
    if (r.includes('injury')      || r.includes('injured'))   return '🤕 Blessé'
    if (r.includes('ill')         || r.includes('sick'))      return '🤒 Malade'
    if (r.includes('out of squad')|| r.includes('missing'))   return '⛔ Absent'
    if (r.includes('covid'))                                   return '😷 COVID'
    if (r)                                                     return `❌ ${raison}`
    return '❌ Indisponible'
  }

  // Joueurs indisponibles (blessés, suspendus, etc.) dans les substitutes avec reason
  const indisDom = rempDom.filter(j => j.player?.reason)
  const indisExt = rempExt.filter(j => j.player?.reason)
  const remDom   = rempDom.filter(j => !j.player?.reason)
  const remExt   = rempExt.filter(j => !j.player?.reason)

  return (
    <div className="pmd-section">
      <TerrainCombine dom={dom} ext={ext} />

      {/* Remplaçants */}
      {(remDom.length > 0 || remExt.length > 0) && (
        <div className="pmd-rempla-section">
          <h3 className="pmd-bloc-titre" style={{padding:'10px 14px 6px',margin:0}}>Remplaçants</h3>
          <div className="pmd-rempla-grille">
            <div className="pmd-rempla-col">
              <div className="pmd-rempla-col-header">
                {dom?.team?.logo && <img src={dom.team.logo} alt="" style={{width:16,height:16,objectFit:'contain'}} />}
                <span>{dom?.team?.name || m.domicile}</span>
              </div>
              {remDom.map((j, i) => (
                <div key={i} className="pmd-rempla-item">
                  <span className="pmd-rempla-num">{j.player?.number}</span>
                  <span className="pmd-rempla-nom">{nomCourt(j.player?.name)}</span>
                  <span className="pmd-rempla-pos dom">{j.player?.pos}</span>
                </div>
              ))}
            </div>
            <div className="pmd-rempla-divider" />
            <div className="pmd-rempla-col">
              <div className="pmd-rempla-col-header">
                {ext?.team?.logo && <img src={ext.team.logo} alt="" style={{width:16,height:16,objectFit:'contain'}} />}
                <span>{ext?.team?.name || m.exterieur}</span>
              </div>
              {remExt.map((j, i) => (
                <div key={i} className="pmd-rempla-item">
                  <span className="pmd-rempla-num">{j.player?.number}</span>
                  <span className="pmd-rempla-nom">{nomCourt(j.player?.name)}</span>
                  <span className="pmd-rempla-pos ext">{j.player?.pos}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Indisponibles (blessés / suspendus) */}
      {(indisDom.length > 0 || indisExt.length > 0) && (
        <div className="pmd-rempla-section">
          <h3 className="pmd-bloc-titre" style={{padding:'10px 14px 6px',margin:0,color:'#dc2626'}}>
            Indisponibles
          </h3>
          <div className="pmd-rempla-grille">
            <div className="pmd-rempla-col">
              {indisDom.length > 0 && (
                <div className="pmd-rempla-col-header">
                  {dom?.team?.logo && <img src={dom.team.logo} alt="" style={{width:16,height:16,objectFit:'contain'}} />}
                  <span>{dom?.team?.name || m.domicile}</span>
                </div>
              )}
              {indisDom.map((j, i) => (
                <div key={i} className="pmd-rempla-item">
                  <span className="pmd-rempla-nom">{nomCourt(j.player?.name)}</span>
                  <span className="pmd-rempla-pos" style={{color:'#dc2626',fontSize:'.6rem'}}>{motifFr(j.player?.reason)}</span>
                </div>
              ))}
            </div>
            {(indisDom.length > 0 && indisExt.length > 0) && <div className="pmd-rempla-divider" />}
            <div className="pmd-rempla-col">
              {indisExt.length > 0 && (
                <div className="pmd-rempla-col-header">
                  {ext?.team?.logo && <img src={ext.team.logo} alt="" style={{width:16,height:16,objectFit:'contain'}} />}
                  <span>{ext?.team?.name || m.exterieur}</span>
                </div>
              )}
              {indisExt.map((j, i) => (
                <div key={i} className="pmd-rempla-item">
                  <span className="pmd-rempla-nom">{nomCourt(j.player?.name)}</span>
                  <span className="pmd-rempla-pos" style={{color:'#dc2626',fontSize:'.6rem'}}>{motifFr(j.player?.reason)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section Forme — 3 sous-onglets ───────────────────────────
function SectionForme({ data, h2h, match: m }) {
  const abrDom = (m.domicile || '').slice(0, 3).toUpperCase()
  const abrExt = (m.exterieur|| '').slice(0, 3).toUpperCase()

  const [sous, setSous] = useState('confrontations')
  const sousTabs = [
    { id: 'confrontations', label: 'Confrontations'      },
    { id: 'dom',            label: `${abrDom} - Dom`     },
    { id: 'ext',            label: `${abrExt} - Ext`     },
  ]

  const fDom = data?.forme_dom || []
  const fExt = data?.forme_ext || []
  const h2hMatchs = h2h?.h2h || []

  // Filtrer matchs domicile à domicile et extérieur à l'extérieur
  const domHome = fDom.filter(fm => fm.dom === m.domicile)
  const extAway = fExt.filter(fm => fm.ext === m.exterieur)

  const LigneMatch = ({ fm }) => (
    <div className="pmd-forme-match">
      <span className={`pmd-forme-res ${fm.res}`}>{fm.res}</span>
      {fm.dom_logo && <img src={fm.dom_logo} alt="" className="pmd-forme-logo"/>}
      <span className="pmd-forme-noms">{fm.dom}</span>
      <span className="pmd-forme-score">{fm.sd}–{fm.se}</span>
      <span className="pmd-forme-noms">{fm.ext}</span>
      {fm.ext_logo && <img src={fm.ext_logo} alt="" className="pmd-forme-logo"/>}
      <span className="pmd-forme-date">{fm.date?.slice(0, 7)}</span>
    </div>
  )

  return (
    <div className="pmd-section">
      <div className="pmd-sous-onglets">
        {sousTabs.map(t => (
          <button key={t.id}
            className={`pmd-sous-onglet ${sous === t.id ? 'actif' : ''}`}
            onClick={() => setSous(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Confrontations (H2H) */}
      {sous === 'confrontations' && (
        <div className="pmd-bloc">
          <h3 className="pmd-bloc-titre">{m.domicile} vs {m.exterieur} — dernières rencontres</h3>
          {h2hMatchs.length === 0
            ? <div className="pmd-vide-mini">Aucune confrontation disponible</div>
            : h2hMatchs.slice().reverse().map((fm, i) => <LigneMatch key={i} fm={fm} />)
          }
        </div>
      )}

      {/* Forme domicile à domicile */}
      {sous === 'dom' && (
        <div className="pmd-bloc">
          <div className="pmd-forme-header">
            {m.logo_dom && <img src={m.logo_dom} alt="" style={{width:18,height:18,objectFit:'contain'}}/>}
            <h3 className="pmd-bloc-titre" style={{margin:0}}>{m.domicile} — matchs à domicile</h3>
          </div>
          {domHome.length === 0
            ? <div className="pmd-vide-mini">Aucun match à domicile disponible</div>
            : domHome.slice().reverse().map((fm, i) => <LigneMatch key={i} fm={fm} />)
          }
        </div>
      )}

      {/* Forme extérieur à l'extérieur */}
      {sous === 'ext' && (
        <div className="pmd-bloc">
          <div className="pmd-forme-header">
            {m.logo_ext && <img src={m.logo_ext} alt="" style={{width:18,height:18,objectFit:'contain'}}/>}
            <h3 className="pmd-bloc-titre" style={{margin:0}}>{m.exterieur} — matchs à l'extérieur</h3>
          </div>
          {extAway.length === 0
            ? <div className="pmd-vide-mini">Aucun match à l'extérieur disponible</div>
            : extAway.slice().reverse().map((fm, i) => <LigneMatch key={i} fm={fm} />)
          }
        </div>
      )}
    </div>
  )
}

// ── Icônes SVG pour les pronostics ───────────────────────────
const IcoBallon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2 C12 2 9 6 9 12 C9 18 12 22 12 22"/>
    <path d="M12 2 C12 2 15 6 15 12 C15 18 12 22 12 22"/>
    <path d="M2 12 H22"/>
    <path d="M3.5 7 Q8 9 12 9 Q16 9 20.5 7"/>
    <path d="M3.5 17 Q8 15 12 15 Q16 15 20.5 17"/>
  </svg>
)
const IcoDomicile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
)
const IcoExterieur = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
)
// Double chance domicile (1X) — fourche montante : une tige + deux branches vers le haut
const IcoDoubleDom = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <line x1="12" y1="21" x2="12" y2="12"/>
    <path d="M12 12 L6 5"/>
    <path d="M12 12 L18 5"/>
    <polyline points="4 7 6 5 8 7"/>
    <polyline points="16 7 18 5 20 7"/>
  </svg>
)
// Double chance extérieur (2X) — fourche descendante : tige + deux branches vers le bas
const IcoDoubleExt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <line x1="12" y1="3" x2="12" y2="12"/>
    <path d="M12 12 L6 19"/>
    <path d="M12 12 L18 19"/>
    <polyline points="4 17 6 19 8 17"/>
    <polyline points="16 17 18 19 20 17"/>
  </svg>
)
const IcoDeuxEquipes = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    {/* Ballon entre deux buts — les 2 équipes marquent */}
    <rect x="1" y="8" width="5" height="8" rx="1"/>
    <rect x="18" y="8" width="5" height="8" rx="1"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M6 12h3M15 12h3"/>
  </svg>
)
const IcoFlamme = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17h2a2.5 2.5 0 0 0 2.5-2.5v-.5c0-1.5-1-2.5-1-4 0-2 1.5-3.5 2-5.5C16 5 14 2 12 2c0 0-2 1.5-2 4.5 0 2.5 1.5 3.5 1.5 4.5v.5c0 1-.5 2-3 3z"/>
  </svg>
)

// ── Labels lisibles pour les pronostics (aucun terme technique) ─
const PRONOS_LABELS = {
  'V1':   { titre: 'Victoire domicile',      Ico: IcoBallon     },
  'V2':   { titre: 'Victoire extérieur',     Ico: IcoBallon     },
  '1X':   { titre: 'Double chance domicile', Ico: IcoDoubleDom  },
  '2X':   { titre: 'Double chance extérieur',Ico: IcoDoubleExt  },
  '+2,5': { titre: 'Plus de 2 buts',         Ico: IcoBallon    },
  '-2,5': { titre: 'Moins de 3 buts',        Ico: IcoFlamme    },
  '2EM':  { titre: 'Les 2 équipes marquent', Ico: IcoDeuxEquipes },
  '+1,5': { titre: 'Plus d\'1 but',          Ico: IcoBallon    },
  '-3,5': { titre: 'Moins de 4 buts',        Ico: IcoFlamme    },
  '+3,5': { titre: 'Plus de 3 buts',         Ico: IcoFlamme    },
}

function evalProno(label, sr) {
  if (!sr) return 'pending'
  const [d, e] = sr.split('-').map(Number)
  const t = d + e
  const r = { 'V1': d>e,'V2': e>d,'1X': d>=e,'2X': e>=d,'+2,5': t>=3,'-2,5': t<3,'2EM': d>0&&e>0,'+1,5': t>=2,'-3,5': t<4,'+3,5': t>=4 }
  return r[label] !== undefined ? (r[label] ? 'ok' : 'nok') : 'pending'
}

// ── Section Prédictions — pronostics gratuits du match ─────────
function SectionCodes({ pred, match: m, modeAdmin = false }) {
  const combis     = pred?.combinaisons || []
  const scorePrevu = modeAdmin ? pred?.score_prevu : null  // score prédit masqué côté utilisateur
  const scoreReel  = pred?.score_reel
  const aProno     = combis.length > 0 || (modeAdmin && scorePrevu)

  if (!pred || !aProno) return (
    <div className="pmd-vide">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" style={{width:40,height:40,color:'#cbd5e1',marginBottom:8}}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p style={{margin:0,color:'#94a3b8',fontSize:'.85rem'}}>Aucun pronostic disponible pour ce match</p>
    </div>
  )

  return (
    <div className="pmd-section">

      {/* ── Carte score ── */}
      {(scorePrevu || scoreReel) && (() => {
        const exact = scoreReel && scorePrevu && scorePrevu === scoreReel
        const perdu = scoreReel && scorePrevu && scorePrevu !== scoreReel
        const etat  = exact ? 'ok' : perdu ? 'nok' : scoreReel ? 'fin' : 'pending'
        return (
          <div className="pp-pred-score-wrap">
            <div className={`pp-pred-score-carte pp-pred-carte-${etat === 'fin' ? 'ok' : etat}`}>
              <div className="pp-pred-carte-ico">
                {scoreReel ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
              <div className="pp-pred-score-centre">
                <span className="pp-pred-score-lbl">
                  {scoreReel ? 'Résultat final' : 'Score pronostiqué'}
                </span>
                <span className={`pp-pred-score-val pp-pred-score-${etat === 'fin' ? 'ok' : etat}`}>
                  {scoreReel || scorePrevu}
                </span>
                {modeAdmin && perdu && (
                  <span className="pp-pred-score-notre">Prédiction : {scorePrevu}</span>
                )}
                <span className={`pp-pred-score-badge pp-pred-badge-${etat === 'fin' ? 'ok' : etat}`}>
                  {exact ? 'Pronostic exact' : perdu ? 'Résultat différent' : scoreReel ? 'Terminé' : 'En attente'}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Pronostics ── */}
      {combis.length > 0 && (
        <div className="pp-pred-pronostics">
          <div className="pp-pred-pronostics-titre">Pronostics gratuits</div>
          {combis.map((c, i) => {
            const etat = evalProno(c.label, scoreReel)
            const info = PRONOS_LABELS[c.label] || { titre: c.label, Ico: IcoBallon }
            const { Ico } = info
            return (
              <div key={i} className={`pp-pred-item pp-pred-item-${etat}`}>
                <span className="pp-pred-item-ico"><Ico /></span>
                <div className="pp-pred-item-texte">
                  <span className="pp-pred-item-code">{c.label}</span>
                  <span className="pp-pred-item-titre">{info.titre}</span>
                </div>
                <span className={`pp-pred-item-statut pp-pred-statut-${etat}`}>
                  {etat === 'ok'  ? '✓ Validé'    :
                   etat === 'nok' ? '✗ Perdu'     :
                                   '⏳ En attente'}
                </span>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

function SectionClassement({ data, match: m }) {
  const table = data?.classement?.[0]?.league?.standings?.[0] || []
  if (!table.length) return <div className="pmd-vide">Classement non disponible</div>

  const couleurRang = r => r === 1 ? '#1b5e20' : r <= 4 ? '#1565c0' : r <= 6 ? '#0369a1' : '#94a3b8'
  const nomsDuMatch = [m.domicile?.toLowerCase(), m.exterieur?.toLowerCase()]

  return (
    <div className="pmd-section">
      <div className="pmd-bloc">
        <h3 className="pmd-bloc-titre">{m.competition} — Classement</h3>
        <table className="pmd-classement-table">
          <thead>
            <tr><th>#</th><th className="pmd-th-eq">Équipe</th><th>MJ</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {table.slice(0, 20).map((eq, i) => {
              const rang = eq.rank || i + 1
              const est  = nomsDuMatch.includes(eq.team?.name?.toLowerCase())
              return (
                <tr key={i} className={`pmd-cl-ligne ${est ? 'surligne' : ''}`}>
                  <td><span className="pmd-cl-rang" style={{background: couleurRang(rang)}}>{rang}</span></td>
                  <td className="pmd-cl-equipe">
                    {eq.team?.logo && <img src={eq.team.logo} alt="" className="pmd-cl-logo"/>}
                    <span className="pmd-cl-nom">{eq.team?.name}</span>
                  </td>
                  <td className="pmd-cl-val">{eq.all?.played ?? eq.playedGames}</td>
                  <td className="pmd-cl-pts">{eq.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
