import { useState, useEffect } from 'react'
import { obtenirQuotaApi } from '../../../adapters/api/ServiceApi.js'
import './DashboardAdmin.css'

// ── Page principale ────────────────────────────────────────────
export default function PageSystemeApi() {
  const [quota, setQuota] = useState(null)
  const [charg, setCharg] = useState(true)
  const [msg,   setMsg]   = useState('')

  useEffect(() => { charger() }, [])

  async function charger(force = false) {
    setCharg(true)
    setMsg('')
    try {
      const q = await obtenirQuotaApi()
      if (q && !q.erreur) { setQuota(q); if (force) setMsg('Données actualisées.') }
      else if (force) setMsg('Données non disponibles.')
    } catch { if (force) setMsg('Erreur de connexion au backend.') }
    setCharg(false)
  }

  if (charg && !quota) return (
    <div className="dash-charg">
      <div className="dash-charg-spinner" />
      Chargement des données système…
    </div>
  )

  return (
    <div className="sysapi-page">

      {/* En-tête */}
      <div className="sysapi-header">
        <div className="sysapi-header-texte">
          <div className="sysapi-titre">Surveillance API-Sports</div>
          <div className="sysapi-sous">Quota journalier · Conseils d'utilisation · Zones horaires Dakar</div>
        </div>
        <div className="sysapi-header-droite">
          <button className="sysapi-btn-refresh" onClick={() => charger(true)} disabled={charg}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {charg ? 'Actualisation…' : 'Actualiser'}
          </button>
          {msg && <span className="sysapi-msg">{msg}</span>}
        </div>
      </div>

      {!quota ? (
        <div className="sysapi-erreur">
          Données API non disponibles — vérifiez que le backend est démarré.
        </div>
      ) : (
        <>
          <QuotaSignal quota={quota} />
          {quota.conseils?.length > 0 && <ConseilsPanel conseils={quota.conseils} />}
        </>
      )}
    </div>
  )
}

