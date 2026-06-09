// PageVIP.jsx — Scores exacts VIP organisés par championnat
import { useState, useEffect, useRef } from 'react'
import { obtenirMatchsVip, initierPaiementVip, verifierPaiementVip, trackerActivite } from '../../../adapters/api/ServiceApi.js'
import './PageVIP.css'

// ── Logos championnats ─────────────────────────────────────────
const L = id => `https://media.api-sports.io/football/leagues/${id}.png`
const LOGOS_VIP = {
  'Champions League': L(2),   'Europa League': L(3),
  'Conference League': L(848),'Premier League': L(39),
  'Championship': L(40),      'La Liga': L(140),
  'Ligue 1': L(61),           'Ligue 2': L(62),
  'Serie A': L(135),          'Serie B': L(136),
  'Bundesliga': L(78),        '2. Bundesliga': L(79),
  'Liga Portugal': L(94),     'Pro League': L(144),
  'Eredivisie': L(88),        'Super Lig': L(203),
  'Süper Lig': L(203),        'MLS': L(253),
  'FA Cup': L(45),            'Copa del Rey': L(143),
  'Coupe de France': L(66),   'DFB Pokal': L(81),
  'Brasileirao Série A': L(71),
}

const METHODES_PAIEMENT = [
  { id: 'wave',         label: 'Wave',         emoji: '🌊', desc: 'Paiement direct — application Wave Sénégal'  },
  { id: 'orange_money', label: 'Orange Money', emoji: '🟠', desc: 'Paiement direct — Orange Money Sénégal'      },
]

// ── Composants ─────────────────────────────────────────────────
function LogoChamp({ nom, taille = 28 }) {
  const [ok, setOk] = useState(true)
  const src = LOGOS_VIP[nom]
  const img = Math.round(taille * 0.72)
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:taille, height:taille, borderRadius:'50%',
      background:'rgba(255,255,255,.92)', flexShrink:0, overflow:'hidden',
      boxShadow:'0 1px 4px rgba(0,0,0,.2)',
    }}>
      {src && ok
        ? <img src={src} alt={nom} style={{width:img,height:img,objectFit:'contain'}} onError={() => setOk(false)} />
        : <span style={{fontSize: Math.round(taille * 0.45) + 'px'}}>🏆</span>}
    </span>
  )
}

function LogoEquipe({ src, nom, taille = 44 }) {
  const [ok, setOk] = useState(true)
  const init = (nom || '?').charAt(0).toUpperCase()
  const couleurs = ['#1b5e20','#1e3a5f','#7c3aed','#d97706','#dc2626','#0891b2']
  const col = couleurs[init.charCodeAt(0) % couleurs.length]
  const s = { width: taille, height: taille, borderRadius: '50%', flexShrink: 0, objectFit: 'contain' }
  if (src && ok) return <img src={src} alt={nom} style={s} onError={() => setOk(false)} />
  return (
    <div style={{ ...s, background: col + '18', border: `2px solid ${col}40`,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize: Math.round(taille * 0.4) + 'px', fontWeight: 800, color: col }}>{init}</span>
    </div>
  )
}

const IcoStar   = () => <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IcoVerrou = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const IcoDever  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
const IcoRetour = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><polyline points="15 18 9 12 15 6"/></svg>
const IcoCheck  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:36,height:36}}><polyline points="20 6 9 17 4 12"/></svg>
const IcoXMark  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:36,height:36}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoClock  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IcoPhone  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>

function compterRebours(publie_le) {
  if (!publie_le) return null
  const fin = new Date(publie_le).getTime() + 24 * 60 * 60 * 1000
  const reste = fin - Date.now()
  if (reste <= 0) return null
  const h = Math.floor(reste / 3600000)
  const m = Math.floor((reste % 3600000) / 60000)
  return `${h}h${String(m).padStart(2, '0')}`
}

