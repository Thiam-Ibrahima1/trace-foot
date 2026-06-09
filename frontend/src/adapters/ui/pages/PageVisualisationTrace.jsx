// ============================================================
// PageVisualisationTrace.jsx — Vérification des tracés admin
//
// Structure par tracé :
//   Grille 4×4 → Interprétation (Youssou/Souleymane/Imsa) → Combinaisons
//
// Tracé 1 = score principal + combinaisons publiées
// Tracé 2 = confirmation ou infirmation du score du Tracé 1
//   Si même score → note de confirmation en bas
//
// Gestion : supprimer un match | sélectionner les combinaisons à publier
// ============================================================
import { useState, useEffect } from 'react'
import {
  obtenirHistorique, obtenirPredictionParMatchId, publierCombinaisonsTrace, sauvegarderPredVip,
} from '../../../adapters/api/ServiceApi.js'
import {
  genererCombinaisonsGratuites, ajusterDoubleChanceDraw,
} from '../../../domain/usecases/TraceUseCases.js'
import './PageVisualisationTrace.css'

// ── Logos officiels des championnats (api-sports.io) ──────────
const L_VISU = id => `https://media.api-sports.io/football/leagues/${id}.png`
const LOGOS_VISU = {
  'Champions League': L_VISU(2),   'Europa League': L_VISU(3),
  'Conference League': L_VISU(848), 'Premier League': L_VISU(39),
  'Championship': L_VISU(40),       'La Liga': L_VISU(140),
  'Segunda División': L_VISU(141),  'Ligue 1': L_VISU(61),
  'Ligue 2': L_VISU(62),            'Ligue 2 BKT': L_VISU(62),
  'Serie A': L_VISU(135),           'Serie B': L_VISU(136),
  'Bundesliga': L_VISU(78),         '2. Bundesliga': L_VISU(79),
  'Liga Portugal': L_VISU(94),      'Primeira Liga': L_VISU(94),
  'Pro League': L_VISU(144),        'Eredivisie': L_VISU(88),
  'Super Lig': L_VISU(203),         'Süper Lig': L_VISU(203),
  'Super League': L_VISU(197),      'Premiership': L_VISU(179),
  'MLS': L_VISU(253),               'Brasileirao Série A': L_VISU(71),
  'FA Cup': L_VISU(45),             'Copa del Rey': L_VISU(143),
  'Coupe de France': L_VISU(66),    'DFB Pokal': L_VISU(81),
}

function LogoChampVisu({ nom }) {
  const [ok, setOk] = useState(true)
  const src = LOGOS_VISU[nom]
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:22, height:22, borderRadius:'50%', background:'#f0f4f8',
      flexShrink:0, overflow:'hidden',
    }}>
      {src && ok
        ? <img src={src} alt="" style={{width:18,height:18,objectFit:'contain'}}
            onError={() => setOk(false)} />
        : <span style={{fontSize:'0.75rem'}}>⚽</span>}
    </span>
  )
}

// ── Couleurs maisons ─────────────────────────────────────────
// Souleymane = vert (définit le score — priorité absolue)
// Noukh = blanc (témoin de Souleymane)
// Toutes les autres = noir
function bg(zone, puissance, nomMaison) {
  if (nomMaison === 'Souleymane') return '#1b5e20'  // vert foncé = primordial
  if (nomMaison === 'Noukh')      return '#94a3b8'  // gris moyen = témoin de Souleymane
  return '#1e293b'                                   // noir pour toutes les autres
}
const txt = (nomMaison) => nomMaison === 'Noukh' ? '#1e293b' : '#fff'

