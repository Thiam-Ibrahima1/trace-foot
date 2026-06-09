// ============================================================
// TraceUseCases.js — Moteur du tracé astro-sportif
//
// RÈGLES DES 3 MAISONS CLÉS :
//
//  IMSA [1,2,1,2] — But jubilé
//   • Puissant si en position M3,M4,M7,M8,M11,M12,M15,M16
//   • 3+ Imsa parmi les 16 → 3+ buts dans le match (+2,5)
//   • 2 Imsa → au moins 2 buts (+1,5)
//   • Imsa UNIQUEMENT en zone domicile → domicile ne perd pas (1X)
//   • Imsa UNIQUEMENT en zone extérieur → extérieur ne perd pas (2X)
//   • Imsa dans les DEUX zones → les deux équipes marquent (2EM)
//
//  SOULEYMANE [1,2,2,1] — But encaissé (chaque = 1 but)
//   • Puissant si en position M3,M4,M7,M8,M11,M12,M15,M16
//   • En zone DOMICILE → l'équipe DOMICILE marque ce but
//   • En zone EXTÉRIEUR → l'équipe EXTÉRIEURE marque ce but
//   • Idem pour NOUKH [2,2,1,1] (même logique)
//
//  YOUSSOU [1,1,2,1] — Maison 1 (toujours domicile)
//   • Garantit que les DEUX équipes marquent (2EM)
//
//  RÉSUMÉ : Score exact = placement de Souleymane par zone
//           Nombre de buts = compte de Imsa (jubilé)
//           Combinaisons = ces 3 maisons + autres signaux
// ============================================================
import { MAISONS, identifierMaison, zonePos, niveauPuissance } from '../entities/Maison.js'

export const CAPS = [[11,16,21,26],[31,36,41,46],[51,56,61,66],[71,76,81,86]]

export const addPts    = (a,b) => (a===b) ? 2 : 1
export const addMaison = (ma,mb) => ma.map((v,i) => addPts(v, mb[i]))
export const calcReste = n => n % 2 === 0 ? 2 : 1

// Génère 16 points aléatoires selon les contraintes des caps
export function genererTraceAlea() {
  let prev = 0
  const pts = []
  for (let bi = 0; bi < 4; bi++)
    for (let li = 0; li < 4; li++) {
      const cap = CAPS[bi][li]
      const min = Math.max(prev + 1, bi === 0 && li === 0 ? 7 : prev + 1)
      const val = min > cap ? min : Math.floor(Math.random() * (cap - min + 1)) + min
      pts.push(val); prev = val
    }
  return pts
}

// Calcule les 16 maisons à partir des 16 points
export function calculerDispositions(pts) {
  const X = pts.map(n => calcReste(n))
  const [M1,M2,M3,M4] = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15]].map(idx => idx.map(i=>X[i]))
  const [M5,M6,M7,M8] = [[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15]].map(idx => idx.map(i=>X[i]))
  const M9=addMaison(M1,M2), M10=addMaison(M3,M4)
  const M11=addMaison(M5,M6), M12=addMaison(M7,M8)
  const M13=addMaison(M9,M10), M14=addMaison(M11,M12)
  const M15=addMaison(M13,M14), M16=addMaison(M1,M15)
  return [M1,M2,M3,M4,M5,M6,M7,M8,M9,M10,M11,M12,M13,M14,M15,M16]
}

// ── Vérification V1 : le témoin de la 1ère maison (M1) est présent ─
// Règle : identifier la maison à la position 1 (M1).
// Son témoin doit figurer parmi les 16 maisons du tracé.
// Si oui → tracé VALIDE (V2 devient optionnelle).
// Si non → recommencer le tirage.
function verifierV1(dispositions) {
  const toutes        = dispositions.map(d => identifierMaison(d))
  const maisonM1      = toutes[0]        // maison à la position 1
  if (!maisonM1) return { valide: false, maisonM1: null, temoin: null, temoinPresent: false }

  const temoinNom     = maisonM1.temoin
  const nomsPresents  = new Set(toutes.filter(Boolean).map(m => m.nom))
  const temoinPresent = nomsPresents.has(temoinNom)

  return {
    valide:        temoinPresent,
    maisonM1:      maisonM1.nom,
    temoin:        temoinNom,
    temoinPresent,
    // Info complémentaire : liste des maisons identifiées
    nomsPresents: [...nomsPresents],
  }
}

// ── Vérification V2 : la Maison Combinée (MC) verte est présente ─
function verifierV2(dispositions) {
  const MA = addMaison(dispositions[2], dispositions[4])   // M3 + M5
  const MB = addMaison(dispositions[10], dispositions[14]) // M11 + M15
  const MC = addMaison(MA, MB)
  const mcConnue = dispositions.some(d => d.every((v, i) => v === MC[i]))
  return { valide: mcConnue, MA, MB, MC, mcConnue }
}