// ── Composant principal ────────────────────────────────────────
export default function PageVIP() {
  const [matchs, setMatchs]             = useState([])
  const [dejaPayes, setPayes]           = useState([])
  const [charg, setCharg]               = useState(true)
  const [msg, setMsg]                   = useState('')
  const [rebours, setRebours]           = useState({})
  const [champsOuverts, setChampsOuverts] = useState({})
  const timerRef = useRef(null)

  // Navigation interne : 'liste' | 'paiement' | 'succes' | 'echec'
  const [vue, setVue]                   = useState('liste')
  const [matchDetail, setMatchDetail]   = useState(null)
  const [matchPaiement, setMatchPaiement] = useState(null)

  // Formulaire paiement
  const [methode, setMethode]           = useState('wave')
  const [telephone, setTel]             = useState('')
  const [enCours, setEnCours]           = useState(false)
  const [msgPaiement, setMsgPaiement]   = useState('')

  // ── Chargement initial + gestion retour Wave / Orange Money ──────
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search)
    const paiement   = params.get('vip_payment')   // 'succes' | 'echec'
    const ref        = params.get('ref')            // ex: TFC-XXXXXXXXXX-42

    // Nettoyer l'URL immédiatement (avant tout rechargement)
    if (paiement || ref) {
      const hash = window.location.hash || '#vip'
      window.history.replaceState({}, '', window.location.pathname + hash)
    }

    if (paiement === 'succes' && ref) {
      // Retour de Wave/OM avec succès → vérifier auprès du backend
      charger().then(async () => {
        try {
          const r = await verifierPaiementVip(ref)
          if (r.statut === 'valide') {
            await charger()   // recharger pour afficher le score débloqué
            setVue('succes')
          } else {
            // Wave a dit succès mais backend pas encore confirmé → attendre webhook
            setVue('succes')  // afficher succès optimiste, le score sera là au prochain chargement
          }
        } catch {
          setVue('succes')    // afficher succès quand même, le webhook finira par valider
        }
      })
    } else if (paiement === 'echec') {
      charger().then(() => setVue('echec'))
    } else {
      charger()
    }
  }, [])

  // Compte à rebours mis à jour chaque minute
  useEffect(() => {
    const maj = () => {
      const map = {}
      matchs.forEach(m => { if (m.publie_le) map[m.id] = compterRebours(m.publie_le) })
      setRebours(map)
    }
    maj()
    timerRef.current = setInterval(maj, 60000)
    return () => clearInterval(timerRef.current)
  }, [matchs])

  async function charger() {
    setCharg(true)
    try {
      const d = await obtenirMatchsVip()
      const liste = d.matchs || []
      setMatchs(liste)
      setPayes(d.deja_payes || [])
      const champs = [...new Set(liste.map(m => m.competition))]
      setChampsOuverts(champs.reduce((acc, c) => ({ ...acc, [c]: true }), {}))
    } catch { setMsg('Erreur de chargement des matchs VIP.') }
    setCharg(false)
  }

  const toggleChamp = c => setChampsOuverts(p => ({ ...p, [c]: !p[c] }))

  function ouvrirPaiement(match) {
    setMatchPaiement(match)
    setMethode('wave')
    setTel('')
    setMsgPaiement('')
    setVue('paiement')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    trackerActivite('vip_debloquer', `${match.domicile} vs ${match.exterieur}`)
  }

  function retourListe() {
    setVue('liste')
    setMatchPaiement(null)
    setMsgPaiement('')
    setMsg('')
  }

  async function payer(e) {
    e.preventDefault()
    const num = telephone.replace(/\s/g, '')
    if (!num.match(/^(221)?[0-9]{9}$/)) {
      setMsgPaiement('Numéro invalide. Exemple : 771234567')
      return
    }
    setEnCours(true)
    setMsgPaiement('')
    try {
      const r = await initierPaiementVip({
        match_id: matchPaiement.id,
        methode,
        telephone: num,
        montant: 10000,
      })

      if (r.redirect_url) {
        // Redirection vers Wave / Orange Money pour valider le paiement
        window.location.href = r.redirect_url
        return
      }

      if (r.statut === 'succes' || r.status === 'success') {
        await charger()
        setVue('succes')
      } else {
        setMsgPaiement(r.message || 'Paiement non abouti. Veuillez réessayer.')
      }
    } catch {
      setMsgPaiement('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    }
    setEnCours(false)
  }

  const metLabel = METHODES_PAIEMENT.find(m => m.id === methode)?.label || methode

  // ── Skeleton de chargement ────────────────────────────────────
  if (charg) return (
    <div className="page-vip">
      <div className="vip-skel-header" />
      <div className="vip-skel-body">
        {[1, 2, 3].map(i => (
          <div key={i} className="vip-skel-carte">
            <div className="vip-skel-comp" />
            <div className="vip-skel-equipes">
              <div className="vip-skel-cercle" />
              <div className="vip-skel-vs" />
              <div className="vip-skel-cercle" />
            </div>
            <div className="vip-skel-score" />
            <div className="vip-skel-btn" />
          </div>
        ))}
      </div>
    </div>
  )

  // ══ VUE DÉTAIL SCORE ═════════════════════════════════════════
  if (matchDetail) {
    const m = matchDetail
    const correct = m.score_reel && m.score_exact_predit === m.score_reel
    const tps     = rebours[m.id]
    return (
      <div className="page-vip">
        <button className="vip-detail-retour" onClick={() => setMatchDetail(null)}>
          <IcoRetour /> Retour
        </button>
        <div className="vip-detail-carte">
          <div className="vip-detail-badge"><IcoStar /> Score VIP Exclusif</div>
          <div className="vip-detail-comp">
            <LogoChamp nom={m.competition} taille={30} />
            <span>{m.competition}</span>
          </div>
          <div className="vip-detail-date">{m.date} · {m.heure}</div>
          {tps && (
            <div className="vip-detail-timer"><IcoClock /> Disponible encore {tps}</div>
          )}
          <div className="vip-detail-equipes">
            <div className="vip-detail-equipe">
              <LogoEquipe src={m.logo_dom} nom={m.domicile} taille={36} />
              <span>{m.domicile}</span>
            </div>
            <span className="vip-detail-vs">VS</span>
            <div className="vip-detail-equipe">
              <LogoEquipe src={m.logo_ext} nom={m.exterieur} taille={36} />
              <span>{m.exterieur}</span>
            </div>
          </div>
          <div className="vip-detail-score-zone">
            <div className="vip-detail-score-lbl"><IcoDever /><span>Score exact prédit</span></div>
            <div className="vip-detail-score">{m.score_exact_predit}</div>
          </div>
          {!m.score_reel ? (
            <div className="vip-detail-attente">
              ⏳ En attente du résultat final
            </div>
          ) : (
            <div className={`vip-detail-resultat ${correct ? 'correct' : 'perdu'}`}>
              <div className="vip-detail-res-ico">
                {correct ? <IcoCheck /> : <IcoXMark />}
              </div>
              <div className="vip-detail-res-info">
                <span className="vip-detail-res-titre">
                  {correct ? '✅ Score exact validé !' : '❌ Score non réalisé'}
                </span>
                <span className="vip-detail-res-score">Résultat réel : <strong>{m.score_reel}</strong></span>
              </div>
            </div>
          )}
          <button className="vip-detail-retour-bas" onClick={() => setMatchDetail(null)}>
            <IcoRetour /> Retour aux matchs VIP
          </button>
        </div>
      </div>
    )
  }

  // ══ VUE PAIEMENT — plein écran fixe, couvre navbar et header ════
  if (vue === 'paiement' && matchPaiement) {
    const m = matchPaiement
    return (
      <div className="vip-pay-overlay">
        <div className="vip-pay-page">

          {/* Info match */}
          <div className="vip-pay-match-card">
            <div className="vip-pay-match-badge"><IcoStar /> Score VIP Exclusif</div>
            <div className="vip-pay-match-corps">
              <div className="vip-pay-equipe">
                <LogoEquipe src={m.logo_dom} nom={m.domicile} taille={48} />
                <span>{m.domicile}</span>
              </div>
              <div className="vip-pay-centre">
                <div className="vip-pay-vs-badge">VS</div>
                <span className="vip-pay-compet-txt">{m.competition}</span>
                <span className="vip-pay-date-txt">{m.date} · {m.heure}</span>
              </div>
              <div className="vip-pay-equipe">
                <LogoEquipe src={m.logo_ext} nom={m.exterieur} taille={48} />
                <span>{m.exterieur}</span>
              </div>
            </div>
            <div className="vip-pay-montant-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Montant : <strong>10 000 FCFA</strong>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={payer} className="vip-pay-form">

            {/* Méthode */}
            <div className="vip-pay-champ">
              <label className="vip-pay-label">Mode de paiement</label>
              <div className="vip-pay-select-wrap">
                <select className="vip-pay-select" value={methode} onChange={e => setMethode(e.target.value)}>
                  {METHODES_PAIEMENT.map(met => (
                    <option key={met.id} value={met.id}>{met.label} — {met.desc}</option>
                  ))}
                </select>
                <span className="vip-pay-select-icone">▾</span>
              </div>
            </div>

            {/* Téléphone */}
            <div className="vip-pay-champ">
              <label className="vip-pay-label">Numéro de téléphone</label>
              <div className="vip-pay-input-wrap">
                <span className="vip-pay-input-icone"><IcoPhone /></span>
                <input type="tel" className="vip-pay-input"
                  placeholder="Ex : 771234567"
                  value={telephone} onChange={e => setTel(e.target.value)}
                  required autoFocus />
              </div>
              <span className="vip-pay-hint">Numéro associé à votre compte {metLabel}</span>
            </div>

            {msgPaiement && (
              <div className="vip-pay-erreur">{msgPaiement}</div>
            )}

            {/* Boutons */}
            <div className="vip-pay-actions">
              <button type="button" className="vip-pay-btn-annuler" onClick={retourListe}>
                Retour
              </button>
              <button type="submit" className="vip-pay-btn-payer" disabled={enCours}>
                {enCours
                  ? <><span className="vip-pay-spinner"/> Traitement...</>
                  : `Payer par ${metLabel}`}
              </button>
            </div>
          </form>

        </div>
      </div>
    )
  }

  // ══ VUE SUCCÈS PAIEMENT ══════════════════════════════════════
  if (vue === 'succes') {
    const m = matchPaiement || matchs.find(x => dejaPayes.includes(x.id))
    return (
      <div className="page-vip">
        <div className="vip-resultat-page">
          <div className="vip-res-ico-wrap succes">
            <IcoCheck />
          </div>
          <h2 className="vip-res-titre">Paiement effectué !</h2>
          <p className="vip-res-sous">
            Votre score exact a été débloqué avec succès. Vous pouvez maintenant le consulter.
          </p>
          {m && (
            <div className="vip-res-match-info">
              <span>{m.domicile}</span>
              <span className="vip-res-vs">VS</span>
              <span>{m.exterieur}</span>
            </div>
          )}
          <button className="vip-res-btn-primaire" onClick={() => {
            setVue('liste')
            setMatchPaiement(null)
          }}>
            Voir mes scores VIP
          </button>
        </div>
      </div>
    )
  }

  // ══ VUE ÉCHEC PAIEMENT ═══════════════════════════════════════
  if (vue === 'echec') {
    return (
      <div className="page-vip">
        <div className="vip-resultat-page">
          <div className="vip-res-ico-wrap echec">
            <IcoXMark />
          </div>
          <h2 className="vip-res-titre echec">Paiement en échec</h2>
          <p className="vip-res-sous">
            Le paiement n'a pas pu être finalisé. Le score reste verrouillé jusqu'à confirmation du paiement.
          </p>
          <div className="vip-res-actions">
            {matchPaiement && (
              <button className="vip-res-btn-primaire" onClick={() => setVue('paiement')}>
                Réessayer le paiement
              </button>
            )}
            <button className="vip-res-btn-secondaire" onClick={retourListe}>
              Retour aux matchs VIP
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══ VUE LISTE — matchs triés par date puis par heure ════════════
  // Classement par match (pas par championnat)
  const matchsTries = [...matchs].sort((a, b) => {
    const da = (a.date || '') + ' ' + (a.heure || '')
    const db = (b.date || '') + ' ' + (b.heure || '')
    return da.localeCompare(db)
  })

  // Grouper par date pour séparer les jours
  const parDate = matchsTries.reduce((acc, m) => {
    const d = m.date || 'Autre'
    if (!acc[d]) acc[d] = []
    acc[d].push(m)
    return acc
  }, {})
  const dates = Object.keys(parDate).sort()

  const nbDebloques = matchs.filter(m => dejaPayes.includes(m.id)).length

  return (
    <div className="page-vip">

      {/* Header compact */}
      <div className="vip-header-compact">
        <div className="vip-header-gauche">
          <IcoStar />
          <div>
            <span className="vip-titre-compact">Scores VIP</span>
            <span className="vip-sous-compact">10 000 FCFA · 24h
              {nbDebloques > 0 && <span className="vip-debloques-badge"> · {nbDebloques} débloqué{nbDebloques > 1 ? 's' : ''}</span>}
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`vip-msg ${msg.includes('Erreur') || msg.includes('❌') ? 'erreur' : 'ok'}`}>
          {msg}
        </div>
      )}

      {matchs.length === 0 && (
        <div className="vip-vide">
          <IcoStar />
          <p>Aucun score VIP disponible pour le moment</p>
          <small>Les scores sont publiés par l'admin et disponibles pendant 24h</small>
        </div>
      )}

      {/* Liste par date puis par match */}
      {dates.map(date => {
        const liste = parDate[date]
        const d = new Date(date + 'T12:00:00')
        const auj = new Date(); auj.setHours(0,0,0,0)
        const labelD = d.toDateString() === auj.toDateString()
          ? "Aujourd'hui"
          : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

        return (
          <div key={date} className="vip-date-section">
            <div className="vip-date-header">
              <span className="vip-date-label">{labelD}</span>
              <span className="vip-date-nb">{liste.length} match{liste.length > 1 ? 's' : ''}</span>
            </div>

            <div className="vip-matchs-liste">
              {liste.map(m => {
                const paye = dejaPayes.includes(m.id)
                const tps  = rebours[m.id]
                return (
                  <div key={m.id} className={`vip-carte-c ${paye ? 'payee' : ''}`}>

                    {/* Ligne 1 : championnat + heure + statut */}
                    <div className="vip-c-top">
                      <LogoChamp nom={m.competition} taille={18} />
                      <span className="vip-c-comp">{m.competition}</span>
                      {tps
                        ? <span className="vip-c-timer"><IcoClock /> {tps}</span>
                        : <span className="vip-c-heure">{m.heure}</span>}
                      {paye
                        ? <span className="vip-c-badge paye">✅ Débloqué</span>
                        : <span className="vip-c-badge lock">🔒 10 000 F</span>}
                    </div>

                    {/* Ligne 2 : équipes + score/verrou en une seule ligne */}
                    <div className="vip-c-row">
                      {/* Domicile */}
                      <div className="vip-c-equipe">
                        <LogoEquipe src={m.logo_dom} nom={m.domicile} taille={26} />
                        <span className="vip-c-nom">{m.domicile}</span>
                      </div>

                      {/* Centre : score ou verrou */}
                      <div className="vip-c-centre">
                        {paye ? (
                          <div className="vip-c-score-zone">
                            <span className="vip-c-score"
                              onClick={() => { setMatchDetail(m); trackerActivite('vip_detail', `${m.domicile} vs ${m.exterieur}`) }}
                              title="Voir le détail">
                              {m.score_exact_predit || '?-?'}
                            </span>
                            {!m.score_reel && (
                              <span className="vip-c-attente">⏳ En attente</span>
                            )}
                          </div>
                        ) : (
                          <button className="vip-c-btn-lock" onClick={() => ouvrirPaiement(m)}>
                            <IcoVerrou />
                            <span>Débloquer</span>
                          </button>
                        )}
                      </div>

                      {/* Extérieur */}
                      <div className="vip-c-equipe ext">
                        <span className="vip-c-nom">{m.exterieur}</span>
                        <LogoEquipe src={m.logo_ext} nom={m.exterieur} taille={26} />
                      </div>
                    </div>

                    {/* Ligne 3 : résultat réel si payé + confirmé */}
                    {paye && m.score_reel && (
                      <div className={`vip-c-resultat ${m.score_exact_predit === m.score_reel ? 'correct' : 'perdu'}`}>
                        {m.score_exact_predit === m.score_reel
                          ? `✅ Score exact ! Réel : ${m.score_reel}`
                          : `❌ Résultat réel : ${m.score_reel}`}
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

