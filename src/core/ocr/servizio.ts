import {
  componiContesto,
  creaClient,
  ErroreLettura,
  fieldLog,
  type DatiContesto,
} from 'from-pic-to-data'
import type { Giorno } from '../domain/types'

/**
 * La lettura col servizio (from-pic-to-data, sul nostro server).
 *
 * ## Perché
 *
 * Tesseract sul telefono legge bene una fattura finta dritta e male una vera
 * stropicciata (domanda aperta C3). Il servizio fa leggere la foto a un modello
 * che capisce l'impaginazione, e poi controlla i dati per conto suo: partita
 * IVA e codice fiscale con la cifra di controllo, le righe che fanno
 * l'imponibile, imponibile + IVA che fa il totale. Ogni campo arriva con la
 * riga da cui viene e quanto ci si può fidare, come prima.
 *
 * ## Cosa cambia per l'agricoltore
 *
 * **La foto esce dal telefono**: va al server e da lì al servizio del modello.
 * Prima no. L'interfaccia lo deve dire, e lo dice (`letturaSulServer`).
 *
 * ## Senza rete
 *
 * Si legge col Tesseract di sempre, sul telefono: la scheda si riempie lo
 * stesso, peggio. Mai bloccare l'inserimento per colpa della lettura.
 *
 * ## Dove sta l'indirizzo
 *
 * Nelle **Impostazioni** del telefono, non dentro l'app: così l'app pubblicata
 * su GitHub Pages non contiene né indirizzo né gettone, e la stessa app si
 * punta al PC durante le prove e al server vero dopo, senza ricostruirla.
 * `VITE_LETTURA_URL` e `VITE_LETTURA_GETTONE` (file `.env.local`) valgono solo
 * come valori predefiniti, comodi in sviluppo.
 */

const CHIAVE = 'servizio-lettura'

export interface ConfigurazioneServizio {
  indirizzo: string
  gettone: string
}

export function configurazioneServizio(): ConfigurazioneServizio {
  try {
    const salvata = localStorage.getItem(CHIAVE)
    if (salvata) return JSON.parse(salvata) as ConfigurazioneServizio
  } catch {
    // Archivio del browser non disponibile o rovinato: valgono i predefiniti.
  }
  return {
    indirizzo: import.meta.env.VITE_LETTURA_URL ?? '',
    gettone: import.meta.env.VITE_LETTURA_GETTONE ?? '',
  }
}

/** Indirizzo vuoto = niente servizio, si legge sul telefono. */
export function impostaServizio(c: ConfigurazioneServizio): void {
  localStorage.setItem(CHIAVE, JSON.stringify({ indirizzo: c.indirizzo.trim(), gettone: c.gettone.trim() }))
}

export function letturaSulServer(): boolean {
  return Boolean(configurazioneServizio().indirizzo)
}

function client() {
  const { indirizzo, gettone } = configurazioneServizio()
  if (!indirizzo) throw new ErroreLettura('accesso', 'Servizio di lettura non configurato.', false)
  return creaClient({ indirizzo, gettone: gettone || undefined })
}

/** Per il pulsante "Prova il collegamento": risponde, e il gettone è giusto? */
export async function provaServizio(): Promise<string> {
  const { indirizzo, gettone } = configurazioneServizio()
  if (!indirizzo) return 'Nessun indirizzo: i documenti si leggono sul telefono.'
  try {
    const salute = await fetch(indirizzo.replace(/\/+$/, '') + '/salute', { signal: AbortSignal.timeout(8000) })
    if (!salute.ok) return `Il servizio risponde con un errore (${salute.status}).`
    // Una richiesta vuota: col gettone giusto torna "nessuna foto", senza
    // gettone o con quello sbagliato torna "accesso".
    const prova = await fetch(indirizzo.replace(/\/+$/, '') + '/leggi', {
      method: 'POST',
      body: new FormData(),
      headers: gettone ? { authorization: `Bearer ${gettone}` } : {},
      signal: AbortSignal.timeout(8000),
    })
    const corpo = (await prova.json().catch(() => null)) as { errore?: { codice: string } } | null
    if (corpo?.errore?.codice === 'accesso') return 'Il servizio risponde, ma il gettone è sbagliato o manca.'
    return '✅ Collegamento a posto: le foto dei documenti si leggono col servizio.'
  } catch {
    return 'Il servizio non risponde: indirizzo sbagliato, PC spento o niente rete.'
  }
}

export type EsitoServizio = ReturnType<typeof fieldLog.comeEsitoOcr>

export async function leggiColServizio(
  immagine: Blob,
  opzioni: { oggi: Giorno; contesto?: DatiContesto; onProgresso?: (frazione: number) => void },
): Promise<EsitoServizio> {
  const lettore = client()

  // Il servizio non dice a che punto è: una barra che avanza piano e non
  // arriva mai in fondo da sola dice la verità, cioè "sto lavorando".
  let frazione = 0.05
  opzioni.onProgresso?.(frazione)
  const timer = setInterval(() => {
    frazione += (0.9 - frazione) * 0.05
    opzioni.onProgresso?.(frazione)
  }, 500)

  try {
    const documento = await lettore.leggi(immagine, {
      profilo: 'documenti',
      oggi: opzioni.oggi,
      contesto: opzioni.contesto ? componiContesto(opzioni.contesto) : undefined,
    })
    opzioni.onProgresso?.(1)
    return fieldLog.comeEsitoOcr(documento)
  } finally {
    clearInterval(timer)
  }
}

export { ErroreLettura }
export type { DatiContesto }
