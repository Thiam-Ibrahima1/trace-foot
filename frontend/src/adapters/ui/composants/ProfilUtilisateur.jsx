// ProfilUtilisateur.jsx — Panneau profil plein écran
import { useState } from 'react'
import { useAuth } from '../../../infrastructure/auth/AuthContexte.jsx'
import { modifierProfil } from '../../api/ServiceApi.js'
import './ProfilUtilisateur.css'

// ── Icônes SVG ────────────────────────────────────────────────
const IcoRetour = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
  </svg>
)
const IcoEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IcoInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IcoDeco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IcoChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,color:'#94a3b8'}}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IcoUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const IcoMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IcoPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
  </svg>
)
const IcoOk = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ── Descriptions des 3 sections ───────────────────────────────
const SECTIONS = [
  {
    couleur: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    titre: 'Prédictions',
    ico: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    desc: 'Consultez chaque jour les analyses de matchs avec leurs combinaisons vérifiées. Retrouvez les résultats des jours passés, les matchs du jour et le programme de la semaine.',
  },
  {
    couleur: '#dc2626',
    bg: '#fff5f5',
    border: '#fecaca',
    titre: 'Direct',
    ico: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
    desc: 'Suivez tous les matchs en cours en temps réel. Scores, minutes de jeu et statut des rencontres mis à jour automatiquement. Cliquez sur un match pour voir le détail.',
  },
  {
    couleur: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    titre: 'VIP',
    ico: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{width:20,height:20}}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    desc: 'Accédez aux scores exacts prédits en exclusivité. Déverrouillez un match en une seule fois pour 10 000 FCFA et consultez la prédiction pendant 24 heures.',
  },
]