// ── Analyse des maisons d'un tracé ────────────────────────────
// Identifie Youssou / Souleymane / Imsa et en déduit score + combis
function analyserTrace(maisons) {
  if (!maisons?.length) return null

  const imsas       = maisons.filter(m => m.maison?.nom === 'Imsa')
  const souleymanes = maisons.filter(m => m.maison?.nom === 'Souleymane')
  const noukhs      = maisons.filter(m => m.maison?.nom === 'Noukh')
  const youssous    = maisons.filter(m => m.maison?.nom === 'Youssou')

  const imsaCount = imsas.length
  const imsaDom   = imsas.filter(im => im.zone === 'domicile').length
  const imsaExt   = imsas.filter(im => im.zone === 'exterieur').length
  const imsaDomPoids = imsas.filter(im => im.zone === 'domicile')
    .reduce((t, im) => t + (im.puissance !== 'normal' ? 2 : 1), 0)
  const imsaExtPoids = imsas.filter(im => im.zone === 'exterieur')
    .reduce((t, im) => t + (im.puissance !== 'normal' ? 2 : 1), 0)

  const youssouEnM1      = youssous.some(y => y.position === 1)
  const makhdiyouPresent = maisons.some(m => m.maison?.nom === 'Makhdiyou')
  const noukhPresent     = noukhs.length > 0

  // Sol dans chaque zone (avant filtre Noukh) → signal 2EM basique
  const solDomPresent = souleymanes.some(s => s.zone === 'domicile')
  const solExtPresent = souleymanes.some(s => s.zone === 'exterieur')
  const sol2emBasique = solDomPresent && solExtPresent

  // Souleymane = priorité absolue → TOUJOURS 1 but, puissant ou non
  let dom = 0, ext = 0
  souleymanes.forEach(mp => {
    if (mp.zone === 'domicile') ext += 1
    else dom += 1
  })

  // 2EM : Sol puissant dans zone DOM ET Sol puissant dans zone EXT (Noukh non requis)
  const solPuissantDom = souleymanes.some(s => s.zone === 'domicile' && s.puissance !== 'normal')
  const solPuissantExt = souleymanes.some(s => s.zone === 'exterieur' && s.puissance !== 'normal')
  const sol2emPuissant = solPuissantDom && solPuissantExt

  if (youssouEnM1 && makhdiyouPresent && souleymanes.length === 0) {
    dom = Math.max(dom, 1); ext = Math.max(ext, 1)
  }
  const solDomOk = souleymanes.some(s => s.zone === 'domicile')
  const solExtOk = souleymanes.some(s => s.zone === 'exterieur')
  if (youssouEnM1 && makhdiyouPresent && solDomOk && solExtOk) {
    dom = Math.max(dom, 1); ext = Math.max(ext, 1)
  }
  // Sol dans les 2 zones sans Souleymane compté → minimum 1-1 (signal 2EM)
  if (sol2emBasique && dom === 0 && ext === 0 && souleymanes.length === 0) {
    dom = Math.max(dom, 1); ext = Math.max(ext, 1)
  }

  // Adama M2 + 3 Sol → +2,5
  const adama2Present  = maisons.some(m => m.maison?.nom === 'Adama' && m.position === 2)
  const adama2Avec3Sol = adama2Present && souleymanes.length >= 3

  // Idriss M4 + Imsa (témoin) + 4 Sol → +3,5
  const idriss4Present  = maisons.some(m => m.maison?.nom === 'Idriss' && m.position === 4)
  const idriss4Avec4Sol = idriss4Present && imsaCount > 0 && souleymanes.length >= 4

  const solFortsDom      = souleymanes.filter(s => s.zone === 'exterieur' && s.puissance !== 'normal').length
  const solFortsExt      = souleymanes.filter(s => s.zone === 'domicile'  && s.puissance !== 'normal').length
  const solTotal         = souleymanes.length
  const solPuissantTotal = souleymanes.filter(s => s.puissance !== 'normal').length
  // Signal fort Imsa : puissant OU M6 OU 3+ (même règle qu'Ibrahima puissant)
  const imsaSignalFort   = imsaCount >= 3
    || imsas.some(im => im.puissance !== 'normal')
    || imsas.some(im => im.position === 6)

  const combis = genererCombinaisonsGratuites(dom, ext, imsaCount, imsaDom, imsaExt, youssouEnM1, [], solFortsDom, solFortsExt, 0, 0, solTotal, solPuissantTotal, sol2emBasique, sol2emPuissant, adama2Avec3Sol, idriss4Avec4Sol, imsaSignalFort)

  return { dom, ext, score: `${dom}-${ext}`, imsaCount, imsaDom, imsaExt, imsaDomPoids, imsaExtPoids, youssouEnM1, souleymanes, noukhs, imsas, youssous, combis, sol2emBasique, sol2emPuissant, adama2Avec3Sol, idriss4Avec4Sol }
}

// ── Composant principal ────────────────────────────────────────
// Date du jour au format YYYY-MM-DD
const aujourdhui = () => new Date().toISOString().split('T')[0]

