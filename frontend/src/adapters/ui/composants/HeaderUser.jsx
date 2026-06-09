// HeaderUser.jsx — En-tête page Prédictions : logo + nom utilisateur + menu hamburger
import { useState } from 'react'
import { useAuth } from '../../../infrastructure/auth/AuthContexte.jsx'
import ProfilUtilisateur from './ProfilUtilisateur.jsx'
import './HeaderUser.css'

const LogoSenFoot = () => (
  <img src="/logo-senfoot.png" alt="Sen Foot" className="hu-logo-img" />
)

// Hamburger — 3 barres = ouvre le menu profil
const IcoMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" width="15" height="15"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18"/>
  </svg>
)

export default function HeaderUser() {
  const { utilisateur } = useAuth()
  const [profilOuvert, setProfilOuvert] = useState(false)

  const prenom = utilisateur?.prenom
    || utilisateur?.name?.split(' ')[0]
    || 'Utilisateur'

  return (
    <>
      <header className="header-user">
        {/* Gauche : logo + nom Sen Foot */}
        <div className="hu-gauche">
          <LogoSenFoot />
          <span className="hu-titre">Sen Foot</span>
        </div>

        {/* Droite : nom utilisateur (affichage seul) + bouton 3 barres */}
        <div className="hu-droite">
          <div className="hu-user-info">
            <span className="hu-avatar">{prenom.charAt(0).toUpperCase()}</span>
            <span className="hu-prenom">{prenom}</span>
          </div>
          <button className="hu-menu-btn" onClick={() => setProfilOuvert(true)} title="Mon profil">
            <IcoMenu />
          </button>
        </div>
      </header>

      {/* Panneau profil plein écran */}
      {profilOuvert && (
        <ProfilUtilisateur onFermer={() => setProfilOuvert(false)} />
      )}
    </>
  )
}
