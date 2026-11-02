import type { Giorno } from '../domain/types'
import { estraiFattura, estraiScadenza } from './estrazione'
import { creaLettoreLocale, preparaImmagine } from './tesseract'
import { fiduciaComplessiva, type RisultatoLettura, type Scheda } from './tipi'

import type { CampoLetto } from '../domain/types'
import { riconosciGenere } from './estrazione'
import { ErroreLettura, leggiColServizio, letturaSulServer, type DatiContesto } from './servizio'

export * from './tipi'
export { configurazioneServizio, impostaServizio, letturaSulServer, provaServizio } from './servizio'
export type { ConfigurazioneServizio } from './servizio'
export type { DatiContesto } from './servizio'
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
  /**
   * Tutti i campi letti, da archiviare: dal servizio arrivano più campi di
   * quelli della scheda (destinatario, IBAN, periodo…). Assente con Tesseract.
   */
  campi?: CampoLetto[]
  /** Quello che il servizio ha controllato: "Imponibile + IVA = totale", "manca una riga"… */
  controlli?: { esito: 'ok' | 'attenzione' | 'errore'; messaggio: string }[]
  /** Se il servizio non ha potuto leggere ed è subentrato Tesseract, il perché. */
  avviso?: string
}

export interface OpzioniLettura {
  oggi: Giorno
  onProgresso?: (frazione: number) => void
  /** Quello che l'app sa e aiuta a leggere: l'azienda, i prodotti in magazzino. */
  contesto?: DatiContesto
}

/**
 * Fotografia → scheda.
 *
 * Se il servizio di lettura è configurato si legge lì (vedi `servizio.ts`);
 * se non risponde — in campo la rete manca spesso — si legge sul telefono con
 * Tesseract, come prima. La scheda si riempie comunque.
 *
 * Il risultato dice sempre **quanto si è capito**. Una scheda che non dichiara
 * la propria incertezza è peggio di nessuna scheda: nessuno la controlla, e
 * l'errore finisce in un registro di legge.
 */
export async function leggiDocumento(
  immagine: Blob,
  /** `'auto'` lascia decidere all'app leggendo il testo: quasi sempre è meglio. */
  genere: GenereDocumento | 'auto',
  opzioni: OpzioniLettura = { oggi: '' },
): Promise<EsitoOcr> {
  if (!letturaSulServer()) return leggiDocumentoLocale(immagine, genere, opzioni)

  try {
    const esito = await leggiColServizio(immagine, opzioni)
    return { ...esito, controlli: esito.documento.controlli }
  } catch (e) {
    console.warn('[lettura] servizio non disponibile, leggo sul telefono:', e)
    const locale = await leggiDocumentoLocale(immagine, genere, opzioni)
    return {
      ...locale,
      avviso: `Letta qui sul telefono, con meno precisione, perché ${motivoInParole(e)}. Controlla bene i campi.`,
    }
  }
}

/**
 * Il perché, detto da persona. Solo quello che si sa davvero: un messaggio
 * che indovina la causa è peggio di nessun messaggio (diario, 26/09).
 */
function motivoInParole(e: unknown): string {
  if (!(e instanceof ErroreLettura)) return 'il servizio di lettura ha avuto un problema'
  switch (e.codice) {
    case 'rete':
      return 'il servizio di lettura non è raggiungibile'
    case 'accesso':
      return 'il servizio di lettura non accetta il gettone o non è configurato'
    case 'limite':
      return 'il servizio di lettura è occupato'
    case 'file':
      return 'il servizio di lettura non ha accettato la foto'
    default:
      return 'il servizio di lettura ha avuto un problema'
  }
}

/** La lettura sul telefono, con Tesseract: niente rete, niente server, più errori. */
export async function leggiDocumentoLocale(
  immagine: Blob,
  genere: GenereDocumento | 'auto',
  opzioni: OpzioniLettura = { oggi: '' },
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
