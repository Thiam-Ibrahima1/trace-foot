// PageStats.jsx — Statistiques admin avec graphiques SVG
import { useState, useEffect, useCallback } from 'react'
import { obtenirStatistiques, obtenirStatsDetail } from '../../../adapters/api/ServiceApi.js'
import './PageStats.css'

// ── Couleurs par combinaison ───────────────────────────────────
const COULEURS = {
  'V1':   { fill: '#16a34a', light: '#dcfce7', dark: '#14532d' },
  'V2':   { fill: '#1d4ed8', light: '#dbeafe', dark: '#1e3a8a' },
  '1X':   { fill: '#0891b2', light: '#cffafe', dark: '#164e63' },
  '2X':   { fill: '#7c3aed', light: '#ede9fe', dark: '#4c1d95' },
  '+2,5': { fill: '#dc2626', light: '#fee2e2', dark: '#7f1d1d' },
  '-2,5': { fill: '#475569', light: '#e2e8f0', dark: '#1e293b' },
  '2EM':  { fill: '#d97706', light: '#fef3c7', dark: '#78350f' },
  '+1,5': { fill: '#db2777', light: '#fce7f3', dark: '#831843' },
  '-3,5': { fill: '#64748b', light: '#f1f5f9', dark: '#334155' },
  '+3,5': { fill: '#ea580c', light: '#ffedd5', dark: '#7c2d12' },
}
const getCouleur = label => COULEURS[label] || { fill: '#64748b', light: '#f1f5f9', dark: '#334155' }

// ── Tooltip global ─────────────────────────────────────────────
function Tooltip({ tooltip }) {
  if (!tooltip) return null
  return (
    <div style={{
      position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 14,
      background: '#0f172a', color: '#fff',
      padding: '10px 14px', borderRadius: 10,
      fontSize: '.75rem', zIndex: 9999, pointerEvents: 'none',
      boxShadow: '0 8px 30px rgba(0,0,0,.4)',
      border: '1px solid rgba(255,255,255,.1)',
      lineHeight: 1.6, minWidth: 130,
    }}>
      {tooltip.content}
    </div>
  )
}

