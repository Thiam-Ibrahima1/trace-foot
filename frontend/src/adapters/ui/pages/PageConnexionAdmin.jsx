import { useState } from 'react'
import { useAuth } from '../../../infrastructure/auth/AuthContexte.jsx'
import './PageConnexionAdmin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Icônes SVG ─────────────────────────────────────────────────
const Ico = {
  email: (
    <svg className="cx-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  lock: (
    <svg className="cx-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  key: (
    <svg className="cx-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  ),
  oeilOuvert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  oeilFerme: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  alerte: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15,flexShrink:0}}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15,flexShrink:0}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
}

// ── Composants réutilisables ───────────────────────────────────
function Champ({ label, icone, children, compact }) {
  return (
    <div className={`cx-field ${compact ? 'compact' : ''}`}>
      <label className="cx-label">{label}</label>
      <div className="cx-input-wrap">
        {icone}
        {children}
      </div>
    </div>
  )
}
function Erreur({ msg }) {
  if (!msg) return null
  return <div className="cx-erreur">{Ico.alerte} {msg}</div>
}
function Succes({ msg }) {
  if (!msg) return null
  return <div className="cx-succes">{Ico.check} {msg}</div>
}

// ── Page principale admin ──────────────────────────────────────
export default function PageConnexionAdmin() {
  const [vue, setVue] = useState('connexion')

  return (
    <div className="cxa-page">

      {/* Décoration SVG fond */}
      <div className="cxa-bg-deco" aria-hidden="true">
        <svg viewBox="0 0 300 300" fill="none">
          <circle cx="150" cy="150" r="130" stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.15"/>
          <circle cx="150" cy="150" r="90"  stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.1"/>
          <circle cx="150" cy="150" r="50"  stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.08"/>
          <line x1="20"  y1="150" x2="280" y2="150" stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.1"/>
          <line x1="150" y1="20"  x2="150" y2="280" stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.1"/>
          <line x1="58"  y1="58"  x2="242" y2="242" stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.06"/>
          <line x1="242" y1="58"  x2="58"  y2="242" stroke="#2e7d32" strokeWidth="1" strokeOpacity="0.06"/>
        </svg>
      </div>

      <div className="cxa-carte">
        {/* Logo admin */}
        <div className="cxa-logo">
          <img src="/logo-senfoot.png" alt="Sen Foot" className="cx-logo-img" />
          <h1 className="cxa-titre">Administration</h1>
          <p className="cxa-sous">Sen Foot — Accès restreint</p>
          {vue === 'connexion' && (
            <div className="cxa-badge-restreint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11}}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Administrateurs uniquement
            </div>
          )}
        </div>

        {vue === 'connexion'    && <VueConnexionAdmin onChanger={setVue} />}
        {vue === 'oublie_email' && <VueOublieEmail    onChanger={setVue} />}
        {vue === 'oublie_code'  && <VueOublieCode     onChanger={setVue} />}
      </div>
    </div>
  )
}

// ── Vue Connexion Admin ────────────────────────────────────────
function VueConnexionAdmin({ onChanger }) {
  const { connecter }       = useAuth()
  const [email, setEmail]   = useState('')
  const [mdp, setMdp]       = useState('')
  const [visible, setVis]   = useState(false)
  const [erreur, setErreur] = useState('')
  const [charg, setCharg]   = useState(false)

  async function soumettre(e) {
    e.preventDefault(); setErreur(''); setCharg(true)
    try { await connecter(email, mdp) }
    catch (err) { setErreur(err.message || 'Accès refusé. Identifiants invalides.') }
    setCharg(false)
  }

  return (
    <form onSubmit={soumettre} className="cx-form">
      <Champ label="E-mail administrateur" icone={Ico.email}>
        <input className="cx-input" type="email" placeholder="admin@trace-fc.com"
          value={email} onChange={e => setEmail(e.target.value)}
          required autoFocus autoComplete="email" />
      </Champ>

      <Champ label="Mot de passe" icone={Ico.lock}>
        <input className="cx-input cx-input-mdp"
          type={visible ? 'text' : 'password'} placeholder="••••••••"
          value={mdp} onChange={e => setMdp(e.target.value)}
          required autoComplete="current-password" />
        <button type="button" className="cx-oeil" onClick={() => setVis(v => !v)}>
          {visible ? Ico.oeilFerme : Ico.oeilOuvert}
        </button>
      </Champ>

      <Erreur msg={erreur} />

      <div className="cx-form-actions">
        <button type="submit" className="cx-btn-primary cxa-btn" disabled={charg}>
          {charg && <span className="cx-spinner" />}
          {charg ? 'Vérification...' : 'Accéder au panneau'}
        </button>
      </div>

      <div className="cx-liens" style={{justifyContent:'center'}}>
        <button type="button" className="cx-lien" onClick={() => onChanger('oublie_email')}>
          Mot de passe oublié ?
        </button>
      </div>
    </form>
  )
}

