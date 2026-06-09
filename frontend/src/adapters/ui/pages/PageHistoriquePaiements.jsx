// PageHistoriquePaiements.jsx — Historique complet des paiements VIP classé par date
import { useState, useEffect } from 'react'
import { obtenirPaiementsAdmin } from '../../../adapters/api/ServiceApi.js'
import './PageHistoriquePaiements.css'

// ── Helpers ───────────────────────────────────────────────────
function labelDate(dateStr) {
  if (!dateStr || dateStr === 'inconnue') return 'Date inconnue'
  const d    = new Date(dateStr + 'T00:00:00')
  const auj  = new Date(); auj.setHours(0,0,0,0)
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1)
  if (d.getTime() === auj.getTime())  return "Aujourd'hui"
  if (d.getTime() === hier.getTime()) return 'Hier'
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function dateKey(created_at) {
  if (!created_at) return 'inconnue'
  return new Date(created_at).toISOString().split('T')[0]
}

function formatHeure(created_at) {
  if (!created_at) return ''
  return new Date(created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── Icônes ────────────────────────────────────────────────────
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IcoClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IcoPaiement = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:26,height:26}}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IcoSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,color:'#94a3b8',flexShrink:0}}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IcoTotal = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IcoValide = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IcoAttente = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IcoCaisse = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

