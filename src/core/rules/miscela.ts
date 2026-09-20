import type { UnitaMisura } from '../domain/types'

/**
 * Calcolatore della miscela.
 *
 * L'etichetta di un fitofarmaco esprime la dose in due modi incompatibili:
 *  - per ettaro           (es. 2 l/ha)   → indipendente dal volume d'acqua
 *  - per ettolitro        (es. 150 ml/hl) → dipendente dal volume d'acqua
 * Confonderli è l'errore di dosaggio più comune e più costoso. Qui sono due
 * strade separate e dichiarate.
 */
export type ModoDose = 'per_ha' | 'per_hl'

export interface RichiestaMiscela {
  superficieHa: number
  /** Volume d'acqua distribuito per ettaro, in litri. */
  volumeAcquaLHa: number
  /** Capacità della botte, in litri. */
  capacitaBotteL: number
  dose: number
  modoDose: ModoDose
  unitaProdotto: UnitaMisura
}

export interface EsitoMiscela {
  /** Prodotto complessivo per tutta la superficie. */
  prodottoTotale: number
  unitaProdotto: UnitaMisura
  acquaTotaleL: number
  /** Botti piene necessarie. */
  bottiPiene: number
  /** Litri d'acqua nell'ultima botte, parziale. */
  ultimaBotteL: number
  /** Prodotto da versare in una botte piena: è il numero che serve sul campo. */
  prodottoPerBottePiena: number
  /** Prodotto da versare nell'ultima botte parziale. */
  prodottoUltimaBotte: number
  /** Ettari coperti da una botte piena: utile per pianificare il giro. */
  haPerBotte: number
  avvertimenti: string[]
}

export function calcolaMiscela(r: RichiestaMiscela): EsitoMiscela {
  const avvertimenti: string[] = []

  if (r.superficieHa <= 0) avvertimenti.push('Superficie non indicata')
  if (r.volumeAcquaLHa <= 0) avvertimenti.push('Volume d’acqua per ettaro non indicato')
  if (r.capacitaBotteL <= 0) avvertimenti.push('Capacità della botte non indicata')

  const acquaTotaleL = r.superficieHa * r.volumeAcquaLHa

  const prodottoTotale =
    r.modoDose === 'per_ha'
      ? r.dose * r.superficieHa
      : // per ettolitro: la dose si riferisce a ogni 100 litri di miscela
        (r.dose * acquaTotaleL) / 100

  const botteSicura = r.capacitaBotteL > 0 ? r.capacitaBotteL : 1
  const botti = acquaTotaleL / botteSicura
  const bottiPiene = Math.floor(botti + 1e-9)
  const ultimaBotteL = Math.round((acquaTotaleL - bottiPiene * botteSicura) * 10) / 10

  const haPerBotte = r.volumeAcquaLHa > 0 ? botteSicura / r.volumeAcquaLHa : 0

  const prodottoPerBottePiena =
    r.modoDose === 'per_ha' ? r.dose * haPerBotte : (r.dose * botteSicura) / 100

  const prodottoUltimaBotte =
    ultimaBotteL > 0
      ? r.modoDose === 'per_ha'
        ? (r.dose * ultimaBotteL) / Math.max(r.volumeAcquaLHa, 1e-9)
        : (r.dose * ultimaBotteL) / 100
      : 0

  if (bottiPiene === 0 && ultimaBotteL > 0) {
    avvertimenti.push('Basta una botte parziale: attenzione a non preparare miscela in eccesso')
  }
  if (ultimaBotteL > 0 && bottiPiene > 0) {
    avvertimenti.push(
      `L’ultima botte va riempita con soli ${arrotonda(ultimaBotteL)} litri d’acqua`,
    )
  }

  return {
    prodottoTotale: arrotonda(prodottoTotale),
    unitaProdotto: r.unitaProdotto,
    acquaTotaleL: arrotonda(acquaTotaleL),
    bottiPiene,
    ultimaBotteL,
    prodottoPerBottePiena: arrotonda(prodottoPerBottePiena),
    prodottoUltimaBotte: arrotonda(prodottoUltimaBotte),
    haPerBotte: arrotonda(haPerBotte),
    avvertimenti,
  }
}

function arrotonda(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

/**
 * Percorso inverso: a fine giornata si sa quanta miscela è stata davvero
 * distribuita, non quanta se ne era programmata. È questo il dato che deve
 * finire nel registro, altrimenti il confronto fra annate non vale nulla.
 */
export function doseEffettiva(
  prodottoImpiegato: number,
  superficieTrattataHa: number,
): number | undefined {
  if (superficieTrattataHa <= 0) return undefined
  return arrotonda(prodottoImpiegato / superficieTrattataHa)
}
