// ============================================================
// PageHistorique.jsx — Historique de la semaine
// Structure : date (calendrier) → championnat (accordéon) → matchs
// Combinaisons : jaune (en attente) | vert (validé) | rouge (perdu)
// ============================================================
import { useState, useEffect } from 'react'
import { obtenirHistorique, supprimerPrediction } from '../../../adapters/api/ServiceApi.js'
import { evaluerCombi, classeCombi } from '../utils/evaluerCombi.js'
import './PageHistorique.css'

// ── SVG Checkbox ───────────────────────────────────────────────
function Checkbox({ etat, onChange }) {
  // etat : 'vide' | 'coche' | 'partiel'
  return (
    <button className="histo-checkbox" onClick={e => { e.stopPropagation(); onChange() }} title="Sélectionner">
      <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <rect x="1" y="1" width="16" height="16" rx="3" stroke={etat === 'vide' ? '#cbd5e1' : '#1b5e20'} strokeWidth="1.5"
          fill={etat === 'coche' ? '#1b5e20' : etat === 'partiel' ? '#f0fdf4' : '#fff'} />
        {etat === 'coche' && (
          <polyline points="4,9 7.5,13 14,5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        )}
        {etat === 'partiel' && (
          <line x1="4.5" y1="9" x2="13.5" y2="9" stroke="#1b5e20" strokeWidth="2" strokeLinecap="round"/>
        )}
      </svg>
    </button>
  )
}

const labelDate = dateStr => {
  if (!dateStr) return '—'
  const d    = new Date(dateStr + 'T12:00:00')
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  const dem  = new Date(auj); dem.setDate(auj.getDate() + 1)
  if (d.toDateString() === auj.toDateString())  return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  if (d.toDateString() === dem.toDateString())  return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Filtre la semaine courante (7j passés + 7j à venir)
const dansSemaine = dateStr => {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T12:00:00')
  const auj = new Date(); auj.setHours(0,0,0,0)
  const debut = new Date(auj); debut.setDate(auj.getDate() - 7)
  const fin   = new Date(auj); fin.setDate(auj.getDate() + 7)
  return d >= debut && d <= fin
}

export default function PageHistorique() {
  const [toutesLespreds, setToutesPreds] = useState([])
  const [stats, setStats]               = useState({})
  const [charg, setCharg]               = useState(true)
  const [erreur, setErreur]             = useState('')
  const [champsOuverts, setChampsOuverts] = useState({})
  const [selectionnes, setSelectionnes]   = useState(new Set())
  const [suppEnCours, setSuppEnCours]     = useState(false)
  const [suppConf, setSuppConf]           = useState(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setCharg(true); setErreur('')
    try {
      // Charger plusieurs pages pour couvrir la semaine
      const r1 = await obtenirHistorique(1)
      let preds = r1.predictions || []
      if ((r1.pages || 1) >= 2) {
        const r2 = await obtenirHistorique(2)
        preds = [...preds, ...(r2.predictions || [])]
      }
      setToutesPreds(preds)
      setStats(r1.stats || {})
    } catch(e) { setErreur(e.message || 'Erreur de chargement.') }
    setCharg(false)
  }

  // ── Sélection ────────────────────────────────────────────────
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
    if (nb === 0)          return 'vide'
    if (nb === ids.length) return 'coche'
    return 'partiel'
  }

  async function supprimer(id) {
    setSuppEnCours(true)
    try { await supprimerPrediction(id); setSuppConf(null); charger() }
    catch { setErreur('Erreur lors de la suppression.') }
    setSuppEnCours(false)
  }

  async function supprimerSelection(ids) {
    const liste = ids || [...selectionnes]
    if (!liste.length) return
    setSuppEnCours(true)
    try {
      await Promise.all(liste.map(id => supprimerPrediction(id)))
      setSelectionnes(prev => { const n = new Set(prev); liste.forEach(id => n.delete(id)); return n })
      charger()
    } catch { setErreur('Erreur lors de la suppression groupée.') }
    setSuppEnCours(false)
  }

  // Accordéon ouvert par défaut — clic ferme (false), re-clic rouvre
  const toggle = cle => setChampsOuverts(p => ({ ...p, [cle]: p[cle] === false ? true : false }))
  const ouvert = cle => champsOuverts[cle] !== false

  // Filtrer à la semaine + grouper par date → championnat
  const semaine = toutesLespreds.filter(p => dansSemaine(p.date))
  const parDate = semaine.reduce((acc, p) => {
    const d = p.date || 'Inconnue'
    if (!acc[d]) acc[d] = {}
    const c = p.competition || 'Autre'
    if (!acc[d][c]) acc[d][c] = []
    acc[d][c].push(p)
    return acc
  }, {})
  const dates = Object.keys(parDate).sort((a, b) => new Date(b) - new Date(a))

  // Stats de la semaine
  const nbTotal    = semaine.length
  const nbOk       = semaine.filter(p => p.score_reel && p.score_prevu === p.score_reel).length
  const nbNok      = semaine.filter(p => p.score_reel && p.score_prevu !== p.score_reel).length
  const nbAttente  = semaine.filter(p => !p.score_reel).length

  return (
    <div className="page-historique">

      {/* Stats de la semaine */}
      <div className="histo-stats">
        <div className="hs-carte"><span className="hs-val">{nbTotal}</span><span className="hs-lbl">Cette semaine</span></div>
        <div className="hs-carte vert"><span className="hs-val">{nbOk}</span><span className="hs-lbl">✓ Validés</span></div>
        <div className="hs-carte rouge"><span className="hs-val">{nbNok}</span><span className="hs-lbl">✗ Perdus</span></div>
        <div className="hs-carte gris"><span className="hs-val">{nbAttente}</span><span className="hs-lbl">En attente</span></div>
      </div>

      {charg && <p className="histo-charg">Chargement...</p>}
      {erreur && <p className="histo-erreur">{erreur}</p>}

      {!charg && semaine.length === 0 && !erreur && (
        <div className="histo-vide">Aucune prédiction cette semaine.</div>
      )}

      {/* Sections par date */}
      {dates.map(dateStr => {
        const parChamp = parDate[dateStr]
        const total    = Object.values(parChamp).reduce((s, l) => s + l.length, 0)
        return (
          <div key={dateStr} className="histo-date-section">
            <div className="histo-date-header">
              <span className="histo-date-label">{labelDate(dateStr)}</span>
              <span className="histo-date-raw">{dateStr}</span>
              <span className="histo-date-nb">{total} match{total > 1 ? 's' : ''}</span>
            </div>

            {Object.entries(parChamp).map(([champ, preds]) => {
              const cle  = `${dateStr}||${champ}`
              const est  = ouvert(cle)
              const nbOkC  = preds.filter(p => p.score_reel && p.score_prevu === p.score_reel).length
              const nbNokC = preds.filter(p => p.score_reel && p.score_prevu !== p.score_reel).length
              return (
                <div key={champ} className={`histo-champ-bloc ${est ? 'ouvert' : ''}`}>
                  <div className="histo-champ-header-wrap">
                    {/* Checkbox "sélectionner tout le championnat" */}
                    <Checkbox
                      etat={etatChamp(preds.map(p => p.id))}
                      onChange={() => selectTout(preds.map(p => p.id))}
                    />
                    <button className="histo-champ-header" onClick={() => toggle(cle)}>
                      <span className="histo-champ-ico">⚽</span>
                      <span className="histo-champ-nom">{champ}</span>
                      <span className="histo-champ-nb">{preds.length}</span>
                      {nbOkC  > 0 && <span className="histo-badge-mini vert">✓{nbOkC}</span>}
                      {nbNokC > 0 && <span className="histo-badge-mini rouge">✗{nbNokC}</span>}
                      <span className="histo-chevron" style={{ transform: est ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="6 9 12 15 18 9"/></svg>
                      </span>
                    </button>
                    {/* Bouton supprimer — visible uniquement si des matchs de ce championnat sont sélectionnés */}
                    {preds.some(p => selectionnes.has(p.id)) && (
                      <button
                        className="histo-btn-suppr-champ"
                        disabled={suppEnCours}
                        onClick={() => supprimerSelection(preds.map(p => p.id).filter(id => selectionnes.has(id)))}
                      >
                        <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                          <polyline points="2 4 4 4 14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13 4l-1 9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 13L3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M6 4V3h4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {suppEnCours ? '...' : `Supprimer (${preds.filter(p => selectionnes.has(p.id)).length})`}
                      </button>
                    )}
                  </div>

                  {est && preds.map(pred => {
                    const aScore  = !!pred.score_reel
                    const correct = aScore && pred.score_prevu === pred.score_reel
                    const sel     = selectionnes.has(pred.id)
                    return (
                      <div key={pred.id} className={`histo-pred-ligne ${correct ? 'correct' : aScore ? 'incorrect' : ''} ${sel ? 'selectionnee' : ''}`}
                        onClick={() => toggleSelect(pred.id)} style={{ cursor: 'pointer' }}>
                        <Checkbox etat={sel ? 'coche' : 'vide'} onChange={() => toggleSelect(pred.id)} />
                        <div className="histo-pred-match">
                          <span className="histo-pred-dom">{pred.domicile}</span>
                          <span className="histo-pred-vs">vs</span>
                          <span className="histo-pred-ext">{pred.exterieur}</span>
                          {pred.heure && <span className="histo-pred-heure">{pred.heure}</span>}
                        </div>
                        <div className="histo-pred-scores">
                          <span className="histo-sc-lbl">Prédit</span>
                          <span className="histo-sc-val predit">{pred.score_prevu || '—'}</span>
                          {aScore && <>
                            <span className="histo-sc-sep">→</span>
                            <span className="histo-sc-lbl">Réel</span>
                            <span className={`histo-sc-val ${correct ? 'correct' : 'incorrect'}`}>{pred.score_reel}</span>
                          </>}
                          <span className={`histo-statut ${!aScore ? 'attente' : correct ? 'correct' : 'incorrect'}`}>
                            {!aScore ? 'Attente' : correct ? '✓ Validé' : '✗ Perdu'}
                          </span>
                        </div>
                        {pred.combinaisons?.length > 0 && (
                          <div className="histo-combis">
                            {pred.combinaisons.map((c, j) => {
                              const etat = evaluerCombi(c.label, pred.score_reel)
                              return (
                                <span key={j} className={`hc-tag ${classeCombi(etat)}`}>
                                  {c.label}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
