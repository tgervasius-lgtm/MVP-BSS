const CONTEXTS = Object.freeze({
  Proizvodnja: { area: 'Ulaz proizvodnje', manager: 'Voditelj proizvodnje', team: 'Proizvodni tim', moment: 'početak jutarnje smjene' },
  Građevina: { area: 'Ulaz gradilišta', manager: 'Voditelj gradilišta', team: 'Terenski tim', moment: 'okupljanje prije izlaska na teren' },
  Logistika: { area: 'Ulaz skladišta', manager: 'Voditelj logistike', team: 'Skladišni tim', moment: 'početak jutarnjeg vala otpreme' },
  Trgovina: { area: 'Ulaz poslovnice', manager: 'Voditelj poslovnice', team: 'Prodajni tim', moment: 'otvaranje poslovnice' },
  Ured: { area: 'Glavni ulaz', manager: 'Voditelj odjela', team: 'Uredski tim', moment: 'početak radnog dana' },
  Ostalo: { area: 'Glavni ulaz', manager: 'Voditelj tima', team: 'Operativni tim', moment: 'početak radnog dana' }
});

export function getIndustryContext(industry) {
  return CONTEXTS[industry] ?? CONTEXTS.Ostalo;
}
