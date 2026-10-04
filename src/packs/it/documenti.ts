import type { Documento } from '../../core/domain/types'

/**
 * Quali documenti servono alla legge sul quaderno di campagna, in Italia.
 *
 * ## Da dove vengono queste regole
 *
 * - D.Lgs. 150/2012 e PAN: il registro dei trattamenti, e **le fatture
 *   d'acquisto dei fitosanitari** da conservare per tre anni (con la copia dei
 *   moduli d'acquisto dei prodotti molto tossici, tossici o nocivi). Lo
 *   ribadiscono le Istruzioni operative AGEA n. 58 del 21/05/2024.
 * - Il QDCA del SIAN, obbligatorio dal 1/1/2027, chiede anche il **numero del
 *   patentino** di chi tratta e la **data del controllo funzionale** delle
 *   irroratrici, e comprende le **concimazioni**.
 *
 * Bollette di luce e acqua, carburante, assicurazioni: utili per i costi, ma
 * la legge del quaderno non li chiede.
 *
 * ## Come si usa
 *
 * L'app **propone**, l'agricoltore **corregge** con un tocco: è il gesto di
 * tutta l'app. Per questo la funzione restituisce anche il *perché*: una
 * proposta senza motivo non la verifica nessuno.
 *
 * Sta nel pacchetto Italia perché è norma italiana: in Francia l'elenco sarà
 * un altro.
 */

export interface PropostaLegale {
  serve: boolean
  motivo: string
}

/** Parole che sulle fatture indicano un prodotto fitosanitario. */
const SEGNI_FITOSANITARI = [
  'fitosanitar',
  'reg. n',
  'reg.n',
  'registrazione n',
  'min. salute',
  'ministero della salute',
  'fungicid',
  'insetticid',
  'erbicid',
  'diserbant',
  'acaricid',
  'nematocid',
  'lumachicid',
  'poltiglia',
  'ossicloruro',
  'idrossido di rame',
  'solfato di rame',
  'zolfo',
  'glifosat',
  'glyphosat',
]

/** Parole che indicano concimi: le concimazioni entrano nel quaderno digitale. */
const SEGNI_CONCIMI = [
  'concim',
  'fertilizzant',
  'urea',
  'nitrato ammonico',
  'nitrato di calcio',
  'solfato ammonico',
  'perfosfato',
  'letame',
  'digestato',
  'npk',
  'n-p-k',
]

/** Documenti che si riconoscono come estranei al quaderno. */
const SEGNI_BOLLETTE = [
  'servizio idrico',
  'acquedotto',
  'energia elettrica',
  'kwh',
  'smc',
  'gas naturale',
  'telefon',
  'canone rai',
]

/**
 * @param nomiFitosanitari i prodotti fitosanitari che l'azienda ha già in
 *   magazzino: un nome commerciale sulla fattura vale più di qualunque parola
 *   generica.
 */
export function propostaLegale(
  documento: Pick<Documento, 'tipo' | 'descrizione' | 'testoLetto' | 'genereLettura'>,
  nomiFitosanitari: string[] = [],
): PropostaLegale {
  if (documento.tipo === 'patentino_fitosanitari') {
    return { serve: true, motivo: 'Il patentino serve per comprare e usare i fitosanitari.' }
  }
  if (documento.tipo === 'controllo_funzionale') {
    return {
      serve: true,
      motivo: 'Il controllo dell’irroratrice va tenuto valido, e la sua data va nel quaderno.',
    }
  }

  const testo = `${documento.descrizione}\n${documento.testoLetto ?? ''}`.toLowerCase()

  const prodotto = nomiFitosanitari.find((n) => n.length >= 4 && testo.includes(n.toLowerCase()))
  if (prodotto || SEGNI_FITOSANITARI.some((s) => testo.includes(s))) {
    return {
      serve: true,
      motivo: prodotto
        ? `C’è ${prodotto}, che è un fitosanitario: la fattura va conservata tre anni.`
        : 'Ci sono prodotti fitosanitari: la fattura va conservata tre anni.',
    }
  }

  if (SEGNI_CONCIMI.some((s) => testo.includes(s))) {
    return {
      serve: true,
      motivo: 'Ci sono concimi: le concimazioni entrano nel quaderno digitale.',
    }
  }

  if (SEGNI_BOLLETTE.some((s) => testo.includes(s))) {
    return { serve: false, motivo: 'È una bolletta: utile per i costi, la legge non la chiede.' }
  }

  return { serve: false, motivo: 'Non ci ho trovato niente che riguardi il quaderno.' }
}

/** La scelta dell'agricoltore vince sempre sulla proposta. */
export function serveAllaLegge(
  documento: Pick<Documento, 'tipo' | 'descrizione' | 'testoLetto' | 'genereLettura' | 'perLaLegge'>,
  nomiFitosanitari: string[] = [],
): PropostaLegale & { decisoDaTe: boolean } {
  const proposta = propostaLegale(documento, nomiFitosanitari)
  if (documento.perLaLegge === undefined) return { ...proposta, decisoDaTe: false }
  return {
    serve: documento.perLaLegge,
    motivo: documento.perLaLegge ? 'L’hai messo tu fra quelli per la legge.' : 'L’hai messo tu fra gli altri.',
    decisoDaTe: true,
  }
}
