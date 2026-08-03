const CONTEXTS = Object.freeze({
  Proizvodnja: { area: 'Ulaz proizvodnje', manager: 'Voditelj proizvodnje', team: 'Proizvodni tim', moment: 'početak jutarnje smjene', units: ['Linija A', 'Linija B'] },
  Građevina: { area: 'Ulaz gradilišta', manager: 'Voditelj gradilišta', team: 'Terenski tim', moment: 'okupljanje prije izlaska na teren', units: ['Gradilišna ekipa', 'Logistika gradilišta'] },
  Logistika: { area: 'Ulaz skladišta', manager: 'Voditelj logistike', team: 'Skladišni tim', moment: 'početak jutarnjeg vala otpreme', units: ['Prijem robe', 'Otprema'] },
  Trgovina: { area: 'Ulaz poslovnice', manager: 'Voditelj poslovnice', team: 'Prodajni tim', moment: 'otvaranje poslovnice', units: ['Prodajni prostor', 'Blagajne'] },
  Ured: { area: 'Glavni ulaz', manager: 'Voditelj odjela', team: 'Uredski tim', moment: 'početak radnog dana', units: ['Operativni tim', 'Podrška'] },
  Ostalo: { area: 'Glavni ulaz', manager: 'Voditelj tima', team: 'Operativni tim', moment: 'početak radnog dana', units: ['Primarno područje', 'Podrška'] }
});

export function getIndustryContext(industry) {
  return CONTEXTS[industry] ?? CONTEXTS.Ostalo;
}
