// PageChampionnat.jsx — Classements, phases et résultats via API-Sports
// IDs de ligues : API-Football (api-sports.io)
import { useState, useEffect, useRef } from 'react'
import { obtenirClassementChampionnat, obtenirMatchsCompetition, obtenirCalendrierCompetition } from '../../../adapters/api/ServiceApi.js'
import './PageChampionnat.css'

const FLAG = code => `https://flagcdn.com/w40/${code}.png`

// ── Étapes knockout → libellés français ──────────────────────
const ETAPES_LABEL = {
  // Phases génériques API-Sports
  'Regular Season':           'Saison régulière',
  'Group Stage':              'Phase de groupes',
  'League Stage':             'Phase de ligue',
  'Round of 16':              '1/8 de finale',
  'Round of 32':              '1/16 de finale',
  'Round of 64':              '1/32 de finale',
  'Quarter-finals':           'Quarts de finale',
  'Semi-finals':              'Demi-finales',
  '3rd Place Final':          '3ème place',
  'Final':                    'Finale',
  'Qualifying':               'Qualification',
  'Preliminary Round':        'Tour préliminaire',
  'Play-offs':                'Barrages',
  'Qualification':            'Qualification',
  '1st Round':                '1er tour',
  '2nd Round':                '2ème tour',
  '3rd Round':                '3ème tour',
  '4th Round':                '4ème tour',
  '5th Round':                '5ème tour',
}

// Ordre d'affichage des étapes (précoce → tardif)
const ORDRE_ETAPES = [
  'Preliminary Round','Qualifying','Qualification','Play-offs',
  '1st Round','2nd Round','3rd Round','4th Round','5th Round',
  'Group Stage','League Stage','Regular Season',
  'Round of 64','Round of 32','Round of 16',
  'Quarter-finals','Semi-finals','3rd Place Final','Final',
]

// URL du logo d'une ligue API-Sports
const logoLigue = id => id ? `https://media.api-sports.io/football/leagues/${id}.png` : null

// Couleurs de fallback si l'image ne charge pas
const TYPES_FALLBACK = {
  D1:    { label: '1re DIV',     bg: '#1b5e20' },
  D2:    { label: '2e DIV',      bg: '#374151' },
  COUPE: { label: 'COUPE',       bg: '#1565c0' },
  SUPER: { label: 'SUPER COUPE', bg: '#b45309' },
}

// ── Config complète : IDs API-Sports par ligue ────────────────
const FLAG_EU = null

