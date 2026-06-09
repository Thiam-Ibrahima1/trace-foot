// ============================================================
// PageIntelligence.jsx — Apprentissage automatique depuis les tracés confirmés
//
// Analyse les prédictions confirmées pour dégager :
//   1. Taux de réussite par combinaison (V1, 1X, +2.5, etc.)
//   2. Fiabilité des maisons (Souleymane, Imsa, Noukh…) par zone/position
//   3. Analyse par période (M1-M4, M5-M8, M9-M16) selon les règles tracé
//   4. Corrélations : quels signaux prédisent quoi
// ============================================================
import { useState, useEffect } from 'react'
import { obtenirDonneesIntelligence } from '../../../adapters/api/ServiceApi.js'
import { evaluerCombi }      from '../utils/evaluerCombi.js'
import './PageIntelligence.css'

// ── Mapping positions → périodes (règles du tracé) ───────────
const PERIODES_DEF = [
  { id: 'p1_dom', label: '1ʳᵉ Mi-temps DOM', positions: [1,2,3,4],        equipe: 'domicile',  couleur: '#2563eb' },
  { id: 'p1_ext', label: '1ʳᵉ Mi-temps EXT', positions: [5,6,7,8],        equipe: 'exterieur', couleur: '#ea580c' },
  { id: 'p2_dom', label: '2ᵉ Mi-temps DOM',  positions: [9,10,13,15,16],  equipe: 'domicile',  couleur: '#1d4ed8' },
  { id: 'p2_ext', label: '2ᵉ Mi-temps EXT',  positions: [11,12,14],       equipe: 'exterieur', couleur: '#c2410c' },
]

const COMBINAISONS_LABELS = ['V1','V2','1X','2X','+2,5','-2,5','2EM','+1,5','+3,5','-3,5']

const MAISONS_ORDRE = ['Souleymane','Noukh','Imsa','Youssou','Adama','Idriss','Makhdiyou','Ibrahima']

const COULEUR_MAISON = {
  Souleymane: '#1b5e20', Noukh: '#64748b', Imsa: '#5b21b6',
  Youssou: '#b45309',   Adama: '#0369a1', Idriss: '#0f766e',
  Makhdiyou: '#9d174d', Ibrahima: '#6d28d9',
}

// ── Analyse d'une prédiction confirmée ───────────────────────
function analyserPred(pred) {
  const sr = pred.score_reel
  if (!sr || !pred.maisons_placees?.length) return null

  const parts = sr.split('-').map(Number)
  if (parts.length !== 2 || parts.some(isNaN)) return null
  const [dom, ext] = parts
  const total      = dom + ext

  const maisons = pred.maisons_placees || []
  const combis  = (pred.combinaisons  || []).map(c =>
    typeof c === 'string' ? c : (c?.label || '')
  ).filter(Boolean)

  return { sr, dom, ext, total, maisons, combis, score_prevu: pred.score_prevu }
}

// ── Calculer le taux de réussite (évite la division par 0) ───
const taux = (ok, total) => total === 0 ? null : Math.round(ok / total * 100)
const barre = pct => Math.max(2, Math.min(100, pct ?? 0))

