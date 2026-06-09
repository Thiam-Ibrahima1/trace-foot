// PageVIPAdmin.jsx — Gestion VIP côté admin
// Onglet 1 : Prédictions (ajouter/modifier par date, groupé par championnat)
// Onglet 2 : Historique (tous les scores publiés)
// Onglet 3 : Paiements (liste des paiements validés)
import { useState, useEffect } from 'react'
import {
  obtenirPredVipAdmin, sauvegarderPredVip,
  obtenirPaiementsAdmin, formaterDateAPI,
  mettreAJourScoreVip, obtenirToutesPredVipAdmin,
  supprimerPredictionVip, getMatchsDuJour,
} from '../../../adapters/api/ServiceApi.js'
import './PageVIPAdmin.css'

// ── Logos championnats ────────────────────────────────────────
const L    = id => `https://media.api-sports.io/football/leagues/${id}.png`
const FLAG = c  => `https://flagcdn.com/w20/${c}.png`
const LOGOS_VIP = {
  'Champions League': L(2),   'Europa League': L(3),    'Conference League': L(848),
  'Premier League':   L(39),  'Championship': L(40),    'FA Cup': L(45),
  'La Liga':          L(140), 'Segunda División': L(141),'Copa del Rey': L(143),
  'Ligue 1':          L(61),  'Ligue 2': L(62),          'Coupe de France': L(66),
  'Serie A':          L(135), 'Serie B': L(136),          'Coppa Italia': L(137),
  'Bundesliga':       L(78),  '2. Bundesliga': L(79),    'DFB Pokal': L(81),
  'Liga Portugal':    L(94),  'Primeira Liga': L(94),    'Pro League': L(144),
  'Eredivisie':       L(88),  'Super Lig': L(203),        'Süper Lig': L(203),
  'Super League':     L(197), 'Premiership': L(179),      'MLS': L(253),
  'Brasileirao Série A': L(71),
}
const FLAGS_VIP = {
  'Premier League': FLAG('gb-eng'), 'Championship': FLAG('gb-eng'),
  'La Liga': FLAG('es'),   'Ligue 1': FLAG('fr'),  'Ligue 2': FLAG('fr'),
  'Serie A': FLAG('it'),   'Bundesliga': FLAG('de'), '2. Bundesliga': FLAG('de'),
  'Liga Portugal': FLAG('pt'), 'Pro League': FLAG('be'), 'Eredivisie': FLAG('nl'),
  'Super Lig': FLAG('tr'), 'Süper Lig': FLAG('tr'), 'Super League': FLAG('gr'),
  'MLS': FLAG('us'),       'Premiership': FLAG('gb-sct'),
}