const PAYS_CHAMPIONNATS = [
  {
    pays: 'Europe (UEFA)', logo: FLAG_EU, emoji: '🏆', comps: [
      { nom: 'Ligue des Champions',   type: 'COUPE', id: 2,   knockout: true  },
      { nom: 'Ligue Europa',          type: 'COUPE', id: 3,   knockout: true  },
      { nom: 'Ligue Conférence',      type: 'COUPE', id: 848, knockout: true  },
      { nom: 'UEFA Super Cup',        type: 'SUPER', id: 531, knockout: true  },
      { nom: 'Ligue des Nations',     type: 'COUPE', id: 8,   knockout: false },
    ],
  },
  {
    pays: 'Monde', logo: FLAG_EU, emoji: '🌍', comps: [
      { nom: 'Coupe du Monde',          type: 'COUPE', id: 1,   knockout: true  },
      { nom: "Coupe d'Afrique (CAN)",   type: 'COUPE', id: 6,   knockout: true  },
      { nom: 'Copa America',            type: 'COUPE', id: 9,   knockout: true  },
    ],
  },
  {
    pays: 'Angleterre', logo: FLAG('gb-eng'), emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', comps: [
      { nom: 'Premier League',  type: 'D1',    id: 39,  knockout: false },
      { nom: 'Championship',    type: 'D2',    id: 40,  knockout: false },
      { nom: 'League One',      type: 'D2',    id: 41,  knockout: false },
      { nom: 'FA Cup',          type: 'COUPE', id: 45,  knockout: true  },
      { nom: 'League Cup',      type: 'COUPE', id: 48,  knockout: true  },
      { nom: 'Community Shield',type: 'SUPER', id: 528, knockout: true  },
    ],
  },
  {
    pays: 'Espagne', logo: FLAG('es'), emoji: '🇪🇸', comps: [
      { nom: 'La Liga',              type: 'D1',    id: 140, knockout: false },
      { nom: 'Segunda División',     type: 'D2',    id: 141, knockout: false },
      { nom: 'Copa del Rey',         type: 'COUPE', id: 143, knockout: true  },
      { nom: 'Supercopa de España',  type: 'SUPER', id: 556, knockout: true  },
    ],
  },
  {
    pays: 'France', logo: FLAG('fr'), emoji: '🇫🇷', comps: [
      { nom: 'Ligue 1',                type: 'D1',    id: 61,  knockout: false },
      { nom: 'Ligue 2',                type: 'D2',    id: 62,  knockout: false },
      { nom: 'Coupe de France',        type: 'COUPE', id: 66,  knockout: true  },
      { nom: 'Trophée des Champions',  type: 'SUPER', id: 526, knockout: true  },
    ],
  },
  {
    pays: 'Italie', logo: FLAG('it'), emoji: '🇮🇹', comps: [
      { nom: 'Serie A',            type: 'D1',    id: 135, knockout: false },
      { nom: 'Serie B',            type: 'D2',    id: 136, knockout: false },
      { nom: 'Coppa Italia',       type: 'COUPE', id: 137, knockout: true  },
      { nom: 'Supercoppa Italiana',type: 'SUPER', id: 547, knockout: true  },
    ],
  },
  {
    pays: 'Allemagne', logo: FLAG('de'), emoji: '🇩🇪', comps: [
      { nom: 'Bundesliga',   type: 'D1',    id: 78,  knockout: false },
      { nom: '2. Bundesliga',type: 'D2',    id: 79,  knockout: false },
      { nom: 'DFB Pokal',    type: 'COUPE', id: 81,  knockout: true  },
      { nom: 'DFL Supercup', type: 'SUPER', id: 529, knockout: true  },
    ],
  },
  {
    pays: 'Portugal', logo: FLAG('pt'), emoji: '🇵🇹', comps: [
      { nom: 'Liga Portugal',    type: 'D1',    id: 94,  knockout: false },
      { nom: 'Liga Portugal 2',  type: 'D2',    id: 95,  knockout: false },
      { nom: 'Taça de Portugal', type: 'COUPE', id: 96,  knockout: true  },
      { nom: 'Supertaça',        type: 'SUPER', id: 527, knockout: true  },
    ],
  },
  {
    pays: 'Turquie', logo: FLAG('tr'), emoji: '🇹🇷', comps: [
      { nom: 'Super Lig',           type: 'D1',    id: 203, knockout: false },
      { nom: 'TFF 1. Lig',          type: 'D2',    id: 204, knockout: false },
      { nom: 'Coupe de Turquie',    type: 'COUPE', id: 205, knockout: true  },
      { nom: 'Super Coupe Turquie', type: 'SUPER', id: 540, knockout: true  },
    ],
  },
  {
    pays: 'Belgique', logo: FLAG('be'), emoji: '🇧🇪', comps: [
      { nom: 'Pro League',           type: 'D1',    id: 144, knockout: false },
      { nom: 'Challenger Pro League',type: 'D2',    id: 145, knockout: false },
      { nom: 'Coupe de Belgique',    type: 'COUPE', id: 146, knockout: true  },
    ],
  },
  {
    pays: 'Pays-Bas', logo: FLAG('nl'), emoji: '🇳🇱', comps: [
      { nom: 'Eredivisie',          type: 'D1',    id: 88,  knockout: false },
      { nom: 'Eerste Divisie',      type: 'D2',    id: 89,  knockout: false },
      { nom: 'KNVB Cup',            type: 'COUPE', id: 90,  knockout: true  },
      { nom: 'Johan Cruyff Shield', type: 'SUPER', id: 533, knockout: true  },
    ],
  },
  {
    pays: 'Grèce', logo: FLAG('gr'), emoji: '🇬🇷', comps: [
      { nom: 'Super League',   type: 'D1',    id: 197, knockout: false },
      { nom: 'Super League 2', type: 'D2',    id: 198, knockout: false },
      { nom: 'Coupe de Grèce', type: 'COUPE', id: 199, knockout: true  },
    ],
  },
  {
    pays: 'Écosse', logo: FLAG('gb-sct'), emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', comps: [
      { nom: 'Premiership',          type: 'D1',    id: 179, knockout: false },
      { nom: 'Scottish Championship',type: 'D2',    id: 180, knockout: false },
      { nom: 'Scottish Cup',         type: 'COUPE', id: 181, knockout: true  },
      { nom: 'Scottish League Cup',  type: 'COUPE', id: 182, knockout: true  },
    ],
  },
  {
    pays: 'Amérique du Sud', logo: FLAG_EU, emoji: '🌎', comps: [
      { nom: 'Copa Libertadores', type: 'COUPE', id: 13,  knockout: true  },
      { nom: 'Copa Sudamericana', type: 'COUPE', id: 11,  knockout: true  },
    ],
  },
  {
    pays: 'Brésil', logo: FLAG('br'), emoji: '🇧🇷', comps: [
      { nom: 'Brasileirao Série A', type: 'D1',    id: 71,  knockout: false },
      { nom: 'Brasileirao Série B', type: 'D2',    id: 72,  knockout: false },
      { nom: 'Copa do Brasil',      type: 'COUPE', id: 73,  knockout: true  },
    ],
  },
  {
    pays: 'Arabie Saoudite', logo: FLAG('sa'), emoji: '🇸🇦', comps: [
      { nom: 'Saudi Pro League', type: 'D1', id: 307, knockout: false },
    ],
  },
  {
    pays: 'États-Unis', logo: FLAG('us'), emoji: '🇺🇸', comps: [
      { nom: 'MLS', type: 'D1', id: 253, knockout: false },
    ],
  },
  {
    pays: 'Algérie', logo: FLAG('dz'), emoji: '🇩🇿', comps: [
      { nom: 'Ligue Professionnelle 1', type: 'D1',    id: 197, knockout: false },
      { nom: "Coupe d'Algérie",         type: 'COUPE', id: 198, knockout: true  },
    ],
  },
]

