import type {
  Campo,
  Documento,
  Giorno,
  Intervento,
  Operatore,
  Prodotto,
} from '../domain/types'
import { differenzaGiorni } from './carenza'

export type EsitoControllo = 'blocco' | 'avviso' | 'nota'

export interface Rilievo {
  esito: EsitoControllo
  codice: string
  messaggio: string
  suggerimento?: string
}

export interface ContestoControllo {
  intervento: Intervento
  campo?: Campo
  prodotti: Map<string, Prodotto>
  operatore?: Operatore
  documentiOperatore: Documento[]
  /** Specie in coltura sul campo: serve a verificare le colture autorizzate. */
  specieColtura?: string
  /** Altri interventi della stessa coltura nella stessa annata. */
  interventiAnnata: Intervento[]
  giacenze: Map<string, number>
  oggi: Giorno
}

/**
 * Controlli eseguiti mentre si registra, non dopo.
 *
 * Nessun rilievo impedisce di salvare: in campo il fatto è già avvenuto e il
 * registro deve rispecchiare la realtà, anche quando la realtà è irregolare.
 * 'blocco' significa "questo ti mette nei guai", non "non puoi scrivere".
 */
export function controllaIntervento(c: ContestoControllo): Rilievo[] {
  const rilievi: Rilievo[] = []
  const { intervento, prodotti } = c

  for (const riga of intervento.righe) {
    const prodotto = prodotti.get(riga.prodottoId)
    if (!prodotto) continue

    controllaRevoca(prodotto, intervento.data, rilievi)
    controllaDoseMassima(prodotto, riga.quantita, intervento, c.campo, rilievi)
    controllaNumeroInterventi(prodotto, intervento, c.interventiAnnata, rilievi)
    controllaColtura(prodotto, c, rilievi)
    controllaGiacenza(prodotto, riga.prodottoId, riga.quantita, c.giacenze, rilievi)
  }

  controllaPatentino(c, rilievi)
  controllaOrigineCampo(intervento, rilievi)

  return rilievi
}

function controllaRevoca(prodotto: Prodotto, data: Giorno, rilievi: Rilievo[]): void {
  const termine = prodotto.utilizzabileFinoAl ?? prodotto.revocatoDal
  if (termine && data > termine) {
    rilievi.push({
      esito: 'blocco',
      codice: 'prodotto_revocato',
      messaggio: `${prodotto.nome} non era più utilizzabile dopo il ${termine}.`,
      suggerimento: 'Verifica la data dell’intervento o il prodotto impiegato.',
    })
  }
}

function controllaDoseMassima(
  prodotto: Prodotto,
  quantita: number,
  intervento: Intervento,
  campo: Campo | undefined,
  rilievi: Rilievo[],
): void {
  if (prodotto.doseMaxPerHa == null) return
  const ha = intervento.superficieTrattataHa ?? campo?.superficieHa
  if (!ha || ha <= 0) return

  const dose = quantita / ha
  if (dose > prodotto.doseMaxPerHa * 1.001) {
    rilievi.push({
      esito: 'blocco',
      codice: 'dose_eccessiva',
      messaggio: `${prodotto.nome}: ${arr(dose)} ${prodotto.unitaMisura}/ha contro un massimo autorizzato di ${prodotto.doseMaxPerHa}.`,
      suggerimento: 'Controlla la quantità impiegata o la superficie trattata.',
    })
  }
}

function controllaNumeroInterventi(
  prodotto: Prodotto,
  intervento: Intervento,
  interventiAnnata: Intervento[],
  rilievi: Rilievo[],
): void {
  if (prodotto.interventiMaxAnnata == null) return

  const precedenti = interventiAnnata.filter(
    (i) =>
      i.id !== intervento.id &&
      !i.annullatoIl &&
      i.righe.some((r) => r.prodottoId === prodotto.id),
  ).length

  const numeroAttuale = precedenti + 1
  if (numeroAttuale > prodotto.interventiMaxAnnata) {
    rilievi.push({
      esito: 'blocco',
      codice: 'interventi_superati',
      messaggio: `Questo è il ${numeroAttuale}° intervento dell’annata con ${prodotto.nome}: il massimo autorizzato è ${prodotto.interventiMaxAnnata}.`,
      suggerimento: 'Valuta un prodotto con una sostanza attiva diversa.',
    })
  } else if (numeroAttuale === prodotto.interventiMaxAnnata) {
    rilievi.push({
      esito: 'avviso',
      codice: 'ultimo_intervento',
      messaggio: `${prodotto.nome}: con questo hai esaurito i ${prodotto.interventiMaxAnnata} interventi ammessi per l’annata.`,
    })
  }
}