const labelJour = dateStr => {
  if (!dateStr) return ''
  const d    = new Date(dateStr + 'T12:00:00')
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  if (d.toDateString() === auj.toDateString())  return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function PageVisualisationTrace({ matchIdInitial = null, onRetour }) {
  const [predictions, setPreds]           = useState([])
  const [charg, setCharg]                 = useState(true)
  const [selection, setSelection]         = useState(null)
  const [recherche, setRecherche]         = useState('')
  const [dateFiltre, setDateFiltre]       = useState(aujourdhui)   // filtre par date — défaut = aujourd'hui
  const [champsOuverts, setChampsOuverts] = useState({})
  const toggleChamp = c => setChampsOuverts(p => ({ ...p, [c]: !p[c] }))
  const champOuvert = c => !!champsOuverts[c]  // fermé par défaut

  useEffect(() => { charger() }, [])

  async function charger() {
    setCharg(true)
    try {
      // Charge les 50 derniers tracés pour la liste latérale (max backend)
      const [d, lookup] = await Promise.all([
        obtenirHistorique(1, 50),
        matchIdInitial ? obtenirPredictionParMatchId(matchIdInitial) : Promise.resolve(null),
      ])
      const avecMaisons = (d.predictions || []).filter(p => p.maisons_placees?.length > 0)
      setPreds(avecMaisons)

      // Trouver la cible : d'abord dans le lookup direct, sinon dans la liste
      if (matchIdInitial) {
        const cibleLookup = (lookup?.predictions || [])[0]
        const cibleListe  = avecMaisons.find(p => String(p.match_id) === String(matchIdInitial))
        const cible       = cibleLookup || cibleListe
        if (cible) {
          setSelection(cible)
          setDateFiltre(cible.date || aujourdhui())
          setChampsOuverts(prev => ({ ...prev, [cible.competition]: true }))
          // Ajouter à la liste si absent (tracé très ancien non dans les 50 premiers)
          if (!cibleListe && cibleLookup?.maisons_placees?.length > 0) {
            setPreds(prev => [cibleLookup, ...prev])
          }
        }
      }
    } catch { setPreds([]) }
    setCharg(false)
  }

  // Filtrer par date du jour sélectionné + recherche textuelle
  const filtrees = predictions.filter(p => {
    const dateOk = !dateFiltre || p.date === dateFiltre
    const texteOk = !recherche ||
      p.domicile?.toLowerCase().includes(recherche.toLowerCase()) ||
      p.exterieur?.toLowerCase().includes(recherche.toLowerCase()) ||
      p.competition?.toLowerCase().includes(recherche.toLowerCase())
    return dateOk && texteOk
  })

  // Toutes les dates disponibles (pour min/max du calendrier)
  const datesDispos = [...new Set(predictions.map(p => p.date).filter(Boolean))].sort()
  const dateMin = datesDispos[0] || ''
  const dateMax = datesDispos[datesDispos.length - 1] || ''

  // Grouper par championnat
  const parChamp = filtrees.reduce((acc, p) => {
    const c = p.competition || 'Autre'
    if (!acc[c]) acc[c] = []
    acc[c].push(p)
    return acc
  }, {})
  const championnats = Object.keys(parChamp).sort()

  const nbMatchsJour = filtrees.length
  const dateLibelle  = labelJour(dateFiltre)

  return (
    <div className="page-visu">

      {/* ── Panneau gauche : liste des matchs ── */}
      <div className="visu-gauche">

        {/* Sélecteur de date — par défaut = aujourd'hui */}
        <div className="visu-date-header">
          <div className="visu-date-titre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{dateLibelle || dateFiltre}</span>
          </div>
          <input
            type="date"
            className="visu-date-input"
            value={dateFiltre}
            min={dateMin}
            max={dateMax}
            onChange={e => {
              setDateFiltre(e.target.value)
              setSelection(null)
            }}
          />
        </div>

        {/* Recherche */}
        <input className="visu-recherche" type="text"
          placeholder="Chercher un match..." value={recherche}
          onChange={e => setRecherche(e.target.value)} />

        <div className="visu-nb">
          {nbMatchsJour} tracé{nbMatchsJour > 1 ? 's' : ''} — {dateLibelle || dateFiltre}
        </div>

        {charg && <div className="visu-charg">Chargement...</div>}
        {!charg && filtrees.length === 0 && (
          <div className="visu-vide">
            Aucun tracé pour le {dateLibelle || dateFiltre}.
          </div>
        )}

        {/* Championnats du jour */}
        {!charg && championnats.map(champ => {
          const liste  = parChamp[champ]
          const ouvert = champOuvert(champ)
          return (
            <div key={champ} className="visu-champ-groupe">
              <button className="visu-champ-titre" onClick={() => toggleChamp(champ)}>
                <span style={{display:'flex', alignItems:'center', gap:7}}>
                  <LogoChampVisu nom={champ} /> {champ}
                </span>
                <span className="visu-champ-nb">{liste.length}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width:12, height:12, transform: ouvert ? 'rotate(180deg)' : 'none', transition:'transform .2s', flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Date du championnat visible dans l'accordéon */}
              {ouvert && (
                <div className="visu-champ-date-badge">
                  📅 {dateFiltre} — {dateLibelle}
                </div>
              )}

              {ouvert && liste.map(p => {
                const certifie = p.verification?.concordance === true || p.trace_status === 'valide'
                return (
                  <div key={p.id} className={`visu-item-wrap ${selection?.id === p.id ? 'actif' : ''}`}>
                    <button className="visu-item" onClick={() => setSelection(p)}>
                      <div className="visu-item-top">
                        <span className="visu-item-date">{p.heure || p.date}</span>
                        <span className={`vi-statut ${certifie ? 'cert' : 'partiel'}`}>
                          {certifie ? '✓' : '🟡'}
                        </span>
                      </div>
                      <div className="visu-item-match">
                        {p.domicile} <span className="vi-vs">vs</span> {p.exterieur}
                      </div>
                      <div className="visu-item-bas">
                        <span className="vi-score">{p.score_prevu}</span>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Panneau droit : détail du tracé ── */}
      <div className={`visu-droite${selection ? ' visu-droite-actif' : ''}`}>
        <div className="visu-droite-topbar">
          {/* Mobile : retour vers la liste */}
          <span className="visu-btn-retour visu-btn-retour-liste"
            onClick={() => setSelection(null)}>
            ← Liste
          </span>
          {/* Admin : retour vers PageMatchsAdmin */}
          {onRetour && selection && (
            <span className="visu-btn-retour"
              onClick={() => onRetour(selection.competition)}>
              ← Matchs
            </span>
          )}
        </div>
        {!selection ? (
          <div className="visu-placeholder">
            <span>🔮</span>
            <p>Sélectionnez un match pour voir ses tracés</p>
          </div>
        ) : (
          <DetailTrace prediction={selection} key={selection.id} />
        )}
      </div>
    </div>
  )
}

// ── Détail d'un tracé ─────────────────────────────────────────
function DetailTrace({ prediction: p }) {
  const v       = p.verification || {}
  const maisons1 = p.maisons_placees || []
  const maisons2 = v.trace2?.maisonsPlacees || []

  const a1 = analyserTrace(maisons1)
  const a2 = maisons2.length > 0 ? analyserTrace(maisons2) : null

  const memeScore    = a1 && a2 && a1.score === a2.score
  const confirmation = memeScore

  // Imsa pondéré (puissant = ×2) cumulé T1 + T2 → détermine 1X ou 2X
  const imsaDomTotal = (a1?.imsaDomPoids || 0) + (a2?.imsaDomPoids || 0)
  const imsaExtTotal = (a1?.imsaExtPoids || 0) + (a2?.imsaExtPoids || 0)

  // Toujours ajuster la double chance selon la dominance Imsa (T1 et T2)
  const combisT1Ajustees = ajusterDoubleChanceDraw(a1?.combis || [], imsaDomTotal, imsaExtTotal)
  const combisT2Ajustees = a2 ? ajusterDoubleChanceDraw(a2.combis || [], imsaDomTotal, imsaExtTotal) : null

  // ── Clé localStorage unique pour le suivi VIP de ce match ──
  const vipKey = `vip_confirme_${p.id}`

  // ── États de confirmation (persistants) ──
  const [combiConfirmee, setCombiConfirmee] = useState(
    p.score_confirme === true || p.trace_status === 'valide'
  )
  const [vipConfirmee, setVipConfirmee] = useState(
    () => localStorage.getItem(vipKey) === 'true'
  )

  // Messages initiaux dérivés de l'état confirmé → toujours visibles au retour
  const [msgCombi, setMsgCombi] = useState(() =>
    (p.score_confirme === true || p.trace_status === 'valide')
      ? '✅ Score Combinaison déjà confirmé côté utilisateur.' : ''
  )
  const [msgVip, setMsgVip] = useState(() =>
    localStorage.getItem(vipKey) === 'true'
      ? '✅ Score VIP déjà confirmé côté utilisateur.' : ''
  )
  const [loadingCombi, setLoadingCombi] = useState(false)
  const [loadingVip, setLoadingVip]     = useState(false)

  // ── Publication combinaisons (force=true = DÉCLENCHER MAINTENANT) ──
  const publierCombi = async (force = false) => {
    if (!force && combiConfirmee) {
      setMsgCombi('⚠️ MATCH DÉJÀ CONFIRMÉ CÔTÉ UTILISATEUR. Utilisez "DÉCLENCHER MAINTENANT" pour mettre à jour.')
      return
    }
    setLoadingCombi(true); setMsgCombi('')
    try {
      await publierCombinaisonsTrace(p.id, {
        combinaisons:   combisT1Ajustees.map(c => ({ label: c.label, score: c.score, couleur: c.couleur })),
        score_prevu:    a1?.score,
        score_confirme: true,
        force,
      })
      setCombiConfirmee(true)
      setMsgCombi(force
        ? '✅ Combinaisons mises à jour — côté utilisateur synchronisé.'
        : '✅ Combinaisons publiées — visibles dans la page Prédiction côté utilisateur.')
    } catch (e) {
      setMsgCombi(e.message === 'Failed to fetch'
        ? '❌ Serveur inaccessible. Vérifiez que le backend est démarré (php artisan serve).'
        : '❌ Erreur : ' + (e.message || 'Réessayez'))
    }
    setLoadingCombi(false)
  }

  // ── Publication VIP (force=true = DÉCLENCHER MAINTENANT) ──
  const publierVip = async (force = false) => {
    if (!force && vipConfirmee) {
      setMsgVip('⚠️ MATCH DÉJÀ CONFIRMÉ CÔTÉ UTILISATEUR. Utilisez "DÉCLENCHER MAINTENANT" pour mettre à jour.')
      return
    }
    setLoadingVip(true); setMsgVip('')
    try {
      await sauvegarderPredVip({
        match_id:           String(p.match_id || p.id),  // toujours string pour le backend
        competition:        p.competition || '',
        domicile:           p.domicile,
        exterieur:          p.exterieur,
        heure:              p.heure || null,              // null accepté (nullable backend)
        date:               p.date,
        score_exact_predit: a1?.score,
        publie:             true,
        logo_dom:           p.logo_dom || null,
        logo_ext:           p.logo_ext || null,
      })
      // Persister dans localStorage → survit à la navigation
      localStorage.setItem(vipKey, 'true')
      setVipConfirmee(true)
      setMsgVip(force
        ? '✅ Score VIP mis à jour — section VIP synchronisée.'
        : '✅ Score VIP publié — visible dans la section VIP par championnat.')
    } catch (e) {
      setMsgVip('❌ Erreur VIP : ' + (e.message || 'Réessayez'))
    }
    setLoadingVip(false)
  }

  const handleConfCombi  = () => publierCombi(false)
  const handleForceCombi = () => publierCombi(true)
  const handleConfVip    = () => publierVip(false)
  const handleForceVip   = () => publierVip(true)

  return (
    <div className="visu-detail-wrap">

      {/* En-tête match */}
      <div className="vd-header">
        <div className="vd-info">
          <span className="vd-comp">{p.competition}</span>
          <h3 className="vd-match">{p.domicile} <span className="vd-vs">vs</span> {p.exterieur}</h3>
          <span className="vd-date">{p.date} {p.heure}</span>
        </div>
        <div className="vd-score-bloc">
          <span className="vd-score-lbl">Score Tracé 1</span>
          <span className="vd-score-val">{a1?.score || p.score_prevu || '—'}</span>
        </div>
      </div>

      {/* ══ TRACÉ 1 ══════════════════════════════════════════════ */}
      <div className="vd-trace-section">
        <div className="vd-trace-titre">
          <span className="vd-trace-num">1</span>
          <span>Tracé N°1</span>
          <span className={`vd-trace-badge ${
            v.traceSolide ?? v.trace1?.traceValide ? 'solide'
            : v.traceAcceptable ?? v.trace1?.v1?.valide ? 'ok'
            : 'nok'}`}>
            {v.traceSolide ?? v.trace1?.traceValide ? '✓✓ Solide'
            : v.traceAcceptable ?? v.trace1?.v1?.valide ? '✓ Acceptable'
            : '✗ Non Acceptable'}
          </span>
        </div>

        {/* Légende */}
        <Legende />

        <GrilleMaisons maisons={maisons1} />

        {/* Interprétation + Combinaisons Tracé 1 (ajustées pour match nul) */}
        {a1 && (
          <InterpretationCombi
            analyse={{ ...a1, combis: combisT1Ajustees }}
            numTrace={1}
            combisPubliees={combisT1Ajustees}
          />
        )}
      </div>

      {/* ── Bandeau Imsa (tous matchs) : détermine 1X ou 2X ── */}
      {imsaDomTotal !== imsaExtTotal && (
        <div className="vd-nul-imsa">
          <span className="vd-nul-titre">⚖️ Dominance Imsa (T1 + T2, puissant ×2)</span>
          <div className="vd-nul-zones">
            <span className={`vd-nul-zone ${imsaDomTotal >= imsaExtTotal ? 'gagne' : ''}`}>
              🏠 DOM ×{imsaDomTotal}
            </span>
            <span className="vd-nul-sep">vs</span>
            <span className={`vd-nul-zone ${imsaExtTotal > imsaDomTotal ? 'gagne' : ''}`}>
              ✈️ EXT ×{imsaExtTotal}
            </span>
          </div>
          <span className="vd-nul-dc">
            → Double chance :&nbsp;
            <strong>{imsaDomTotal > imsaExtTotal ? '1X' : '2X'}</strong>
          </span>
        </div>
      )}

      {/* ══ TRACÉ 2 — CONFIRMATION ═══════════════════════════════ */}
      {maisons2.length > 0 && (
        <div className="vd-trace-section trace2">
          <div className="vd-trace-titre">
            <span className="vd-trace-num t2">2</span>
            <span>Tracé N°2 — CONFIRMATION</span>
            <span className={`vd-trace-badge ${v.trace2?.traceValide ? 'ok' : 'nok'}`}>
              {v.trace2?.traceValide ? '✓ Acceptable' : '✗ Non Acceptable'}
            </span>
          </div>

          <Legende />
          <GrilleMaisons maisons={maisons2} essais={null} />

          {a2 && <InterpretationCombi analyse={{ ...a2, combis: combisT2Ajustees }} numTrace={2} />}

          {/* Note de confirmation ou infirmation */}
          {confirmation ? (
            <div className="vd-confirmation ok">
              CONFIRMATION — Tracé 2 donne <strong>{a2.score}</strong> = Tracé 1 (<strong>{a1?.score}</strong>).
              Le score <strong>{a1?.score}</strong> est <strong>confirmé</strong> par les deux tracés.
            </div>
          ) : (
            <div className="vd-confirmation nok">
              ⚠️ Tracé 2 : <strong>{a2?.score}</strong> ≠ Tracé 1 : <strong>{a1?.score}</strong>.
              Les deux tracés ne concordent pas — relancer le Tracé 2 pour tenter de confirmer.
            </div>
          )}
        </div>
      )}

      {!maisons2.length && (
        <div className="vd-no-trace2">
          Tracé 2 non encore généré. Générez le Tracé 2 pour certifier le score.
        </div>
      )}

      {/* ══ BOUTONS DE CONFIRMATION (Point 5 NB) ════════════════
          Apparaissent uniquement si Tracé 1 et Tracé 2 donnent le même score
          → Score combinaison publié côté utilisateur
          → Score VIP publié dans la section VIP utilisateur
      */}
      {/* ══ ANALYSE PAR PÉRIODE ════════════════════════════════ */}
      <AnalysePeriodes
        maisons={maisons1}
        scorePrevu={a1?.score || p.score_prevu}
        scoreReel={p.score_reel}
        domicile={p.domicile}
        exterieur={p.exterieur}
        confirme={combiConfirmee}
      />

      {confirmation && (
        <div className="vd-confirmation-actions">
          <div className="vd-cert-score">
            <span className="vd-cert-ico">🏆</span>
            <span>Score certifié : <strong>{a1?.score}</strong></span>
          </div>
          <div className="vd-cert-btns">

            {/* ── Groupe Combinaison ── */}
            <div className="vd-cert-btn-group">
              <button
                className={`vd-btn-confirmer-combi ${combiConfirmee ? 'deja-confirme' : ''}`}
                onClick={handleConfCombi}
                disabled={loadingCombi}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {loadingCombi ? 'Publication...' : 'Confirmation Score Combinaison'}
              </button>
              {combiConfirmee && (
                <button className="vd-btn-declencher" onClick={handleForceCombi} disabled={loadingCombi}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.99"/>
                  </svg>
                  {loadingCombi ? 'Mise à jour...' : 'DÉCLENCHER MAINTENANT'}
                </button>
              )}
              {msgCombi && (
                <p className={`vd-conf-msg ${msgCombi.startsWith('✅') ? 'ok' : 'avertissement'}`}>{msgCombi}</p>
              )}
            </div>

            {/* ── Groupe VIP ── */}
            <div className="vd-cert-btn-group">
              <button
                className={`vd-btn-confirmer-vip ${vipConfirmee ? 'deja-confirme' : ''}`}
                onClick={handleConfVip}
                disabled={loadingVip}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {loadingVip ? 'Publication VIP...' : 'Confirmer Score VIP'}
              </button>
              {vipConfirmee && (
                <button className="vd-btn-declencher vd-btn-declencher-vip" onClick={handleForceVip} disabled={loadingVip}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.99"/>
                  </svg>
                  {loadingVip ? 'Mise à jour...' : 'DÉCLENCHER MAINTENANT'}
                </button>
              )}
              {msgVip && (
                <p className={`vd-conf-msg ${msgVip.startsWith('✅') ? 'ok' : 'avertissement'}`}>{msgVip}</p>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ── Mapping positions → périodes ─────────────────────────────
// M1-M4   : 1ère mi-temps équipe DOMICILE
// M5-M8   : 1ère mi-temps équipe EXTÉRIEUR
// M9,M10,M13,M15,M16 : 2ème mi-temps équipe DOMICILE
// M11,M12,M14         : 2ème mi-temps équipe EXTÉRIEUR
const PERIODES = [
  {
    id: 'p1_dom',
    label: '1ère Mi-temps — DOMICILE',
    positions: [1, 2, 3, 4],
    posLabel: 'M1 · M2 · M3 · M4',
    equipe: 'domicile',
    mi: 1,
  },
  {
    id: 'p1_ext',
    label: '1ère Mi-temps — EXTÉRIEUR',
    positions: [5, 6, 7, 8],
    posLabel: 'M5 · M6 · M7 · M8',
    equipe: 'exterieur',
    mi: 1,
  },
  {
    id: 'p2_dom',
    label: '2ème Mi-temps — DOMICILE',
    positions: [9, 10, 13, 15, 16],
    posLabel: 'M9 · M10 · M13 · M15 · M16',
    equipe: 'domicile',
    mi: 2,
  },
  {
    id: 'p2_ext',
    label: '2ème Mi-temps — EXTÉRIEUR',
    positions: [11, 12, 14],
    posLabel: 'M11 · M12 · M14',
    equipe: 'exterieur',
    mi: 2,
  },
]

// ── Couleur de fond d'une maison (reprise de bg()) ───────────
function couleurMaison(nom) {
  if (nom === 'Souleymane') return { bg: '#1b5e20', txt: '#fff' }
  if (nom === 'Noukh')      return { bg: '#94a3b8', txt: '#1e293b' }
  if (nom === 'Imsa')       return { bg: '#5b21b6', txt: '#fff' }
  if (nom === 'Youssou')    return { bg: '#b45309', txt: '#fff' }
  if (nom === 'Adama')      return { bg: '#0369a1', txt: '#fff' }
  if (nom === 'Idriss')     return { bg: '#0f766e', txt: '#fff' }
  if (nom === 'Makhdiyou')  return { bg: '#9d174d', txt: '#fff' }
  if (nom === 'Ibrahima')   return { bg: '#6d28d9', txt: '#fff' }
  return { bg: '#1e293b', txt: '#fff' }
}

// ── Génère les signaux pour une liste de maisons d'une période ─
function signauxPeriode(maisons, domicile, exterieur) {
  const sigs = []
  maisons.forEach(m => {
    const nom = m.maison?.nom
    const zone = m.zone
    const pos  = m.position
    const pui  = m.puissance !== 'normal'
      ? (m.puissance === 'tres_puissant' ? ' ★★' : ' ★') : ''

    if (nom === 'Souleymane') {
      if (zone === 'domicile')
        sigs.push({ ico: '⚽', txt: `Souleymane M${pos}${pui} zone DOM → ${domicile} encaisse → ${exterieur} +1 but`, type: 'sol' })
      else
        sigs.push({ ico: '⚽', txt: `Souleymane M${pos}${pui} zone EXT → ${exterieur} encaisse → ${domicile} +1 but`, type: 'sol' })
    }
    if (nom === 'Noukh')
      sigs.push({ ico: '👁️', txt: `Noukh M${pos} — témoin confirmatoire de Souleymane (ne marque pas)`, type: 'noukh' })
    if (nom === 'Imsa') {
      const eq = zone === 'domicile' ? domicile : exterieur
      const signal = m.puissance !== 'normal' ? 'signal fort (bloque -2.5/-3.5)' : 'signal jubilé'
      sigs.push({ ico: '🎉', txt: `Imsa M${pos}${pui} zone ${zone === 'domicile' ? 'DOM' : 'EXT'} → ${eq} jubilé — ${signal}`, type: 'imsa' })
    }
    if (nom === 'Youssou')
      sigs.push({ ico: '🤝', txt: `Youssou M${pos} → les deux équipes marquent (2EM confirmé)`, type: 'youssou' })
    if (nom === 'Adama' && pos === 2)
      sigs.push({ ico: '📈', txt: `Adama M2 → si +3 Souleymane : signal +2,5 buts`, type: 'adama' })
    if (nom === 'Idriss' && pos === 4)
      sigs.push({ ico: '📈', txt: `Idriss M4 → si Imsa + 4 Souleymane : signal +3,5 buts`, type: 'idriss' })
    if (nom === 'Makhdiyou')
      sigs.push({ ico: '🔗', txt: `Makhdiyou M${pos} → renforce Youssou/Souleymane (2EM renforcé)`, type: 'makh' })
    if (nom === 'Ibrahima')
      sigs.push({ ico: '🚫', txt: `Ibrahima M${pos}${pui} → signal de résistance (réduit le score)`, type: 'ibra' })
  })
  return sigs
}

// ── Composant analyse par période ─────────────────────────────
function AnalysePeriodes({ maisons, scorePrevu, scoreReel, domicile, exterieur, confirme }) {
  const [ouvert, setOuvert] = useState(false)
  if (!maisons?.length) return null

  const correct  = scoreReel && scorePrevu === scoreReel
  const partiel  = scoreReel && !correct && (() => {
    const [dp, ep] = (scorePrevu || '0-0').split('-').map(Number)
    const [dr, er] = (scoreReel  || '0-0').split('-').map(Number)
    return Math.abs(dp - dr) <= 1 && Math.abs(ep - er) <= 1
  })()

  return (
    <div className="vd-analyse-wrap">
      {/* Toggle */}
      <button className="vd-analyse-toggle" onClick={() => setOuvert(o => !o)}>
        <span className="vd-analyse-toggle-ico">📊</span>
        <span>Analyse par Période — Tracé N°1</span>
        {scoreReel && (
          <span className={`vd-analyse-badge ${correct ? 'correct' : partiel ? 'partiel' : 'incorrect'}`}>
            {correct ? '✅ Score exact' : partiel ? '🟡 Approché' : '❌ Différent'}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ width:12, height:12, marginLeft:'auto', transform: ouvert ? 'rotate(180deg)' : 'none', transition:'transform .2s', flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {ouvert && (
        <div className="vd-analyse-body">

          {/* ── Comparaison score (si score réel connu) ── */}
          {scoreReel ? (
            <div className={`vd-compare-bloc ${correct ? 'correct' : partiel ? 'partiel' : 'incorrect'}`}>
              <div className="vd-compare-titre">
                {correct ? '✅ TRACÉ EXACT — Score confirmé' : partiel ? '🟡 TRACÉ APPROCHÉ — Score proche' : '❌ TRACÉ DIFFÉRENT — Analyser les périodes'}
              </div>
              <div className="vd-compare-scores">
                <div className="vd-compare-col">
                  <span className="vd-compare-lbl">Tracé prédit</span>
                  <span className="vd-compare-val predit">{scorePrevu || '—'}</span>
                </div>
                <span className="vd-compare-sep">VS</span>
                <div className="vd-compare-col">
                  <span className="vd-compare-lbl">Score réel</span>
                  <span className={`vd-compare-val ${correct ? 'correct' : 'incorrect'}`}>{scoreReel}</span>
                </div>
              </div>
              {!correct && (
                <p className="vd-compare-note">
                  💡 Analysez les périodes ci-dessous pour comprendre les maisons qui ont influencé le résultat réel.
                </p>
              )}
            </div>
          ) : (
            <div className="vd-compare-bloc attente">
              <span>⏳ Score réel non encore renseigné — la comparaison sera disponible après le match.</span>
            </div>
          )}

          {/* ── Périodes ── */}
          {PERIODES.map(periode => {
            const ms = maisons.filter(m => periode.positions.includes(m.position))
            const sigs = signauxPeriode(ms, domicile, exterieur)
            const isDom = periode.equipe === 'domicile'

            return (
              <div key={periode.id} className={`vd-periode ${isDom ? 'dom' : 'ext'}`}>
                <div className="vd-periode-header">
                  <span className="vd-periode-mi">{periode.mi === 1 ? '1ʳᵉ MT' : '2ᵉ MT'}</span>
                  <span className="vd-periode-label">{isDom ? `🏠 ${domicile}` : `✈️ ${exterieur}`}</span>
                  <span className="vd-periode-pos">{periode.posLabel}</span>
                </div>

                {/* Cases de positions */}
                <div className="vd-periode-cases">
                  {periode.positions.map(pos => {
                    const m = ms.find(x => x.position === pos)
                    const c = m ? couleurMaison(m.maison?.nom) : null
                    return (
                      <div key={pos} className={`vd-case ${m ? 'occupee' : 'libre'}`}>
                        <span className="vd-case-num">M{pos}</span>
                        {m ? (
                          <span className="vd-case-nom"
                            style={{ background: c.bg, color: c.txt }}>
                            {m.maison?.nom}
                            {m.puissance !== 'normal' && <span className="vd-case-star">★</span>}
                          </span>
                        ) : (
                          <span className="vd-case-vide">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Signaux */}
                {sigs.length > 0 ? (
                  <div className="vd-periode-sigs">
                    {sigs.map((s, i) => (
                      <div key={i} className={`vd-sig vd-sig-${s.type}`}>
                        <span className="vd-sig-ico">{s.ico}</span>
                        <span className="vd-sig-txt">{s.txt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="vd-periode-vide">Aucune maison clé dans cette période</div>
                )}
              </div>
            )
          })}

          {/* Note apprentissage */}
          <div className="vd-analyse-note">
            📚 Ces données s'accumulent à chaque match confirmé et permettent d'affiner la lecture des tracés futurs.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Interprétation + Combinaisons d'un tracé ─────────────────
function InterpretationCombi({ analyse: a, numTrace, combisPubliees }) {
  if (!a) return null
  const [combisSelectionnees, setCombisSelectionnees] = useState(
    // Pour tracé 1 : utilise les combis publiées si disponibles
    combisPubliees?.map(c => c.label) || a.combis.map(c => c.label)
  )

  const toggler = label => {
    setCombisSelectionnees(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const lignes = []

  // ── Youssou ──
  if (a.youssouPresent) {
    a.youssous.forEach(y => {
      lignes.push({ icone: '⚽', texte: `Youssou M${y.position} (zone ${y.zone === 'domicile' ? 'DOM' : 'EXT'}) → confirmation 2EM — les deux équipes marquent`, type: 'youssou' })
    })
  }

  // ── Souleymane ──
  a.souleymanes.forEach(s => {
    const forme = s.puissance !== 'normal' ? ` ★(${s.puissance === 'tres_puissant' ? 'très puissant' : 'puissant'})` : ''
    if (s.zone === 'domicile')
      lignes.push({ icone: '🏠', texte: `Souleymane M${s.position}${forme} zone DOM → domicile ENCAISSE → Extérieur +1 but`, type: 'sol' })
    else
      lignes.push({ icone: '✈️', texte: `Souleymane M${s.position}${forme} zone EXT → extérieur ENCAISSE → Domicile +1 but`, type: 'sol' })
  })
  if (a.souleymanes.length > 0)
    lignes.push({ icone: '⟹', texte: `Score Souleymane → Domicile ${a.dom} but(s) — Extérieur ${a.ext} but(s)`, type: 'resume' })

  // ── Noukh ──
  if (a.noukhs.length > 0) {
    const pos = a.noukhs.map(n => `M${n.position}`).join(', ')
    lignes.push({ icone: '👁️', texte: `Noukh en ${pos} — spectateur confirmatoire de Souleymane (ne donne pas de but)`, type: 'noukh' })
  }

  // ── Imsa ──
  a.imsas.forEach(im => {
    const forme = im.puissance !== 'normal' ? ` ★(${im.puissance === 'tres_puissant' ? 'très puissant' : 'puissant'})` : ''
    lignes.push({ icone: '🎉', texte: `Imsa M${im.position}${forme} zone ${im.zone === 'domicile' ? 'DOM' : 'EXT'} → 1 but jubilé ${im.zone === 'domicile' ? 'Domicile' : 'Extérieur'}`, type: 'imsa' })
  })
  if (a.imsaCount >= 3) lignes.push({ icone: '⟹', texte: `${a.imsaCount} Imsa → match à 3+ buts (signal +2,5 FORT)`, type: 'resume' })
  else if (a.imsaCount === 2) lignes.push({ icone: '⟹', texte: `2 Imsa → match à 2+ buts (signal +1,5)`, type: 'resume' })
  if (a.imsaDom > 0 && a.imsaExt === 0) lignes.push({ icone: '', texte: `Imsa uniquement zone DOM ×${a.imsaDom} → Domicile NE PERD PAS (1X)`, type: 'resume' })
  if (a.imsaExt > 0 && a.imsaDom === 0) lignes.push({ icone: '', texte: `Imsa uniquement zone EXT ×${a.imsaExt} → Extérieur NE PERD PAS (2X)`, type: 'resume' })
  if (a.imsaDom > 0 && a.imsaExt > 0)   lignes.push({ icone: '🎯', texte: `Imsa 2 zones (DOM×${a.imsaDom} EXT×${a.imsaExt}) → les DEUX ÉQUIPES MARQUENT (2EM)`, type: 'resume' })

  // Score final
  lignes.push({ icone: '📊', texte: `Score Tracé ${numTrace} : ${a.score}`, type: 'score' })

  if (lignes.length === 1) {
    lignes.unshift({ icone: '⚪', texte: 'Aucune maison clé (Youssou/Souleymane/Imsa) dans ce tracé', type: 'vide' })
  }

  return (
    <div className="vd-interp-section">
      <div className="vd-interp-titre">📋 Analyse du Tracé {numTrace}</div>
      <div className="vd-interp-lignes">
        {lignes.map((l, i) => (
          <div key={i} className={`vd-interp-ligne ${l.type}`}>
            <span className="vd-interp-ico">{l.icone}</span>
            <span>{l.texte}</span>
          </div>
        ))}
      </div>

      {/* Combinaisons du tracé */}
      <div className="vd-combis-titre">
        {numTrace === 1 ? '🏆 Combinaisons publiées (Tracé 1)' : '🔍 Combinaisons Tracé 2 (vérification)'}
      </div>
      <div className="vd-combis">
        {a.combis.map((c, i) => {
          const selectionnee = combisSelectionnees.includes(c.label)
          return (
            <button
              key={i}
              className={`vd-combi-btn ${selectionnee ? 'selectionne' : ''}`}
              style={{ borderColor: c.couleur, color: selectionnee ? '#fff' : c.couleur, background: selectionnee ? c.couleur : c.couleur + '18' }}
              onClick={() => toggler(c.label)}
              title={c.desc}
            >
              {c.label}
              <span className="vd-combi-pct">{c.score}%</span>
            </button>
          )
        })}
        {a.combis.length === 0 && <span className="vd-combis-vide">Aucune combinaison significative</span>}
      </div>
      {numTrace === 1 && (
        <p className="vd-combis-note">Cliquez pour sélectionner/désélectionner les combinaisons à publier.</p>
      )}
    </div>
  )
}

// ── Légende des couleurs ──────────────────────────────────────
function Legende() {
  return (
    <div className="vd-legende">
      {[['#c62828','Dom. ★★'],['#2e7d32','Dom. ★'],['#a5d6a7','Dom.'],
        ['#6a1b9a','Ext. ★★'],['#1565c0','Ext. ★'],['#90caf9','Ext.']].map(([c,l]) => (
        <span key={l} style={{ background: c, color: (c==='#a5d6a7'||c==='#90caf9') ? '#1e293b' : '#fff' }}
          className="vd-leg-item">{l}</span>
      ))}
    </div>
  )
}

// ── Nouvelle architecture 16 maisons ─────────────────────────
const POSITIONS_M = [
  { idx: 7,    col: 1,      row: 1, box: false, span: false },
  { idx: 6,    col: 3,      row: 1, box: false, span: false },
  { idx: 5,    col: 5,      row: 1, box: false, span: false },
  { idx: 4,    col: 7,      row: 1, box: false, span: false },
  { idx: 3,    col: 9,      row: 1, box: false, span: false },
  { idx: 2,    col: 11,     row: 1, box: false, span: false },
  { idx: 1,    col: 13,     row: 1, box: false, span: false },
  { idx: 0,    col: 15,     row: 1, box: false, span: false },
  { idx: 11,   col: 2,      row: 2, box: false, span: false },
  { idx: 10,   col: 6,      row: 2, box: false, span: false },
  { idx: 9,    col: 10,     row: 2, box: false, span: false },
  { idx: 8,    col: 14,     row: 2, box: false, span: false },
  { idx: 13,   col: 4,      row: 3, box: false, span: false },
  { idx: 12,   col: 12,     row: 3, box: false, span: false },
  { idx: 14,   col: '7/10', row: 4, box: true,  span: true  },
  { idx: 15,   col: 15,     row: 4, box: true,  span: false, right: true },
  { idx: 'MC', col: 1,      row: 4, box: true,  span: false, mc: true },
]

const addDisp = (a, b) => a.map((v, i) => v === b[i] ? 2 : 1)

function GrilleMaisons({ maisons }) {
  if (!maisons?.length) return <div className="vd-grille-vide">Pas de données</div>

  // Calculer MC à partir des dispositions
  const d = (i) => maisons[i]?.disposition || [1,1,1,1]
  const MA = addDisp(d(2), d(4))
  const MB = addDisp(d(10), d(14))
  const MC = addDisp(MA, MB)

  return (
    <div className="vd-grille-wrap">
    <div className="vd-grille-nouvelle">
      <div className="vd-sep-v" style={{ gridColumn: 8, gridRow: '1 / 4', height: 'calc(100% + 20px)' }} />
      {POSITIONS_M.map((pos, ki) => {
        const isMC = pos.idx === 'MC'
        const mp   = isMC ? null : maisons[pos.idx]
        const disp = isMC ? MC : mp?.disposition || []
        const nom  = isMC ? 'MC' : (mp?.maison?.nom || '?')
        const b    = isMC ? '#16a34a' : bg(mp?.zone, mp?.puissance, nom)
        const t    = isMC ? '#fff'    : txt(nom)
        if (!isMC && !mp) return null
        return (
          <div key={ki}
            className={`vd-case-m${pos.box ? ' vd-case-box' : ''}${pos.mc ? ' mc' : ''}`}
            style={{
              gridColumn: pos.col, gridRow: pos.row, background: b,
              ...(pos.span  ? { justifySelf: 'center' } : {}),
              ...(pos.box && pos.row === 4 ? { borderBottom: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
              ...(pos.right ? { transform: 'translateX(65px)' } : {}),
              ...(pos.mc    ? { borderColor: '#16a34a' } : {}),
            }}
            title={isMC ? 'MC' : `M${mp.position} — ${nom}`}>
            {disp.map((d, di) => (
              <div key={di} className="vd-m-rang">
                {Array.from({ length: d }, (_, k) => (
                  <span key={k} className="vd-m-dot" style={{ background: t }} />
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </div>
    </div>
  )
}