function LogoChampVip({ nom, taille = 28 }) {
  const [ok, setOk]       = useState(true)
  const [flagOk, setFlagOk] = useState(true)
  const src  = LOGOS_VIP[nom]
  const flag = FLAGS_VIP[nom]
  const style = {
    width: taille, height: taille, borderRadius: '50%', flexShrink: 0,
    background: '#f0fdf4', border: '1px solid #c8e6c9', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  if (src && ok)
    return <div style={style}><img src={src} alt={nom}
      style={{width:taille-4,height:taille-4,objectFit:'contain'}}
      onError={() => setOk(false)}/></div>
  if (flag && flagOk)
    return <div style={style}><img src={flag} alt={nom}
      style={{width:taille,height:Math.round(taille*.67),objectFit:'cover'}}
      onError={() => setFlagOk(false)}/></div>
  return <div style={style}><span style={{fontSize:Math.round(taille*.42)+'px'}}>⚽</span></div>
}

// ── Icônes ────────────────────────────────────────────────────
const IcoEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IcoTrash = () => (
  <svg viewBox="0 0 16 16" fill="none" style={{width:13,height:13}}>
    <polyline points="2 4 4 4 14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 4l-1 9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 13L3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 4V3h4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// ── Composant principal ───────────────────────────────────────
export default function PageVIPAdmin({ ongletInitial = 'predictions' }) {
  const [onglet, setOnglet]   = useState(ongletInitial)
  const [preds, setPreds]     = useState([])
  const [paiements, setPai]   = useState([])
  const [statsPai, setStatsPai] = useState({})
  const [dateVip, setDateVip] = useState(formaterDateAPI(new Date()))
  const [form, setForm]       = useState({
    match_id:'', competition:'', domicile:'', exterieur:'',
    heure:'', date: formaterDateAPI(new Date()), score_exact_predit:'', publie: true,
    logo_dom: null, logo_ext: null,
  })
  const [msg, setMsg]         = useState('')
  // Édition inline dans Prédictions
  const [editPredId, setEditPredId]     = useState(null)
  const [editPredScore, setEditPredScore] = useState('')
  const [editPredMsg, setEditPredMsg]   = useState({})
  // Suppression dans Prédictions
  const [suppPredConf, setSuppPredConf] = useState(null)
  const [suppPredEnCours, setSuppPredEnCours] = useState(false)

  // Historique
  const [historique, setHistorique]   = useState([])
  const [chargHisto, setChargHisto]   = useState(false)
  const [editHistoId, setEditHistoId] = useState(null)
  const [editHistoScore, setEditHistoScore] = useState('')
  const [suppHistoConf, setSuppHistoConf] = useState(null)
  const [suppHistoEnCours, setSuppHistoEnCours] = useState(false)
  const [msgHisto, setMsgHisto]       = useState('')

  useEffect(() => {
    if (onglet === 'predictions') chargerPreds()
    if (onglet === 'paiements')   chargerPaiements()
    if (onglet === 'historique')  chargerHistorique()
  }, [onglet, dateVip])

  async function chargerPreds() {
    const d = await obtenirPredVipAdmin(dateVip)
    setPreds(Array.isArray(d) ? d : d.predictions || d.data || [])
  }
  async function chargerPaiements() {
    const d = await obtenirPaiementsAdmin()
    setPai(d.paiements || []); setStatsPai(d.stats || {})
  }
  async function chargerHistorique() {
    setChargHisto(true)
    try {
      // Toutes les prédictions VIP (toutes dates confondues)
      const r = await obtenirToutesPredVipAdmin()
      const liste = r.predictions || r.data || (Array.isArray(r) ? r : [])
      // Trier : date décroissante, puis heure
      liste.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date)
        return (a.heure || '').localeCompare(b.heure || '')
      })
      setHistorique(liste)
    } catch { setMsgHisto('Erreur de chargement.') }
    setChargHisto(false)
  }

  // Quand l'admin entre un match_id, chercher le match dans les données du jour
  // et pré-remplir automatiquement domicile, extérieur, heure, competition et logos
  async function onMatchIdChange(val) {
    setForm(f => ({ ...f, match_id: val }))
    if (!val || val.length < 5) return
    try {
      const r = await getMatchsDuJour(dateVip)
      const fixture = (r.matchs || []).find(m => String(m.id) === String(val))
      if (fixture) {
        setForm(f => ({
          ...f,
          match_id:    val,
          competition: fixture.competition || f.competition,
          domicile:    fixture.domicile    || f.domicile,
          exterieur:   fixture.exterieur   || f.exterieur,
          heure:       fixture.heure       || f.heure,
          logo_dom:    fixture.logo_dom    || null,
          logo_ext:    fixture.logo_ext    || null,
        }))
      }
    } catch {}
  }

  async function sauvegarder(e) {
    e.preventDefault(); setMsg('')
    try {
      await sauvegarderPredVip({ ...form, date: dateVip })
      setMsg('Prédiction VIP sauvegardée !'); chargerPreds()
    } catch(err) { setMsg('❌ Erreur : ' + err.message) }
  }

  // ── Prédictions : modifier ────────────────────────────────────
  async function sauvegarderModifPred(id) {
    if (!editPredScore.match(/^\d+-\d+$/)) {
      setEditPredMsg(m => ({ ...m, [id]: '⚠️ Format invalide. Ex: 2-1' })); return
    }
    try {
      await mettreAJourScoreVip(id, editPredScore)
      setEditPredMsg(m => ({ ...m, [id]: 'Modifié.' }))
      setEditPredId(null); setEditPredScore('')
      chargerPreds()
    } catch { setEditPredMsg(m => ({ ...m, [id]: '❌ Erreur.' })) }
  }

  // ── Prédictions : supprimer ───────────────────────────────────
  async function supprimerPred(id) {
    setSuppPredEnCours(true)
    try {
      await supprimerPredictionVip(id)
      setSuppPredConf(null)
      setPreds(prev => prev.filter(p => p.id !== id))
    } catch {}
    setSuppPredEnCours(false)
  }

  // ── Historique : modifier ─────────────────────────────────────
  async function sauvegarderModifHisto(id) {
    if (!editHistoScore.match(/^\d+-\d+$/)) {
      setMsgHisto('⚠️ Format invalide. Ex: 2-1'); return
    }
    try {
      await mettreAJourScoreVip(id, editHistoScore)
      setMsgHisto('Score mis à jour.')
      setEditHistoId(null); setEditHistoScore('')
      chargerHistorique()
    } catch { setMsgHisto('❌ Erreur de modification.') }
  }

  // ── Historique : supprimer ────────────────────────────────────
  async function supprimerHisto(id) {
    setSuppHistoEnCours(true)
    try {
      await supprimerPredictionVip(id)
      setSuppHistoConf(null)
      setHistorique(prev => prev.filter(p => p.id !== id))
      setMsgHisto('Score supprimé.')
    } catch { setMsgHisto('❌ Erreur.') }
    setSuppHistoEnCours(false)
  }

  // Groupements
  const parChampPred = preds.reduce((acc, p) => {
    const c = p.competition || 'Autre'
    if (!acc[c]) acc[c] = []
    acc[c].push(p); return acc
  }, {})
  // Grouper historique : date → championnat
  const parDateHisto = historique.reduce((acc, p) => {
    const d = p.date || 'Inconnue'
    if (!acc[d]) acc[d] = {}
    const c = p.competition || 'Autre'
    if (!acc[d][c]) acc[d][c] = []
    acc[d][c].push(p); return acc
  }, {})
  const datesHisto = Object.keys(parDateHisto).sort().reverse()

  // ── Rendu lignes score (réutilisable) ─────────────────────────
  const LigneScore = ({ p, editId, editScore, setEditId, setEditScore, saveEdit, suppConf, setSuppConf, suppEnCours, supprimer, msgEdit }) => {
    const correct = p.score_reel && ((p.score_exact_predit || p.score_prevu) === p.score_reel)
    const perdu   = p.score_reel && !correct
    const scorePredit = p.score_exact_predit || p.score_prevu || '—'
    const enEdit = editId === p.id
    const enSupp = suppConf === p.id
    return (
      <div className={`vipa-ligne ${correct ? 'correct' : perdu ? 'incorrect' : ''}`}>
        <div className="vipa-ligne-match">
          <div className="vipa-ligne-equipes">
            {p.logo_dom && <img src={p.logo_dom} alt="" className="vipa-eq-mini"/>}
            <span className="vipa-ligne-dom">{p.domicile}</span>
            <span className="vipa-ligne-vs">vs</span>
            <span className="vipa-ligne-ext">{p.exterieur}</span>
            {p.logo_ext && <img src={p.logo_ext} alt="" className="vipa-eq-mini"/>}
          </div>
          <div className="vipa-ligne-meta">
            <span>{p.date} {p.heure}</span>
            {p.publie !== undefined && (
              <span className={`vipa-publie-badge ${p.publie ? 'ok' : 'nok'}`}>
                {p.publie ? 'Publié' : 'Masqué'}
              </span>
            )}
          </div>
        </div>

        <div className="vipa-ligne-scores">
          <div className="vipa-histo-score-bloc">
            <span className="vipa-histo-slbl">Prédit</span>
            <span className="vipa-histo-sval predit">{scorePredit}</span>
          </div>
          {p.score_reel && (
            <div className="vipa-histo-score-bloc">
              <span className="vipa-histo-slbl">Réel</span>
              <span className={`vipa-histo-sval ${correct ? 'correct' : 'incorrect'}`}>{p.score_reel}</span>
            </div>
          )}
        </div>

        {msgEdit?.[p.id] && (
          <p className={`vipa-corr-msg ${!msgEdit[p.id].includes('Erreur') && !msgEdit[p.id].includes('❌') && msgEdit[p.id].length > 0 ? 'ok' : 'erreur'}`}>{msgEdit[p.id]}</p>
        )}

        {!enEdit && !enSupp && (
          <div className="vipa-histo-btns">
            <button className="vipa-btn-modifier"
              onClick={() => { setEditId(p.id); setEditScore(scorePredit); setSuppConf(null) }}>
              <IcoEdit /> Modifier
            </button>
            <button className="vipa-btn-supprimer"
              onClick={() => { setSuppConf(p.id); setEditId(null) }}>
              <IcoTrash /> Supprimer
            </button>
          </div>
        )}

        {enEdit && (
          <div className="vipa-histo-edit">
            <input type="text" className="vipa-corr-input"
              placeholder="Nouveau score ex: 2-1"
              value={editScore}
              onChange={e => setEditScore(e.target.value)}/>
            <button className="vipa-corr-btn" onClick={() => saveEdit(p.id)}>✓</button>
            <button className="vipa-btn-annuler-edit" onClick={() => { setEditId(null); setEditScore('') }}>✕</button>
          </div>
        )}

        {enSupp && (
          <div className="vipa-histo-suppr-conf">
            <span>Supprimer ?</span>
            <button className="vipa-conf-oui" onClick={() => supprimer(p.id)} disabled={suppEnCours}>
              {suppEnCours ? '...' : 'Oui'}
            </button>
            <button className="vipa-conf-non" onClick={() => setSuppConf(null)}>Non</button>
          </div>
        )}
      </div>
    )
  }

  // ── Bloc championnat réutilisable ─────────────────────────────
  const BlocChamp = ({ champ, liste, ...ligneProps }) => (
    <div className="vipa-histo-champ">
      <div className="vipa-histo-champ-header">
        <LogoChampVip nom={champ} taille={32} />
        <span className="vipa-histo-champ-nom">{champ}</span>
        <span className="vipa-histo-champ-nb">{liste.length}</span>
      </div>
      {liste.map(p => <LigneScore key={p.id} p={p} {...ligneProps} />)}
    </div>
  )

  return (
    <div className="page-vip-admin">

      {/* ── En-tête ── */}
      <div className="vipa-header">
        <h2 className="vipa-titre">Gestion VIP</h2>
        <div className="vipa-onglets">
          {[['predictions','Prédictions'],['historique','Historique'],['paiements','Paiements']].map(([id,lbl]) => (
            <button key={id} className={`vipa-onglet ${onglet===id?'actif':''}`} onClick={() => setOnglet(id)}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ══ PRÉDICTIONS — formulaire fixe uniquement ════════════ */}
      {onglet === 'predictions' && (
        <div className="vipa-pred-fixe">
          <form className="vipa-form vipa-form-fixe" onSubmit={sauvegarder} style={{overflowY:'hidden'}}>
            <h4 className="vipa-form-titre">Ajouter un score exact VIP</h4>
            <div className="vipa-form-grille">
              <div className="vipa-field">
                <label className="vipa-label">ID Match</label>
                <input type="text" className="vipa-input" value={form.match_id}
                  onChange={e => onMatchIdChange(e.target.value)}
                  placeholder="Ex : 1035048" required/>
                <span style={{fontSize:'.62rem',color:'#94a3b8',marginTop:2}}>
                  Copiez l'ID visible dans la section "Voir les matchs" → les infos se remplissent automatiquement
                </span>
              </div>
              <div className="vipa-field">
                <label className="vipa-label">Date</label>
                <input type="date" className="vipa-input" value={form.date}
                  onChange={e => setForm(f=>({...f, date: e.target.value}))} required/>
              </div>
              {[
                ['competition','Championnat'],
                ['domicile','Équipe domicile'],
                ['exterieur','Équipe extérieure'],
                ['heure','Heure (HH:MM)'],
                ['score_exact_predit','Score exact prédit'],
              ].map(([k,l]) => (
                <div key={k} className="vipa-field">
                  <label className="vipa-label">{l}</label>
                  <input type="text" className="vipa-input" value={form[k] || ''}
                    onChange={e => setForm(f=>({...f,[k]:e.target.value}))}
                    placeholder={l} required/>
                </div>
              ))}
              <div className="vipa-field vipa-field-check">
                <label className="vipa-label-check">
                  <input type="checkbox" checked={form.publie}
                    onChange={e => setForm(f=>({...f,publie:e.target.checked}))}/>
                  Visible dans la section VIP utilisateurs
                </label>
              </div>
            </div>
            {msg && <p className={`vipa-msg ${msg.includes('❌')?'erreur':'ok'}`}>{msg}</p>}
            <div className="vipa-form-actions">
              <button type="submit" className="vipa-btn-save">Valider</button>
            </div>
          </form>
        </div>
      )}

      {/* ══ HISTORIQUE ═══════════════════════════════════════════ */}
      {onglet === 'historique' && (
        <div className="vipa-historique">
          <div className="vipa-histo-header">
            <span className="vipa-histo-titre">Historique des scores exacts publiés</span>
            <span className="vipa-histo-nb">{historique.length} score{historique.length>1?'s':''}</span>
          </div>
          {msgHisto && <p className={`vipa-msg ${!msgHisto.includes('Erreur') && !msgHisto.includes('❌') && msgHisto.length > 0?'ok':'erreur'}`}>{msgHisto}</p>}
          {chargHisto && <p className="vipa-vide">Chargement...</p>}
          {!chargHisto && historique.length === 0 && !msgHisto && (
            <p className="vipa-vide">Aucune prédiction VIP enregistrée.</p>
          )}

          {/* Groupé par date puis par championnat */}
          {datesHisto.map(dateStr => (
            <div key={dateStr} className="vipa-histo-date-section">
              <div className="vipa-histo-date-header">
                <span className="vipa-histo-date-lbl">
                  {new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR',
                    { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </span>
                <span className="vipa-histo-nb">
                  {Object.values(parDateHisto[dateStr]).flat().length} score{Object.values(parDateHisto[dateStr]).flat().length > 1 ? 's' : ''}
                </span>
              </div>
              {Object.keys(parDateHisto[dateStr]).sort().map(champ => (
                <BlocChamp key={champ} champ={champ} liste={parDateHisto[dateStr][champ]}
                  editId={editHistoId}        editScore={editHistoScore}
                  setEditId={setEditHistoId}  setEditScore={setEditHistoScore}
                  saveEdit={sauvegarderModifHisto}
                  suppConf={suppHistoConf}    setSuppConf={setSuppHistoConf}
                  suppEnCours={suppHistoEnCours} supprimer={supprimerHisto}
                  msgEdit={{}}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ══ PAIEMENTS — filtre date + groupement par match ═════ */}
      {onglet === 'paiements' && (() => {
        const [filtreDate, setFiltreDate] = [dateVip, setDateVip]
        // Filtrer par date si une date est choisie
        const paiementsFiltres = filtreDate
          ? paiements.filter(p => p.created_at?.startsWith(filtreDate) || p.prediction_vip?.date === filtreDate)
          : paiements

        // Grouper par match (prediction_vip_id)
        const parMatch = paiementsFiltres.reduce((acc, p) => {
          const key = p.prediction_vip_id || 'orphelin'
          if (!acc[key]) acc[key] = { vip: p.prediction_vip, paiements: [] }
          acc[key].paiements.push(p)
          return acc
        }, {})

        const caTot   = paiementsFiltres.reduce((t, p) => t + (p.montant || 0), 0)

        return (
          <div className="vipa-paiements">
            {/* Stats + filtre date */}
            <div className="vipa-pai-top">
              <div className="vipa-stats-pai">
                <div className="vipa-stat">
                  <span className="vs-val">{paiementsFiltres.length}</span>
                  <span className="vs-lbl">Paiements</span>
                </div>
                <div className="vipa-stat vert">
                  <span className="vs-val">{caTot.toLocaleString()} FCFA</span>
                  <span className="vs-lbl">CA {filtreDate ? 'ce jour' : 'total'}</span>
                </div>
              </div>
              <div className="vipa-pai-filtre">
                <label className="vipa-date-lbl">Filtrer par date :</label>
                <input type="date" value={filtreDate}
                  onChange={e => setFiltreDate(e.target.value)}
                  className="vipa-date-input"/>
                {filtreDate && (
                  <button className="vipa-pai-reset" onClick={() => setFiltreDate('')}>
                    Tout voir
                  </button>
                )}
              </div>
            </div>

            {paiementsFiltres.length === 0 && (
              <p className="vipa-vide">Aucun paiement{filtreDate ? ' pour cette date' : ''} enregistré.</p>
            )}

            {/* Groupé par match */}
            {Object.entries(parMatch).map(([key, { vip, paiements: pais }]) => {
              const caMatch = pais.reduce((t, p) => t + (p.montant || 0), 0)
              return (
                <div key={key} className="pai-match-section">
                  {/* En-tête match */}
                  <div className="pai-match-header">
                    {vip ? (
                      <>
                        <LogoChampVip nom={vip.competition} taille={22} />
                        <div className="pai-match-hdr-info">
                          <span className="pai-match-hdr-comp">{vip.competition}</span>
                          <span className="pai-match-hdr-equipes">
                            {vip.domicile} <span className="pai-vs">vs</span> {vip.exterieur}
                          </span>
                          <span className="pai-match-hdr-date">{vip.date} · {vip.heure}</span>
                        </div>
                      </>
                    ) : (
                      <span className="pai-match-hdr-comp" style={{color:'#94a3b8',fontStyle:'italic'}}>Match supprimé</span>
                    )}
                    <div className="pai-match-hdr-resume">
                      <span className="pai-champ-nb">{pais.length} paiement{pais.length > 1 ? 's' : ''}</span>
                      <span className="pai-champ-ca">{caMatch.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  {/* Lignes paiements */}
                  {pais.map((p, i) => {
                    const datePai  = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
                    const heurePai = p.created_at ? new Date(p.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : ''
                    return (
                      <div key={i} className="pai-row">
                        <div className="pai-info">
                          <div className="pai-info-ligne">
                            <span className="pai-info-lbl">Utilisateur :</span>
                            <span className="pai-info-val">{p.user?.name || '—'} {p.user?.email ? `(${p.user.email})` : ''}</span>
                          </div>
                          <div className="pai-info-ligne">
                            <span className="pai-info-lbl">Méthode :</span>
                            <span className="pai-info-val">{p.methode || '—'} · Réf : <span className="mono">{p.reference || p.id}</span></span>
                          </div>
                          <div className="pai-info-ligne">
                            <span className="pai-info-lbl">Date :</span>
                            <span className="pai-info-val">{datePai}{heurePai ? ` à ${heurePai}` : ''}</span>
                          </div>
                        </div>
                        <div className="pai-droite">
                          <span className={`pai-statut ${p.statut}`}>{p.statut}</span>
                          <span className="pai-montant">{(p.montant||0).toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