// ── Analyser les 16 maisons → score + combinaisons + interprétation ─
export function analyserDispositions(dispositions) {
  const maisonsPlacees = dispositions.map((disp, idx) => {
    const position = idx + 1
    const maison   = identifierMaison(disp)
    const zone     = zonePos(position)
    const puissance = maison ? niveauPuissance(maison, position) : 'normal'
    return { position, maison, zone, puissance, disposition: disp }
  })

  // ── 3 maisons clés ───────────────────────────────────────────
  const imsas       = maisonsPlacees.filter(mp => mp.maison?.nom === 'Imsa')
  const souleymanes = maisonsPlacees.filter(mp => mp.maison?.nom === 'Souleymane')
  const noukhs      = maisonsPlacees.filter(mp => mp.maison?.nom === 'Noukh')
  const youssous    = maisonsPlacees.filter(mp => mp.maison?.nom === 'Youssou')

  const imsaCount    = imsas.length
  const imsaDom      = imsas.filter(im => im.zone === 'domicile').length
  const imsaExt      = imsas.filter(im => im.zone === 'exterieur').length
  // Poids Imsa pour double chance (puissant = ×2)
  const imsaDomPoids = imsas.filter(im => im.zone === 'domicile')
    .reduce((t, im) => t + (im.puissance !== 'normal' ? 2 : 1), 0)
  const imsaExtPoids = imsas.filter(im => im.zone === 'exterieur')
    .reduce((t, im) => t + (im.puissance !== 'normal' ? 2 : 1), 0)
  // Signal fort de but : Imsa puissant OU Imsa en M6 OU 3+ Imsa
  // (même règle qu'Ibrahima puissant → signal de but marqué)
  const imsaSignalFort = imsaCount >= 3
    || imsas.some(im => im.puissance !== 'normal')
    || imsas.some(im => im.position === 6)

  // POINT 1 : Youssou ne confirme les 2EM QUE s'il est en M1 (position 1)
  const youssouEnM1    = youssous.some(y => y.position === 1)
  const makhdiyouPresent = maisonsPlacees.some(mp => mp.maison?.nom === 'Makhdiyou')
  // Témoin de Youssou = Makhdiyou. Si Youssou en M1 + Makhdiyou présent = 2EM même sans Souleymane

  // POINT 2 : SCORE uniquement par Souleymane
  // Souleymane = priorité absolue pour le score → TOUJOURS compté comme but,
  // qu'il soit puissant ou non, avec ou sans Noukh.
  // (Le Noukh sert uniquement pour le signal 2EM, pas pour le comptage)
  const noukhPresent = noukhs.length > 0

  const solDomPresent = souleymanes.some(s => s.zone === 'domicile')
  const solExtPresent = souleymanes.some(s => s.zone === 'exterieur')
  const sol2emBasique = solDomPresent && solExtPresent  // Sol dans les 2 zones → 2EM

  let domButs = 0, extButs = 0
  souleymanes.forEach(mp => {
    // Chaque Souleymane = 1 but encaissé, sans exception
    if (mp.zone === 'domicile') extButs += 1   // domicile encaisse → extérieur marque
    else                        domButs += 1   // extérieur encaisse → domicile marque
  })

  // Signal 2EM : Sol puissant dans zone DOM ET Sol puissant dans zone EXT
  // (Noukh non requis — la puissance suffit à confirmer le 2EM)
  const solPuissantDom = souleymanes.some(s => s.zone === 'domicile' && s.puissance !== 'normal')
  const solPuissantExt = souleymanes.some(s => s.zone === 'exterieur' && s.puissance !== 'normal')
  const sol2emPuissant = solPuissantDom && solPuissantExt

  // Ibrahima en position puissante : signal secondaire (absence totale de Souleymane)
  const NOMS_IBR = new Set(['Ibrahima'])
  const POS_BUT  = new Set([3,4,5,7,8,11,12,15,16])
  const evenements = []
  let butDomSignal = 0, butExtSignal = 0
  let adama2Present = false
  let idriss4Present = false
  maisonsPlacees.forEach(({ maison, zone, position, puissance }) => {
    if (!maison) return
    if (['Imsa','Souleymane','Noukh','Youssou'].includes(maison.nom)) return
    if (maison.nom === 'Adama') {
      evenements.push({ type: 'victoire_3buts', maison: maison.nom, position, zone })
      if (position === 2) adama2Present = true
    }
    if (maison.nom === 'Idriss' && position === 4) idriss4Present = true
    if (NOMS_IBR.has(maison.nom) && POS_BUT.has(position) && puissance !== 'normal') {
      if (zone === 'domicile') butDomSignal++
      else butExtSignal++
    }
  })

  // Adama en position 2 + 3 Souleymane → +2,5 garanti
  const adama2Avec3Sol = adama2Present && souleymanes.length >= 3
  // Idriss en position 4 + Imsa (témoin) + 4 Souleymane → forte chance de 4 buts (+3,5)
  const idriss4Avec4Sol = idriss4Present && imsaCount > 0 && souleymanes.length >= 4

  let dom = domButs
  let ext = extButs

  // POINT 3 : Youssou en M1 + Makhdiyou présent + pas de Souleymane → 2EM (minimum 1-1)
  if (youssouEnM1 && makhdiyouPresent && souleymanes.length === 0) {
    dom = Math.max(dom, 1); ext = Math.max(ext, 1)
  }
  // Youssou en M1 + Makhdiyou présent + Souleymane DOM ET EXT → 2EM confirmé
  const solDomOk = souleymanes.some(s => s.zone === 'domicile')
  const solExtOk = souleymanes.some(s => s.zone === 'exterieur')
  if (youssouEnM1 && makhdiyouPresent && solDomOk && solExtOk) {
    dom = Math.max(dom, 1); ext = Math.max(ext, 1)
  }
  // Sol dans les 2 zones (même non-puissant) → minimum 1-1 (comme Youssou)
  // Sol dans 2 zones mais aucun Souleymane compté → signal 2EM minimum
  if (sol2emBasique && dom === 0 && ext === 0 && souleymanes.length === 0) {
    dom = Math.max(dom, 1); ext = Math.max(ext, 1)
  }

  const v1              = verifierV1(dispositions)
  const v2              = verifierV2(dispositions)
  const traceAcceptable = v1.valide
  const traceSolide     = v1.valide && v2.valide

  const solFortsDom      = souleymanes.filter(mp => mp.zone === 'exterieur' && mp.puissance !== 'normal').length
  const solFortsExt      = souleymanes.filter(mp => mp.zone === 'domicile'  && mp.puissance !== 'normal').length
  const solTotal         = souleymanes.length
  const solPuissantTotal = souleymanes.filter(mp => mp.puissance !== 'normal').length

  const combinaisons   = genererCombinaisonsGratuites(dom, ext, imsaCount, imsaDom, imsaExt, youssouEnM1, evenements, solFortsDom, solFortsExt, butDomSignal, butExtSignal, solTotal, solPuissantTotal, sol2emBasique, sol2emPuissant, adama2Avec3Sol, idriss4Avec4Sol, imsaSignalFort)
  const interpretation = genererInterpretation(maisonsPlacees, dom, ext, imsaCount, imsaDom, imsaExt, youssouEnM1, souleymanes, noukhs, v1, butDomSignal, butExtSignal, maisonsPlacees.filter(mp => NOMS_IBR.has(mp.maison?.nom) && POS_BUT.has(mp.position) && mp.puissance !== 'normal'))

  return {
    maisonsPlacees, evenements, dom, ext,
    scorePrincipal:    `${dom}-${ext}`,
    scoresAlternatifs: [`${dom+1}-${ext}`, `${dom}-${ext+1}`, `${Math.max(0,dom-1)}-${ext}`],
    combinaisons, interpretation,
    imsaCount, imsaDom, imsaExt, imsaDomPoids, imsaExtPoids, youssouEnM1,
    MA: v2.MA, MB: v2.MB, MC: v2.MC,
    verification: {
      v1,
      v2: { valide: v2.valide, MA: v2.MA, MB: v2.MB, MC: v2.MC, mcConnue: v2.mcConnue },
      traceAcceptable,
      traceSolide,
      traceValide: traceSolide,
      niveau: traceSolide ? 'solide' : traceAcceptable ? 'acceptable' : 'invalide',
    },
  }
}