// ── Feu tricolore + barre + lignes d'info ──────────────────────
function QuotaSignal({ quota }) {
  const pct      = quota.pourcentage ?? 0
  const restants = quota.restants ?? 0
  const niveau   = pct >= 80 ? 'rouge' : pct >= 50 ? 'jaune' : 'vert'
  const couleur  = { vert:'#16a34a', jaune:'#d97706', rouge:'#dc2626' }[niveau]
  const labelNiveau = {
    vert:  'Utilisation normale',
    jaune: 'Attention — ralentissez',
    rouge: 'Danger — quota presque épuisé',
  }[niveau]

  const minR = quota.minutes_avant_reset ?? 0
  const hh = Math.floor(minR / 60), mm = minR % 60
  const resetLabel = hh > 0 ? `${hh}h ${String(mm).padStart(2,'0')}min` : `${mm}min`

  const intervalle = quota.rythme_max_conseille > 0
    ? Math.round(60 / quota.rythme_max_conseille) : null
  const intervalleLabel = intervalle
    ? (intervalle >= 60
        ? `${Math.floor(intervalle/60)}h ${String(intervalle%60).padStart(2,'0')}min`
        : `${intervalle} min`)
    : null

  const projDepasse = (quota.projection_fin_journee ?? 0) > quota.limite_jour
  const reserve = quota.limite_jour - (quota.projection_fin_journee ?? 0)

  return (
    <div className="qsig-wrap">
      {/* Feu tricolore */}
      <div className="qsig-feu">
        <div className={`qsig-feu-dot rouge ${niveau === 'rouge' ? 'actif' : ''}`} title="Danger (> 80% utilisé)" />
        <div className={`qsig-feu-dot jaune ${niveau === 'jaune' ? 'actif' : ''}`} title="Attention (50–80% utilisé)" />
        <div className={`qsig-feu-dot vert  ${niveau === 'vert'  ? 'actif' : ''}`} title="Normal (< 50% utilisé)" />
      </div>

      <div className="qsig-droite">
        {/* Titre + statut */}
        <div className="qsig-titre-row">
          <span className="qsig-titre">API-Sports</span>
          <span className="qsig-plan">{quota.plan}</span>
          {quota.compte_email && <span className="qsig-email">{quota.compte_email}</span>}
          {quota.expire_le    && <span className="qsig-expire">expire le {quota.expire_le}</span>}
          {quota.lu_a         && <span className="qsig-lu-a">lu à {quota.lu_a} · actualisé toutes les 10 min</span>}
          <span className="qsig-statut" style={{color:couleur,borderColor:couleur+'40',background:couleur+'12'}}>
            <span className="qsig-statut-dot" style={{background:couleur}} />
            {labelNiveau}
          </span>
        </div>

        {/* Barre de progression */}
        <div className="qsig-piste">
          <div className="qsig-remplissage" style={{width:`${Math.min(100,pct)}%`,background:couleur}} />
          <div className="qsig-repere"       style={{left:'50%'}} title="50 req" />
          <div className="qsig-repere rouge" style={{left:'80%'}} title="80 req" />
        </div>
        <div className="qsig-piste-labels">
          <span>0</span>
          <span style={{marginLeft:'calc(50% - 6px)'}}>50</span>
          <span style={{marginLeft:'calc(30% - 6px)'}}>80</span>
          <span style={{marginLeft:'auto'}}>{quota.limite_jour}</span>
        </div>

        {/* Lignes d'info */}
        <div className="qsig-lignes">
          <div className="qsig-ligne">
            <span className="qsig-pt" style={{background:couleur}} />
            <span className="qsig-lbl">Requêtes utilisées aujourd'hui :</span>
            <strong className="qsig-val" style={{color:couleur}}>{quota.utilises} sur {quota.limite_jour}</strong>
            <span className="qsig-lbl">—</span>
            <strong className="qsig-val" style={{color: restants <= 10 ? '#dc2626' : couleur}}>
              {restants} restantes
            </strong>
          </div>

          <div className="qsig-ligne">
            <span className="qsig-pt" style={{background:'#38bdf8'}} />
            <span className="qsig-lbl">Remise à zéro dans :</span>
            <strong className="qsig-val" style={{color:'#38bdf8'}}>{resetLabel}</strong>
            <span className="qsig-lbl">(à {quota.reset_a} heure Dakar)</span>
          </div>

          {intervalleLabel && (
            <div className="qsig-ligne">
              <span className="qsig-pt" style={{background:'#a78bfa'}} />
              <span className="qsig-lbl">Attendez au moins</span>
              <strong className="qsig-val" style={{color:'#a78bfa'}}>{intervalleLabel}</strong>
              <span className="qsig-lbl">entre chaque action sur l'API</span>
            </div>
          )}

          {quota.projection_fin_journee !== null && (
            <div className="qsig-ligne">
              <span className="qsig-pt" style={{background: projDepasse ? '#dc2626' : '#22c55e'}} />
              <span className="qsig-lbl">À ce rythme, vous terminerez la journée avec</span>
              <strong className="qsig-val" style={{color: projDepasse ? '#dc2626' : '#22c55e'}}>
                {projDepasse
                  ? `quota dépassé de ${quota.projection_fin_journee - quota.limite_jour} requêtes`
                  : `${reserve} requête${reserve > 1 ? 's' : ''} en réserve`}
              </strong>
            </div>
          )}

          {quota.limite_atteinte && (
            <div className="qsig-ligne qsig-alerte">
              <span className="qsig-pt" style={{background:'#fbbf24'}} />
              <span>Quota épuisé — données servies depuis le cache jusqu'à {quota.reset_a} (dans {resetLabel})</span>
            </div>
          )}
        </div>

        {/* Frise horaire */}
        <ZoneHoraire heureActuelle={quota.heure_actuelle_dakar} />
      </div>
    </div>
  )
}

