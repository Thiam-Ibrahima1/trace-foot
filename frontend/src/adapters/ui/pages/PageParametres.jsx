// ============================================================
// PageParametres.jsx — Paramètres admin
// Onglet 1 : Informations du profil (Nom, Email)
// Onglet 2 : Modifier le mot de passe
// ============================================================
import { useState } from 'react'
import { useAuth } from '../../../infrastructure/auth/AuthContexte.jsx'
import { modifierUtilisateur } from '../../../adapters/api/ServiceApi.js'
import './PageParametres.css'

// ── Icônes ───────────────────────────────────────────────────
const IcoProfil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IcoCadenas = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IcoSave = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

export default function PageParametres() {
  const { utilisateur, mettreAJourUtilisateur } = useAuth()
  const [onglet, setOnglet] = useState('profil')

  return (
    <div className="param-page">
      <div className="param-header">
        <h2 className="param-titre">Paramètres du système</h2>
        <p className="param-sous">Gérez votre profil et la sécurité de votre compte</p>
      </div>

      {/* ── Onglets ── */}
      <div className="param-onglets">
        <button
          className={`param-onglet ${onglet === 'profil' ? 'actif' : ''}`}
          onClick={() => setOnglet('profil')}>
          <IcoProfil /> Informations du profil
        </button>
        <button
          className={`param-onglet ${onglet === 'mdp' ? 'actif' : ''}`}
          onClick={() => setOnglet('mdp')}>
          <IcoCadenas /> Modifier le mot de passe
        </button>
      </div>

      {/* ── Onglet Profil ── */}
      {onglet === 'profil' && (
        <ProfilForm utilisateur={utilisateur} onUpdate={mettreAJourUtilisateur} />
      )}

      {/* ── Onglet Mot de passe ── */}
      {onglet === 'mdp' && (
        <MotDePasseForm utilisateur={utilisateur} />
      )}
    </div>
  )
}

// ── Formulaire profil ─────────────────────────────────────────
function ProfilForm({ utilisateur, onUpdate }) {
  const [nom, setNom]     = useState(utilisateur?.name  || '')
  const [email, setEmail] = useState(utilisateur?.email || '')
  const [msg, setMsg]     = useState('')
  const [loading, setLoading] = useState(false)

  async function enregistrer(e) {
    e.preventDefault()
    if (!nom.trim() || !email.trim()) {
      setMsg('⚠️ Nom et email sont obligatoires.')
      return
    }
    setLoading(true); setMsg('')
    try {
      const data = { name: nom.trim(), email: email.trim() }
      await modifierUtilisateur(utilisateur.id, data)
      // Mise à jour immédiate dans le contexte (sidebar + partout)
      onUpdate?.(data)
      setMsg('Profil mis à jour avec succès.')
    } catch (err) {
      setMsg('❌ Erreur : ' + (err.message || 'Impossible de sauvegarder.'))
    }
    setLoading(false)
  }

  return (
    <form className="param-carte" onSubmit={enregistrer}>
      <div className="param-grille">
        <div className="param-field">
          <label className="param-label">Nom complet</label>
          <input className="param-input" type="text" value={nom}
            onChange={e => setNom(e.target.value)} placeholder="Votre nom" />
        </div>
        <div className="param-field">
          <label className="param-label">Adresse email</label>
          <input className="param-input" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" />
        </div>
      </div>
      {msg && (
        <p className={`param-msg ${!msg.includes('Erreur') && !msg.includes('❌') && msg.length > 0 ? 'ok' : msg.includes('⚠️') ? 'warn' : 'erreur'}`}>
          {msg}
        </p>
      )}
      <div className="param-actions">
        <button className="param-btn-save" type="submit" disabled={loading}>
          <IcoSave /> {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}

// ── Formulaire mot de passe ───────────────────────────────────
function MotDePasseForm({ utilisateur }) {
  const [ancien, setAncien]   = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg]         = useState('')
  const [loading, setLoading] = useState(false)

  async function changerMdp(e) {
    e.preventDefault()
    if (!ancien || !nouveau || !confirm) {
      setMsg('⚠️ Tous les champs sont obligatoires.')
      return
    }
    if (nouveau.length < 8) {
      setMsg('⚠️ Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (nouveau !== confirm) {
      setMsg('⚠️ Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true); setMsg('')
    try {
      await modifierUtilisateur(utilisateur.id, { password: nouveau })
      setMsg('Mot de passe modifié avec succès.')
      setAncien(''); setNouveau(''); setConfirm('')
    } catch (err) {
      setMsg('❌ Erreur : ' + (err.message || 'Impossible de modifier le mot de passe.'))
    }
    setLoading(false)
  }

  return (
    <form className="param-carte" onSubmit={changerMdp}>
      <div className="param-field">
        <label className="param-label">Ancien mot de passe</label>
        <input className="param-input" type="password" value={ancien}
          onChange={e => setAncien(e.target.value)} placeholder="••••••••" />
      </div>
      <div className="param-field" style={{marginTop: '1rem'}}>
        <label className="param-label">Nouveau mot de passe</label>
        <input className="param-input" type="password" value={nouveau}
          onChange={e => setNouveau(e.target.value)} placeholder="••••••••" />
        <span className="param-hint">Le mot de passe doit contenir au moins 8 caractères</span>
      </div>
      <div className="param-field" style={{marginTop: '1rem'}}>
        <label className="param-label">Confirmer le nouveau mot de passe</label>
        <input className="param-input" type="password" value={confirm}
          onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
      </div>
      {msg && (
        <p className={`param-msg ${!msg.includes('Erreur') && !msg.includes('❌') && msg.length > 0 ? 'ok' : msg.includes('⚠️') ? 'warn' : 'erreur'}`}>
          {msg}
        </p>
      )}
      <div className="param-actions">
        <button className="param-btn-save" type="submit" disabled={loading}>
          <IcoCadenas /> {loading ? 'Modification...' : 'Modifier le mot de passe'}
        </button>
      </div>
    </form>
  )
}