// ── Combinaisons gratuites basées sur les 3 maisons clés ─────
//
//  Règles métier :
//   • 2EM  : Youssou présent OU Imsa dans les deux zones
//   • +2,5 : 3+ Imsa parmi les 16 maisons
//   • +1,5 : 2+ Imsa OU total ≥ 2 buts
//   • V1   : dom > ext (Souleymane donne plus de buts à domicile)
//   • 1X   : Imsa UNIQUEMENT en zone domicile OU dom ≥ ext
//   • V2   : ext > dom
//   • 2X   : Imsa UNIQUEMENT en zone extérieur OU ext ≥ dom
//
export function genererCombinaisonsGratuites(dom, ext, imsaCount, imsaDom, imsaExt, youssouPresent, evenements = [], solFortsDom = 0, solFortsExt = 0, butDomSignal = 0, butExtSignal = 0, solTotal = 0, solPuissantTotal = 0, sol2emBasique = false, sol2emPuissant = false, adama2Avec3Sol = false, idriss4Avec4Sol = false, imsaSignalFort = false) {
  const total         = dom + ext
  const imsaSeulDom   = imsaDom > 0 && imsaExt === 0
  const imsaSeulExt   = imsaExt > 0 && imsaDom === 0
  const imsaDeuxZones = imsaDom > 0 && imsaExt > 0
  const deuxEquipes   = youssouPresent || imsaDeuxZones || (dom > 0 && ext > 0) || sol2emBasique || sol2emPuissant
  const victoire3     = evenements.some(e => e.type === 'victoire_3buts')

  // Règle Souleymane puissant (seulement quand 3 Souleymanes existent)
  const sol3Avec2Fort = solTotal === 3 && solPuissantTotal === 2
  const sol3Avec3Fort = solTotal === 3 && solPuissantTotal === 3

  // ── CAS D'ABSENCE TOTALE : utiliser le signal des maisons But ──
  // Quand dom=0, ext=0 et aucune maison clé, le signal But détermine 1X/2X
  const absenceTotal = total === 0 && imsaCount === 0 && !youssouPresent
  if (absenceTotal && (butDomSignal > 0 || butExtSignal > 0)) {
    const combisAbsence = []
    if (butDomSignal >= butExtSignal && butDomSignal > 0)
      combisAbsence.push({ label: '1X', desc: `Domicile ne perd pas (Ibrahima DOM ×${butDomSignal})`, couleur: '#43a047', score: 50 + butDomSignal * 8 })
    if (butExtSignal >= butDomSignal && butExtSignal > 0)
      combisAbsence.push({ label: '2X', desc: `Extérieur ne perd pas (Ibrahima EXT ×${butExtSignal})`, couleur: '#1976d2', score: 50 + butExtSignal * 8 })
    if (butDomSignal > 0 && butExtSignal > 0)
      combisAbsence.push({ label: '-2,5', desc: 'Match fermé sous 3 buts (Ibrahima équilibré)', couleur: '#7c3aed', score: 55 })
    else
      combisAbsence.push({ label: '-2,5', desc: 'Moins de 3 buts (absence maisons clés)', couleur: '#7c3aed', score: 70 })
    // Déduplication double chance avant retour
    let _dc = false
    const _abs = combisAbsence.sort((a,b) => b.score-a.score).filter(c => {
      if (c.label === '1X' || c.label === '2X') { if (_dc) return false; _dc = true }
      return true
    })
    return _abs.slice(0,3).map(({label,desc,couleur,score}) => ({label,desc,couleur,score}))
  }
  // Absence totale sans signal But → 0-0 attendu, matchs très fermés
  if (absenceTotal) {
    return [
      { label: '-2,5', desc: 'Moins de 3 buts (aucune maison clé)', couleur: '#7c3aed', score: 75 },
      { label: '-3,5', desc: 'Moins de 4 buts (match très fermé)', couleur: '#6d28d9', score: 60 },
    ]
  }
  // Bonus "par la forme" quand Souleymane est en position forte
  const formesDom     = solFortsDom   // buts domicile confirmés par la forme
  const formesExt     = solFortsExt   // buts extérieur confirmés par la forme

  const COMBIS = [

    // ── V1 : Victoire domicile ─────────────────────────────────
    {
      label:   'V1',
      desc:    'Victoire équipe domicile',
      couleur: '#2e7d32',
      score: dom > ext
        ? 55
          + Math.min((dom - ext) * 12, 30)
          + (imsaSeulDom ? 10 : 0)
          + Math.min(formesDom * 8, 16)  // bonus "par la forme" Souleymane puissant
        : 0,
    },

    // ── 1X : Domicile ne perd pas ──────────────────────────────
    {
      label:   '1X',
      desc:    'Domicile ne perd pas',
      couleur: '#43a047',
      score: imsaSeulDom
        ? 70 + Math.min(imsaDom * 5, 20) + Math.min(formesDom * 5, 15)
        : dom >= ext
          ? 45 + Math.min((dom - ext) * 8, 20) + Math.min(formesDom * 5, 10)
          : 10,
    },

    // ── V2 : Victoire extérieur ────────────────────────────────
    {
      label:   'V2',
      desc:    'Victoire équipe extérieur',
      couleur: '#1565c0',
      score: ext > dom
        ? 55
          + Math.min((ext - dom) * 12, 30)
          + (imsaSeulExt ? 10 : 0)
          + Math.min(formesExt * 8, 16)  // bonus "par la forme" Souleymane puissant
        : 0,
    },

    // ── 2X : Extérieur ne perd pas ─────────────────────────────
    {
      label:   '2X',
      desc:    'Extérieur ne perd pas',
      couleur: '#1976d2',
      score: imsaSeulExt
        ? 70 + Math.min(imsaExt * 5, 20) + Math.min(formesExt * 5, 15)
        : ext >= dom
          ? 45 + Math.min((ext - dom) * 8, 20) + Math.min(formesExt * 5, 10)
          : 10,
    },

    // ── +2,5 : 3 buts ou plus ─────────────────────────────────
    {
      label:   '+2,5',
      desc:    sol3Avec3Fort
        ? '3 buts ou plus (3 Souleymane tous puissants)'
        : adama2Avec3Sol
          ? '3 buts ou plus (Adama M2 + 3 Souleymane)'
          : '3 buts ou plus dans le match',
      couleur: '#d97706',
      score: sol3Avec3Fort
        ? 84
        : adama2Avec3Sol
          ? 80
          : imsaCount >= 3
            ? 75 + Math.min((imsaCount - 3) * 5, 20) + (victoire3 ? 5 : 0)
            : total >= 3 || (formesDom + formesExt) >= 2
              ? 50 + Math.min((total - 3 + formesDom + formesExt) * 5, 25) + (victoire3 ? 5 : 0)
              : Math.max(0, 15 - (3 - total) * 8),
    },

    // ── -2,5 : Moins de 3 buts — bloqué si signal fort Imsa ──
    {
      label:   '-2,5',
      desc:    'Moins de 3 buts dans le match',
      couleur: '#7c3aed',
      score: imsaSignalFort ? 0   // Imsa puissant/M6/3+ = buts attendus → jamais -2,5
        : imsaCount === 0 && total < 3 && formesDom + formesExt < 2
          ? 65 + Math.min((3 - total) * 10, 25)
          : imsaCount < 2 && total < 3 ? 35
          : total < 3 ? 20 : Math.max(0, 15 - (total - 2) * 10),
    },

    // ── 2EM : Les deux équipes marquent ───────────────────────
    // Déclencheurs : score dom>0 && ext>0 ; Youssou M1 ; Imsa 2 zones ;
    // OU Sol puissant dans chaque zone (sans sol non-puissant seul)
    {
      label:   '2EM',
      desc:    '2EM',
      couleur: '#c62828',
      score: (dom > 0 && ext > 0)
        ? 55
          + (youssouPresent ? 30 : 0)
          + (imsaDeuxZones ? 20 : 0)
          + (sol2emPuissant ? 25 : 0)
          + Math.min(dom * 5, 10)
          + Math.min(ext * 5, 10)
        : sol2emPuissant ? 70
        : 0,
    },

    // ── +1,5 : 2 buts ou plus ─────────────────────────────────
    {
      label:   '+1,5',
      desc:    sol3Avec2Fort
        ? '2 buts ou plus (3 Souleymane dont 2 puissants)'
        : '2 buts ou plus dans le match',
      couleur: '#0891b2',
      score: sol3Avec2Fort
        ? 78
        : imsaCount >= 2 || total >= 2 || (formesDom + formesExt) >= 1
          ? 55 + Math.min((imsaCount + formesDom + formesExt) * 5, 25) + Math.min((total - 2) * 5, 15)
          : Math.max(0, 20 - (2 - total) * 15),
    },

    // ── -3,5 : Moins de 4 buts ────────────────────────────────
    {
      label:   '-3,5',
      desc:    'Moins de 4 buts dans le match',
      couleur: '#6d28d9',
      // Bloqué si signal fort Imsa ou idriss4 ou score élevé
      score: (!idriss4Avec4Sol && !imsaSignalFort && total < 4)
        ? (imsaCount === 0 && total <= 1
            ? 55 + Math.min((2 - total) * 8, 16)
            : imsaCount <= 2 && total < 4 ? 42
            : 20)
        : 0,
    },

    // ── +3,5 : 4 buts ou plus ─────────────────────────────────
    {
      label:   '+3,5',
      desc:    idriss4Avec4Sol
        ? '4 buts ou plus (Idriss M4 + Imsa + 4 Souleymane)'
        : '4 buts ou plus dans le match',
      couleur: '#b45309',
      score: idriss4Avec4Sol
        ? 78
        : total >= 4
          ? 40 + Math.min((total - 4) * 8, 20)
          : 0,
    },
  ]

  // Filtre de cohérence : la combinaison doit être compatible avec le score prédit
  const estCoherent = label => {
    const t = dom + ext
    if (label === 'V1')   return dom > ext
    if (label === 'V2')   return ext > dom
    if (label === '1X')   return dom >= ext
    if (label === '2X')   return ext >= dom
    // 2EM via score OU Sol puissant dans les 2 zones (sol2emBasique seul ne suffit plus)
    if (label === '2EM')  return (dom > 0 && ext > 0) || sol2emPuissant
    if (label === '+2,5') return t >= 3 || sol3Avec3Fort || adama2Avec3Sol
    if (label === '+1,5') return t >= 2 || sol3Avec2Fort || sol3Avec3Fort
    // Imsa puissant/M6/3+ = signal de buts → bloquer les "moins de buts"
    if (label === '-2,5') return t < 3 && !adama2Avec3Sol && !idriss4Avec4Sol && !imsaSignalFort
    if (label === '-3,5') return t < 4 && !idriss4Avec4Sol && !imsaSignalFort
    if (label === '+3,5') return t >= 4 || idriss4Avec4Sol
    return true
  }

  const tri = COMBIS
    .filter(c => c.score > 0 && estCoherent(c.label))
    .sort((a, b) => b.score - a.score)

  // Max 1 double chance + incompatibilités logiques :
  // V1 (dom gagne) est incompatible avec 2X (ext ne perd pas)
  // V2 (ext gagne) est incompatible avec 1X (dom ne perd pas)
  let dcInclus = false
  let hasV1 = false, hasV2 = false
  const sansDoubleDC = tri.filter(c => {
    if (c.label === 'V1') hasV1 = true
    if (c.label === 'V2') hasV2 = true
    if (c.label === '2X' && hasV1) return false  // V1 + 2X impossible
    if (c.label === '1X' && hasV2) return false  // V2 + 1X impossible
    if (c.label === '1X' || c.label === '2X') {
      if (dcInclus) return false
      dcInclus = true
    }
    return true
  })

  return sansDoubleDC
    .slice(0, 3)
    .map(({ label, desc, couleur, score }) => ({ label, desc, couleur, score }))
}