// ── Conseils automatiques ──────────────────────────────────────
function ConseilsPanel({ conseils }) {
  const palette = {
    vert:  { bg:'#f0fdf4', border:'#16a34a', titreCoul:'#166534', msgCoul:'#15803d' },
    jaune: { bg:'#fefce8', border:'#ca8a04', titreCoul:'#92400e', msgCoul:'#a16207' },
    rouge: { bg:'#fef2f2', border:'#dc2626', titreCoul:'#991b1b', msgCoul:'#b91c1c' },
    info:  { bg:'#f0f9ff', border:'#0ea5e9', titreCoul:'#0369a1', msgCoul:'#075985' },
  }

  return (
    <div className="conseil-wrap">
      <div className="conseil-section-titre">Conseils automatiques</div>
      <div className="conseil-liste">
        {conseils.map((c, i) => {
          const p = palette[c.niveau] || palette.info
          return (
            <div key={i} className="conseil-carte" style={{
              background:  p.bg,
              borderLeft: `3px solid ${p.border}`,
            }}>
              <div className="conseil-haut">
                <span className="conseil-dot" style={{background: p.border}} />
                <strong className="conseil-titre-item" style={{color: p.titreCoul}}>{c.titre}</strong>
              </div>
              <p className="conseil-msg" style={{color: p.msgCoul}}>{c.message}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Frise horaire 24h ──────────────────────────────────────────
function ZoneHoraire({ heureActuelle }) {
  const heureNow = heureActuelle ? parseInt(heureActuelle.split(':')[0]) : null
  const minNow   = heureActuelle ? parseInt(heureActuelle.split(':')[1]) : 0

  const ZONES = [
    { de:0,  a:4,  label:'Auto',      couleur:'#7c3aed', tip:'00h–04h : Génération automatique. Ne déclenchez rien manuellement.' },
    { de:4,  a:13, label:'Sûre ✓',   couleur:'#16a34a', tip:'04h–13h : Meilleure période. Faites vos actions ici.' },
    { de:13, a:14, label:'Attention', couleur:'#ca8a04', tip:'13h–14h : Matchs de l\'après-midi imminents. Évitez de vider le cache.' },
    { de:14, a:22, label:'Matchs',    couleur:'#dc2626', tip:'14h–22h : Matchs en direct. Évitez les actions manuelles.' },
    { de:22, a:24, label:'Réserve',   couleur:'#0ea5e9', tip:'22h–00h : Gardez au moins 10 requêtes pour les tâches automatiques.' },
  ]

  const pctPos = heureNow !== null ? ((heureNow * 60 + minNow) / (24 * 60)) * 100 : null

  return (
    <div className="dash-frise-wrap">
      <div className="dash-frise-titre">Zones horaires Dakar</div>
      <div className="dash-frise-barre">
        {ZONES.map(z => (
          <div key={z.de} className="dash-frise-zone" title={z.tip}
            style={{
              left:       `${(z.de / 24) * 100}%`,
              width:      `${((z.a - z.de) / 24) * 100}%`,
              background: z.couleur + '30',
              borderLeft: `2px solid ${z.couleur}60`,
            }}>
            <span className="dash-frise-zone-lbl" style={{color:z.couleur}}>{z.label}</span>
            <span className="dash-frise-zone-h">{z.de}h–{z.a}h</span>
          </div>
        ))}
        {pctPos !== null && (
          <div className="dash-frise-curseur" style={{left:`${pctPos}%`}}>
            <div className="dash-frise-curseur-ligne" />
            <span className="dash-frise-curseur-lbl">{heureActuelle}</span>
          </div>
        )}
      </div>
      <div className="dash-frise-legende">
        {ZONES.map(z => (
          <span key={z.de} className="dash-frise-leg-item" title={z.tip}>
            <span className="dash-frise-leg-dot" style={{background:z.couleur}} />
            <span className="dash-frise-leg-lbl" style={{color:z.couleur}}>{z.label}</span>
            <span className="dash-frise-leg-h">{z.de}h–{z.a}h</span>
          </span>
        ))}
      </div>
    </div>
  )
}
