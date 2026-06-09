import { useState, useEffect } from 'react'
import {
  obtenirPredictionsAConfirmer,
  confirmerScoreTrace,
  confirmerScoreVip,
  obtenirScoresConfirmes,
  corrigerScoreReel,
  corrigerScoreVip,
  reinitialiserScore,
  reinitialiserScoreVip,
  supprimerPrediction,
  supprimerPredictionVip,
  obtenirPredictionsParDate,
  formaterDateAPI,
} from '../../../adapters/api/ServiceApi.js'
import { evaluerCombi, classeCombi } from '../utils/evaluerCombi.js'
import './PageConfirmationScore.css'

// ── Icônes SVG ─────────────────────────────────────────────────
const Ico = {
  certifier: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  modifier: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  reinit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.95"/>
    </svg>
  ),
  supprimer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  alerte: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

// ── Composant principal ─────────────────────────────────────────
export default function PageConfirmationScore() {
  const [onglet, setOnglet]           = useState('calendrier')
  const [aConfirmer, setAConfirmer]   = useState({ predictions: [], predictions_vip: [], total: 0 })
  const [historique, setHistorique]   = useState({ confirmes: [], confirmes_vip: [], taux_tracé: 0, taux_vip: 0 })
  const [calendrier, setCalendrier]   = useState([])  // prédictions du jour publiées
  const [chargement, setChargement]   = useState(true)
  const [msg, setMsg]                 = useState('')

  // État modal certification / re-certification
  const [modal, setModal]             = useState(null)
  // { id, type: 'normal'|'vip', scorePredit, scoreActuel, mode: 'certifier'|'recertifier' }
  const [scoreModal, setScoreModal]   = useState('')
  const [noteModal, setNoteModal]     = useState('')
  const [enCours, setEnCours]         = useState(false)

  // État édition inline du score réel (onglet En attente)
  const [editScore, setEditScore]     = useState(null)
  // { id, type, scoreActuel }
  const [nouveauScore, setNouveauScore] = useState('')

  // État confirmation suppression
  const [confirmerSup, setConfirmerSup] = useState(null) // { id, type }

  useEffect(() => { charger() }, [onglet])

  async function charger() {
    setChargement(true); setMsg('')
    try {
      if (onglet === 'calendrier') {
        // POINT 8 : prédictions publiées du jour, par championnat, couleurs jaune/vert/rouge
        const today = formaterDateAPI(new Date())
        const preds = await obtenirPredictionsParDate(today).catch(() => [])
        setCalendrier(preds || [])
      } else if (onglet === 'en_attente') {
        const d = await obtenirPredictionsAConfirmer()
        setAConfirmer(d)
      } else {
        const d = await obtenirScoresConfirmes()
        setHistorique(d)
      }
    } catch { setMsg('Erreur de chargement.') }
    setChargement(false)
  }

  // ── Ouvrir le modal de certification ─────────────────────────
  function ouvrirModal(id, type, scorePredit, scoreActuel = '', mode = 'certifier') {
    setModal({ id, type, scorePredit, mode })
    setScoreModal(scoreActuel || '')
    setNoteModal('')
    setMsg('')
  }

  // ── Soumettre la certification ────────────────────────────────
  async function soumettreCertification(e) {
    e.preventDefault()
    if (!scoreModal.match(/^\d+-\d+$/)) {
      setMsg('Format de score invalide. Exemple : 2-1')
      return
    }
    setEnCours(true)
    try {
      const payload = { score_reel: scoreModal, note_confirmation: noteModal }
      const res = modal.type === 'vip'
        ? await confirmerScoreVip(modal.id, payload)
        : await confirmerScoreTrace(modal.id, payload)
      setMsg(res.score_correct
        ? `Tracé CORRECT ! Prédit : ${modal.scorePredit} — Réel : ${scoreModal}`
        : `⚠️ Score approché. Prédit : ${modal.scorePredit} — Réel : ${scoreModal}`)
      setModal(null)
      charger()
    } catch { setMsg('Erreur lors de la certification.') }
    setEnCours(false)
  }

  // ── Modifier le score réel inline (avant certification) ──────
  async function soumettreMofificationScore(e) {
    e.preventDefault()
    if (!nouveauScore.match(/^\d+-\d+$/)) {
      setMsg('Format de score invalide. Exemple : 2-1')
      return
    }
    setEnCours(true)
    try {
      if (editScore.type === 'vip') {
        await corrigerScoreVip(editScore.id, { score_reel: nouveauScore })
      } else {
        await corrigerScoreReel(editScore.id, { score_reel: nouveauScore, raison: 'Correction avant certification' })
      }
      setMsg('Score réel mis à jour.')
      setEditScore(null)
      charger()
    } catch { setMsg('Erreur lors de la modification.') }
    setEnCours(false)
  }

  // ── Réinitialiser le score réel (effacer) ────────────────────
  async function reinitialiser(id, type) {
    try {
      if (type === 'vip') {
        await reinitialiserScoreVip(id)
      } else {
        await reinitialiserScore(id)
      }
      setMsg('🔄 Score effacé. Saisissez le score final dans "Saisir les scores".')
      charger()
    } catch { setMsg('Erreur lors de la réinitialisation.') }
  }

  // ── Supprimer une prédiction ──────────────────────────────────
  async function supprimer(id, type) {
    try {
      if (type === 'vip') {
        await supprimerPredictionVip(id)
      } else {
        await supprimerPrediction(id)
      }
      setConfirmerSup(null)
      setMsg('🗑️ Prédiction supprimée.')
      charger()
    } catch { setMsg('Erreur lors de la suppression.') }
  }

  return (
    <div className="page-confirmation">

      {/* En-tête */}
      <div className="conf-header">
        <h2 className="conf-titre">Confirmation du Score Exact</h2>
        <p className="conf-sous">
          Certifiez les scores réels, modifiez-les ou supprimez une prédiction si nécessaire.
        </p>
      </div>

      {/* Onglets */}
      <div className="conf-onglets">
        <button className={`conf-onglet ${onglet === 'calendrier' ? 'actif' : ''}`}
          onClick={() => setOnglet('calendrier')}>
          📅 Calendrier du jour
        </button>
        <button className={`conf-onglet ${onglet === 'en_attente' ? 'actif' : ''}`}
          onClick={() => setOnglet('en_attente')}>
          ⏳ En attente
          {(aConfirmer.total ?? 0) > 0 &&
            <span className="badge-rouge">{aConfirmer.total}</span>}
        </button>
        <button className={`conf-onglet ${onglet === 'historique' ? 'actif' : ''}`}
          onClick={() => setOnglet('historique')}>
          Scores confirmés
        </button>
      </div>

      {/* Message de retour */}
      {msg && (
        <div className={`conf-msg ${!msg.includes('Erreur') && !msg.includes('❌') && msg.length > 0 ? 'ok' : msg.includes('⚠️') ? 'approche' : msg.includes('🔄') || msg.includes('🗑️') ? 'info' : 'erreur'}`}>
          {msg}
          <button className="conf-msg-fermer" onClick={() => setMsg('')}>✕</button>
        </div>
      )}

      {/* ── Modal certification / re-certification ── */}
      {modal && (
        <div className="conf-overlay" onClick={() => setModal(null)}>
          <div className="conf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="conf-modal-titre">
              {modal.mode === 'recertifier' ? 'Modifier le score certifié' : 'Certifier le score du match'}
            </h3>
            <div className="conf-modal-info">
              <div>
                <span className="conf-modal-sub">Score prédit par le tracé</span>
                <span className="conf-score-predit">{modal.scorePredit}</span>
              </div>
            </div>
            {modal.mode === 'recertifier' && (
              <div className="conf-modal-avert">
                {Ico.alerte}
                <span>Modifier un score déjà certifié recalcule le taux de réussite du tracé.</span>
              </div>
            )}
            <form onSubmit={soumettreCertification} className="conf-form">
              <div className="conf-field">
                <label className="conf-label">Score réel final du match (ex: 2-1)</label>
                <input
                  className="conf-input conf-input-score"
                  type="text" value={scoreModal}
                  onChange={e => setScoreModal(e.target.value)}
                  placeholder="ex: 2-1" pattern="\d+-\d+"
                  required autoFocus
                />
              </div>
              <div className="conf-field">
                <label className="conf-label">Note admin (optionnel)</label>
                <input
                  className="conf-input"
                  type="text" value={noteModal}
                  onChange={e => setNoteModal(e.target.value)}
                  placeholder="Observation sur ce tracé..."
                  maxLength={255}
                />
              </div>
              <div className="conf-modal-actions">
                <button type="button" className="btn-annuler" onClick={() => setModal(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn-confirmer" disabled={enCours}>
                  {enCours ? 'En cours...' : (
                    <>{Ico.certifier} {modal.mode === 'recertifier' ? 'Mettre à jour' : 'Certifier'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal édition score inline ── */}
      {editScore && (
        <div className="conf-overlay" onClick={() => setEditScore(null)}>
          <div className="conf-modal" onClick={e => e.stopPropagation()}>
            <h3 className="conf-modal-titre">Modifier le score réel</h3>
            <div className="conf-modal-info">
              <div>
                <span className="conf-modal-sub">Score actuellement saisi</span>
                <span className="conf-score-predit" style={{color:'#f59e0b'}}>{editScore.scoreActuel}</span>
              </div>
            </div>
            <form onSubmit={soumettreMofificationScore} className="conf-form">
              <div className="conf-field">
                <label className="conf-label">Nouveau score réel (ex: 2-1)</label>
                <input
                  className="conf-input conf-input-score"
                  type="text" value={nouveauScore}
                  onChange={e => setNouveauScore(e.target.value)}
                  placeholder="ex: 2-1" pattern="\d+-\d+"
                  required autoFocus
                />
              </div>
              <div className="conf-modal-actions">
                <button type="button" className="btn-annuler" onClick={() => setEditScore(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn-confirmer" style={{background:'#f59e0b'}} disabled={enCours}>
                  {enCours ? 'En cours...' : <>{Ico.modifier} Modifier le score</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Contenu selon onglet ── */}
      {chargement ? (
        <div className="conf-charg">
          <span className="conf-charg-spinner" />
          Chargement...
        </div>
      ) : onglet === 'calendrier' ? (

        // ── ONGLET CALENDRIER DU JOUR (Point 8) ──
        <div className="conf-calendrier">
          <div className="conf-cal-header">
            <span>Prédictions publiées aujourd'hui — {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</span>
            <span className="conf-cal-total">{calendrier.length} match{calendrier.length > 1 ? 's' : ''}</span>
          </div>
          {calendrier.length === 0 && (
            <div className="conf-vide">
              <span className="conf-vide-icon">{Ico.certifier}</span>
              <p>Aucune prédiction confirmée pour aujourd'hui.<br/>
              Générez et confirmez des tracés dans "Voir les maisons".</p>
            </div>
          )}
          {/* Grouper par championnat */}
          {Object.entries(
            calendrier.reduce((acc, p) => {
              const c = p.competition || 'Autre'
              if (!acc[c]) acc[c] = []
              acc[c].push(p); return acc
            }, {})
          ).map(([champ, preds]) => (
            <div key={champ} className="conf-cal-champ">
              <div className="conf-cal-champ-header">⚽ {champ}</div>
              {preds.map(p => {
                const correct   = p.score_reel && p.score_prevu === p.score_reel
                const incorrect = p.score_reel && p.score_prevu !== p.score_reel
                return (
                  <div key={p.id} className={`conf-cal-ligne ${correct ? 'correct' : incorrect ? 'incorrect' : ''}`}>
                    <div className="conf-cal-match">
                      <span className="conf-cal-heure">{p.heure || '--:--'}</span>
                      <span className="conf-cal-dom">{p.domicile}</span>
                      <div className="conf-cal-scores">
                        <span className="conf-cal-predit">{p.score_prevu || '?'}</span>
                        {p.score_reel && <><span className="conf-cal-sep">→</span><span className={`conf-cal-reel ${correct ? 'ok' : 'nok'}`}>{p.score_reel}</span></>}
                      </div>
                      <span className="conf-cal-ext">{p.exterieur}</span>
                    </div>
                    {p.combinaisons?.length > 0 && (
                      <div className="conf-cal-combis">
                        {p.combinaisons.map((c, j) => {
                          const etat = evaluerCombi(c.label, p.score_reel)
                          return (
                            <span key={j} className={`conf-cal-combi ${classeCombi(etat)}`}>
                              {c.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

      ) : onglet === 'en_attente' ? (

        // ── ONGLET : En attente de confirmation ──
        <div className="conf-liste">
          {aConfirmer.predictions?.length === 0 && aConfirmer.predictions_vip?.length === 0 && (
            <div className="conf-vide">
              <span className="conf-vide-icon">{Ico.certifier}</span>
              <p>Tous les scores ont été confirmés. Aucun match en attente.</p>
            </div>
          )}

          {aConfirmer.predictions?.length > 0 && (
            <div className="conf-groupe">
              <h3 className="conf-groupe-titre">Tracés standard</h3>
              {aConfirmer.predictions.map(p => (
                <CarteAttente
                  key={p.id}
                  id={p.id} type="normal"
                  competition={p.competition}
                  domicile={p.domicile} exterieur={p.exterieur}
                  date={p.date} heure={p.heure}
                  scorePredit={p.score_prevu} scoreReel={p.score_reel}
                  traceStatus={p.trace_status}
                  enSuppression={confirmerSup?.id === p.id}
                  onCertifier={() => ouvrirModal(p.id, 'normal', p.score_prevu, p.score_reel)}
                  onModifier={() => { setEditScore({ id: p.id, type: 'normal', scoreActuel: p.score_reel }); setNouveauScore('') }}
                  onReinit={() => reinitialiser(p.id, 'normal')}
                  onSupprimer={() => setConfirmerSup({ id: p.id, type: 'normal' })}
                  onAnnulerSup={() => setConfirmerSup(null)}
                  onConfirmerSup={() => supprimer(p.id, 'normal')}
                />
              ))}
            </div>
          )}

          {aConfirmer.predictions_vip?.length > 0 && (
            <div className="conf-groupe">
              <h3 className="conf-groupe-titre">Matchs VIP</h3>
              {aConfirmer.predictions_vip.map(p => (
                <CarteAttente
                  key={p.id}
                  id={p.id} type="vip"
                  competition={p.competition}
                  domicile={p.domicile} exterieur={p.exterieur}
                  date={p.date} heure={p.heure}
                  scorePredit={p.score_exact_predit} scoreReel={p.score_reel}
                  enSuppression={confirmerSup?.id === p.id}
                  onCertifier={() => ouvrirModal(p.id, 'vip', p.score_exact_predit, p.score_reel)}
                  onModifier={() => { setEditScore({ id: p.id, type: 'vip', scoreActuel: p.score_reel }); setNouveauScore('') }}
                  onReinit={() => reinitialiser(p.id, 'vip')}
                  onSupprimer={() => setConfirmerSup({ id: p.id, type: 'vip' })}
                  onAnnulerSup={() => setConfirmerSup(null)}
                  onConfirmerSup={() => supprimer(p.id, 'vip')}
                />
              ))}
            </div>
          )}
        </div>

      ) : (

        // ── ONGLET : Scores confirmés (historique) ──
        <div className="conf-historique">
          <div className="conf-taux-blocs">
            <div className="conf-taux-bloc">
              <span className="conf-taux-val">{historique.taux_tracé}%</span>
              <span className="conf-taux-lbl">Tracés standards corrects</span>
            </div>
            <div className="conf-taux-bloc vip">
              <span className="conf-taux-val">{historique.taux_vip}%</span>
              <span className="conf-taux-lbl">Tracés VIP corrects</span>
            </div>
          </div>

          {historique.confirmes?.map(p => (
            <CarteConfirmee
              key={p.id}
              id={p.id} type="normal"
              competition={p.competition}
              domicile={p.domicile} exterieur={p.exterieur}
              date={p.date}
              scorePredit={p.score_prevu} scoreReel={p.score_reel}
              note={p.note_confirmation} dateConf={p.score_confirme_le}
              enSuppression={confirmerSup?.id === p.id}
              onRecertifier={() => ouvrirModal(p.id, 'normal', p.score_prevu, p.score_reel, 'recertifier')}
              onSupprimer={() => setConfirmerSup({ id: p.id, type: 'normal' })}
              onAnnulerSup={() => setConfirmerSup(null)}
              onConfirmerSup={() => supprimer(p.id, 'normal')}
            />
          ))}
          {historique.confirmes_vip?.map(p => (
            <CarteConfirmee
              key={p.id}
              id={p.id} type="vip"
              competition={p.competition}
              domicile={p.domicile} exterieur={p.exterieur}
              date={p.date}
              scorePredit={p.score_exact_predit} scoreReel={p.score_reel}
              note={p.note_confirmation} dateConf={p.score_confirme_le}
              enSuppression={confirmerSup?.id === p.id}
              onRecertifier={() => ouvrirModal(p.id, 'vip', p.score_exact_predit, p.score_reel, 'recertifier')}
              onSupprimer={() => setConfirmerSup({ id: p.id, type: 'vip' })}
              onAnnulerSup={() => setConfirmerSup(null)}
              onConfirmerSup={() => supprimer(p.id, 'vip')}
            />
          ))}
          {!historique.confirmes?.length && !historique.confirmes_vip?.length && (
            <p className="conf-vide">Aucun score confirmé pour l'instant.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Carte : match en attente de confirmation ───────────────────
function CarteAttente({
  id, type, competition, domicile, exterieur, date, heure,
  scorePredit, scoreReel, traceStatus,
  enSuppression,
  onCertifier, onModifier, onReinit, onSupprimer, onAnnulerSup, onConfirmerSup
}) {
  return (
    <div className={`conf-carte ${type === 'vip' ? 'vip' : ''}`}>

      {/* En-tête */}
      <div className="conf-carte-top">
        <span className="conf-competition">{competition}</span>
        <span className="conf-date">{date} {heure}</span>
        {type === 'vip' && <span className="badge-vip">VIP</span>}
        <button className="conf-btn-suppr" onClick={onSupprimer} title="Supprimer">
          {Ico.supprimer}
        </button>
      </div>

      {/* Confirmation de suppression */}
      {enSuppression && (
        <div className="conf-confirm-suppr">
          <span>Supprimer définitivement cette prédiction ?</span>
          <div className="conf-confirm-actions">
            <button className="conf-btn-oui" onClick={onConfirmerSup}>Oui, supprimer</button>
            <button className="conf-btn-non" onClick={onAnnulerSup}>Annuler</button>
          </div>
        </div>
      )}

      {/* Match */}
      <div className="conf-carte-match">
        <span className="conf-equipe">{domicile}</span>
        <span className="conf-vs">vs</span>
        <span className="conf-equipe">{exterieur}</span>
      </div>

      {/* Scores */}
      <div className="conf-carte-scores">
        <div className="conf-score-bloc predit">
          <span className="conf-score-label">Prédit par tracé</span>
          <span className="conf-score-num">{scorePredit}</span>
        </div>
        {scoreReel && (
          <div className="conf-score-bloc reel">
            <span className="conf-score-label">Score réel saisi</span>
            <span className="conf-score-num">{scoreReel}</span>
          </div>
        )}
      </div>

      {traceStatus && (
        <span className={`conf-trace-status ${traceStatus === 'valide' ? 'ok' : 'partiel'}`}>
          Tracé : {traceStatus}
        </span>
      )}

      {/* Actions */}
      <div className="conf-actions">
        <button className="conf-btn-certifier" onClick={onCertifier}>
          {Ico.certifier} Certifier ce score
        </button>
        {scoreReel && (
          <>
            <button className="conf-btn-modifier" onClick={onModifier} title="Modifier le score réel saisi">
              {Ico.modifier} Modifier
            </button>
            <button className="conf-btn-reinit" onClick={onReinit} title="Effacer le score pour le ressaisir après le match">
              {Ico.reinit} Réinitialiser
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Carte : score déjà confirmé ────────────────────────────────
function CarteConfirmee({
  id, type, competition, domicile, exterieur, date,
  scorePredit, scoreReel, note, dateConf,
  enSuppression,
  onRecertifier, onSupprimer, onAnnulerSup, onConfirmerSup
}) {
  const correct = scorePredit === scoreReel
  return (
    <div className={`conf-carte confirmee ${correct ? 'correct' : 'approche'}`}>

      {/* En-tête */}
      <div className="conf-carte-top">
        <span className="conf-competition">{competition}</span>
        <span className="conf-date">{date}</span>
        {type === 'vip' && <span className="badge-vip">VIP</span>}
        <span className={`badge-resultat ${correct ? 'ok' : 'approche'}`}>
          {correct ? <>{Ico.check} TRACÉ CORRECT</> : <>{Ico.alerte} Approché</>}
        </span>
        <button className="conf-btn-suppr" onClick={onSupprimer} title="Supprimer">
          {Ico.supprimer}
        </button>
      </div>

      {/* Confirmation de suppression */}
      {enSuppression && (
        <div className="conf-confirm-suppr">
          <span>Supprimer définitivement cette prédiction certifiée ?</span>
          <div className="conf-confirm-actions">
            <button className="conf-btn-oui" onClick={onConfirmerSup}>Oui, supprimer</button>
            <button className="conf-btn-non" onClick={onAnnulerSup}>Annuler</button>
          </div>
        </div>
      )}

      {/* Match */}
      <div className="conf-carte-match">
        <span className="conf-equipe">{domicile}</span>
        <span className="conf-vs">vs</span>
        <span className="conf-equipe">{exterieur}</span>
      </div>

      {/* Scores */}
      <div className="conf-carte-scores">
        <div className="conf-score-bloc predit">
          <span className="conf-score-label">Prédit</span>
          <span className="conf-score-num">{scorePredit}</span>
        </div>
        <div className={`conf-score-bloc reel ${correct ? 'ok' : 'nok'}`}>
          <span className="conf-score-label">Réel certifié</span>
          <span className="conf-score-num">{scoreReel}</span>
        </div>
      </div>

      {note && <p className="conf-note">💬 {note}</p>}
      {dateConf && (
        <p className="conf-date-certif">
          Certifié le {new Date(dateConf).toLocaleString('fr-FR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}
        </p>
      )}

      {/* Actions */}
      <div className="conf-actions">
        <button className="conf-btn-recertifier" onClick={onRecertifier}>
          {Ico.modifier} Modifier le score certifié
        </button>
      </div>
    </div>
  )
}
