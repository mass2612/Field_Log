import type { Giorno } from '../domain/types'
import { estraiFattura, estraiScadenza } from './estrazione'
import { creaLettoreLocale, preparaImmagine } from './tesseract'
import { fiduciaComplessiva, type RisultatoLettura, type Scheda } from './tipi'

export * from './tipi'
export { estraiFattura, estraiScadenza } from './estrazione'

export type GenereDocumento = 'fattura' | 'scadenza'

export interface EsitoOcr {
  scheda: Scheda
  lettura: RisultatoLettura
  /** Quanto ci si può fidare della scheda nel suo insieme, da 0 a 1. */
  fiducia: number
  /** Vero quando conviene che l'utente controlli riga per riga. */
  daControllare: boolean
}

/**
 * Fotografia → scheda.
 *
 * Un passaggio solo per chi la usa; sotto sono tre: si raddrizza l'immagine, si
 * legge il testo, si ricavano i campi.
 *
 * Il risultato dice sempre **quanto si è capito**. Una scheda che non dichiara
 * la propria incertezza è peggio di nessuna scheda: nessuno la controlla, e
 * l'errore finisce in un registro di legge.
 */
export async function leggiDocumento(
  immagine: Blob,
  genere: GenereDocumento,
  opzioni: { oggi: Giorno; onProgresso?: (frazione: number) => void } = { oggi: '' },
): Promise<EsitoOcr> {
  const lettore = creaLettoreLocale('ita')

  try {
    const preparata = await preparaImmagine(immagine)
    const lettura = await lettore.leggi(preparata, opzioni.onProgresso)

    const scheda =
      genere === 'fattura'
        ? estraiFattura(lettura.testoGrezzo)
        : estraiScadenza(lettura.testoGrezzo, opzioni.oggi)

    // Due incertezze distinte: quanto è leggibile la foto, e quanto si è
    // riusciti a capirne. Vanno moltiplicate, non mediate.
    const fiducia = fiduciaComplessiva(scheda) * Math.max(0.35, lettura.fiducia)

    return { scheda, lettura, fiducia, daControllare: fiducia < 0.65 }
  } finally {
    await lettore.chiudi?.()
  }
}