// ── Icônes ────────────────────────────────────────────────────
const IcoRetour = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><polyline points="15 18 9 12 15 6"/></svg>
const IcoCle    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>
const IcoDroit  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><polyline points="9 18 15 12 9 6"/></svg>

function LogoDrapeau({ logo, emoji, taille = 36 }) {
  const h = Math.round(taille * 0.67)
  const base = { width: taille, height: h, borderRadius: 4, flexShrink: 0 }
  if (logo) {
    return (
      <>
        <img src={logo} alt="" style={{ ...base, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,.15)' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
        <span style={{ ...base, display: 'none', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: Math.round(taille * .5) + 'px' }}>{emoji}</span>
      </>
    )
  }
  return <span style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: Math.round(taille * .5) + 'px' }}>{emoji}</span>
}

// Vrai logo du championnat (image API-Sports) avec fallback texte
function LogoComp({ id, type, taille = 28 }) {
  const url      = logoLigue(id)
  const fallback = TYPES_FALLBACK[type] || { label: '', bg: '#64748b' }
  if (!url) {
    return <span style={{ background: fallback.bg, color: '#fff', fontSize: '.56rem', fontWeight: 700, padding: '2px 6px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>{fallback.label}</span>
  }
  return (
    <div style={{ width: taille, height: taille, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={url} alt="" style={{ width: taille, height: taille, objectFit: 'contain' }}
        onError={e => {
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'inline'
        }}
      />
      <span style={{ display: 'none', background: fallback.bg, color: '#fff', fontSize: '.56rem', fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>
        {fallback.label}
      </span>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function PageChampionnat() {
  const [champSelect, setChampSelect] = useState(null)

  if (!champSelect) {
    return (
      <div className="page-champ">
        <div className="pc-header">
          <h2 className="pc-titre">Championnats</h2>
        </div>

        <div className="pc-liste">
          {PAYS_CHAMPIONNATS.map(({ pays, logo, emoji, comps }) => (
            <div key={pays}>
              <div className="pc-pays-sep">
                <LogoDrapeau logo={logo} emoji={emoji} taille={24} />
                <span>{pays.toUpperCase()}</span>
              </div>
              {comps.map(comp => (
                <button key={comp.nom} className="pc-champ-ligne"
                  onClick={() => setChampSelect({ ...comp, pays, logo, emoji })}>
                  {/* Vrai logo du championnat (API-Sports) */}
                  <LogoComp id={comp.id} type={comp.type} taille={32} />
                  <span className="pc-champ-nom">{comp.nom}</span>
                  <span className="pc-champ-chevron"><IcoDroit /></span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return <DetailChampionnat champ={champSelect} onRetour={() => setChampSelect(null)} />
}

// ── Détail compétition ────────────────────────────────────────
function DetailChampionnat({ champ, onRetour }) {
  const [onglet, setOnglet]         = useState(champ.knockout ? 'phases' : 'classement')
  const [standings, setStandings]   = useState(null)
  const [matchsSaison, setMatchsSaison] = useState([])   // matchs saison 2024 (résultats)
  const [matchsCal, setMatchsCal]   = useState([])        // matchs calendrier (prochains)
  const [saisonLabel, setSaisonLabel] = useState('')
  const [charg, setCharg]           = useState(true)
  const [erreur, setErreur]         = useState('')
  const [etapeActive, setEtapeActive] = useState(null)
  const etapeBarRef = useRef(null)

  useEffect(() => {
    let annule = false
    setCharg(true); setErreur('')
    setStandings(null); setMatchsSaison([]); setMatchsCal([]); setEtapeActive(null)

    Promise.all([
      // 1. Classement (saison 2024 — dernière dispo sur plan gratuit)
      obtenirClassementChampionnat(champ.id).catch(() => null),
      // 2. Matchs de la saison complète 2024/25 (résultats)
      obtenirMatchsCompetition(champ.id, null, {}).catch(() => ({ matches: [], saison: 0 })),
      // 3. Calendrier : prochains matchs via endpoint dates (saison 2025/26)
      obtenirCalendrierCompetition(champ.id).catch(() => ({ matches: [] })),
    ]).then(([stand, matchsData, calData]) => {
      if (annule) return
      setStandings(stand)

      const ms  = matchsData?.matches  || []
      const cal = calData?.matches     || []
      const sai = matchsData?.saison   || 0

      setMatchsSaison(ms)
      setMatchsCal(cal)
      setSaisonLabel(sai ? `${sai}/${String(sai + 1).slice(2)}` : '')

      // Pour les compétitions knockout : trouver la phase la plus avancée
      if (ms.length > 0 && champ.knockout) {
        const etapes = extraireEtapes(ms)
        if (etapes.length > 0) setEtapeActive(etapes[etapes.length - 1])
      }
      setCharg(false)
    }).catch(e => { if (!annule) { setErreur(e?.message || 'Erreur'); setCharg(false) } })

    return () => { annule = true }
  }, [champ.id, champ.knockout])

  // Extraire les étapes disponibles dans l'ordre logique
  function extraireEtapes(matchs) {
    const set = new Set(matchs.map(m => m.league?.round || m.round).filter(Boolean))
    const disponibles = [...set]
    // Trier selon ORDRE_ETAPES, puis alphabétique pour les autres
    return disponibles.sort((a, b) => {
      const ia = ORDRE_ETAPES.findIndex(e => a.includes(e))
      const ib = ORDRE_ETAPES.findIndex(e => b.includes(e))
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b, 'fr')
    })
  }

  // Extraire le round d'un match (API-Sports)
  function getRound(m) {
    return m.league?.round || m.round || ''
  }

  // Phases knockout depuis la saison 2024 (résultats complets)
  const etapesDisponibles = extraireEtapes(matchsSaison)
  const matchsEtape = etapeActive
    ? matchsSaison.filter(m => getRound(m) === etapeActive)
    : []

  // Résultats : matchs terminés saison 2024, du plus récent au plus ancien
  const resultats = [...matchsSaison]
    .filter(m => m.statut_code === 'FINISHED')
    .sort((a, b) => new Date(b.date + 'T' + b.heure) - new Date(a.date + 'T' + a.heure))

  // Calendrier : matchs à venir (saison 2025/26 via endpoint dates)
  const calendrier = [...matchsCal]
    .filter(m => m.statut_code !== 'FINISHED')
    .sort((a, b) => new Date(a.date + 'T' + a.heure) - new Date(b.date + 'T' + b.heure))

  // Classement : standings[0] = groupe principal (ligue)
  const ligueStandings = standings?.response?.[0]?.league?.standings?.[0] || []
  const lieueLogo      = standings?.response?.[0]?.league?.logo || null
  const lieueDrapeau   = standings?.response?.[0]?.league?.flag || null
  const saisonStandings = standings?.response?.[0]?.league?.season || null

  const onglets = champ.knockout
    ? ['phases', 'resultats', 'calendrier']
    : ['classement', 'resultats', 'calendrier']

  const labelsOnglets = {
    classement: 'Classement', phases: 'Tableau',
    resultats: 'Résultats', calendrier: 'Calendrier',
  }

  const couleurRang = r =>
    r === 1 ? '#1b5e20' : r <= 4 ? '#1565c0' : r <= 6 ? '#0369a1' : '#374151'

  return (
    <div className="page-champ">
      <div className="pc-detail-header">
        <button className="pc-retour" onClick={onRetour}><IcoRetour /> Retour</button>
        {/* Logo du championnat dans l'en-tête de détail */}
        <LogoComp id={champ.id} type={champ.type} taille={28} />
      </div>

      {/* Bannière avec logo API si disponible */}
      <div className="pc-banniere">
        {lieueLogo ? (
          <img src={lieueLogo} alt="" style={{ width: 60, height: 60, objectFit: 'contain' }} />
        ) : (
          <LogoDrapeau logo={champ.logo} emoji={champ.emoji} taille={60} />
        )}
        <div className="pc-banniere-info">
          <span className="pc-banniere-pays">{champ.pays}</span>
          <h2 className="pc-banniere-nom">{champ.nom}</h2>
          {saisonStandings && (
            <span className="pc-banniere-saison">
              Saison {saisonStandings}/{String(saisonStandings + 1).slice(2)}
            </span>
          )}
        </div>
        {/* Drapeau du pays depuis l'API */}
        {lieueDrapeau && (
          <img src={lieueDrapeau} alt="" style={{ height: 20, borderRadius: 2, marginLeft: 'auto', opacity: .7 }} />
        )}
      </div>

      {/* Onglets */}
      <div className="pc-onglets">
        {onglets.map(o => (
          <button key={o} className={`pc-onglet ${onglet === o ? 'actif' : ''}`}
            onClick={() => setOnglet(o)}>
            {labelsOnglets[o]}
          </button>
        ))}
      </div>

      {charg && <div className="pc-charg"><span className="pc-spinner" /> Chargement...</div>}
      {erreur && <div className="pc-erreur">{erreur}</div>}

      {/* ── Classement ── */}
      {!charg && !erreur && onglet === 'classement' && (
        ligueStandings.length > 0 ? (
          <table className="pc-table">
            <thead>
              <tr>
                <th className="pc-th pc-th-num">#</th>
                <th className="pc-th pc-th-equipe">Équipe</th>
                <th className="pc-th" title="Matchs joués">MJ</th>
                <th className="pc-th" title="Victoires">V</th>
                <th className="pc-th" title="Nuls">N</th>
                <th className="pc-th" title="Défaites">D</th>
                <th className="pc-th" title="Buts">B</th>
                <th className="pc-th" title="Différence">Diff</th>
                <th className="pc-th pc-th-pts">Pts</th>
              </tr>
            </thead>
            <tbody>
              {ligueStandings.slice(0, 25).map((eq, i) => {
                const rang = eq.rank || i + 1
                const diff = eq.goalsDiff ?? 0
                const all  = eq.all || {}
                return (
                  <tr key={eq.team?.id || i} className="pc-tr">
                    <td className="pc-td pc-td-num">
                      <span className="pc-rang" style={{ background: couleurRang(rang) }}>{rang}</span>
                    </td>
                    <td className="pc-td pc-td-equipe">
                      {eq.team?.logo && <img src={eq.team.logo} alt="" className="pc-eq-logo" />}
                      <span className="pc-eq-nom">{eq.team?.name}</span>
                    </td>
                    <td className="pc-td pc-td-centre">{all.played ?? eq.playedGames}</td>
                    <td className="pc-td pc-td-centre">{all.win}</td>
                    <td className="pc-td pc-td-centre">{all.draw}</td>
                    <td className="pc-td pc-td-centre">{all.lose}</td>
                    <td className="pc-td pc-td-centre pc-buts">
                      {all.goals?.for ?? eq.goalsFor}:{all.goals?.against ?? eq.goalsAgainst}
                    </td>
                    <td className={`pc-td pc-td-centre ${diff > 0 ? 'pc-diff-pos' : diff < 0 ? 'pc-diff-neg' : ''}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </td>
                    <td className="pc-td pc-td-pts">{eq.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="pc-vide"><p>Classement non disponible</p></div>
        )
      )}

      {/* ── Phases (knockout) ── */}
      {!charg && !erreur && onglet === 'phases' && (
        <div>
          {etapesDisponibles.length === 0 ? (
            <div className="pc-vide"><p>Phases non disponibles</p></div>
          ) : (
            <>
              <div className="pc-etapes-barre" ref={etapeBarRef}>
                {etapesDisponibles.map(e => (
                  <button key={e}
                    className={`pc-etape-btn ${etapeActive === e ? 'actif' : ''}`}
                    onClick={() => setEtapeActive(e)}>
                    {ETAPES_LABEL[e] || e}
                  </button>
                ))}
              </div>
              <div className="pc-knockout-liste">
                {matchsEtape.length === 0
                  ? <div className="pc-vide"><p>Aucun match pour cette phase</p></div>
                  : matchsEtape.map(m => <CarteMatchKnockout key={m.id} match={m} />)
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Résultats ── */}
      {!charg && !erreur && onglet === 'resultats' && (
        resultats.length === 0
          ? <div className="pc-vide"><p>Aucun résultat disponible</p></div>
          : <div className="pc-matchs-liste">
              {grouperParDate(resultats).map(({ date, matchs }) => (
                <div key={date}>
                  <div className="pc-date-sep">{formatDateFr(date)}</div>
                  {matchs.map(m => <CarteMatchResultat key={m.id} match={m} />)}
                </div>
              ))}
            </div>
      )}

      {/* ── Calendrier ── */}
      {!charg && !erreur && onglet === 'calendrier' && (
        calendrier.length === 0
          ? <div className="pc-vide"><p>Aucun match programmé</p></div>
          : <div className="pc-matchs-liste">
              {grouperParDate(calendrier).map(({ date, matchs }) => (
                <div key={date}>
                  <div className="pc-date-sep">{formatDateFr(date)}</div>
                  {matchs.map(m => <CarteMatchCalendrier key={m.id} match={m} />)}
                </div>
              ))}
            </div>
      )}
    </div>
  )
}

// ── Carte knockout ────────────────────────────────────────────
function CarteMatchKnockout({ match: m }) {
  const enCours = m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED'
  const termine = m.statut_code === 'FINISHED'
  return (
    <div className={`pc-ko-carte ${enCours ? 'en-cours' : ''}`}>
      <div className={`pc-ko-equipe ${termine && m.score_dom > m.score_ext ? 'gagnant' : termine && m.score_dom < m.score_ext ? 'perdant' : ''}`}>
        {m.logo_dom && <img src={m.logo_dom} alt="" className="pc-ko-logo" />}
        <span className="pc-ko-nom">{m.domicile}</span>
        {(termine || enCours) && <span className={`pc-ko-score ${enCours ? 'live' : ''}`}>{m.score_dom ?? '–'}</span>}
      </div>
      <div className="pc-ko-sep">
        {!termine && !enCours && <span className="pc-ko-heure">{m.heure}</span>}
        {enCours  && <span className="pc-live-mini">LIVE</span>}
        {termine  && <span className="pc-ko-fin">FIN</span>}
      </div>
      <div className={`pc-ko-equipe ext ${termine && m.score_ext > m.score_dom ? 'gagnant' : termine && m.score_ext < m.score_dom ? 'perdant' : ''}`}>
        {m.logo_ext && <img src={m.logo_ext} alt="" className="pc-ko-logo" />}
        <span className="pc-ko-nom">{m.exterieur}</span>
        {(termine || enCours) && <span className={`pc-ko-score ${enCours ? 'live' : ''}`}>{m.score_ext ?? '–'}</span>}
      </div>
    </div>
  )
}

// ── Carte résultat ────────────────────────────────────────────
function CarteMatchResultat({ match: m }) {
  const domGagne = m.statut_code === 'FINISHED' && m.score_dom > m.score_ext
  const extGagne = m.statut_code === 'FINISHED' && m.score_ext > m.score_dom
  return (
    <div className="pc-res-carte">
      <div className={`pc-res-equipe ${domGagne ? 'gagnant' : ''}`}>
        {m.logo_dom && <img src={m.logo_dom} alt="" className="pc-res-logo" />}
        <span className="pc-res-nom">{m.domicile}</span>
        <span className="pc-res-score">{m.score_dom ?? '–'}</span>
      </div>
      <span className="pc-res-sep">–</span>
      <div className={`pc-res-equipe ext ${extGagne ? 'gagnant' : ''}`}>
        <span className="pc-res-score">{m.score_ext ?? '–'}</span>
        <span className="pc-res-nom">{m.exterieur}</span>
        {m.logo_ext && <img src={m.logo_ext} alt="" className="pc-res-logo" />}
      </div>
    </div>
  )
}

// ── Carte calendrier ──────────────────────────────────────────
function CarteMatchCalendrier({ match: m }) {
  const enCours = m.statut_code === 'IN_PLAY' || m.statut_code === 'PAUSED'
  return (
    <div className={`pc-cal-carte ${enCours ? 'en-cours' : ''}`}>
      <div className="pc-cal-heure">
        {enCours ? <span className="pc-live-mini">LIVE</span> : m.heure}
      </div>
      <div className="pc-cal-corps">
        <div className="pc-cal-equipe">
          {m.logo_dom && <img src={m.logo_dom} alt="" className="pc-res-logo" />}
          <span>{m.domicile}</span>
        </div>
        <span className="pc-cal-vs">vs</span>
        <div className="pc-cal-equipe">
          {m.logo_ext && <img src={m.logo_ext} alt="" className="pc-res-logo" />}
          <span>{m.exterieur}</span>
        </div>
      </div>
    </div>
  )
}

// ── Utilitaires ───────────────────────────────────────────────
function grouperParDate(matchs) {
  const g = {}
  matchs.forEach(m => { const d = m.date || 'inconnue'; if (!g[d]) g[d] = []; g[d].push(m) })
  return Object.entries(g).map(([date, matchs]) => ({ date, matchs }))
}

function formatDateFr(dateStr) {
  if (!dateStr || dateStr === 'inconnue') return 'Date inconnue'
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
