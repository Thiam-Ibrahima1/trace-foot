// AuthContexte.jsx — Authentification JWT avec gestion sécurisée des tokens
// Protection : tout accès non authentifié est redirigé vers la connexion
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthCtx = createContext(null)
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Clé de stockage du token dans le navigateur
const CLE_TOKEN = 'trace_token'

// Détecter si l'URL actuelle correspond au panneau admin
export function estCheminAdmin() {
  const prefix = import.meta.env.VITE_ADMIN_PREFIX || 'gestion-trace-admin'
  return window.location.pathname.startsWith('/' + prefix)
}

// Événement global déclenché quand le token expire ou est invalide
// Toute fonction peut émettre cet événement pour forcer la déconnexion
const EVENEMENT_DECONNEXION = 'trace:deconnexion-forcee'

export function declencherDeconnexionGlobale() {
  window.dispatchEvent(new Event(EVENEMENT_DECONNEXION))
}

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement]   = useState(true)

  // Fonction de nettoyage de session (appelée depuis partout)
  const nettoyer = useCallback(() => {
    localStorage.removeItem(CLE_TOKEN)
    setUtilisateur(null)
  }, [])

  // Écouter l'événement global de déconnexion forcée (token expiré, 401, etc.)
  useEffect(() => {
    window.addEventListener(EVENEMENT_DECONNEXION, nettoyer)
    return () => window.removeEventListener(EVENEMENT_DECONNEXION, nettoyer)
  }, [nettoyer])

  // Vérifier le token au chargement de l'application
  useEffect(() => {
    const token = localStorage.getItem(CLE_TOKEN)

    if (!token) {
      setChargement(false)
      return
    }

    // Valider le token auprès du backend
    fetch(`${API}/auth/moi`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
      .then(async rep => {
        if (rep.status === 401) {
          // Token invalide ou expiré : déconnexion immédiate
          nettoyer()
          return null
        }
        if (!rep.ok) return null
        return rep.json()
      })
      .then(data => {
        if (!data?.utilisateur) {
          nettoyer()
          return
        }
        // Bloquer un utilisateur normal sur le chemin admin
        if (estCheminAdmin() && data.utilisateur.role !== 'admin') {
          nettoyer()
          return
        }
        setUtilisateur(data.utilisateur)
      })
      .catch(() => {
        // Erreur réseau : on garde l'utilisateur connecté (token potentiellement valide)
        // On ne nettoie pas pour éviter des déconnexions dues à un réseau instable
      })
      .finally(() => setChargement(false))
  }, [nettoyer])

  // Connexion : appelle l'endpoint selon le chemin (user ou admin)
  async function connecter(email, motDePasse) {
    const endpoint = estCheminAdmin() ? 'admin/connexion' : 'auth/connexion'

    const rep = await fetch(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password: motDePasse }),
    })

    const data = await rep.json()

    if (rep.status === 401 || rep.status === 422) {
      throw new Error(data.message || 'Identifiants incorrects.')
    }
    if (rep.status === 429) {
      throw new Error('Trop de tentatives. Veuillez attendre quelques minutes.')
    }
    if (!rep.ok) {
      throw new Error(data.message || 'Erreur de connexion.')
    }

    // Vérifier le rôle admin si on est sur le chemin admin
    if (estCheminAdmin() && data.utilisateur?.role !== 'admin') {
      throw new Error('Accès réservé aux administrateurs.')
    }

    localStorage.setItem(CLE_TOKEN, data.token)
    setUtilisateur(data.utilisateur)
    return data.utilisateur
  }

  // Mise à jour locale de l'utilisateur (après modification de profil)
  function mettreAJourUtilisateur(data) {
    setUtilisateur(prev => prev ? { ...prev, ...data } : prev)
  }

  // Déconnexion propre : invalide le token côté serveur + nettoie le frontend
  function deconnecter() {
    const token = localStorage.getItem(CLE_TOKEN)
    if (token) {
      // Invalider le token côté serveur (fire and forget)
      fetch(`${API}/auth/deconnexion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }).catch(() => {})
    }
    nettoyer()
  }

  return (
    <AuthCtx.Provider value={{
      utilisateur,
      chargement,
      connecter,
      deconnecter,
      mettreAJourUtilisateur,
      estAdmin:    utilisateur?.role === 'admin',
      estConnecte: !!utilisateur,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
