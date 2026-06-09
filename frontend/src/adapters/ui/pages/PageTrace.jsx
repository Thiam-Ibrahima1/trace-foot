// ============================================================
// PageTrace.jsx — Générateur de tracé MANUEL (4 étapes)
//
// Étape 1 : Saisir les infos du match
// Étape 2 : Saisir les 16 points dans la grille 4×4 (ou auto-générer)
// Étape 3 : Visualiser les restes + les 4 premières maisons domicile
// Étape 4 : Les 16 maisons complètes avec score, combis, interprétation
// ============================================================
import React, { useState, useRef, useEffect } from 'react'
import {
  genererTraceValide, genererTrace1AvecSouleymane, genererTraceAlea, calculerDispositions, analyserDispositions,
} from '../../../domain/usecases/TraceUseCases.js'
import { identifierMaison, niveauPuissance } from '../../../domain/entities/Maison.js'
import { sauvegarderPrediction } from '../../../adapters/api/ServiceApi.js'
import './PageTrace.css'

// Intervalles min/max pour chacune des 16 lignes
const LIGNES = [
  { min: 7,  max: 11 }, { min: 12, max: 16 }, { min: 17, max: 21 }, { min: 22, max: 26 },
  { min: 27, max: 31 }, { min: 32, max: 36 }, { min: 37, max: 41 }, { min: 42, max: 46 },
  { min: 47, max: 51 }, { min: 52, max: 56 }, { min: 57, max: 61 }, { min: 62, max: 66 },
  { min: 67, max: 71 }, { min: 72, max: 76 }, { min: 77, max: 81 }, { min: 82, max: 86 },
]

// Calcule le reste (1 ou 2 selon parité)
const calcReste = n => n % 2 === 0 ? 2 : 1

// Couleur d'une maison selon zone et puissance
function couleurMaison(zone, puissance) {
  const c = {
    domicile:  { tres_puissant: '#c62828', puissant: '#2e7d32', normal: '#a5d6a7' },
    exterieur: { tres_puissant: '#6a1b9a', puissant: '#1565c0', normal: '#90caf9' },
  }
  return c[zone]?.[puissance] || '#e0e0e0'
}

// ── Indicateur d'étapes ────────────────────────────────────────
function IndicateurEtapes({ etape }) {
  const etapes = ['Infos match', 'Points 4×4', '4 premières maisons', '16 maisons']
  return (
    <div className="trace-etapes">
      {etapes.map((lbl, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < etapes.length - 1 ? 1 : 'none' }}>
          <div className={`etape-point ${etape > i + 1 ? 'fait' : etape === i + 1 ? 'actif' : ''}`}>
            <span className="etape-num">{i + 1}</span>
            <span className="etape-lbl">{lbl}</span>
          </div>
          {i < etapes.length - 1 && <div className="etape-ligne" />}
        </div>
      ))}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────
