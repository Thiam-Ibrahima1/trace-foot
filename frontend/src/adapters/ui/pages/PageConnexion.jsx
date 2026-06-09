import { useState } from 'react'
import { useAuth } from '../../../infrastructure/auth/AuthContexte.jsx'
import './PageConnexion.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Icône retour flèche ────────────────────────────────────────
const IcoFleche = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
  </svg>
)

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
  user: (
    <svg className="cx-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  phone: (
    <svg className="cx-input-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.08 1.2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.09 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 21 16z"/>
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

// ── Page principale ────────────────────────────────────────────
// ── Panneau gauche réutilisable ───────────────────────────────
function PanneauGauche() {
  return (
    <div className="cx-panneau-gauche">
      <div className="cx-deco-cercles" aria-hidden="true">
        <svg viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="180" stroke="#22c55e" strokeWidth="1"/>
          <circle cx="200" cy="200" r="120" stroke="#22c55e" strokeWidth="1"/>
          <circle cx="200" cy="200" r="60"  stroke="#22c55e" strokeWidth="1"/>
          <line x1="20" y1="200" x2="380" y2="200" stroke="#22c55e" strokeWidth="1"/>
          <line x1="200" y1="20" x2="200" y2="380" stroke="#22c55e" strokeWidth="1"/>
        </svg>
      </div>
      <div className="cx-marque">
        <img src="/logo-senfoot.png" alt="Sen Foot" className="cx-marque-logo" />
        <h1 className="cx-marque-nom">Sen Foot</h1>
        <p className="cx-marque-tag">Prédictions football intelligentes — précises & en temps réel</p>
        <div className="cx-features">
          <div className="cx-feature">
            <div className="cx-feature-ico vert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div className="cx-feature-txt">
              <span className="cx-feature-titre">Prédictions du jour</span>
              <span className="cx-feature-sous">Combinaisons analysées & vérifiées</span>
            </div>
          </div>
          <div className="cx-feature">
            <div className="cx-feature-ico bleu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
                <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            </div>
            <div className="cx-feature-txt">
              <span className="cx-feature-titre">Direct & Historique</span>
              <span className="cx-feature-sous">Scores en temps réel</span>
            </div>
          </div>
          <div className="cx-feature">
            <div className="cx-feature-ico or">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width:18,height:18}}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className="cx-feature-txt">
              <span className="cx-feature-titre">Scores Exacts VIP</span>
              <span className="cx-feature-sous">Accès exclusif aux prédictions exactes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PageConnexion() {
  const [vue, setVue] = useState('connexion')

  // Inscription et récupération de mot de passe → pages plein écran dédiées
  if (vue === 'inscription')  return <PageInscription  onRetour={() => setVue('connexion')} />
  if (vue === 'oublie_email') return <PageOublieEmail  onRetour={() => setVue('connexion')} onSuivant={() => setVue('oublie_code')} />
  if (vue === 'oublie_code')  return <PageOublieCode   onRetour={() => setVue('oublie_email')} onSucces={() => setVue('connexion')} />

  return (
    <div className="cx-page">
      <PanneauGauche />

      {/* ── Panneau droit — Connexion ── */}
      <div className="cx-panneau-droit">
        <div className="cx-carte">
          {/* En-tête centré */}
          <div className="cx-carte-header">
            <div className="cx-bienvenue-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <h1 className="cx-titre">Bon retour !</h1>
            <p className="cx-sous">Connectez-vous à votre espace</p>
          </div>

          {/* Séparateur */}
          <div className="cx-carte-sep" />

          <VueConnexion onChanger={setVue} />
        </div>
      </div>

    </div>
  )
}

// ── Vue Connexion ──────────────────────────────────────────────
function VueConnexion({ onChanger }) {
  const { connecter }       = useAuth()
  const [email, setEmail]   = useState('')
  const [mdp, setMdp]       = useState('')
  const [visible, setVis]   = useState(false)
  const [erreur, setErreur] = useState('')
  const [charg, setCharg]   = useState(false)

  async function soumettre(e) {
    e.preventDefault(); setErreur(''); setCharg(true)
    try { await connecter(email, mdp) }
    catch (err) { setErreur(err.message || 'Email ou mot de passe incorrect.') }
    setCharg(false)
  }

  return (
    <form onSubmit={soumettre} className="cx-form">
      <Champ label="Adresse e-mail" icone={Ico.email}>
        <input className="cx-input" type="email" placeholder="votre@email.com"
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
        <button type="submit" className="cx-btn-primary" disabled={charg}>
          {charg && <span className="cx-spinner" />}
          {charg ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>

      <div className="cx-liens">
        <button type="button" className="cx-lien" onClick={() => onChanger('oublie_email')}>
          Mot de passe oublié ?
        </button>
        <span className="cx-lien-sep">·</span>
        <button type="button" className="cx-lien" onClick={() => onChanger('inscription')}>
          Créer un compte
        </button>
      </div>
    </form>
  )
}

// ── Page Inscription — plein écran dédié ──────────────────────
function PageInscription({ onRetour }) {
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    password: '', password_confirmation: ''
  })
  const [visMdp, setVisMdp] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [charg, setCharg]   = useState(false)

  const maj = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault(); setErreur(''); setSucces('')
    if (!form.prenom.trim())    return setErreur('Le prénom est requis.')
    if (!form.nom.trim())       return setErreur('Le nom est requis.')
    if (!form.telephone.trim()) return setErreur('Le téléphone est requis.')
    if (form.password.length < 6) return setErreur('Minimum 6 caractères pour le mot de passe.')
    if (form.password !== form.password_confirmation) return setErreur('Les mots de passe ne correspondent pas.')
    setCharg(true)
    try {
      const r = await fetch(`${API}/auth/inscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) {
        setErreur(d.errors ? Object.values(d.errors).flat().join(' ') : d.message || 'Erreur.')
      } else {
        setSucces('Compte créé avec succès ! Redirection...')
        setTimeout(() => onRetour(), 2500)
      }
    } catch { setErreur('Erreur de connexion au serveur.') }
    setCharg(false)
  }

  const mdpOk = form.password && form.password_confirmation &&
    form.password === form.password_confirmation

  return (
    <div className="cx-standalone">
      <button className="cx-back-btn" onClick={onRetour} title="Retour"><IcoFleche /></button>
      <div className="cx-standalone-card">
        <div className="cx-standalone-header">
          <img src="/logo-senfoot.png" alt="Sen Foot" className="cx-standalone-logo" />
          <h2 className="cx-standalone-titre">Créer un compte</h2>
          <p className="cx-standalone-sous">Rejoignez Sen Foot dès maintenant</p>
        </div>

        <form onSubmit={soumettre} className="cx-form cx-form-inscription">
          <div className="cx-grille-inscription">
            <Champ label="Prénom" icone={Ico.user} compact>
              <input className="cx-input" name="prenom" type="text" placeholder="Moussa"
                value={form.prenom} onChange={maj} required autoFocus />
            </Champ>
            <Champ label="Nom" icone={Ico.user} compact>
              <input className="cx-input" name="nom" type="text" placeholder="Diallo"
                value={form.nom} onChange={maj} required />
            </Champ>
            <Champ label="E-mail" icone={Ico.email} compact>
              <input className="cx-input" name="email" type="email" placeholder="vous@email.com"
                value={form.email} onChange={maj} required />
            </Champ>
            <Champ label="Téléphone" icone={Ico.phone} compact>
              <input className="cx-input" name="telephone" type="tel" placeholder="771234567"
                value={form.telephone} onChange={maj} required />
            </Champ>
            <Champ label="Mot de passe" icone={Ico.lock} compact>
              <input className="cx-input cx-input-mdp" name="password"
                type={visMdp ? 'text' : 'password'} placeholder="Min. 6 car."
                value={form.password} onChange={maj} required />
              <button type="button" className="cx-oeil" onClick={() => setVisMdp(v => !v)}>
                {visMdp ? Ico.oeilFerme : Ico.oeilOuvert}
              </button>
            </Champ>
            <Champ label="Confirmation" icone={Ico.lock} compact>
              <input className={`cx-input ${form.password_confirmation && !mdpOk ? 'cx-input-erreur' : ''}`}
                name="password_confirmation"
                type={visMdp ? 'text' : 'password'} placeholder="Répétez"
                value={form.password_confirmation} onChange={maj} required />
            </Champ>
          </div>

          {form.password && form.password_confirmation && (
            <span className={`cx-match ${mdpOk ? 'ok' : 'nok'}`}>
              {mdpOk ? <>{Ico.check} Mots de passe identiques</> : <>{Ico.alerte} Mots de passe différents</>}
            </span>
          )}

          <Erreur msg={erreur} />
          <Succes msg={succes} />

          <div className="cx-form-actions">
            <button type="submit" className="cx-btn-primary" disabled={charg || !!succes}>
              {charg && <span className="cx-spinner" />}
              {charg ? 'Création...' : 'Créer mon compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page Mot de passe oublié — Email — plein écran ────────────
function PageOublieEmail({ onRetour, onSuivant }) {
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
        setTimeout(() => onSuivant(), 2000)
      }
    } catch { setErreur('Erreur de connexion au serveur.') }
    setCharg(false)
  }

  return (
    <div className="cx-standalone">
      <button className="cx-back-btn" onClick={onRetour} title="Retour"><IcoFleche /></button>
      <div className="cx-standalone-card cx-standalone-card-sm">
        <div className="cx-standalone-header">
          <div className="cx-standalone-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h2 className="cx-standalone-titre">Mot de passe oublié</h2>
          <p className="cx-standalone-sous">Entrez votre email pour recevoir un code de réinitialisation</p>
        </div>

        <form onSubmit={soumettre} className="cx-form">
          <Champ label="Votre adresse e-mail" icone={Ico.email}>
            <input className="cx-input" type="email" placeholder="votre@email.com"
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
            <button type="submit" className="cx-btn-primary" disabled={charg}>
              {charg && <span className="cx-spinner" />}
              {charg ? 'Envoi...' : 'Envoyer le code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Vue Mot de passe oublié — Code ────────────────────────────
function PageOublieCode({ onRetour, onSucces }) {
  const emailSauvegarde     = localStorage.getItem('trace_reset_email') || ''
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
        body: JSON.stringify({ email: emailSauvegarde, code, password: mdp, password_confirmation: conf }),
      })
      const d = await r.json()
      if (!r.ok) { setErreur(d.message || 'Erreur de réinitialisation.') }
      else {
        setSucces(d.message)
        localStorage.removeItem('trace_reset_email')
        setTimeout(() => onSucces(), 2000)
      }
    } catch { setErreur('Erreur de connexion au serveur.') }
    setCharg(false)
  }

  return (
    <div className="cx-standalone">
      <button className="cx-back-btn" onClick={onRetour} title="Retour"><IcoFleche /></button>
      <div className="cx-standalone-card cx-standalone-card-sm">
        <div className="cx-standalone-header">
          <div className="cx-standalone-ico vert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 className="cx-standalone-titre">Nouveau mot de passe</h2>
          {emailSauvegarde && (
            <p className="cx-standalone-sous">Code envoyé à <strong>{emailSauvegarde}</strong></p>
          )}
        </div>

        <form onSubmit={soumettre} className="cx-form">
          <Champ label="Code à 6 chiffres" icone={Ico.key}>
            <input className="cx-input cx-input-code" type="text" placeholder="000000"
              maxLength={6} inputMode="numeric"
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
              {mdp === conf ? <>{Ico.check} Mots de passe identiques</> : <>{Ico.alerte} Mots de passe différents</>}
            </span>
          )}
          <Erreur msg={erreur} />
          <Succes msg={succes} />
          <div className="cx-form-actions">
            <button type="submit" className="cx-btn-primary" disabled={charg}>
              {charg && <span className="cx-spinner" />}
              {charg ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
