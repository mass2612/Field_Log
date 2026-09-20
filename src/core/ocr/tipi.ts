import type { Giorno, UnitaMisura } from '../domain/types'

/**
 * Leggere i documenti fotografati.
 *
 * Due pezzi separati apposta:
 *   1. il **motore** che trasforma la foto in testo (Tesseract oggi, un servizio
 *      migliore domani);
 *   2. l'**estrazione** che dal testo ricava i campi — numero, data, importi.
 *
 * Il secondo è quello che vale, ed è indipendente dal primo: si può provare
 * senza fotografare niente, e resta buono anche cambiando motore.
 */

export interface RisultatoLettura {
  testoGrezzo: string
  /** Quanto il motore si fida di quello che ha letto, da 0 a 1. */
  fiducia: number
  durataMs: number
  motore: string
}

export interface LettoreDocumenti {
  nome: string
  /** Vero se funziona senza rete. */
  offline: boolean
  leggi(immagine: Blob, onProgresso?: (frazione: number) => void): Promise<RisultatoLettura>
  chiudi?(): Promise<void>
}

/**
 * Un campo ricavato dal testo.
 *
 * Porta con sé **da quale riga è stato preso**: è così che l'agricoltore può
 * controllare in un secondo se il numero è quello giusto, invece di fidarsi o
 * di ricontrollare tutto. Un dato senza provenienza è un dato che nessuno
 * verifica.
 */
export interface CampoEstratto<T> {
  valore: T
  /** Da 0 a 1. Sotto 0,6 l'interfaccia lo segnala come da controllare. */
  fiducia: number
  riga: string
}

export interface RigaFattura {
  descrizione: string
  quantita?: number
  unitaMisura?: UnitaMisura
  prezzoUnitario?: number
  importo?: number
  fiducia: number
  riga: string
}

export interface SchedaFattura {
  tipo: 'fattura'
  fornitore?: CampoEstratto<string>
  numero?: CampoEstratto<string>
  data?: CampoEstratto<Giorno>
  partitaIva?: CampoEstratto<string>
  imponibile?: CampoEstratto<number>
  totale?: CampoEstratto<number>
  righe: RigaFattura[]
}

export interface SchedaScadenza {
  tipo: 'scadenza'
  intestatario?: CampoEstratto<string>
  numero?: CampoEstratto<string>
  rilasciatoIl?: CampoEstratto<Giorno>
  scadeIl?: CampoEstratto<Giorno>
}

export type Scheda = SchedaFattura | SchedaScadenza

/** Quanto ci si può fidare della scheda nel suo insieme. */
export function fiduciaComplessiva(scheda: Scheda): number {
  const campi: (CampoEstratto<unknown> | undefined)[] =
    scheda.tipo === 'fattura'
      ? [scheda.fornitore, scheda.numero, scheda.data, scheda.totale]
      : [scheda.scadeIl, scheda.numero, scheda.intestatario]

  const presenti = campi.filter((c): c is CampoEstratto<unknown> => c != null)
  if (presenti.length === 0) return 0
  // Media abbassata da quanti campi mancano: una scheda mezza vuota non è
  // "sicura al 90%", è una scheda mezza vuota.
  const media = presenti.reduce((s, c) => s + c.fiducia, 0) / presenti.length
  return media * (presenti.length / campi.length)
}