export default function PageTrace({ matchPrefill }) {
  const [etape, setEtape]         = useState(matchPrefill ? 1 : 0)
  const [matchInfo, setMatchInfo] = useState(
    matchPrefill || { match_id: '', competition: '', domicile: '', exterieur: '', date: '', heure: '' }
  )
  const [pts, setPts]             = useState(Array(16).fill(''))
  const [restes, setRestes]       = useState(null)
  const [premieres, setPremieres] = useState(null)
  const [resultat, setResultat]   = useState(null)
  const [msg, setMsg]             = useState('')
  const [saving, setSaving]       = useState(false)

  // ── Refs navigation étape 1 ─────────────────────────────────
  const refDom = useRef(null)
  const refHH  = useRef(null)
  const refMM  = useRef(null)
  const refExt = useRef(null)
  const [heureHH, setHeureHH] = useState('')
  const [heureMM, setHeureMM] = useState('')
  const [domicileConfirme, setDomicileConfirme] = useState(false)

  // ── État pour les tuyaux (dots) ─────────────────────────────
  const [validatedLines, setValidatedLines] = useState(Array(16).fill(false))
  const [barredCounts, setBarredCounts]     = useState(Array(16).fill(0))
  const [biffageTermine, setBiffageTermine] = useState(false)
  const [biffageLance, setBiffageLance]     = useState(false)
  const [completedBlocs, setCompletedBlocs] = useState([false, false, false, false])
  const [autoGenere, setAutoGenere]         = useState(false)

  async function lancerBiffage() {
    const barred = Array(16).fill(0)
    const blocs  = [false, false, false, false]
    for (let b = 0; b < 4; b++) {
      // Barrer les 4 lignes du bloc b
      for (let j = 0; j < 4; j++) {
        const i      = b * 4 + j
        const val    = parseInt(pts[i] || '0', 10)
        const reste  = val % 2 === 0 ? 2 : 1
        const target = val - reste
        while (barred[i] < target) {
          await new Promise(r => setTimeout(r, 60))
          barred[i] = Math.min(barred[i] + 2, target)
          setBarredCounts([...barred])
        }
      }
      // Afficher le cadre du bloc
      blocs[b] = true
      setCompletedBlocs([...blocs])
      // Pause avant le bloc suivant
      if (b < 3) await new Promise(r => setTimeout(r, 500))
    }
    setBiffageTermine(true)
  }

  useEffect(() => {
    if (etape === 1) setTimeout(() => refDom.current?.focus(), 50)
  }, [etape])

  // Valider la ligne active via Entrée (sauf si focus sur un input texte)
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Enter' || etape !== 1) return
      if (document.activeElement?.tagName === 'INPUT') return
      const idx = validatedLines.findIndex(v => !v)
      if (idx === -1) return
      const val    = parseInt(pts[idx] || '0', 10)
      const maxVal = LIGNES[idx].max
      if (val > maxVal) return
      if (idx === 0 && val < 7) return
      if (idx > 0 && val <= parseInt(pts[idx - 1] || '0', 10)) return
      setValidatedLines(v => { const n = [...v]; n[idx] = true; return n })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [etape, validatedLines, pts])

  function validerLigne(i) {
    const val    = parseInt(pts[i] || '0', 10)
    const maxVal = LIGNES[i].max
    if (val > maxVal) return
    if (i === 0 && val < 7) return
    if (i > 0 && val <= parseInt(pts[i - 1] || '0', 10)) return
    setValidatedLines(v => { const n = [...v]; n[i] = true; return n })
  }

  function changerHH(val) {
    const n = val.replace(/\D/g, '').slice(0, 2)
    if (n.length === 2 && parseInt(n, 10) > 23) {
      setHeureHH('')
      return
    }
    setHeureHH(n)
    setMatchInfo(m => ({ ...m, heure: `${n}:${heureMM}` }))
    if (n.length === 2) refMM.current?.focus()
  }

  function changerMM(val) {
    const n = val.replace(/\D/g, '').slice(0, 2)
    if (n.length === 2 && parseInt(n, 10) > 59) {
      setHeureMM('')
      return
    }
    setHeureMM(n)
    setMatchInfo(m => ({ ...m, heure: `${heureHH}:${n}` }))
    if (n.length === 2) refExt.current?.focus()
  }

  // ── Mode auto : génération multi-tentatives ──────────────────
  const [genAutoEnCours, setGenAutoEnCours] = useState(false)
  const [autoEssais, setAutoEssais]         = useState(0)
  const [autoResultat, setAutoResultat]     = useState(null) // { t1, tConf, essais, concordance }

  // ── Étape 1 → 2 ──────────────────────────────────────────────
  function allerEtape2() {
    if (!matchInfo.domicile || !matchInfo.exterieur) {
      setMsg('⚠️ Remplissez au minimum les équipes domicile et extérieure.')
      return
    }
    setMsg('')
    setEtape(2)
  }

  // ── Étape 2 : auto-générer — même règle que la génération par championnat ──
  // Souleymane prioritaire : réessaie jusqu'à V1 valide + Souleymane présent
  function autoGenerer() {
    const trace = genererTrace1AvecSouleymane(500)
    setPts(trace.pts.map(String))
    setMsg(trace.status === 'valide'
      ? `Points générés — V1 validée en ${trace.essais} essai(s). Souleymane présent.`
      : `⚠️ Points générés (${trace.essais} essais) — vérifiez les maisons.`)
  }

  function changerPoint(idx, val) {
    const n = val.replace(/\D/g, '')
    setPts(p => { const c = [...p]; c[idx] = n; return c })
  }

  // ── Étape 2 → 3 : calculer les restes + 4 premières maisons ─
  function calculerRestes() {
    const nums = pts.map(v => parseInt(v, 10))
    if (nums.some(isNaN) || nums.some(n => n < 1)) {
      setMsg('⚠️ Tous les 16 points doivent être renseignés (valeurs positives).')
      return
    }
    const X  = nums.map(calcReste)
    const M1 = X.slice(0, 4)
    const M2 = X.slice(4, 8)
    const M3 = X.slice(8, 12)
    const M4 = X.slice(12, 16)
    setRestes(X)
    setPremieres([
      { label: 'M1', position: 1, disp: M1, maison: identifierMaison(M1) },
      { label: 'M2', position: 2, disp: M2, maison: identifierMaison(M2) },
      { label: 'M3', position: 3, disp: M3, maison: identifierMaison(M3) },
      { label: 'M4', position: 4, disp: M4, maison: identifierMaison(M4) },
    ])
    // Calculer aussi les 16 maisons complètes
    const disps = calculerDispositions(nums)
    const anal  = analyserDispositions(disps)
    setResultat({ ...anal, pts: nums, dispositions: disps })
    setMsg('')
    setEtape(3)
  }

  // ── Étape 3 → 4 : générer les 16 maisons complètes ──────────
  function generer16Maisons() {
    const nums  = pts.map(v => parseInt(v, 10))
    const disps = calculerDispositions(nums)
    const anal  = analyserDispositions(disps)
    setResultat({ ...anal, pts: nums, dispositions: disps })
    setMsg('')
    setEtape(4)
  }

  // ── Regénérer entièrement — Souleymane obligatoire pour T1 ─────
  function regenererAvecRegles() {
    const trace = genererTrace1AvecSouleymane(500)
    setPts(trace.pts.map(String))
    const X  = trace.pts.map(n => n % 2 === 0 ? 2 : 1)
    const M1 = X.slice(0, 4), M2 = X.slice(4, 8), M3 = X.slice(8, 12), M4 = X.slice(12, 16)
    setRestes(X)
    setPremieres([
      { label: 'M1', position: 1, disp: M1, maison: identifierMaison(M1) },
      { label: 'M2', position: 2, disp: M2, maison: identifierMaison(M2) },
      { label: 'M3', position: 3, disp: M3, maison: identifierMaison(M3) },
      { label: 'M4', position: 4, disp: M4, maison: identifierMaison(M4) },
    ])
    // Calculer directement les 16 maisons
    const disps = calculerDispositions(trace.pts)
    const anal  = analyserDispositions(disps)
    setResultat({ ...anal, pts: trace.pts, dispositions: disps })
    setMsg(trace.status === 'valide'
      ? `Nouveau tracé généré — V1 validée en ${trace.essais} essai(s).`
      : `⚠️ Tracé partiel — V1 non validée après ${trace.essais} essais.`)
  }

  // ── Étape 4 : sauvegarder et publier ────────────────────────
  async function publier() {
    setSaving(true); setMsg('')
    try {
      const auj = new Date().toISOString().split('T')[0]
      await sauvegarderPrediction({
        ...matchInfo,
        match_id:           matchInfo.match_id    || `manuel-${Date.now()}`,
        competition:        matchInfo.competition || 'Tracé Manuel',
        date:               matchInfo.date        || auj,
        score_prevu:        resultat.scorePrincipal,
        scores_alternatifs: resultat.scoresAlternatifs,
        interpretation:     resultat.interpretation,
        combinaisons:       resultat.combinaisons,
        maisons_placees:    resultat.maisonsPlacees,
        verification: {
          trace1: { ...resultat.verification, maisonsPlacees: resultat.maisonsPlacees || [] },
          concordance: null,
          statut: resultat.verification.traceValide ? 'certifie' : 'trace1_sauvegarde',
        },
        essais:       1,
        trace_status: 'trace1',
      })
      setMsg('Tracé sauvegardé — Confirmez dans "Voir les maisons" pour le publier.')
    } catch (e) {
      setMsg(e.message === 'Failed to fetch'
        ? '❌ Serveur inaccessible. Vérifiez que le backend est démarré (php artisan serve).'
        : '❌ Erreur : ' + e.message)
    }
    setSaving(false)
  }

  function recommencer() {
    setEtape(1); setRestes(null); setPremieres(null); setResultat(null)
    setPts(Array(16).fill('')); setMsg('')
    setValidatedLines(Array(16).fill(false))
    setBarredCounts(Array(16).fill(0))
    setBiffageTermine(false)
    setBiffageLance(false)
    setCompletedBlocs([false, false, false, false])
    setAutoGenere(false)
    setAutoResultat(null); setAutoEssais(0)
    setHeureHH(''); setHeureMM(''); setDomicileConfirme(false)
    if (!matchPrefill) setMatchInfo({ match_id: '', competition: '', domicile: '', exterieur: '', date: '', heure: '' })
  }

  // ── Génère un tracé complet en une seule passe ───────────────
  // T2/T3 : génération normale
  function genererUnTraceComplet() {
    const trace = genererTraceValide(100)
    const disps = calculerDispositions(trace.pts)
    const anal  = analyserDispositions(disps)
    return { ...anal, pts: trace.pts, dispositions: disps }
  }

  // T1 : Souleymane obligatoire (priorité — il définit le score)
  function genererTrace1Complet() {
    return genererTrace1AvecSouleymane(500)
  }

  // ── Génération automatique : T1 → T2 → (T3) par cycle ───────
  async function genererAutomatique() {
    if (!matchInfo.domicile || !matchInfo.exterieur) {
      setMsg('⚠️ Remplissez au minimum les équipes domicile et extérieure.')
      return
    }
    setGenAutoEnCours(true); setAutoEssais(0); setAutoResultat(null); setMsg('')

    let essais = 0
    let dernierT1 = null

    while (essais < 50) {
      essais++
      setAutoEssais(essais)
      await new Promise(r => setTimeout(r, 20)) // laisse l'UI se mettre à jour

      const t1 = genererTrace1Complet()  // T1 : Souleymane obligatoire
      dernierT1 = t1
      await new Promise(r => setTimeout(r, 10))

      const t2 = genererUnTraceComplet()  // T2 : génération normale

      if (t1.scorePrincipal === t2.scorePrincipal) {
        // Concordance T1 == T2 
        setAutoResultat({ t1, tConf: t2, essais, concordance: true, numConf: 2 })
        setGenAutoEnCours(false)
        return
      }

      await new Promise(r => setTimeout(r, 10))
      const t3 = genererUnTraceComplet()

      if (t3.scorePrincipal === t1.scorePrincipal) {
        // Concordance T1 == T3 
        setAutoResultat({ t1, tConf: t3, essais, concordance: true, numConf: 3 })
        setGenAutoEnCours(false)
        return
      }
      // Pas de concordance dans ce cycle → prochain cycle
    }

    // Limite atteinte sans concordance — sauvegarder le dernier T1
    setAutoResultat({ t1: dernierT1, tConf: null, essais, concordance: false })
    setGenAutoEnCours(false)
  }

  // ── Publier le résultat de la génération automatique ─────────
  async function publierAuto() {
    if (!autoResultat?.t1) return
    const { t1, tConf, essais, concordance } = autoResultat
    setSaving(true); setMsg('')
    try {
      const auj = new Date().toISOString().split('T')[0]
      await sauvegarderPrediction({
        ...matchInfo,
        match_id:           matchInfo.match_id    || `manuel-${Date.now()}`,
        competition:        matchInfo.competition || 'Tracé Manuel',
        date:               matchInfo.date        || auj,
        score_prevu:        t1.scorePrincipal,
        scores_alternatifs: t1.scoresAlternatifs,
        interpretation:     tConf
          ? [t1.interpretation, '---', tConf.interpretation].join('\n')
          : t1.interpretation,
        combinaisons:       t1.combinaisons,
        maisons_placees:    t1.maisonsPlacees,
        verification: {
          trace1:      { ...t1.verification,   maisonsPlacees: t1.maisonsPlacees   || [] },
          trace2:      tConf ? { ...tConf.verification, maisonsPlacees: tConf.maisonsPlacees || [] } : null,
          concordance: concordance,
          statut:      concordance ? 'certifie' : 'trace1_sauvegarde',
        },
        essais,
        trace_status: 'trace1',
      })
      setMsg(`Tracé sauvegardé (${essais} essai(s)${concordance ? ', concordance ' : ''}) — Confirmez dans "Voir les maisons".`)
      setAutoResultat(null)
    } catch (e) {
      setMsg(e.message === 'Failed to fetch'
        ? '❌ Serveur inaccessible. Vérifiez que le backend est démarré (php artisan serve).'
        : '❌ Erreur : ' + e.message)
    }
    setSaving(false)
  }

  // ────────────────────────────────────────────────────────────
  return (
    <div className="page-trace">

      {/* ══ ÉTAPE 0 : Écran d'accueil ═══════════════════════════ */}
      {etape === 0 && (
        <div className="trace-accueil">
          <div className="trace-accueil-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <h2 className="trace-accueil-titre">Générateur de Tracé</h2>
          <p className="trace-accueil-sous">
            Générez un tracé manuel pour un match spécifique en 4 étapes guidées.
          </p>
          <div className="trace-accueil-etapes">
            {[
              { n: '1', lbl: 'Infos du match',         ico: '⚽' },
              { n: '2', lbl: 'Points 4×4',             ico: '🔢' },
              { n: '3', lbl: '4 premières maisons',    ico: '🏠' },
              { n: '4', lbl: '16 maisons + résultat',  ico: '✦'  },
            ].map(e => (
              <div key={e.n} className="trace-accueil-step">
                <span className="trace-accueil-step-n">{e.n}</span>
                <span className="trace-accueil-step-lbl">{e.lbl}</span>
              </div>
            ))}
          </div>
          <button className="trace-btn-commencer" onClick={recommencer}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
            </svg>
            Commencer
          </button>
        </div>
      )}

      {etape > 1 && <IndicateurEtapes etape={etape} />}

      {/* Bandeau match pré-sélectionné */}
      {matchPrefill && etape > 0 && (
        <div className="trace-prefill-banner">
          ⚽ Match : <strong>{matchPrefill.domicile} — {matchPrefill.exterieur}</strong>
          <span className="trace-prefill-comp">{matchPrefill.competition}</span>
          {matchPrefill.heure && <span className="trace-prefill-heure">{matchPrefill.heure}</span>}
        </div>
      )}

      {/* ══ ÉTAPE 1 : Infos du match (design terrain) ══════════ */}
      {etape === 1 && (
        <div className="trace-e1-page">

          {/* ── Terrain : Équipe Extérieure | XX:XX | Équipe Domicile ── */}
          <div className="trace-e1-terrain">

            {/* Équipe Extérieure */}
            <div className="trace-e1-equipe trace-e1-ext">
              <input ref={refExt} className="trace-e1-eq-input" type="text"
                placeholder="Nom équipe extérieure"
                value={matchInfo.exterieur}
                disabled={!domicileConfirme || heureHH.length < 2 || heureMM.length < 2}
                onChange={e => setMatchInfo(m => ({ ...m, exterieur: e.target.value.toUpperCase() }))} />
            </div>

            {/* Centre : heure HH:MM */}
            <div className="trace-e1-centre">
              <div className="trace-e1-heure">
                <input ref={refHH} className="trace-e1-heure-input" type="text"
                  placeholder="HH" maxLength={2}
                  value={heureHH}
                  disabled={!domicileConfirme}
                  onChange={e => changerHH(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && heureHH.length === 2) { e.preventDefault(); refMM.current?.focus() } }} />
                <span className="trace-e1-heure-sep">:</span>
                <input ref={refMM} className="trace-e1-heure-input" type="text"
                  placeholder="MM" maxLength={2}
                  value={heureMM}
                  disabled={!domicileConfirme}
                  onChange={e => changerMM(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && heureMM.length === 2) { e.preventDefault(); refExt.current?.focus() } }} />
              </div>
            </div>

            {/* Équipe Domicile */}
            <div className="trace-e1-equipe trace-e1-dom">
              <input ref={refDom} className="trace-e1-eq-input" type="text"
                placeholder="Nom équipe domicile"
                value={matchInfo.domicile}
                onChange={e => {
                  const val = e.target.value.toUpperCase()
                  setMatchInfo(m => ({ ...m, domicile: val }))
                  if (!val) setDomicileConfirme(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && matchInfo.domicile) {
                    e.preventDefault()
                    setDomicileConfirme(true)
                    setTimeout(() => refHH.current?.focus(), 10)
                  }
                }} />
            </div>
          </div>



          {/* ── Tuyaux : apparaissent après saisie de l'équipe extérieure ── */}
          {matchInfo.exterieur && (
            <>
              <div className="trace-tuyaux">
                {[0, 1, 2, 3].map(b => {
                  const firstIdx = b * 4
                  const blocVisible = firstIdx === 0 || validatedLines[firstIdx - 1]
                  if (!blocVisible) return null
                  return (
                    <React.Fragment key={b}>
                      <div className="trace-bloc-wrapper">
                        <div className="trace-bloc-lignes"
                          style={{ width: `calc((100% - 44px) * ${Math.min(0.9, parseInt(pts[b * 4 + 3] || '0', 10) / 86 + 0.10).toFixed(3)})` }}>
                          {[0, 1, 2, 3].map(j => {
                            const i = b * 4 + j
                            const visible = i === 0 || validatedLines[i - 1]
                            if (!visible) return null
                            const { max: maxVal } = LIGNES[i]
                            const val       = parseInt(pts[i] || '0', 10)
                            const validated = validatedLines[i]
                            const ratio     = (maxVal / 86).toFixed(3)
                            return (
                              <div key={i} className={`trace-tuyau-ligne ${validated ? 'validated' : ''}`}>
                                <div className="trace-dots-zone">
                                  {Array.from({ length: val }, (_, di) => {
                                    const isBarred = di >= val - barredCounts[i]
                                    return <span key={di} className={`trace-dot${isBarred ? ' trace-dot-barre' : ''}`} />
                                  })}
                                </div>
                                {!validated && (
                                  <button className="trace-tuyau-btn"
                                    disabled={val >= maxVal}
                                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                                    onClick={e => {
                                      if (val < maxVal) {
                                        const n = [...pts]; n[i] = String(val + 1); setPts(n)
                                      }
                                      e.currentTarget.focus()
                                    }}>+</button>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {completedBlocs[b] && (
                          <div className="trace-bloc-restes">
                            {[0, 1, 2, 3].map(j => {
                              const i     = b * 4 + j
                              const val   = parseInt(pts[i] || '0', 10)
                              const reste = val % 2 === 0 ? 2 : 1
                              return (
                                <div key={j} className="trace-reste-dots">
                                  {Array.from({ length: reste }, (_, k) => (
                                    <span key={k} className="trace-dot trace-dot-reste" />
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {b < 3 && validatedLines[firstIdx + 3] && <div className="trace-tuyaux-sep" />}
                    </React.Fragment>
                  )
                })}
              </div>
            </>
          )}

          {msg && <p className="trace-msg warn">{msg}</p>}

          <div className="trace-e1-actions" style={{ justifyContent: 'flex-start', gap: '48px', paddingLeft: '60px' }}>
            <span className="trace-lien-action" onClick={() => {
              if (biffageLance) {
                setBiffageLance(false)
                setBiffageTermine(false)
                setBarredCounts(Array(16).fill(0))
                setCompletedBlocs([false, false, false, false])
              } else {
                setEtape(0)
              }
            }}>
              ← Retour
            </span>
            {matchInfo.exterieur && !autoGenere && !biffageLance && (
              <span className="trace-lien-action" onClick={() => {
                autoGenerer()
                setValidatedLines(Array(16).fill(true))
                setAutoGenere(true)
                setMsg('')
              }}>
                Auto-générer
              </span>
            )}
            {validatedLines[15] && !biffageLance && (
              <span className="trace-lien-action" onClick={() => {
                setBiffageLance(true)
                lancerBiffage()
              }}>
                Valider
              </span>
            )}
            {biffageTermine && (
              <span className="trace-lien-action" onClick={calculerRestes}>
                Suivant →
              </span>
            )}
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 3 : 16 maisons ═══════════════════════════════ */}
      {etape === 3 && restes && (() => {
        const cb = (a, b) => a.map((v, i) => v === b[i] ? 2 : 1)
        const X  = restes
        const M1  = [X[0],  X[1],  X[2],  X[3] ]
        const M2  = [X[4],  X[5],  X[6],  X[7] ]
        const M3  = [X[8],  X[9],  X[10], X[11]]
        const M4  = [X[12], X[13], X[14], X[15]]
        const M5  = [X[0],  X[4],  X[8],  X[12]]
        const M6  = [X[1],  X[5],  X[9],  X[13]]
        const M7  = [X[2],  X[6],  X[10], X[14]]
        const M8  = [X[3],  X[7],  X[11], X[15]]
        const M9  = cb(M1, M2)
        const M10 = cb(M3, M4)
        const M11 = cb(M5, M6)
        const M12 = cb(M7, M8)
        const M13 = cb(M9, M10)
        const M14 = cb(M11, M12)
        const M15 = cb(M13, M14)
        const M16 = cb(M1, M15)

        // Placement selon l'image : col(1-8), row(1-3)
        // Grille 15 colonnes : 1-7 gauche | 8 séparateur | 9-15 droite
        const positions = [
          // Row 1 : M8…M5 (gauche) | M4…M1 (droite/références)
          { m: M8,  col: 1,       row: 1, box: false, span: false },
          { m: M7,  col: 3,       row: 1, box: false, span: false },
          { m: M6,  col: 5,       row: 1, box: false, span: false },
          { m: M5,  col: 7,       row: 1, box: false, span: false },
          { m: M4,  col: 9,       row: 1, box: false, span: false },
          { m: M3,  col: 11,      row: 1, box: false, span: false },
          { m: M2,  col: 13,      row: 1, box: false, span: false },
          { m: M1,  col: 15,      row: 1, box: false, span: false },
          // Row 2 : centrées entre paires
          { m: M12, col: 2,       row: 2, box: false, span: false },
          { m: M11, col: 6,       row: 2, box: false, span: false },
          { m: M10, col: 10,      row: 2, box: false, span: false },
          { m: M9,  col: 14,      row: 2, box: false, span: false },
          // Row 3 : centrées entre paires de row 2
          { m: M14, col: 4,       row: 3, box: false, span: false },
          { m: M13, col: 12,      row: 3, box: false, span: false },
          // Row 4 : M15 chevauche la ligne | M16 far right
          { m: M15, col: '7/10',  row: 4, box: true,  span: true  },
          { m: M16, col: 15,      row: 4, box: true,  span: false, right: true, marginLeft: '65px' },
        ]

        const MaisonDots = ({ disp }) => (
          <div className="trace-e3-maison">
            {disp.map((d, di) => (
              <div key={di} className="trace-e3-rang">
                {Array.from({ length: d }, (_, k) => (
                  <span key={k} className="trace-e3-dot" />
                ))}
              </div>
            ))}
          </div>
        )

        return (
          <div className="trace-e3-page">
            <div className="trace-e3-layout">
              <div className="trace-e3-sep-v" style={{ gridColumn: 8, gridRow: '1 / 4', height: 'calc(100% + 24px)' }} />
              {positions.map((pos, idx) => (
                <div key={idx}
                  className={`trace-e3-cell${pos.box ? ' trace-e3-box' : ''}${pos.mc ? ' mc' : ''}`}
                  style={{
                    gridColumn: pos.col,
                    gridRow: pos.row,
                    ...(pos.span ? { justifySelf: 'center' } : {}),
                    ...(pos.box && pos.row === 4 ? { borderBottom: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
                    ...(pos.right ? { transform: `translateX(${pos.marginLeft || '0px'})` } : {})
                  }}>
                  <MaisonDots disp={pos.m} />
                </div>
              ))}
            </div>
            <div className="trace-e3-nav">
              <span className="trace-lien-action" onClick={() => setEtape(1)}>← Retour</span>
              <span className="trace-lien-action" onClick={() => setEtape(4)}>Suivant →</span>
            </div>
          </div>
        )
      })()}

      {/* ══ ÉTAPE 4 : 16 maisons (même layout étape 3) ══════════ */}
      {etape === 4 && restes && (() => {
        const cb = (a, b) => a.map((v, i) => v === b[i] ? 2 : 1)
        const X  = restes
        const M1  = [X[0],  X[1],  X[2],  X[3] ]
        const M2  = [X[4],  X[5],  X[6],  X[7] ]
        const M3  = [X[8],  X[9],  X[10], X[11]]
        const M4  = [X[12], X[13], X[14], X[15]]
        const M5  = [X[0],  X[4],  X[8],  X[12]]
        const M6  = [X[1],  X[5],  X[9],  X[13]]
        const M7  = [X[2],  X[6],  X[10], X[14]]
        const M8  = [X[3],  X[7],  X[11], X[15]]
        const M9  = cb(M1, M2)
        const M10 = cb(M3, M4)
        const M11 = cb(M5, M6)
        const M12 = cb(M7, M8)
        const M13 = cb(M9, M10)
        const M14 = cb(M11, M12)
        const M15 = cb(M13, M14)
        const M16 = cb(M1, M15)
        const MA  = cb(M3, M5)
        const MB  = cb(M11, M15)
        const MC  = cb(MA, MB)

        const positions = [
          { m: M8,  col: 1,      row: 1, box: false, span: false },
          { m: M7,  col: 3,      row: 1, box: false, span: false },
          { m: M6,  col: 5,      row: 1, box: false, span: false },
          { m: M5,  col: 7,      row: 1, box: false, span: false },
          { m: M4,  col: 9,      row: 1, box: false, span: false },
          { m: M3,  col: 11,     row: 1, box: false, span: false },
          { m: M2,  col: 13,     row: 1, box: false, span: false },
          { m: M1,  col: 15,     row: 1, box: false, span: false },
          { m: M12, col: 2,      row: 2, box: false, span: false },
          { m: M11, col: 6,      row: 2, box: false, span: false },
          { m: M10, col: 10,     row: 2, box: false, span: false },
          { m: M9,  col: 14,     row: 2, box: false, span: false },
          { m: M14, col: 4,      row: 3, box: false, span: false },
          { m: M13, col: 12,     row: 3, box: false, span: false },
          { m: M15, col: '7/10', row: 4, box: true,  span: true,  mc: false },
          { m: M16, col: 15,     row: 4, box: true,  span: false, right: true, marginLeft: '65px', mc: false },
          { m: MC,  col: 1,      row: 4, box: true,  span: false, mc: true },
        ]

        const MaisonDots = ({ disp, green }) => (
          <div className="trace-e3-maison">
            {disp.map((d, di) => (
              <div key={di} className="trace-e3-rang">
                {Array.from({ length: d }, (_, k) => (
                  <span key={k} className="trace-e3-dot"
                    style={green ? { background: '#16a34a' } : {}} />
                ))}
              </div>
            ))}
          </div>
        )

        return (
          <div className="trace-e3-page">
            <div className="trace-e3-layout">
              <div className="trace-e3-sep-v" style={{ gridColumn: 8, gridRow: '1 / 4', height: 'calc(100% + 24px)' }} />
              {positions.map((pos, idx) => (
                <div key={idx}
                  className={`trace-e3-cell${pos.box ? ' trace-e3-box' : ''}${pos.mc ? ' mc' : ''}`}
                  style={{
                    gridColumn: pos.col, gridRow: pos.row,
                    ...(pos.span ? { justifySelf: 'center' } : {}),
                    ...(pos.box && pos.row === 4 ? { borderBottom: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
                    ...(pos.right ? { transform: `translateX(${pos.marginLeft || '0px'})` } : {})
                  }}>
                  <MaisonDots disp={pos.m} green={pos.mc} />
                </div>
              ))}
            </div>
            {/* ── Analyses du tracé ── */}
            {resultat && (
              <div className="trace-e4-analyse">

                <div className="trace-verif">
                  <div className={`verif-bloc ${resultat.verification.v1.valide ? 'ok' : 'nok'}`} style={{flex:2}}>
                    <span className="v-label">V1 — Témoin de M1</span>
                    <span className="v-val">
                      M1 = <strong>{resultat.verification.v1.maisonM1 || '?'}</strong>
                      {' '}· Témoin : <strong>{resultat.verification.v1.temoin || '?'}</strong>
                      {' '}{resultat.verification.v1.temoinPresent ? '✓ Présent' : '✗ Absent'}
                    </span>
                  </div>
                  <div className={`verif-bloc ${resultat.verification.v2.mcConnue ? 'ok' : 'info'}`}>
                    <span className="v-label">V2 — MC Verte</span>
                    <span className="v-val">{resultat.verification.v2.mcConnue ? '✓ Présente' : '— Absente'}</span>
                  </div>
                  <div className={`verif-bloc ${resultat.verification.traceValide ? 'ok' : 'nok'}`}>
                    <span className="v-label">Statut</span>
                    <span className="v-val">
                      {resultat.verification.traceValide
                        ? (resultat.verification.v2.mcConnue ? '🟢 SOLIDE' : '🟡 BON')
                        : '🔴 À REFAIRE'}
                    </span>
                  </div>
                </div>

                <div className="trace-score-derive">
                  <div className="tsd-score-zone">
                    <span className="trace-score-lbl">Score prédit</span>
                    <span className="trace-score-val">{resultat.scorePrincipal}</span>
                  </div>
                  <div className="tsd-detail">
                    {resultat.maisonsPlacees.filter(mp => mp.maison?.nom === 'Souleymane' && mp.zone === 'domicile').map((mp, i) => (
                      <div key={i} className="tsd-ligne ext">Souleymane DOM → Extérieur +1 but</div>
                    ))}
                    {resultat.maisonsPlacees.filter(mp => mp.maison?.nom === 'Souleymane' && mp.zone === 'exterieur').map((mp, i) => (
                      <div key={i} className="tsd-ligne dom">Souleymane EXT → Domicile +1 but</div>
                    ))}
                    {resultat.imsaCount > 0 && (
                      <div className="tsd-ligne imsa">⟹ {resultat.imsaCount} Imsa — {resultat.dom + resultat.ext} buts</div>
                    )}
                    {resultat.youssouPresent && (
                      <div className="tsd-ligne youssou">⚽ Youssou → 2EM</div>
                    )}
                    {!resultat.dom && !resultat.ext && !resultat.imsaCount && !resultat.youssouPresent && (
                      <div className="tsd-ligne info">Aucune maison clé — score 0-0</div>
                    )}
                  </div>
                </div>

                {!resultat.verification.traceValide && (
                  <div className="trace-v1-alerte">
                    <span>⚠️ V1 non validée — le témoin de M1 (<strong>{resultat.verification.v1.temoin}</strong>) est absent.</span>
                    <button className="trace-btn-regenerer" onClick={regenererAvecRegles}>🔄 Regénérer</button>
                  </div>
                )}

                <div className="trace-combis-section">
                  <span className="trace-combis-titre">🏆 Top 3 combinaisons</span>
                  <div className="trace-combis">
                    {resultat.combinaisons.map((c, i) => (
                      <div key={i} className="combi-finale"
                        style={{ borderLeft: `4px solid ${c.couleur}`, background: c.couleur + '11' }}>
                        <span className="combi-finale-label" style={{ color: c.couleur }}>{c.label}</span>
                        <span className="combi-finale-desc">{c.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trace-interpretation">
                  <span className="trace-interp-titre">📋 Interprétation</span>
                  <div className="trace-interp-texte">
                    {resultat.interpretation.split('\n').map((l, i) => (
                      <p key={i} className="trace-interp-ligne">{l}</p>
                    ))}
                  </div>
                </div>

                {msg && <p className={`trace-msg-save ${msg.includes('❌') ? 'erreur' : 'ok'}`}>{msg}</p>}
              </div>
            )}

            <div className="trace-e3-nav">
              <span className="trace-lien-action" onClick={() => setEtape(3)}>← Retour</span>
              <button className="trace-btn-primary trace-btn-publier" onClick={publier} disabled={saving}
                style={{ margin: '0 0 0 32px', flex: '0 0 auto', width: 'auto', padding: '5px 8px', fontSize: '.78rem', borderRadius: '6px', boxShadow: 'none' }}>
                {saving ? '⏳...' : 'Publier'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