// ── Composant principal ───────────────────────────────────────
export default function ProfilUtilisateur({ onFermer }) {
  const { utilisateur, mettreAJourUtilisateur, deconnecter } = useAuth()
  const [section, setSection] = useState('menu') // 'menu' | 'edit' | 'detail'

  const prenom = utilisateur?.prenom || utilisateur?.name?.split(' ')[0] || 'Utilisateur'
  const nom    = utilisateur?.nom    || utilisateur?.name?.split(' ').slice(1).join(' ') || ''
  const initiale = prenom.charAt(0).toUpperCase()

  return (
    <div className="pru-page">

      {/* ── Topbar ── */}
      <div className="pru-topbar">
        <button className="pru-retour" onClick={section === 'menu' ? onFermer : () => setSection('menu')}>
          <IcoRetour />
        </button>
        <span className="pru-topbar-titre">
          {section === 'menu'   && 'Mon profil'}
          {section === 'edit'   && 'Modifier mes informations'}
          {section === 'detail' && 'À propos'}
        </span>
        <div style={{width:36}} />
      </div>

      {/* ── Menu principal ── */}
      {section === 'menu' && (
        <div className="pru-corps">
          {/* Hero bannière */}
          <div className="pru-hero">
            <div className="pru-avatar-grand">{initiale}</div>
            <div className="pru-hero-infos">
              <span className="pru-hero-nom">{prenom} {nom}</span>
              <span className="pru-hero-email">{utilisateur?.email}</span>
              {utilisateur?.telephone && (
                <span className="pru-hero-tel">{utilisateur.telephone}</span>
              )}
            </div>
          </div>
          <div className="pru-hero-wave" />

          {/* Menu items */}
          <div className="pru-menu-wrap">
            <div className="pru-menu">
              <button className="pru-item" onClick={() => setSection('edit')}>
                <div className="pru-item-ico vert"><IcoEdit /></div>
                <div className="pru-item-txt">
                  <span className="pru-item-titre">Modifier mes informations</span>
                  <span className="pru-item-sous">Nom, email, téléphone</span>
                </div>
                <IcoChevron />
              </button>
              <button className="pru-item" onClick={() => setSection('detail')}>
                <div className="pru-item-ico bleu"><IcoInfo /></div>
                <div className="pru-item-txt">
                  <span className="pru-item-titre">À propos de l'application</span>
                  <span className="pru-item-sous">Prédictions · Direct · VIP</span>
                </div>
                <IcoChevron />
              </button>
            </div>

            {/* Déconnexion */}
            <div className="pru-deco-zone">
              <button className="pru-btn-deco" onClick={deconnecter}>
                <IcoDeco />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Modifier ── */}
      {section === 'edit' && (
        <SectionEdit
          utilisateur={utilisateur}
          onSucces={u => { mettreAJourUtilisateur(u); setSection('menu') }}
        />
      )}

      {/* ── Section Détail ── */}
      {section === 'detail' && <SectionDetail />}
    </div>
  )
}

// ── Section Modifier infos ─────────────────────────────────────
function SectionEdit({ utilisateur, onSucces }) {
  const [form, setForm] = useState({
    prenom:    utilisateur?.prenom    || '',
    nom:       utilisateur?.nom       || '',
    email:     utilisateur?.email     || '',
    telephone: utilisateur?.telephone || '',
  })
  const [charg, setCharg]   = useState(false)
  const [erreur, setErreur] = useState('')
  const [ok, setOk]         = useState(false)

  const maj = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function soumettre(e) {
    e.preventDefault(); setErreur(''); setCharg(true)
    try {
      const r = await modifierProfil(form)
      if (r.utilisateur) { setOk(true); setTimeout(() => onSucces(r.utilisateur), 900) }
      else setErreur(r.message || 'Erreur de mise à jour.')
    } catch { setErreur('Erreur de connexion.') }
    setCharg(false)
  }

  return (
    <div className="pru-corps">
      <div className="pru-edit-wrap">
        <div className="pru-edit-card">
          <form onSubmit={soumettre} className="pru-edit-form" style={{gap:0}}>
            <div className="pru-edit-grille" style={{marginBottom:12}}>
              <div className="pru-champ">
                <label className="pru-label"><IcoUser /> Prénom</label>
                <input className="pru-input" name="prenom" value={form.prenom}
                  onChange={maj} placeholder="Prénom" autoFocus />
              </div>
              <div className="pru-champ">
                <label className="pru-label"><IcoUser /> Nom</label>
                <input className="pru-input" name="nom" value={form.nom}
                  onChange={maj} placeholder="Nom" />
              </div>
            </div>

            <div className="pru-champ" style={{marginBottom:12}}>
              <label className="pru-label"><IcoMail /> Adresse e-mail</label>
              <input className="pru-input" type="email" name="email" value={form.email}
                onChange={maj} placeholder="email@exemple.com" />
            </div>

            <div className="pru-champ" style={{marginBottom:16}}>
              <label className="pru-label"><IcoPhone /> Téléphone</label>
              <input className="pru-input" type="tel" name="telephone" value={form.telephone}
                onChange={maj} placeholder="771234567" />
            </div>

            {erreur && <div className="pru-erreur" style={{marginBottom:12}}>{erreur}</div>}
            {ok     && <div className="pru-succes" style={{marginBottom:12}}><IcoOk /> Informations mises à jour</div>}

            <div className="pru-edit-actions">
              <button type="submit" className="pru-btn-save" disabled={charg || ok}>
                {charg ? <><span className="pru-spinner"/> Enregistrement...</> : ok ? <><IcoOk /> Enregistré</> : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Section Détail ─────────────────────────────────────────────
function SectionDetail() {
  return (
    <div className="pru-corps-fixe">
      <div className="pru-detail-wrap">
        <p className="pru-detail-intro">
          Découvrez les 3 espaces de Sen Foot et comment en tirer le meilleur parti.
        </p>
        {SECTIONS.map(s => (
          <div key={s.titre} className="pru-detail-card"
            style={{ background: s.bg, borderColor: s.border }}>
            <div className="pru-detail-card-header">
              <div className="pru-detail-ico" style={{ color: s.couleur, background: s.bg }}>
                {s.ico}
              </div>
              <span className="pru-detail-titre" style={{ color: s.couleur }}>{s.titre}</span>
            </div>
            <p className="pru-detail-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
