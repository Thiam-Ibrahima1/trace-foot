// ============================================================
// NavbarUser.jsx — Barre de navigation en bas (4 onglets)
// Onglets : Prédictions | Direct | VIP | Championnat
// (Tous supprimé — fusionné dans Prédictions)
// ============================================================
import './NavbarUser.css'

// Graphe pulsation (onglet Prédictions)
const IcoPrediction = ({ actif }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={actif ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

// Signal radio (onglet Direct)
const IcoDirect = ({ actif }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={actif ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>
)

// Étoile (onglet VIP)
const IcoVip = ({ actif }) => (
  <svg viewBox="0 0 24 24"
    fill={actif ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const ONGLETS = [
  { id: 'prediction', label: 'Tous',   Ico: IcoPrediction },
  { id: 'direct',     label: 'Direct', Ico: IcoDirect     },
  { id: 'vip',        label: 'VIP',    Ico: IcoVip        },
]

export default function NavbarUser({ pageActive, onChangerPage }) {
  return (
    <nav className="navbar-user">
      {ONGLETS.map(({ id, label, Ico }) => {
        const actif = pageActive === id
        return (
          <button
            key={id}
            className={`nb-btn ${actif ? 'actif' : ''}`}
            onClick={() => onChangerPage(id)}
          >
            <span className="nb-ico"><Ico actif={actif} /></span>
            <span className="nb-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