// ── Diagramme en barres verticales (combinaisons) ─────────────
function BarChartCombi({ data, onTooltip }) {
  if (!data?.length) return <div className="st-vide">Données insuffisantes</div>

  const PAD_L = 36, PAD_R = 10, PAD_T = 16, PAD_B = 40
  const W = 520, H = 220
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const barW   = Math.floor(innerW / data.length) - 6
  const maxVal = 100

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="st-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grille horizontale */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = PAD_T + innerH - (v / maxVal) * innerH
        return (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
              stroke={v === 0 ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={v === 0 ? 1.5 : 1}
              strokeDasharray={v > 0 ? '4,4' : ''} />
            <text x={PAD_L - 5} y={y + 4} fill="#94a3b8" fontSize={8} textAnchor="end">{v}%</text>
          </g>
        )
      })}

      {/* Barres */}
      {data.map((d, i) => {
        const col    = getCouleur(d.label)
        const x      = PAD_L + i * (innerW / data.length) + (innerW / data.length - barW) / 2
        const barH   = Math.max(2, (d.taux / maxVal) * innerH)
        const y      = PAD_T + innerH - barH

        return (
          <g key={i}
            onMouseMove={e => onTooltip({
              x: e.clientX, y: e.clientY,
              content: (
                <div>
                  <div style={{fontWeight:800,fontSize:'.82rem',color:col.fill,marginBottom:4}}>{d.label}</div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Total : <span style={{color:'#fff',fontWeight:700}}>{d.total}</span></div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Corrects : <span style={{color:'#4ade80',fontWeight:700}}>{d.corrects}</span></div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem',marginTop:2}}>Taux : <span style={{color:col.fill,fontWeight:800,fontSize:'.82rem'}}>{d.taux}%</span></div>
                </div>
              )
            })}
            onMouseLeave={() => onTooltip(null)}
            style={{ cursor: 'pointer' }}>
            {/* Fond barre */}
            <rect x={x} y={PAD_T} width={barW} height={innerH} fill={col.light} rx={4} opacity={.4} />
            {/* Barre remplie */}
            <rect x={x} y={y} width={barW} height={barH} fill={col.fill} rx={4} />
            {/* Valeur au-dessus */}
            {d.taux > 8 && (
              <text x={x + barW / 2} y={y - 4} fill={col.dark} fontSize={8} textAnchor="middle" fontWeight={800}>
                {d.taux}%
              </text>
            )}
            {/* Label en-dessous */}
            <text x={x + barW / 2} y={H - PAD_B + 14} fill="#475569" fontSize={8.5} textAnchor="middle" fontWeight={700}>
              {d.label}
            </text>
            <text x={x + barW / 2} y={H - PAD_B + 24} fill="#94a3b8" fontSize={7} textAnchor="middle">
              {d.total}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Donut chart ────────────────────────────────────────────────
function DonutChart({ valeur, label, total, corrects, couleur, taille = 130 }) {
  const r   = 46, cx = 60, cy = 60
  const circ = 2 * Math.PI * r
  const arc  = circ * Math.min(valeur, 100) / 100
  const bg   = '#e2e8f0'

  return (
    <div className="st-donut-wrap">
      <svg viewBox="0 0 120 120" width={taille} height={taille}>
        {/* Fond */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg} strokeWidth={14} />
        {/* Arc coloré */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={couleur} strokeWidth={14}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        {/* Chiffre central */}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#0f172a" fontSize={18} fontWeight={900}>{valeur}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={7.5}>{label}</text>
      </svg>
      {(total !== undefined) && (
        <div className="st-donut-meta">
          <span className="st-donut-ok">{corrects} corrects</span>
          <span className="st-donut-tot">sur {total}</span>
        </div>
      )}
    </div>
  )
}

// ── Barres horizontales (championnats) ─────────────────────────
function BarnesChampionnats({ data, onTooltip }) {
  if (!data?.length) return <div className="st-vide">Données insuffisantes</div>
  const max = Math.max(...data.map(d => d.taux), 1)
  return (
    <div className="st-champ-liste">
      {data.map((c, i) => {
        const col = c.taux >= 60 ? '#16a34a' : c.taux >= 40 ? '#d97706' : '#dc2626'
        const bg  = c.taux >= 60 ? '#f0fdf4' : c.taux >= 40 ? '#fef9c3' : '#fff1f2'
        const pct = max > 0 ? (c.taux / max) * 100 : 0
        return (
          <div key={i} className="st-champ-row"
            onMouseMove={e => onTooltip({
              x: e.clientX, y: e.clientY,
              content: (
                <div>
                  <div style={{fontWeight:800,fontSize:'.8rem',marginBottom:4}}>{c.competition}</div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Total matchs : <b style={{color:'#fff'}}>{c.total}</b></div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Corrects : <b style={{color:'#4ade80'}}>{c.corrects}</b></div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Taux réussite : <b style={{color:col,fontSize:'.82rem'}}>{c.taux}%</b></div>
                </div>
              )
            })}
            onMouseLeave={() => onTooltip(null)}>
            <span className="st-champ-nom">{c.competition}</span>
            <div className="st-champ-barre-fond">
              <div className="st-champ-barre-fill" style={{ width: `${pct}%`, background: col, transition: 'width .5s ease' }} />
            </div>
            <span className="st-champ-pct" style={{ color: col }}>{c.taux}%</span>
            <span className="st-champ-detail">{c.corrects}/{c.total}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Graphique d'évolution (barres + ligne) ────────────────────
function EvolutionChart({ data, onTooltip }) {
  if (!data?.length) return <div className="st-vide">Pas encore de données pour cette période</div>

  const PAD_L = 36, PAD_R = 10, PAD_T = 16, PAD_B = 36
  const W = 560, H = 180
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const n      = data.length
  const step   = n > 1 ? innerW / (n - 1) : innerW
  const barW   = Math.max(4, Math.floor(innerW / n) - 4)
  const maxT   = Math.max(...data.map(d => d.taux), 1)

  const points = data.map((d, i) => {
    const x = PAD_L + i * (n > 1 ? innerW / (n - 1) : 0)
    const y = PAD_T + innerH - (d.taux / 100) * innerH
    return { x, y, ...d }
  })
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="st-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grille */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = PAD_T + innerH - (v / 100) * innerH
        return (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
              stroke={v === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={v === 0 ? 1.5 : 1}
              strokeDasharray={v > 0 ? '4,4' : ''} />
            <text x={PAD_L - 5} y={y + 4} fill="#94a3b8" fontSize={8} textAnchor="end">{v}%</text>
          </g>
        )
      })}

      {/* Barres */}
      {points.map((p, i) => {
        const col = p.taux >= 60 ? '#16a34a' : p.taux >= 40 ? '#d97706' : '#dc2626'
        const bx  = p.x - barW / 2
        const bH  = Math.max(2, (p.taux / 100) * innerH)
        const by  = PAD_T + innerH - bH
        return (
          <g key={i}
            onMouseMove={e => onTooltip({
              x: e.clientX, y: e.clientY,
              content: (
                <div>
                  <div style={{fontWeight:800,fontSize:'.78rem',marginBottom:3}}>{p.date}</div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Matchs : <b style={{color:'#fff'}}>{p.total}</b></div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Corrects : <b style={{color:'#4ade80'}}>{p.corrects}</b></div>
                  <div style={{color:'#94a3b8',fontSize:'.7rem'}}>Taux : <b style={{color:col,fontSize:'.82rem'}}>{p.taux}%</b></div>
                </div>
              )
            })}
            onMouseLeave={() => onTooltip(null)}
            style={{ cursor: 'pointer' }}>
            <rect x={bx} y={by} width={barW} height={bH} fill={col} rx={3} opacity={.75} />
          </g>
        )
      })}

      {/* Ligne de tendance */}
      {points.length > 1 && (
        <polyline points={polyline} fill="none" stroke="#1d4ed8" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" opacity={.8} />
      )}

      {/* Points sur la ligne */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#1d4ed8" stroke="#fff" strokeWidth={1.5} />
      ))}

      {/* Labels date en bas */}
      {points.map((p, i) => {
        if (n > 20 && i % 5 !== 0) return null
        return (
          <text key={i} x={p.x} y={H - PAD_B + 14} fill="#94a3b8" fontSize={7}
            textAnchor="middle" transform={n > 10 ? `rotate(-35,${p.x},${H - PAD_B + 14})` : ''}>
            {(p.date || '').slice(5)}
          </text>
        )
      })}
    </svg>
  )
}

// ── Composant principal ────────────────────────────────────────
export default function PageStats() {
  const [stats,   setStats]   = useState(null)
  const [detail,  setDetail]  = useState(null)
  const [charg,   setCharg]   = useState(true)
  const [periode, setPeriode] = useState('30')
  const [tooltip, setTooltip] = useState(null)

  const charger = useCallback(async () => {
    setCharg(true)
    const dateDebut = new Date()
    dateDebut.setDate(dateDebut.getDate() - parseInt(periode))
    const dateFin = new Date()
    const d1 = dateDebut.toISOString().split('T')[0]
    const d2 = dateFin.toISOString().split('T')[0]

    // Phase 1 — stats globales (cache 5min, rapide)
    try {
      const s = await obtenirStatistiques()
      setStats(s)
    } catch {}
    setCharg(false) // afficher la page dès que les KPI sont là

    // Phase 2 — détail période en arrière-plan (cache 5min côté backend)
    obtenirStatsDetail(d1, d2)
      .then(d => { if (d) setDetail(d) })
      .catch(() => {})
  }, [periode])

  useEffect(() => { charger() }, [charger])

  if (charg) return (
    <div className="page-stats">
      <div className="st-skel-top" />
      <div className="st-skel-kpis">
        {[1, 2, 3, 4].map(i => <div key={i} className="st-skel-kpi" />)}
      </div>
      <div className="st-skel-graph" />
      <div className="st-skel-graph st-skel-graph--sm" />
    </div>
  )

  const g      = stats?.global || {}
  const combis = stats?.meilleures_combinaisons || []
  const evo    = detail?.evolution || stats?.evolution_7j || []
  const champs = detail?.par_championnat || stats?.par_championnat || []

  const KPI = [
    { val: `${g.taux_general || 0}%`,      lbl: 'Taux général',      sous: `${g.corrects||0} corrects / ${g.predictions_total||0}`,         couleur: '#1d4ed8', bg: '#eff6ff' },
    { val: `${g.taux_vip || 0}%`,          lbl: 'Taux VIP',          sous: `${g.vip_corrects||0} exacts / ${g.vip_total||0}`,                couleur: '#d97706', bg: '#fffbeb' },
    { val: g.ca_formate || '0 FCFA',       lbl: 'Chiffre d\'affaires',sous: `${g.utilisateurs||0} utilisateur${g.utilisateurs>1?'s':''}`,    couleur: '#16a34a', bg: '#f0fdf4' },
    { val: g.total_matchs_generes || 0,    lbl: 'Matchs générés',    sous: `${g.predictions_total||0} avec résultat`,                        couleur: '#7c3aed', bg: '#f5f3ff' },
  ]

  return (
    <div className="page-stats" onMouseLeave={() => setTooltip(null)}>
      <Tooltip tooltip={tooltip} />

      {/* ── En-tête ── */}
      <div className="st-top">
        <div>
          <h2 className="st-titre">Statistiques</h2>
          <p className="st-sous">Performance et analyse des prédictions</p>
        </div>
        <div className="st-periode">
          {[['7','7 jours'],['14','14 jours'],['30','30 jours'],['90','90 jours']].map(([v,l]) => (
            <button key={v} className={`st-per-btn ${periode===v?'actif':''}`} onClick={() => setPeriode(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="st-kpi-grille">
        {KPI.map((k, i) => (
          <div key={i} className="st-kpi" style={{ background: k.bg, borderLeft: `4px solid ${k.couleur}` }}>
            <div className="st-kpi-val" style={{ color: k.couleur }}>{k.val}</div>
            <div className="st-kpi-lbl">{k.lbl}</div>
            <div className="st-kpi-sous">{k.sous}</div>
          </div>
        ))}
      </div>

      {/* ── Combinaisons (barres) + Donuts ── */}
      <div className="st-row-haut">

        {/* Diagramme barres combinaisons */}
        <div className="st-card st-card-large">
          <div className="st-card-header">
            <div>
              <div className="st-card-titre">Combinaisons</div>
              <div className="st-card-sous">Taux de réussite par type de pari</div>
            </div>
            <span className="st-card-badge">{combis.length} combinaisons</span>
          </div>
          {combis.length === 0
            ? <div className="st-vide">Pas encore de données disponibles</div>
            : (
              <div className="st-chart-wrap">
                <BarChartCombi data={combis} onTooltip={setTooltip} />
                <div className="st-legende-combi">
                  {combis.map((c, i) => (
                    <span key={i} className="st-leg-item">
                      <span className="st-leg-dot" style={{ background: getCouleur(c.label).fill }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          }
        </div>

        {/* Donuts taux */}
        <div className="st-card st-card-donuts">
          <div className="st-card-header">
            <div>
              <div className="st-card-titre">Taux de réussite</div>
              <div className="st-card-sous">Vue globale</div>
            </div>
          </div>
          <div className="st-donuts-grille">
            <DonutChart
              valeur={g.taux_general || 0}
              label="Global"
              total={g.predictions_total}
              corrects={g.corrects}
              couleur="#1d4ed8"
            />
            <DonutChart
              valeur={g.taux_vip || 0}
              label="VIP"
              total={g.vip_total}
              corrects={g.vip_corrects}
              couleur="#d97706"
            />
            <DonutChart
              valeur={g.taux_confirmes || 0}
              label="Certifiés"
              total={g.confirmes}
              corrects={g.confirmes_corrects}
              couleur="#16a34a"
            />
          </div>
          {/* Légende */}
          <div className="st-donut-legende">
            <div className="st-dl-item">
              <span style={{width:10,height:10,borderRadius:'50%',background:'#1d4ed8',flexShrink:0}} />
              <span>Global — tous les matchs</span>
            </div>
            <div className="st-dl-item">
              <span style={{width:10,height:10,borderRadius:'50%',background:'#d97706',flexShrink:0}} />
              <span>VIP — scores exacts</span>
            </div>
            <div className="st-dl-item">
              <span style={{width:10,height:10,borderRadius:'50%',background:'#16a34a',flexShrink:0}} />
              <span>Certifiés par admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Évolution + Championnats ── */}
      <div className="st-row-bas">

        {/* Évolution temporelle */}
        <div className="st-card st-card-evo">
          <div className="st-card-header">
            <div>
              <div className="st-card-titre">Évolution sur {periode} jours</div>
              <div className="st-card-sous">Taux journalier — barres + tendance</div>
            </div>
            {evo.length > 0 && (
              <div className="st-evo-resume">
                <span className="st-evo-moy">
                  Moy. {Math.round(evo.reduce((s,d)=>s+(d.taux||0),0)/evo.length)}%
                </span>
              </div>
            )}
          </div>
          <div className="st-chart-wrap">
            <EvolutionChart data={evo} onTooltip={setTooltip} />
          </div>
          <div className="st-evo-legende">
            <span className="st-leg-item"><span className="st-leg-dot" style={{background:'#16a34a'}} />≥ 60%</span>
            <span className="st-leg-item"><span className="st-leg-dot" style={{background:'#d97706'}} />40–60%</span>
            <span className="st-leg-item"><span className="st-leg-dot" style={{background:'#dc2626'}} />{'<'} 40%</span>
            <span className="st-leg-item"><span className="st-leg-line" style={{background:'#1d4ed8'}} />Tendance</span>
          </div>
        </div>

        {/* Par championnat */}
        {champs.length > 0 && (
          <div className="st-card st-card-champ">
            <div className="st-card-header">
              <div>
                <div className="st-card-titre">Par championnat</div>
                <div className="st-card-sous">Top {champs.length} sur la période</div>
              </div>
            </div>
            <BarnesChampionnats data={champs} onTooltip={setTooltip} />
          </div>
        )}
      </div>

    </div>
  )
}