// ── Interprétation du tracé ──────────────────────────────────
export function genererInterpretation(maisonsPlacees, dom, ext, imsaCount, imsaDom, imsaExt, youssouPresent, souleymanes, noukhs, v1 = null, butDomSignal = 0, butExtSignal = 0, maisonsBut = []) {
  const lignes = []

  // Extraire les Imsa depuis maisonsPlacees (évite le problème de portée)
  const imsas = maisonsPlacees.filter(m => m.maison?.nom === 'Imsa')

  // Noms présents pour vérifier le témoin de Imsa (Ayouba)
  const nomsPresents      = new Set(maisonsPlacees.filter(m => m.maison).map(m => m.maison.nom))
  const temoinImsaPresent = nomsPresents.has('Ayouba')

  const solDom = souleymanes.filter(s => s.zone === 'domicile')
  const solExt = souleymanes.filter(s => s.zone === 'exterieur')

  // Imsa en positions puissantes par zone
  const imsaFortsDom = imsas.filter(im => im.zone === 'domicile' && im.puissance !== 'normal')
  const imsaFortsExt = imsas.filter(im => im.zone === 'exterieur' && im.puissance !== 'normal')

  // ── VALIDATION V1 ─────────────────────────────────────────────
  if (v1) {
    if (v1.temoinPresent)
      lignes.push(`V1 VALIDÉE — M1="${v1.maisonM1}" | Témoin "${v1.temoin}" PRÉSENT`)
    else
      lignes.push(`❌ V1 NON VALIDÉE — M1="${v1.maisonM1}" | Témoin "${v1.temoin}" ABSENT — tracé à recommencer`)
  }

  // ── CAS : ABSENCE TOTALE de Souleymane ET Imsa ───────────────
  if (souleymanes.length === 0 && imsaCount === 0) {
    if (youssouPresent) {
      const posY = maisonsPlacees.filter(m => m.maison?.nom === 'Youssou').map(m => `M${m.position}`).join(',')
      lignes.push(`⚽ YOUSSOU en ${posY} — Absence totale de Souleymane et Imsa`)
      lignes.push(`  ⟹ Malgré zéro but encaissé et zéro jubilé, les DEUX ÉQUIPES MARQUENT (2EM garanti par Youssou)`)
      lignes.push(`📊 Score prédit : ${dom}-${ext} (2EM minimal)`)
    } else {
      lignes.push(`⚪ ABSENCE TOTALE — Aucun Souleymane (but encaissé), Imsa (jubilé) ni Youssou`)
      lignes.push(`  ⟹ Score de base : 0-0 — aucun but prévu par les maisons clés`)
      // Analyse des maisons But en positions puissantes
      if (maisonsBut.length > 0) {
        lignes.push(`--- IBRAHIMA en position puissante (M3,M4,M5,M7,M8,M11,M12,M15,M16) ---`)
        maisonsBut.forEach(mp => {
          lignes.push(`  • Ibrahima M${mp.position} ★(${mp.puissance === 'tres_puissant' ? 'très puissant' : 'puissant'}) zone ${mp.zone === 'domicile' ? 'DOMICILE' : 'EXTÉRIEUR'}`)
        })
        if (butDomSignal > butExtSignal)
          lignes.push(`  ⟹ Ibrahima DOM (×${butDomSignal}) > EXT (×${butExtSignal}) → Domicile NE PERD PAS (1X)`)
        else if (butExtSignal > butDomSignal)
          lignes.push(`  ⟹ Ibrahima EXT (×${butExtSignal}) > DOM (×${butDomSignal}) → Extérieur NE PERD PAS (2X)`)
        else
          lignes.push(`  ⟹ Ibrahima DOM=EXT (×${butDomSignal}) → Nul possible (-2,5)`)
      } else {
        lignes.push(`  ⟹ Aucun Ibrahima en position puissante → Match 0-0 très probable`)
      }
    }
    return lignes.join('\n')
  }

  // ── SOULEYMANE : "but encaissé" ───────────────────────────────
  // zone DOMICILE → domicile encaisse → Extérieur +1 but
  // zone EXTÉRIEUR → extérieur encaisse → Domicile +1 but
  if (souleymanes.length > 0) {
    lignes.push(`--- SOULEYMANE "but encaissé" (${souleymanes.length} occurrence(s)) ---`)
    solDom.forEach(s => {
      const f = s.puissance !== 'normal' ? ` ★(${s.puissance === 'tres_puissant' ? 'très puissant' : 'puissant'} — but quasi certain)` : ''
      lignes.push(`  • M${s.position} zone DOMICILE${f} → domicile ENCAISSE → Extérieur +1 but`)
    })
    solExt.forEach(s => {
      const f = s.puissance !== 'normal' ? ` ★(${s.puissance === 'tres_puissant' ? 'très puissant' : 'puissant'} — but quasi certain)` : ''
      lignes.push(`  • M${s.position} zone EXTÉRIEUR${f} → extérieur ENCAISSE → Domicile +1 but`)
    })
    if (solDom.length > 0 && solExt.length > 0)
      lignes.push(`  ⟹ Souleymane DOM + EXT → les DEUX ÉQUIPES MARQUENT`)
    lignes.push(`  ⟹ Bilan Souleymane : Dom ${dom} — Ext ${ext}`)
  }

  // ── NOUKH (spectateur confirmatoire) ─────────────────────────
  if (noukhs.length > 0)
    lignes.push(`👁️ NOUKH en ${noukhs.map(n => `M${n.position}`).join(', ')} — spectateur (ne donne pas de but)`)

  // ── IMSA : "but jubilé" — l'équipe qui jubile marque le but ──
  // Nombre de Imsa = nombre total de buts dans le match
  if (imsaCount > 0) {
    lignes.push(`--- IMSA "but jubilé" (${imsaCount} occurrence(s) = ${imsaCount} but(s) dans le match) ---`)
    imsas.forEach(im => {
      const f = im.puissance !== 'normal' ? ` ★(${im.puissance === 'tres_puissant' ? 'très puissant' : 'puissant'})` : ''
      lignes.push(`  • M${im.position} zone ${im.zone === 'domicile' ? 'DOMICILE' : 'EXTÉRIEUR'}${f} → ${im.zone === 'domicile' ? 'Domicile' : 'Extérieur'} jubile +1 but`)
    })

    // Témoin de Imsa (Ayouba) = confirmation
    if (temoinImsaPresent)
      lignes.push(`  ★ Ayouba (témoin d'Imsa) PRÉSENT → signal CONFIRMÉ`)

    // Signal fort : Imsa DOM uniquement + Souleymane EXT → Domicile GAGNE
    if (imsaDom > 0 && imsaExt === 0 && solExt.length > 0)
      lignes.push(`  ⟹ SIGNAL FORT V1 : Imsa DOM-only (jubilé dom) + Souleymane EXT (ext encaisse) → DOMICILE GAGNE`)
    // Signal fort : Imsa EXT uniquement + Souleymane DOM → Extérieur GAGNE
    else if (imsaExt > 0 && imsaDom === 0 && solDom.length > 0)
      lignes.push(`  ⟹ SIGNAL FORT V2 : Imsa EXT-only (jubilé ext) + Souleymane DOM (dom encaisse) → EXTÉRIEUR GAGNE`)
    // Imsa DOM only
    else if (imsaDom > 0 && imsaExt === 0)
      lignes.push(`  ⟹ Imsa uniquement zone DOMICILE → Domicile NE PERD PAS (1X)`)
    // Imsa EXT only
    else if (imsaExt > 0 && imsaDom === 0)
      lignes.push(`  ⟹ Imsa uniquement zone EXTÉRIEUR → Extérieur NE PERD PAS (2X)`)
    // Les deux zones
    else if (imsaDom > 0 && imsaExt > 0)
      lignes.push(`  ⟹ Imsa dans les DEUX zones → les DEUX ÉQUIPES MARQUENT (2EM)`)

    // 2+ Imsa puissants zone DOM → domicile marque forcément N buts
    if (imsaFortsDom.length >= 2) {
      lignes.push(`  ⟹ ${imsaFortsDom.length} Imsa puissants DOM (${imsaFortsDom.map(im=>`M${im.position}`).join(',')}) → Domicile marque FORCÉMENT ${imsaFortsDom.length}+ buts`)
      if (temoinImsaPresent && solExt.length > 0)
        lignes.push(`    ★ Confirmation MAX : Ayouba présent + Souleymane EXT`)
    }
    // 2+ Imsa puissants zone EXT → extérieur marque forcément N buts
    if (imsaFortsExt.length >= 2)
      lignes.push(`  ⟹ ${imsaFortsExt.length} Imsa puissants EXT (${imsaFortsExt.map(im=>`M${im.position}`).join(',')}) → Extérieur marque FORCÉMENT ${imsaFortsExt.length}+ buts`)

    // Total buts par Imsa
    if (imsaCount >= 3) lignes.push(`  ⟹ ${imsaCount} Imsa → ${imsaCount} buts total (signal +2,5 FORT)`)
    else if (imsaCount === 2) lignes.push(`  ⟹ 2 Imsa → 2 buts total (signal +1,5)`)
    else lignes.push(`  ⟹ 1 Imsa → 1 but jubilé`)
  } else {
    lignes.push(`⚪ Aucun Imsa — pas de but jubilé`)
  }

  // ── YOUSSOU ───────────────────────────────────────────────────
  if (youssouPresent) {
    const posY = maisonsPlacees.filter(m => m.maison?.nom === 'Youssou').map(m => `M${m.position}`).join(',')
    lignes.push(`⚽ YOUSSOU en ${posY} → les DEUX ÉQUIPES MARQUENT (2EM garanti)`)
  }

  // ── RÉSULTAT FINAL ────────────────────────────────────────────
  const total = dom + ext
  if (dom > ext)      lignes.push(`📊 Score prédit : ${dom}-${ext} — DOMICILE favori`)
  else if (ext > dom) lignes.push(`📊 Score prédit : ${dom}-${ext} — EXTÉRIEUR favori`)
  else                lignes.push(`📊 Score prédit : ${dom}-${ext} — NUL possible`)

  if (total >= 3)       lignes.push(`📈 Total ${total} buts → +2,5`)
  else if (total === 2) lignes.push(`📈 Total 2 buts → +1,5`)
  else if (total === 1) lignes.push(`📉 1 but → match fermé`)
  else                  lignes.push(`📉 0 but → match très fermé`)

  return lignes.join('\n')
}

