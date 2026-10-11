import type { Prodotto, UnitaMisura } from '../domain/types'

/**
 * La dose per ettaro scritta in una nota, confrontata col massimo consentito.
 *
 * Serve a **fare le cose bene prima**, non a fare la predica dopo: chi scrive
 * "6 kg di rame su un ettaro" quando l'etichetta ne consente 4 lo deve sapere
 * subito, quando ancora può controllare se ha sbagliato a scrivere o a
 * dosare, e non quando i dati sono già nella dichiarazione.
 *
 * **Non impedisce mai di salvare**: il trattamento è già avvenuto, e un
 * registro che rifiuta un fatto irregolare non lo rende regolare, lo rende
 * invisibile.
 *
 * **Limite da dire chiaro:** funziona solo per i prodotti a cui è stata
 * messa la dose massima. Finché non arriva il registro ufficiale dei prodotti
 * la mette l'agricoltore a mano, dall'etichetta.
 */

export interface EsitoDose {
  prodotto: string
  dosePerEttaro: number
  doseMassima: number
  unita: UnitaMisura
  oltre: boolean
  messaggio: string
}

/** Fattori verso l'unità base del gruppo: chilogrammi o litri. */
const FATTORE: Partial<Record<UnitaMisura, { gruppo: 'peso' | 'volume'; fattore: number }>> = {
  g: { gruppo: 'peso', fattore: 0.001 },
  kg: { gruppo: 'peso', fattore: 1 },
  q: { gruppo: 'peso', fattore: 100 },
  t: { gruppo: 'peso', fattore: 1000 },
  ml: { gruppo: 'volume', fattore: 0.001 },
  l: { gruppo: 'volume', fattore: 1 },
}

/** Converte una quantità in un'altra unità; `undefined` se non si può (kg in litri). */
export function converti(quantita: number, da: UnitaMisura, a: UnitaMisura): number | undefined {
  if (da === a) return quantita
  const x = FATTORE[da]
  const y = FATTORE[a]
  if (!x || !y || x.gruppo !== y.gruppo) return undefined
  return (quantita * x.fattore) / y.fattore
}

export function controllaDose(
  prodotto: Prodotto,
  quantita: number,
  unitaNota: UnitaMisura | undefined,
  ettari: number | undefined,
): EsitoDose | undefined {
  if (prodotto.doseMaxPerHa == null || !ettari || ettari <= 0) return undefined
  const nellUnitaDelProdotto = converti(quantita, unitaNota ?? prodotto.unitaMisura, prodotto.unitaMisura)
  if (nellUnitaDelProdotto == null) return undefined

  const dose = Math.round((nellUnitaDelProdotto / ettari) * 100) / 100
  const oltre = dose > prodotto.doseMaxPerHa * 1.001
  const u = prodotto.unitaMisura
  return {
    prodotto: prodotto.nome,
    dosePerEttaro: dose,
    doseMassima: prodotto.doseMaxPerHa,
    unita: u,
    oltre,
    messaggio: oltre
      ? `${prodotto.nome}: ${numero(dose)} ${u}/ha, oltre il massimo di ${numero(prodotto.doseMaxPerHa)} ${u}/ha.`
      : `${prodotto.nome}: ${numero(dose)} ${u}/ha, entro il massimo di ${numero(prodotto.doseMaxPerHa)} ${u}/ha.`,
  }
}

function numero(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 })
}

/** Tutti i controlli di dose di una nota: uno per prodotto riconosciuto. */
export function controllaDosiNota(
  prodottiNota: { nome: string; quantita?: number; unitaMisura?: UnitaMisura }[],
  ettari: number | undefined,
  anagrafica: Prodotto[],
): EsitoDose[] {
  const esiti: EsitoDose[] = []
  for (const p of prodottiNota) {
    if (p.quantita == null || !p.nome) continue
    const prodotto = anagrafica.find((x) => !x.annullatoIl && x.nome.toLowerCase() === p.nome.toLowerCase())
    if (!prodotto) continue
    const esito = controllaDose(prodotto, p.quantita, p.unitaMisura, ettari)
    if (esito) esiti.push(esito)
  }
  return esiti
}