// ── Vue Mot de passe oublié — Email ───────────────────────────
function VueOublieEmail({ onChanger }) {
  const [email, setEmail]     = useState('')
  const [erreur, setErreur]   = useState('')
  const [succes, setSucces]   = useState('')
  const [codeDev, setCodeDev] = useState('')
  const [charg, setCharg]     = useState(false)

  async function soumettre(e) {
    e.preventDefault(); setErreur(''); setSucces(''); setCharg(true)
    try {
      const r = await fetch(`${API}/auth/mot-de-passe-oublie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (!r.ok) { setErreur(d.message || 'Email introuvable.') }
      else {
        localStorage.setItem('trace_reset_email', email)
        setSucces(d.message)
        if (d.code_dev) setCodeDev(d.code_dev)
        setTimeout(() => onChanger('oublie_code'), 2000)
      }
    } catch { setErreur('Erreur serveur.') }
    setCharg(false)
  }

  return (
    <form onSubmit={soumettre} className="cx-form">
      <p className="cx-info-texte">
        Entrez votre email admin. Vous recevrez un code à 6 chiffres.
      </p>
      <Champ label="E-mail administrateur" icone={Ico.email}>
        <input className="cx-input" type="email" placeholder="admin@trace-fc.com"
          value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
      </Champ>
      <Erreur msg={erreur} />
      <Succes msg={succes} />
      {codeDev && (
        <div className="cx-succes" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
          <span style={{fontSize:'0.75rem',color:'#475569'}}>Code (mode dev) :</span>
          <strong style={{fontSize:'1.4rem',letterSpacing:6,color:'#1b5e20'}}>{codeDev}</strong>
        </div>
      )}
      <div className="cx-form-actions">
        <button type="submit" className="cx-btn-primary cxa-btn" disabled={charg}>
          {charg && <span className="cx-spinner" />}
          {charg ? 'Envoi...' : 'Envoyer le code'}
        </button>
        <button type="button" className="cx-btn-retour" onClick={() => onChanger('connexion')}>
          Retour
        </button>
      </div>
    </form>
  )
}

// ── Vue Mot de passe oublié — Code ────────────────────────────
function VueOublieCode({ onChanger }) {
  const emailSave           = localStorage.getItem('trace_reset_email') || ''
  const [code, setCode]     = useState('')
  const [mdp, setMdp]       = useState('')
  const [conf, setConf]     = useState('')
  const [visible, setVis]   = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [charg, setCharg]   = useState(false)

  async function soumettre(e) {
    e.preventDefault(); setErreur('')
    if (code.length !== 6) return setErreur('Le code doit contenir 6 chiffres.')
    if (mdp.length < 6)    return setErreur('Minimum 6 caractères.')
    if (mdp !== conf)       return setErreur('Les mots de passe ne correspondent pas.')
    setCharg(true)
    try {
      const r = await fetch(`${API}/auth/reinitialiser-mot-de-passe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: emailSave, code, password: mdp, password_confirmation: conf }),
      })
      const d = await r.json()
      if (!r.ok) { setErreur(d.message || 'Erreur.') }
      else {
        setSucces(d.message)
        localStorage.removeItem('trace_reset_email')
        setTimeout(() => onChanger('connexion'), 2000)
      }
    } catch { setErreur('Erreur serveur.') }
    setCharg(false)
  }

  return (
    <form onSubmit={soumettre} className="cx-form">
      {emailSave && (
        <div className="cx-email-recap">
          Code envoyé à : <strong>{emailSave}</strong>
        </div>
      )}
      <Champ label="Code à 6 chiffres" icone={Ico.key}>
        <input className="cx-input cx-input-code" type="text"
          placeholder="000000" maxLength={6} inputMode="numeric"
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          required autoFocus />
      </Champ>
      <div className="cx-grille-mdp">
        <Champ label="Nouveau mot de passe" icone={Ico.lock} compact>
          <input className="cx-input cx-input-mdp"
            type={visible ? 'text' : 'password'} placeholder="Min. 6 car."
            value={mdp} onChange={e => setMdp(e.target.value)} required />
          <button type="button" className="cx-oeil" onClick={() => setVis(v => !v)}>
            {visible ? Ico.oeilFerme : Ico.oeilOuvert}
          </button>
        </Champ>
        <Champ label="Confirmation" icone={Ico.lock} compact>
          <input className="cx-input"
            type={visible ? 'text' : 'password'} placeholder="Répétez"
            value={conf} onChange={e => setConf(e.target.value)} required />
        </Champ>
      </div>
      {mdp && conf && (
        <span className={`cx-match ${mdp === conf ? 'ok' : 'nok'}`}>
          {mdp === conf ? '✓ Mots de passe identiques' : '✗ Mots de passe différents'}
        </span>
      )}
      <Erreur msg={erreur} />
      <Succes msg={succes} />
      <div className="cx-form-actions">
        <button type="submit" className="cx-btn-primary cxa-btn" disabled={charg}>
          {charg && <span className="cx-spinner" />}
          {charg ? 'Réinitialisation...' : 'Réinitialiser'}
        </button>
        <button type="button" className="cx-btn-retour" onClick={() => onChanger('oublie_email')}>
          Renvoyer un code
        </button>
      </div>
    </form>
  )
}