// ── Ajustement double chance par dominance Imsa (T1 + T2) ────────
// Valable pour tout match (pas seulement les nuls).
// Les Imsa puissants comptent double.
// Règle :
//   imsaDomTotal > imsaExtTotal → DOM ne perd pas → 1X
//   imsaExtTotal > imsaDomTotal → EXT ne perd pas → 2X
//   égalité → inchangé
export function ajusterDoubleChanceDraw(combinaisons, imsaDomTotal, imsaExtTotal) {
  if (imsaDomTotal === imsaExtTotal || !combinaisons?.length) return combinaisons

  const dcVoulu  = imsaDomTotal > imsaExtTotal ? '1X' : '2X'
  const dcExclu  = imsaDomTotal > imsaExtTotal ? '2X' : '1X'
  const couleurV = dcVoulu === '1X' ? '#43a047' : '#1976d2'
  const descV    = dcVoulu === '1X'
    ? `Domicile ne perd pas (Imsa DOM ×${imsaDomTotal} > EXT ×${imsaExtTotal})`
    : `Extérieur ne perd pas (Imsa EXT ×${imsaExtTotal} > DOM ×${imsaDomTotal})`

  // Règle d'incompatibilité logique :
  // V1 (dom gagne) est incompatible avec 2X (ext ne perd pas)
  // V2 (ext gagne) est incompatible avec 1X (dom ne perd pas)
  const hasV1 = combinaisons.some(c => c.label === 'V1')
  const hasV2 = combinaisons.some(c => c.label === 'V2')
  if (dcVoulu === '2X' && hasV1) return combinaisons  // V1 + 2X impossible
  if (dcVoulu === '1X' && hasV2) return combinaisons  // V2 + 1X impossible

  const aExclu = combinaisons.some(c => c.label === dcExclu)
  const aVoulu = combinaisons.some(c => c.label === dcVoulu)

  // Rien à corriger : bonne DC déjà présente ou aucune DC
  if (!aExclu && aVoulu)  return combinaisons
  if (!aExclu && !aVoulu) return combinaisons

  let result = combinaisons.filter(c => c.label !== dcExclu)
  if (!aVoulu) {
    result = [...result, { label: dcVoulu, desc: descV, couleur: couleurV, score: 58 }]
    result.sort((a, b) => b.score - a.score)
  }
  return result.slice(0, 3)
}