/**
 * Un prodotto è autorizzato su colture determinate. Usarlo altrove è un illecito
 * anche quando agronomicamente funziona.
 */
function controllaColtura(
  prodotto: Prodotto,
  c: ContestoControllo,
  rilievi: Rilievo[],
): void {
  if (!prodotto.colturaAmmesse?.length) return
  if (!c.specieColtura) return

  const normalizza = (s: string) => s.trim().toLowerCase()
  const specie = normalizza(c.specieColtura)
  const ammessa = prodotto.colturaAmmesse.some((v) => normalizza(v) === specie)

  if (!ammessa) {
    rilievi.push({
      esito: 'blocco',
      codice: 'coltura_non_ammessa',
      messaggio: `${prodotto.nome} non risulta autorizzato su ${c.specieColtura}.`,
      suggerimento: `Colture autorizzate: ${prodotto.colturaAmmesse.join(', ')}.`,
    })
  }
}

function controllaGiacenza(
  prodotto: Prodotto,
  prodottoId: string,
  quantita: number,
  giacenze: Map<string, number>,
  rilievi: Rilievo[],
): void {
  const giacenza = giacenze.get(prodottoId)
  if (giacenza == null) return
  if (quantita > giacenza + 1e-9) {
    rilievi.push({
      esito: 'avviso',
      codice: 'giacenza_insufficiente',
      messaggio: `A magazzino risultano ${arr(giacenza)} ${prodotto.unitaMisura} di ${prodotto.nome}, ne stai registrando ${arr(quantita)}.`,
      suggerimento: 'Probabilmente manca un carico da fattura.',
    })
  }
}

/**
 * Chi tratta deve avere il patentino valido *alla data del trattamento*.
 * È uno dei rilievi più frequenti in sede di controllo.
 */
function controllaPatentino(c: ContestoControllo, rilievi: Rilievo[]): void {
  if (c.intervento.tipo !== 'trattamento') return
  if (!c.operatore) {
    rilievi.push({
      esito: 'avviso',
      codice: 'operatore_mancante',
      messaggio: 'Non hai indicato chi ha eseguito il trattamento.',
      suggerimento: 'È un dato obbligatorio nel registro.',
    })
    return
  }

  const patentini = c.documentiOperatore.filter(
    (d) => d.tipo === 'patentino_fitosanitari' && !d.annullatoIl,
  )
  if (patentini.length === 0) {
    rilievi.push({
      esito: 'avviso',
      codice: 'patentino_assente',
      messaggio: `Per ${c.operatore.nome} ${c.operatore.cognome} non risulta alcun patentino registrato.`,
      suggerimento: 'Fotografalo una volta: l’app poi ti avvisa alla scadenza.',
    })
    return
  }

  const valido = patentini.some((p) => !p.scadeIl || p.scadeIl >= c.intervento.data)
  if (!valido) {
    const ultima = patentini
      .map((p) => p.scadeIl)
      .filter(Boolean)
      .sort()
      .pop()
    rilievi.push({
      esito: 'blocco',
      codice: 'patentino_scaduto',
      messaggio: `Il patentino di ${c.operatore.nome} ${c.operatore.cognome} risulta scaduto il ${ultima} — prima di questo trattamento.`,
    })
  } else {
    const inScadenza = patentini
      .filter((p) => p.scadeIl)
      .map((p) => differenzaGiorni(c.oggi, p.scadeIl!))
      .filter((g) => g >= 0 && g <= 30)
    if (inScadenza.length) {
      rilievi.push({
        esito: 'nota',
        codice: 'patentino_in_scadenza',
        messaggio: `Il patentino di ${c.operatore.cognome} scade fra ${Math.min(...inScadenza)} giorni.`,
      })
    }
  }
}

/**
 * Se il campo è stato dedotto dal GPS ma il lavoro l'ha fatto un altro, il dato
 * è sbagliato e nessuno se ne accorge. Meglio dirlo.
 */
function controllaOrigineCampo(intervento: Intervento, rilievi: Rilievo[]): void {
  if (intervento.origineCampo !== 'gps') return
  if (intervento.posizione?.precisioneM != null && intervento.posizione.precisioneM > 100) {
    rilievi.push({
      esito: 'nota',
      codice: 'gps_impreciso',
      messaggio: `La posizione ha una precisione di ±${Math.round(intervento.posizione.precisioneM)} m: conferma che il campo sia quello giusto.`,
    })
  }
}

function arr(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}

export function haBlocchi(rilievi: Rilievo[]): boolean {
  return rilievi.some((r) => r.esito === 'blocco')
}
