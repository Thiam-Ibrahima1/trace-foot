// ============================================================
// AdminLayout.jsx — Sidebar admin redesignée
// Style : fond blanc · icônes SVG outline bleu-marine · sobre
// ============================================================
import { useState, useEffect } from 'react'
import { useAuth } from '../../../infrastructure/auth/AuthContexte.jsx'
import { obtenirBadgesAdmin } from '../../../adapters/api/ServiceApi.js'

// ── Icônes SVG outline (style menu gauche) ────────────────────
const Ico = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  trace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  ),
  visualisation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  confirmation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  historique: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  matchs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  vip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  logs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  parametres: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  intelligence: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a6 6 0 0 1 6 6c0 2-.8 3.8-2 5l-1 1v2H9v-2l-1-1a7 7 0 0 1-2-5 6 6 0 0 1 6-6z"/>
      <line x1="9" y1="21" x2="15" y2="21"/>
      <line x1="10" y1="17" x2="14" y2="17"/>
    </svg>
  ),
  systeme_api: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  deconnexion: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
}

const MENU = [
  {
    groupe: 'PRINCIPAL',
    items: [
      { id: 'dashboard',        ico: Ico.dashboard,     label: 'Tableau de bord' },
    ],
  },
  {
    groupe: 'TRACÉ',
    items: [
      { id: 'trace',            ico: Ico.trace,         label: 'Générer un tracé' },
      { id: 'visualisation',    ico: Ico.visualisation, label: 'Voir les maisons'  },
    ],
  },
  {
    groupe: 'RÉSULTATS',
    items: [
      { id: 'historique_complet', ico: Ico.historique,    label: 'Historique complet' },
      { id: 'intelligence',       ico: Ico.intelligence,  label: 'Intelligence'       },
      { id: 'stats',              ico: Ico.stats,         label: 'Statistiques'       },
    ],
  },
  {
    groupe: 'GESTION',
    items: [
      { id: 'matchs',           ico: Ico.matchs,        label: 'Matchs'         },
      { id: 'vip',              ico: Ico.vip,           label: 'VIP & Paiements' },
    ],
  },
  {
    groupe: 'SYSTÈME',
    items: [
      { id: 'systeme_api', ico: Ico.systeme_api, label: 'Surveillance API' },
      { id: 'logs',        ico: Ico.logs,        label: 'Logs système'     },
      { id: 'parametres',  ico: Ico.parametres,  label: 'Paramètres'      },
    ],
  },
]

const trouverItem = id => MENU.flatMap(g => g.items).find(i => i.id === id)

export default function AdminLayout({ pageActive, onChangerPage, children }) {
  const { utilisateur, deconnecter } = useAuth()
  const [confirmerDeco, setConfirmerDeco] = useState(false)
  const [badges, setBadges] = useState({})
  const itemActif = trouverItem(pageActive) || { ico: Ico.dashboard, label: 'Tableau de bord' }

  useEffect(() => {
    async function chargerBadges() {
      try {
        const b = await obtenirBadgesAdmin()
        if (!b) return
        setBadges({
          confirmation:       b.confirmation > 0       ? b.confirmation      : null,
          vip:                b.vip_attente > 0        ? b.vip_attente       : null,
          historique_complet: b.historique_total > 0   ? b.historique_total  : null,
          logs:               b.logs_erreurs > 0       ? b.logs_erreurs      : null,
        })
      } catch {}
    }
    chargerBadges()
    const id = setInterval(chargerBadges, 90000)
    return () => clearInterval(id)
  }, [])


  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false)

  return (
    <div className="admin-shell">

      {/* ── Overlay mobile ──────────────────────────────────── */}
      {menuMobileOuvert && (
        <div className="admin-mobile-overlay" onClick={() => setMenuMobileOuvert(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`admin-sidebar${menuMobileOuvert ? ' mobile-ouvert' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <img src="/logo-senfoot.png" alt="Sen Foot" className="sidebar-logo-img" />
          <div>
            <div className="sidebar-logo-texte">Sen Foot</div>
            <div className="sidebar-logo-badge">ADMIN</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {MENU.map(groupe => (
            <div key={groupe.groupe} className="sidebar-groupe">
              <span className="sidebar-groupe-titre">{groupe.groupe}</span>
              {groupe.items.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-btn ${pageActive === item.id ? 'actif' : ''}`}
                  onClick={() => { onChangerPage(item.id); setMenuMobileOuvert(false) }}
                >
                  <span className="sidebar-btn-icone">{item.ico}</span>
                  <span className="sidebar-btn-label">{item.label}</span>
                  {badges[item.id] && (
                    <span className={`sidebar-badge ${
                      item.id === 'logs'         ? 'rouge' :
                      item.id === 'intelligence' ? 'or'    :
                      item.id === 'stats'        ? 'bleu'  : ''
                    }`}>
                      {badges[item.id]}
                    </span>
                  )}
                  {pageActive === item.id && !badges[item.id] && <span className="sidebar-actif-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Espace libre entre les items et le pied — réservé pour futurs items */}
        <div style={{ flex: 1, minHeight: 16 }} />

        {/* Pied */}
        <div className="sidebar-pied">
          <span className="sidebar-user-ico">{Ico.user}</span>
          <div className="sidebar-user-info">
            <span className="sidebar-user-nom">{utilisateur?.name || 'Admin'}</span>
            <span className="sidebar-user-role">Administrateur</span>
          </div>
          {confirmerDeco ? (
            <div className="sidebar-deco-confirm">
              <span>Quitter ?</span>
              <button className="sidebar-deco-oui" onClick={deconnecter}>Oui</button>
              <button className="sidebar-deco-non" onClick={() => setConfirmerDeco(false)}>Non</button>
            </div>
          ) : (
            <button className="sidebar-deco-btn" onClick={() => setConfirmerDeco(true)} title="Déconnexion">
              {Ico.deconnexion}
            </button>
          )}
        </div>
      </aside>

      {/* ── Zone principale ──────────────────────────────────── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-hamburger" onClick={() => setMenuMobileOuvert(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:20,height:20}}>
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
          <span className="topbar-icone-svg">{itemActif.ico}</span>
          <span className="topbar-titre">{itemActif.label}</span>
          <span className="topbar-date">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </header>
        <main className="admin-contenu">{children}</main>
      </div>
    </div>
  )
}
