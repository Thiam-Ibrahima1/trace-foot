// ============================================================
// Navbar.jsx — Menu de navigation admin et utilisateur
// ============================================================
import './Navbar.css'

const LABELS_ADMIN = {
  dashboard:     { label: 'Tableau de bord', icon: '📊' },
  matchs:        { label: 'Matchs',          icon: '⚽' },
  trace:         { label: 'Tracé',           icon: '🔮' },
  visualisation: { label: 'Visualisation',   icon: '🗂️' }, // ← NOUVEAU
  confirmation:  { label: 'Confirmation',    icon: '' },
  vip:           { label: 'VIP',             icon: '⭐' },
  historique:    { label: 'Historique',      icon: '📋' },
  stats:         { label: 'Statistiques',    icon: '📈' },
  logs:          { label: 'Logs',            icon: '🗄️' },
}

const LABELS_USER = {
  matchs: { label: 'Matchs du jour', icon: '⚽' },
  vip:    { label: 'VIP Scores',     icon: '⭐' },
}

export default function Navbar({ pageActive, onChangerPage, pages, estAdmin }) {
  const labels = estAdmin ? LABELS_ADMIN : LABELS_USER

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className="logo-icone">🔮</span>
        <span className="logo-texte">Trace FC</span>
        {estAdmin && <span className="logo-badge">Admin</span>}
      </div>
      <div className="navbar-liens">
        {Object.values(pages).map(pageId => {
          const info = labels[pageId] || { label: pageId, icon: '•' }
          return (
            <button
              key={pageId}
              className={`nav-lien ${pageActive === pageId ? 'actif' : ''}`}
              onClick={() => onChangerPage(pageId)}
              title={info.label}
            >
              <span className="nav-icone">{info.icon}</span>
              <span className="nav-label">{info.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