export default function PageIntelligence() {
  const [preds, setPreds]   = useState([])
  const [charg, setCharg]   = useState(true)
  const [onglet, setOnglet] = useState('combis') // 'combis' | 'maisons' | 'periodes' | 'signaux'

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    setCharg(true)
    try {
      const r      = await obtenirDonneesIntelligence()
      const toutes = r.predictions || []
      // Garder uniquement les confirmés avec score réel et maisons placées
      const filtrees = toutes.filter(p =>
        p.score_reel &&
        p.maisons_placees?.length > 0 &&
        (p.trace_status === 'valide' || p.score_confirme === true || p.verification?.concordance === true)
      )
      // Dédoublonner par match_id (au cas où)
      const vus = new Set()
      const uniques = filtrees.filter(p => {
        if (vus.has(p.match_id)) return false
        vus.add(p.match_id); return true
      })
      setPreds(uniques)
    } catch {}
    setCharg(false)
  }

  // ── Statistiques par combinaison ─────────────────────────────
  const statsCombi = COMBINAISONS_LABELS.map(label => {
    let proposees = 0, gagnees = 0, perdues = 0
    preds.forEach(pred => {
      const a = analyserPred(pred)
      if (!a) return
      if (a.combis.includes(label)) {
        proposees++
        const etat = evaluerCombi(label, a.sr)
        if (etat === 'ok')  gagnees++
        if (etat === 'nok') perdues++
      }
    })
    return { label, proposees, gagnees, perdues, taux: taux(gagnees, proposees) }
  }).filter(s => s.proposees > 0).sort((a,b) => (b.taux ?? 0) - (a.taux ?? 0))

  // ── Statistiques par maison ───────────────────────────────────
  const statsMaison = MAISONS_ORDRE.map(nom => {
    let appDom = 0, appExt = 0, signaux = []
    preds.forEach(pred => {
      const a = analyserPred(pred)
      if (!a) return
      a.maisons.filter(m => m.maison?.nom === nom).forEach(m => {
        if (m.zone === 'domicile') appDom++
        else appExt++
        // Signal réalisé ?
        if (nom === 'Souleymane') {
          // Souleymane DOM → EXT marque
          if (m.zone === 'domicile' && a.ext > 0) signaux.push('ok')
          else if (m.zone === 'domicile' && a.ext === 0) signaux.push('nok')
          else if (m.zone === 'exterieur' && a.dom > 0) signaux.push('ok')
          else signaux.push('nok')
        }
        if (nom === 'Imsa') {
          // Imsa → au moins 1 but dans la zone concernée
          if (m.zone === 'domicile' && a.dom > 0) signaux.push('ok')
          else if (m.zone === 'domicile') signaux.push('nok')
          else if (m.zone === 'exterieur' && a.ext > 0) signaux.push('ok')
          else signaux.push('nok')
        }
      })
    })
    const total = appDom + appExt
    const ok    = signaux.filter(s => s === 'ok').length
    return {
      nom, total, appDom, appExt,
      tauxSignal: nom === 'Souleymane' || nom === 'Imsa' ? taux(ok, signaux.length) : null,
    }
  }).filter(s => s.total > 0).sort((a,b) => b.total - a.total)

  // ── Statistiques par période ──────────────────────────────────
  const statsPeriode = PERIODES_DEF.map(per => {
    const maisonsCount = {}
    let totalMatchs = 0
    preds.forEach(pred => {
      const a = analyserPred(pred)
      if (!a) return
      const ms = a.maisons.filter(m => per.positions.includes(m.position))
      if (!ms.length) return
      totalMatchs++
      ms.forEach(m => {
        const nom = m.maison?.nom || 'Inconnu'
        maisonsCount[nom] = (maisonsCount[nom] || 0) + 1
      })
    })
    const top = Object.entries(maisonsCount)
      .sort((a,b) => b[1] - a[1]).slice(0,4)
    return { ...per, totalMatchs, top }
  })

  // ── Signaux fiables (corrélations) ───────────────────────────
  // Quels signaux du tracé prédisent le mieux l'issue ?
  const signaux = [
    {
      titre: 'Souleymane = but encaissé',
      desc:  'Quand Souleymane est en zone DOM → l\'équipe EXT marque',
      calcul: () => {
        let ok = 0, total = 0
        preds.forEach(pred => {
          const a = analyserPred(pred)
          if (!a) return
          const sols = a.maisons.filter(m => m.maison?.nom === 'Souleymane')
          if (!sols.length) return
          // Chaque Souleymane DOM prédit EXT +1
          const predExt = sols.filter(s => s.zone === 'domicile').length
          if (predExt > 0) {
            total++
            if (a.ext >= predExt) ok++
          }
        })
        return taux(ok, total)
      }
    },
    {
      titre: 'Score exact prédit correct',
      desc:  'Tracé 1 score_prevu === score réel',
      calcul: () => {
        const avecScore = preds.filter(p => p.score_reel && p.score_prevu)
        const ok = avecScore.filter(p => p.score_prevu === p.score_reel).length
        return taux(ok, avecScore.length)
      }
    },
    {
      titre: 'Match à buts (2+)',
      desc:  'Quand +2 Souleymane → total buts ≥ 2',
      calcul: () => {
        let ok = 0, total = 0
        preds.forEach(pred => {
          const a = analyserPred(pred)
          if (!a) return
          const nb = a.maisons.filter(m => m.maison?.nom === 'Souleymane').length
          if (nb >= 2) { total++; if (a.total >= 2) ok++ }
        })
        return taux(ok, total)
      }
    },
    {
      titre: 'Imsa = jubilé réalisé',
      desc:  'Quand Imsa présent → l\'équipe de sa zone marque',
      calcul: () => {
        let ok = 0, total = 0
        preds.forEach(pred => {
          const a = analyserPred(pred)
          if (!a) return
          a.maisons.filter(m => m.maison?.nom === 'Imsa').forEach(m => {
            total++
            if (m.zone === 'domicile' && a.dom > 0) ok++
            if (m.zone === 'exterieur' && a.ext > 0) ok++
          })
        })
        return taux(ok, total)
      }
    },
    {
      titre: 'Combinaison V1 réussie',
      desc:  'Quand V1 proposé → domicile gagne effectivement',
      calcul: () => {
        let ok = 0, total = 0
        preds.forEach(pred => {
          const a = analyserPred(pred)
          if (!a) return
          const combis = a.combis
          if (combis.includes('V1')) {
            total++
            if (evaluerCombi('V1', a.sr) === 'ok') ok++
          }
        })
        return taux(ok, total)
      }
    },
    {
      titre: 'Double chance 1X fiable',
      desc:  'Quand 1X proposé → DOM ne perd pas',
      calcul: () => {
        let ok = 0, total = 0
        preds.forEach(pred => {
          const a = analyserPred(pred)
          if (!a) return
          if (a.combis.includes('1X')) {
            total++
            if (evaluerCombi('1X', a.sr) === 'ok') ok++
          }
        })
        return taux(ok, total)
      }
    },
  ].map(s => ({ ...s, pct: s.calcul() })).filter(s => s.pct !== null)

  const totalAnalyses = preds.length

  if (charg) return (
    <div className="intel-page">
      <div className="intel-skel-hero" />
      <div className="intel-skel-onglets" />
      <div className="intel-skel-body">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="intel-skel-ligne">
            <div className="intel-skel-label" style={{ width: `${45 + i * 8}%` }} />
            <div className="intel-skel-barre" style={{ width: `${20 + i * 12}%` }} />
            <div className="intel-skel-pct" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="intel-page">

      {/* ── En-tête ── */}
      <div className="intel-hero">
        <div className="intel-hero-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:28,height:28}}>
            <path d="M12 2a6 6 0 0 1 6 6c0 2-.8 3.8-2 5l-1 1v2H9v-2l-1-1a7 7 0 0 1-2-5 6 6 0 0 1 6-6z"/>
            <line x1="9" y1="21" x2="15" y2="21"/><line x1="10" y1="17" x2="14" y2="17"/>
          </svg>
        </div>
        <div className="intel-hero-texte">
          <h2 className="intel-titre">Intelligence Tracé FC</h2>
          <p className="intel-sous">
            Apprentissage sur <strong>{totalAnalyses}</strong> tracé{totalAnalyses !== 1 ? 's' : ''} confirmé{totalAnalyses !== 1 ? 's' : ''} avec score réel
          </p>
        </div>
      </div>

      {totalAnalyses === 0 && (
        <div className="intel-vide">
          <p>Aucune donnée disponible.</p>
          <small>Confirmez des tracés et renseignez les scores réels pour alimenter l'intelligence.</small>
        </div>
      )}

      {totalAnalyses > 0 && (
        <>
          {/* ── Onglets ── */}
          <div className="intel-onglets">
            {[
              { id:'combis',   label:'Combinaisons' },
              { id:'maisons',  label:'Maisons'      },
              { id:'periodes', label:'Périodes'      },
              { id:'signaux',  label:'Signaux clés'  },
            ].map(o => (
              <button key={o.id}
                className={`intel-onglet ${onglet === o.id ? 'actif' : ''}`}
                onClick={() => setOnglet(o.id)}>
                {o.label}
              </button>
            ))}
          </div>

          {/* ══ COMBINAISONS ══════════════════════════════════════ */}
          {onglet === 'combis' && (
            <div className="intel-section">
              <p className="intel-section-desc">
                Taux de réussite de chaque combinaison sur l'ensemble des tracés confirmés.
              </p>
              <div className="intel-combis-liste">
                {statsCombi.map((s,i) => (
                  <div key={s.label} className="intel-combi-row">
                    <span className="intel-combi-rang">#{i+1}</span>
                    <span className="intel-combi-label">{s.label}</span>
                    <div className="intel-barre-wrap">
                      <div className="intel-barre"
                        style={{ width: barre(s.taux) + '%',
                          background: s.taux >= 70 ? '#16a34a' : s.taux >= 50 ? '#d97706' : '#dc2626' }}/>
                    </div>
                    <span className={`intel-combi-pct ${s.taux >= 70 ? 'vert' : s.taux >= 50 ? 'orange' : 'rouge'}`}>
                      {s.taux}%
                    </span>
                    <span className="intel-combi-detail">{s.gagnees}✓ / {s.perdues}✗ / {s.proposees} proposées</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ MAISONS ═══════════════════════════════════════════ */}
          {onglet === 'maisons' && (
            <div className="intel-section">
              <p className="intel-section-desc">
                Fréquence d'apparition de chaque maison dans les tracés confirmés et fiabilité de ses signaux.
              </p>
              <div className="intel-maisons-liste">
                {statsMaison.map(s => (
                  <div key={s.nom} className="intel-maison-row">
                    <div className="intel-maison-puce"
                      style={{ background: COULEUR_MAISON[s.nom] || '#1e293b' }}>
                      {s.nom.charAt(0)}
                    </div>
                    <div className="intel-maison-info">
                      <span className="intel-maison-nom">{s.nom}</span>
                      <div className="intel-maison-zones">
                        <span className="intel-zone dom">🏠 DOM ×{s.appDom}</span>
                        <span className="intel-zone ext">✈️ EXT ×{s.appExt}</span>
                        <span className="intel-zone total">Total : {s.total}</span>
                      </div>
                    </div>
                    {s.tauxSignal !== null && (
                      <div className="intel-maison-signal">
                        <span className="intel-signal-lbl">Signal</span>
                        <span className={`intel-signal-val ${s.tauxSignal >= 70 ? 'vert' : s.tauxSignal >= 50 ? 'orange' : 'rouge'}`}>
                          {s.tauxSignal}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PÉRIODES ══════════════════════════════════════════ */}
          {onglet === 'periodes' && (
            <div className="intel-section">
              <p className="intel-section-desc">
                Maisons les plus fréquentes par période selon la grille 4×4 (M1-M16).
              </p>
              <div className="intel-periodes">
                {statsPeriode.map(per => (
                  <div key={per.id} className="intel-periode-card">
                    <div className="intel-periode-header"
                      style={{ borderLeft: `4px solid ${per.couleur}` }}>
                      <span className="intel-periode-label">{per.label}</span>
                      <span className="intel-periode-pos">
                        M{per.positions.join(' · M')}
                      </span>
                      <span className="intel-periode-nb">{per.totalMatchs} tracés</span>
                    </div>
                    {per.top.length > 0 ? (
                      <div className="intel-periode-top">
                        {per.top.map(([nom, count]) => (
                          <div key={nom} className="intel-periode-item">
                            <span className="intel-pi-puce"
                              style={{ background: COULEUR_MAISON[nom] || '#1e293b' }}>
                              {nom.charAt(0)}
                            </span>
                            <span className="intel-pi-nom">{nom}</span>
                            <span className="intel-pi-count">×{count}</span>
                            <div className="intel-pi-barre-wrap">
                              <div className="intel-pi-barre"
                                style={{ width: barre(taux(count, per.totalMatchs)) + '%',
                                  background: COULEUR_MAISON[nom] || '#1e293b' }}/>
                            </div>
                            <span className="intel-pi-pct">{taux(count, per.totalMatchs)}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="intel-periode-vide">Aucune maison dans cette période</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ SIGNAUX CLÉS ══════════════════════════════════════ */}
          {onglet === 'signaux' && (
            <div className="intel-section">
              <p className="intel-section-desc">
                Corrélations entre les signaux du tracé et les résultats réels.
                Ces données s'améliorent à chaque nouveau match confirmé.
              </p>
              <div className="intel-signaux">
                {signaux.sort((a,b) => b.pct - a.pct).map((s,i) => (
                  <div key={i} className="intel-signal-card">
                    <div className="intel-signal-top">
                      <span className="intel-signal-titre">{s.titre}</span>
                      <span className={`intel-signal-pct-badge ${s.pct >= 70 ? 'vert' : s.pct >= 50 ? 'orange' : 'rouge'}`}>
                        {s.pct}%
                      </span>
                    </div>
                    <p className="intel-signal-desc">{s.desc}</p>
                    <div className="intel-barre-wrap" style={{marginTop:6}}>
                      <div className="intel-barre"
                        style={{ width: barre(s.pct) + '%',
                          background: s.pct >= 70 ? '#16a34a' : s.pct >= 50 ? '#d97706' : '#dc2626',
                          height: 8, borderRadius: 4 }}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note d'apprentissage */}
              <div className="intel-note-apprentissage">
                <span>📚</span>
                <div>
                  <strong>Comment améliorer l'intelligence ?</strong>
                  <p>
                    Confirmez les tracés via "Confirmation Score Combinaison" et renseignez les scores réels
                    après chaque match. Plus le nombre de tracés analysés augmente, plus les statistiques
                    deviennent fiables pour orienter les futurs tracés.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
