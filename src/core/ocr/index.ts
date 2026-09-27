import type { Giorno } from '../domain/types'
import { estraiFattura, estraiScadenza } from './estrazione'
import { creaLettoreLocale, preparaImmagine } from './tesseract'
import { fiduciaComplessiva, type RisultatoLettura, type Scheda } from './tipi'

import type { CampoLetto } from '../domain/types'
import { riconosciGenere } from './estrazione'

export * from './tipi'
export { estraiFattura, estraiScadenza, riconosciGenere } from './estrazione'

export type GenereDocumento = 'fattura' | 'scadenza'

const ETICHETTE: Record<string, string> = {
  fornitore: 'Fornitore',
  numero: 'Numero',
  data: 'Data del documento',
  partitaIva: 'Partita IVA',
  imponibile: 'Imponibile',
  totale: 'Totale',
  intestatario: 'Intestatario',
  rilasciatoIl: 'Rilasciato il',
  scadeIl: 'Scade il',
}

/**
 * Appiattisce la scheda in un elenco di campi da archiviare col documento.
 *
 * Si conservano perché **la correzione deve restare possibile sempre**, non
 * solo nei trenta secondi dell'inserimento.
 */
export function campiDellaScheda(scheda: Scheda): CampoLetto[] {
  const campi: CampoLetto[] = []

  for (const [chiave, valore] of Object.entries(scheda)) {
    if (chiave === 'tipo' || chiave === 'righe' || !valore) continue
    const campo = valore as { valore: unknown; fiducia: number; riga: string }
    if (campo.valore == null) continue

    campi.push({
      chiave,
      etichetta: ETICHETTE[chiave] ?? chiave,
      valore: String(campo.valore),
      fiducia: campo.fiducia,
      riga: campo.riga,
    })
  }

  return campi
}

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
  /** `'auto'` lascia decidere all'app leggendo il testo: quasi sempre è meglio. */
  genere: GenereDocumento | 'auto',
  opzioni: { oggi: Giorno; onProgresso?: (frazione: number) => void } = { oggi: '' },
): Promise<EsitoOcr> {
  const lettore = creaLettoreLocale('ita')

  try {
    const preparata = await preparaImmagine(immagine)
    const lettura = await lettore.leggi(preparata, opzioni.onProgresso)

    const genereEffettivo =
      genere === 'auto' ? riconosciGenere(lettura.testoGrezzo) : genere

    const scheda = interpretaTesto(lettura.testoGrezzo, genereEffettivo, opzioni.oggi)

    // Due incertezze distinte: quanto è leggibile la foto, e quanto si è
    // riusciti a capirne. Vanno moltiplicate, non mediate.
    const fiducia = fiduciaComplessiva(scheda) * Math.max(0.35, lettura.fiducia)

    return { scheda, lettura, fiducia, daControllare: fiducia < 0.65 }
  } finally {
    await lettore.chiudi?.()
  }
}

/**
 * Rilegge i campi dal testo già acquisito, senza rifotografare.
 *
 * Serve quando ci si accorge che il documento è stato interpretato col lettore
 * sbagliato: si cambia tipo e i campi si ricavano di nuovo in un istante,
 * perché il testo della foto è già archiviato.
 */
export function interpretaTesto(
  testoGrezzo: string,
  genere: GenereDocumento,
  oggi: Giorno,
): Scheda {
  return genere === 'fattura'
    ? estraiFattura(testoGrezzo)
    : estraiScadenza(testoGrezzo, oggi)
}
