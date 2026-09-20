import type { Giorno, Intervento, Istante, Prodotto, RigaProdotto } from '../domain/types'

/** Somma giorni a una data civile, senza farsi sviare dai fusi orari. */
export function aggiungiGiorni(giorno: Giorno, giorni: number): Giorno {
  const [a, m, g] = giorno.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, g))
  d.setUTCDate(d.getUTCDate() + giorni)
  return d.toISOString().slice(0, 10)
}

export function differenzaGiorni(da: Giorno, a: Giorno): number {
  const p = (s: Giorno) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((p(a) - p(da)) / 86_400_000)
}

/**
 * Data a partire dalla quale si può raccogliere.
 *
 * Vale il tempo di carenza più lungo fra tutti i prodotti impiegati: basta un
 * prodotto con carenza lunga per bloccare l'intera raccolta.
 * Restituisce `undefined` se nessun prodotto ha un tempo di carenza noto — in
 * quel caso l'app deve dirlo chiaramente, non dare per buono "zero giorni".
 */
export function calcolaRaccoltaConsentitaDal(
  dataIntervento: Giorno,
  righe: RigaProdotto[],
  prodotti: Map<string, Prodotto>,
): { dal?: Giorno; prodottoVincolante?: Prodotto; incompleto: boolean } {
  let massimo = -1
  let vincolante: Prodotto | undefined
  let incompleto = false

  for (const riga of righe) {
    const prodotto = prodotti.get(riga.prodottoId)
    if (!prodotto) {
      incompleto = true
      continue
    }
    if (prodotto.tempoCarenzaGiorni == null) {
      // Prodotto senza dato di carenza: non possiamo affermare che sia zero.
      if (prodotto.tipo === 'fitosanitario') incompleto = true
      continue
    }
    if (prodotto.tempoCarenzaGiorni > massimo) {
      massimo = prodotto.tempoCarenzaGiorni
      vincolante = prodotto
    }
  }

  if (massimo < 0) return { incompleto }
  return {
    dal: aggiungiGiorni(dataIntervento, massimo),
    prodottoVincolante: vincolante,
    incompleto,
  }
}

/**
 * Istante dal quale si può rientrare in campo senza dispositivi di protezione.
 * Si conta dalla fine del trattamento; in mancanza dell'ora si assume mezzogiorno,
 * scelta prudente rispetto a mezzanotte.
 */
export function calcolaRientroConsentitoDal(
  dataIntervento: Giorno,
  oraFine: string | undefined,
  righe: RigaProdotto[],
  prodotti: Map<string, Prodotto>,
): Istante | undefined {
  let oreMax = -1
  for (const riga of righe) {
    const ore = prodotti.get(riga.prodottoId)?.tempoRientroOre
    if (ore != null && ore > oreMax) oreMax = ore
  }
  if (oreMax < 0) return undefined

  const [a, m, g] = dataIntervento.split('-').map(Number)
  const [oh, om] = (oraFine ?? '12:00').split(':').map(Number)
  const fine = new Date(a, m - 1, g, oh || 0, om || 0)
  fine.setHours(fine.getHours() + oreMax)
  return fine.toISOString()
}

export interface StatoCarenza {
  /** La raccolta è bloccata a oggi. */
  bloccata: boolean
  dal?: Giorno
  giorniMancanti?: number
  prodottoVincolante?: string
  /** Manca il dato di carenza di almeno un prodotto: il calcolo non è affidabile. */
  incompleto: boolean
}

/**
 * Stato di carenza corrente di un campo, guardando tutti i suoi interventi.
 * È il dato che va in cima alla scheda del campo.
 */
export function statoCarenzaCampo(
  interventi: Intervento[],
  prodotti: Map<string, Prodotto>,
  aOggi: Giorno,
): StatoCarenza {
  let dal: Giorno | undefined
  let vincolante: string | undefined
  let incompleto = false

  for (const intervento of interventi) {
    if (intervento.annullatoIl) continue
    if (intervento.tipo !== 'trattamento') continue

    const esito = calcolaRaccoltaConsentitaDal(intervento.data, intervento.righe, prodotti)
    if (esito.incompleto) incompleto = true
    if (!esito.dal) continue
    if (!dal || esito.dal > dal) {
      dal = esito.dal
      vincolante = esito.prodottoVincolante?.nome
    }
  }

  if (!dal) return { bloccata: false, incompleto }
  const mancanti = differenzaGiorni(aOggi, dal)
  return {
    bloccata: mancanti > 0,
    dal,
    giorniMancanti: mancanti > 0 ? mancanti : 0,
    prodottoVincolante: vincolante,
    incompleto,
  }
}