// ── MOTEUR PRINCIPAL ──────────────────────────────────────────────
// Régénère jusqu'à obtenir un tracé SOLIDE (V1 ET V2 passés)
export function genererTraceValide(maxEssais = 100) {
  for (let essai = 1; essai <= maxEssais; essai++) {
    const pts          = genererTraceAlea()
    const dispositions = calculerDispositions(pts)
    const analyse      = analyserDispositions(dispositions)
    if (analyse.verification.traceValide)
      return { ...analyse, pts, dispositions, essais: essai, status: 'valide' }
  }
  const pts          = genererTraceAlea()
  const dispositions = calculerDispositions(pts)
  const analyse      = analyserDispositions(dispositions)
  return { ...analyse, pts, dispositions, essais: maxEssais, status: 'partiel' }
}

// ── TRACÉ 1 OBLIGATOIRE avec Souleymane ───────────────────────────
// Le Tracé 1 doit contenir au moins un Souleymane.
// Si aucun Souleymane n'est présent, on relance jusqu'à en trouver un.
export function genererTrace1AvecSouleymane(maxEssais = 500) {
  const aSouleymane = a => a.maisonsPlacees?.some(m => m.maison?.nom === 'Souleymane')

  for (let essai = 1; essai <= maxEssais; essai++) {
    const pts          = genererTraceAlea()
    const dispositions = calculerDispositions(pts)
    const analyse      = analyserDispositions(dispositions)
    if (analyse.verification.traceValide && aSouleymane(analyse))
      return { ...analyse, pts, dispositions, essais: essai, status: 'valide' }
  }
  // Fallback : retourner le dernier tracé valide même sans Souleymane
  return genererTraceValide(100)
}