// ── Composant principal ───────────────────────────────────────
export default function PageHistoriquePaiements() {
  const [paiements,  setPaiements]  = useState([])
  const [charg,      setCharg]      = useState(true)
  const [erreur,     setErreur]     = useState('')
  const [recherche,  setRecherche]  = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')

  useEffect(() => { charger() }, [])

  async function charger() {
    setCharg(true); setErreur('')
    try {
      const r = await obtenirPaiementsAdmin()
      setPaiements(r.paiements || [])
    } catch { setErreur('Erreur de chargement des paiements.') }
    setCharg(false)
  }

  // Filtrer par recherche et statut
  const filtres = paiements.filter(p => {
    const texte = recherche.toLowerCase()
    const matchTexte = !texte ||
      p.user?.name?.toLowerCase().includes(texte) ||
      p.user?.email?.toLowerCase().includes(texte) ||
      p.prediction_vip?.domicile?.toLowerCase().includes(texte) ||
      p.prediction_vip?.exterieur?.toLowerCase().includes(texte) ||
      p.reference?.toLowerCase().includes(texte) ||
      p.telephone?.includes(texte)
    const matchStatut = filtreStatut === 'tous' || p.statut === filtreStatut
    return matchTexte && matchStatut
  })

  // Grouper par date
  const parDate = filtres.reduce((acc, p) => {
    const k = dateKey(p.created_at)
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})
  const dates = Object.keys(parDate).sort().reverse()

  // Stats globales
  const totalValides = paiements.filter(p => p.statut === 'valide').length
  const totalMontant = paiements.filter(p => p.statut === 'valide').reduce((t, p) => t + (p.montant || 0), 0)
  const totalAttente = paiements.filter(p => p.statut === 'en_attente').length

  if (charg) return (
    <div className="php-page">
      <div className="php-skel-banniere" />
      <div className="php-skel-stats">
        {[1, 2, 3].map(i => <div key={i} className="php-skel-stat" />)}
      </div>
      {[1, 2, 3, 4].map(i => <div key={i} className="php-skel-ligne" />)}
    </div>
  )

  return (
    <div className="php-page">

      {/* ── Bannière titre ── */}
      <div className="php-banniere">
        <div className="php-banniere-ico"><IcoPaiement /></div>
        <div className="php-banniere-texte">
          <h2 className="php-banniere-titre">Historique des Paiements</h2>
          <p className="php-banniere-sous">Tous les paiements VIP classés par date · du plus récent au plus ancien</p>
        </div>
        <div className="php-banniere-badge">
          {paiements.length} paiement{paiements.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Métriques résumé ── */}
      <div className="php-stats">
        <div className="php-stat total">
          <div className="php-stat-icon"><IcoTotal /></div>
          <span className="php-stat-val">{paiements.length}</span>
          <span className="php-stat-lbl">Total paiements</span>
        </div>
        <div className="php-stat vert">
          <div className="php-stat-icon"><IcoValide /></div>
          <span className="php-stat-val">{totalValides}</span>
          <span className="php-stat-lbl">Validés</span>
        </div>
        <div className="php-stat or">
          <div className="php-stat-icon"><IcoAttente /></div>
          <span className="php-stat-val">{totalAttente}</span>
          <span className="php-stat-lbl">En attente</span>
        </div>
        <div className="php-stat ca">
          <div className="php-stat-icon"><IcoCaisse /></div>
          <span className="php-stat-val php-stat-val-sm">{totalMontant.toLocaleString()} FCFA</span>
          <span className="php-stat-lbl">Chiffre d'affaires</span>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="php-filtres">
        <div className="php-recherche-wrap">
          <IcoSearch />
          <input
            type="text"
            className="php-recherche"
            placeholder="Rechercher utilisateur, match, référence..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
          {recherche && (
            <button onClick={() => setRecherche('')}
              style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:0,fontSize:'0.85rem'}}>
              ✕
            </button>
          )}
        </div>
        <div className="php-filtre-statut">
          {[
            { id: 'tous',        label: 'Tous' },
            { id: 'valide',      label: '✓ Validés' },
            { id: 'en_attente',  label: '⏳ En attente' },
            { id: 'echec',       label: '✗ Échec' },
          ].map(f => (
            <button
              key={f.id}
              className={`php-filtre-btn ${filtreStatut === f.id ? 'actif' : ''}`}
              onClick={() => setFiltreStatut(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {erreur && <div className="php-erreur">{erreur}</div>}

      {filtres.length === 0 && !erreur && (
        <div className="php-vide">
          <IcoPaiement />
          <p>Aucun paiement trouvé.</p>
        </div>
      )}

      {/* ── Liste par date ── */}
      {dates.map(dateStr => {
        const liste      = parDate[dateStr]
        const nbValides  = liste.filter(p => p.statut === 'valide').length
        const montantJour = liste.filter(p => p.statut === 'valide').reduce((t, p) => t + (p.montant || 0), 0)

        return (
          <div key={dateStr} className="php-groupe">

            {/* En-tête date */}
            <div className="php-date-header">
              <div className="php-date-gauche">
                <span className="php-date-label">{labelDate(dateStr)}</span>
                <span className="php-date-raw">{dateStr !== 'inconnue' ? dateStr : ''}</span>
              </div>
              <div className="php-date-droite">
                <span className="php-date-nb">{liste.length} paiement{liste.length > 1 ? 's' : ''}</span>
                {montantJour > 0 && (
                  <span className="php-date-ca">{montantJour.toLocaleString()} FCFA</span>
                )}
              </div>
            </div>

            {/* Lignes paiements */}
            {liste.map((p, i) => {
              const statut = p.statut || 'en_attente'
              const heure  = formatHeure(p.created_at)

              return (
                <div key={i} className={`php-ligne ${statut}`}>

                  {/* Icône statut */}
                  <div className={`php-statut-ico ${statut}`}>
                    {statut === 'valide'     ? <IcoCheck /> :
                     statut === 'echec'      ? <IcoX />     :
                                               <IcoClock />}
                  </div>

                  {/* Match */}
                  <div className="php-match-info">
                    {p.prediction_vip ? (
                      <>
                        <span className="php-match-nom">
                          {p.prediction_vip.domicile}
                          <span className="php-vs"> vs </span>
                          {p.prediction_vip.exterieur}
                        </span>
                        <span className="php-competition">{p.prediction_vip.competition}</span>
                      </>
                    ) : (
                      <span className="php-match-supprime">Match supprimé</span>
                    )}
                  </div>

                  {/* Utilisateur */}
                  <div className="php-user-info">
                    <span className="php-user-nom">{p.user?.name || '—'}</span>
                    <span className="php-user-email">{p.user?.email || ''}</span>
                  </div>

                  {/* Méthode + téléphone */}
                  <div className="php-methode-info">
                    <span className="php-methode-badge">{p.methode || '—'}</span>
                    {p.telephone && <span className="php-tel">{p.telephone}</span>}
                  </div>

                  {/* Heure + référence */}
                  <div className="php-ref-info">
                    {heure && <span className="php-heure">{heure}</span>}
                    <span className="php-ref">{p.reference || `#${p.id}`}</span>
                  </div>

                  {/* Montant + statut */}
                  <div className="php-droite">
                    <span className="php-montant">{(p.montant || 10000).toLocaleString()} FCFA</span>
                    <span className={`php-badge ${statut}`}>
                      {statut === 'valide' ? '✓ Validé' : statut === 'echec' ? '✗ Échec' : '⏳ Attente'}
                    </span>
                  </div>

                </div>
              )
            })}
          </div>
        )
      })}

    </div>
  )
}
