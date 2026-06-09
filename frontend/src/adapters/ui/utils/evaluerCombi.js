// Évalue si une combinaison est gagnée/perdue selon le score réel.
// Retourne : 'pending' (jaune) | 'ok' (vert) | 'nok' (rouge)
export function evaluerCombi(label, scoreReel) {
  if (!scoreReel || typeof scoreReel !== 'string') return 'pending'
  const parts = scoreReel.split('-')
  if (parts.length !== 2) return 'pending'
  const dom = parseInt(parts[0], 10)
  const ext = parseInt(parts[1], 10)
  if (isNaN(dom) || isNaN(ext)) return 'pending'
  const total = dom + ext
  const regles = {
    'V1':   () => dom > ext,
    'V2':   () => ext > dom,
    '1X':   () => dom >= ext,
    '2X':   () => ext >= dom,
    '+2,5': () => total >= 3,
    '-2,5': () => total < 3,
    '2EM':  () => dom > 0 && ext > 0,
    '+1,5': () => total >= 2,
    '-3,5': () => total < 4,
    '+3,5': () => total >= 4,
  }
  const fn = regles[label]
  if (!fn) return 'pending'
  return fn() ? 'ok' : 'nok'
}

// Classe CSS selon l'évaluation
export function classeCombi(etat) {
  if (etat === 'ok')  return 'combi-ok'
  if (etat === 'nok') return 'combi-nok'
  return 'combi-pending'
}
