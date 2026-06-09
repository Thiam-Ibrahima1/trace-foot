// ============================================================
// Maison.js — 16 maisons avec dispositions corrigées + témoins
// ============================================================
export const MAISONS = [
  { n:1,  nom:'Youssou',        temoin:'Makhdiyou',      d:[1,1,2,1], sig:'But encaissé — 2 équipes marquent',  p:[1,5,9,13],  tp:[2,6,10,14] },
  { n:2,  nom:'Adama',          temoin:'Idriss',         d:[1,2,2,2], sig:'Victoire ou 3 buts',                 p:[1,5,9,13],  tp:[2,6,10,14] },
  { n:3,  nom:'Makhdiyou',      temoin:'Ibrahima',       d:[2,1,1,1], sig:'But et victoire',                    p:[2,6,10,14], tp:[1,5,9,13]  },
  { n:4,  nom:'Idriss',         temoin:'Imsa',           d:[2,2,1,2], sig:'But',                                p:[3,7,11,15], tp:[4,8,12,16] },
  { n:5,  nom:'Ibrahima',       temoin:'Omar',           d:[1,1,1,1], sig:'But',                                p:[3,5,7,11,15], tp:[4,8,12,16] },
  { n:6,  nom:'Imsa',           temoin:'Ayouba',         d:[1,2,1,2], sig:'But jubilé',                         p:[3,6,7,11,15], tp:[4,8,12,16] },
  { n:7,  nom:'Omar',           temoin:'Allahou Talla',  d:[2,1,2,2], sig:'Carton rouge ou blessure',           p:[2,6,10,14], tp:[1,5,9,13]  },
  { n:8,  nom:'Ayouba',         temoin:'Souleymane',     d:[2,2,2,1], sig:'Hors-jeu',                           p:[4,8,12,16], tp:[3,7,11,15] },
  { n:9,  nom:'Allahou Talla',  temoin:'Alioune Badara', d:[1,1,2,2], sig:'But et victoire fort',               p:[1,5,9,13],  tp:[2,6,10,14] },
  { n:10, nom:'Souleymane',     temoin:'Noukh',          d:[1,2,2,1], sig:'But encaissé (chaque = 1 but)',      p:[4,8,10,12,16], tp:[3,7,11,15] },
  { n:11, nom:'Alioune Badara', temoin:'Assane',         d:[2,1,1,2], sig:'But tardif',                         p:[2,6,10,14], tp:[1,5,9,13]  },
  { n:12, nom:'Noukh',          temoin:'Younouss',       d:[2,2,1,1], sig:'But encaissé',                       p:[4,8,12,16], tp:[3,7,11,15] },
  { n:13, nom:'Assane',         temoin:'Ousmane',        d:[1,1,1,2], sig:'Penalty',                            p:[3,7,11,15], tp:[4,8,12,16] },
  { n:14, nom:'Younouss',       temoin:'Moussa',         d:[1,2,1,1], sig:'2 buts ou victoire',                 p:[4,8,12,16], tp:[3,7,11,15] },
  { n:15, nom:'Ousmane',        temoin:'Youssou',        d:[2,1,2,1], sig:'But et victoire',                    p:[2,6,10,14], tp:[1,5,9,13]  },
  { n:16, nom:'Moussa',         temoin:'Adama',          d:[2,2,2,2], sig:'2 buts',                             p:[1,5,9,13],  tp:[2,6,10,14] },
]

export const ZONE_DOM = [1,2,3,4,9,10,13,15,16]

export const identifierMaison   = d  => MAISONS.find(m => m.d.every((v,i) => v===d[i])) || null
export const zonePos             = pos => ZONE_DOM.includes(pos) ? 'domicile' : 'exterieur'
export const niveauPuissance     = (m,pos) => m.tp.includes(pos)?'tres_puissant':m.p.includes(pos)?'puissant':'normal'
