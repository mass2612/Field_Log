import type { Giorno, ID, Tracciato, UnitaMisura } from './types'

/**
 * LA NOTA — il primitivo dell'app.
 *
 * Tutto il quaderno è fatto di note. L'agricoltore scrive o detta quello che è
 * successo, come gli viene; la struttura la ricava la macchina e lui la corregge
 * se ha capito male. È lo stesso gesto della foto della fattura che diventa
 * scheda: un solo concetto da spiegare, per tutta l'app.
 *
 * Conseguenza importante: **il campo è testo libero, non un elenco a tendina.**
 * I campi dell'azienda nascono dalle note, non il contrario. Scrivi "vigna sotto
 * casa" e da quel momento quel campo esiste.
 */
export interface Nota extends Tracciato {
  aziendaId: ID

  /** Quello che ha scritto o detto. È questa la verità: il resto è ricavato. */
  testo: string

  /**
   * Quando è successo il fatto — diverso da `creatoIl`, che è quando l'ha
   * scritto. La sera si scrive della mattina, il lunedì di sabato.
   */
  dataFatto: Giorno

  /** Il campo come l'ha scritto lui. Facoltativo. */
  campoNome?: string
  /** Collegamento al campo riconosciuto, quando si riesce ad agganciarlo. */
  campoId?: ID

  /** Raggruppamenti: trattamento, concimazione, semina… Proposti, non imposti. */
  argomenti: string[]
  /** Vero se gli argomenti li ha sistemati lui: da lì in poi non si toccano più. */
  argomentiConfermati?: boolean

  /** Arrivata a voce. */
  daVoce?: boolean
  /**
   * Audio conservato **solo finché la trascrizione non è stata riletta**.
   * Poi si cancella da solo: pochi byte, e nessuna nota persa per strada.
   */
  audioAllegatoId?: ID
  trascrizioneDaRileggere?: boolean

  /** L'interpretazione strutturata, da confermare. */
  scheda?: SchedaNota
}

/**
 * Quello che la macchina ha capito leggendo la nota.
 *
 * Finché `confermata` è falsa è solo una proposta, e va mostrata come tale.
 * Serve a costruire il registro dei trattamenti e a scaricare il magazzino
 * senza che l'agricoltore compili mai un modulo.
 */
export interface SchedaNota {
  confermata?: boolean
  campoNome?: string
  prodotti?: { nome: string; quantita?: number; unitaMisura?: UnitaMisura }[]
  superficieHa?: number
  avversita?: string
  /** Chi ha lavorato, quando la nota lo dice. */
  operatore?: string
}

// ---------------------------------------------------------------------------
// Argomenti — raggruppare le note senza imporre una classificazione
// ---------------------------------------------------------------------------

/**
 * `legale: true` marca gli argomenti che hanno conseguenze di legge. Non cambia
 * niente nell'interfaccia — cambia cosa succede sotto: da lì esce il registro.
 */
export interface Argomento {
  chiave: string
  etichetta: string
  icona: string
  legale?: boolean
  parole: RegExp
}

/*
 * Le parole chiave vanno strette, non larghe.
 *
 * Un'etichetta sbagliata costa più di una mancante: se "si è rotto il trattore"
 * finisce fra i trattamenti, l'agricoltore smette di fidarsi di tutto il resto —
 * e ha ragione. Da qui i confini di parola e le eccezioni esplicite:
 *   tratt(?!or)  → trattamento, trattato, trattare   ma non trattore, trattorista
 *   \btacca\b    → la tacca del cambio               ma non "attacca"
 *   \bfres(a|at) → fresa, fresato                    ma non "fresco"
 */
export const ARGOMENTI: Argomento[] = [
  {
    chiave: 'trattamento',
    etichetta: 'Trattamenti',
    icona: '💧',
    legale: true,
    parole:
      /\btratt(?!or)|diserb|fungicid|insetticid|acaricid|\brame\b|rameic|zolfo|poltiglia|peronospor|oidio|botrit|\bafid|ragnett|irror|atomizz|\bbotte\b|ugell|carenz|\bdose\b|dosaggi/i,
  },
  {
    chiave: 'concimazione',
    etichetta: 'Concimazioni',
    icona: '🌱',
    legale: true,
    parole:
      /concim|\burea\b|nitrato|\bammonio\b|letame|liquame|\bazoto\b|fertiliz|spandiconcim|\bnpk\b|\bunità fertiliz/i,
  },
  {
    chiave: 'semina',
    etichetta: 'Semine',
    icona: '🌾',
    parole: /\bsemin|\bsement|trapiant|\btacca\b|investiment|\bvarietà|\bvarieta\b|interfila/i,
  },
  {
    chiave: 'raccolta',
    etichetta: 'Raccolta',
    icona: '🚜',
    parole:
      /raccolt|vendemm|mietitur|mietitrebb|trebbiat|quintal|\bresa\b|\bq\/ha\b|umidit|proteine|grado zucch/i,
  },
  {
    chiave: 'lavorazione',
    etichetta: 'Lavorazioni',
    icona: '⛏️',
    parole: /\barat|erpic|\bfres(a|at)|ripunt|sarchiat|trinci|lavorazion|vangat|rullat|\bsolco\b/i,
  },
  {
    chiave: 'irrigazione',
    etichetta: 'Irrigazione',
    icona: '💦',
    parole: /irrig|\bpivot\b|gocciolant|aspersion|annaff|\bala piovana\b/i,
  },
  {
    chiave: 'guasto',
    etichetta: 'Guasti e manutenzioni',
    icona: '🔧',
    parole:
      /guast|\brott[oaie]\b|ripar|manutenz|officina|cambio olio|\bfiltr|cinghia|\bgomm|tagliand|\bpezzo di ricambio\b/i,
  },
  {
    chiave: 'acquisto',
    etichetta: 'Acquisti',
    icona: '🧾',
    parole: /fattur|comprat|acquist|fornitor|\bprezzo\b|€|\beuro\b|consorzi|\bpagat/i,
  },
  {
    chiave: 'osservazione',
    etichetta: 'Osservazioni',
    icona: '👀',
    parole:
      /\bvisto\b|\bnotat|\bsembra\b|\battacc|malatt|infest|\bdann[oi]\b|grandin|\bgelat|\bgelo\b|seccagg|\bmacchi/i,
  },
]

export function argomentoDi(chiave: string): Argomento | undefined {
  return ARGOMENTI.find((a) => a.chiave === chiave)
}

/**
 * Propone gli argomenti leggendo il testo.
 *
 * Deliberatamente generoso: meglio due etichette di cui una da togliere che una
 * nota che poi non si ritrova più. Restano proposte finché non le conferma lui.
 */
export function proponiArgomenti(testo: string): string[] {
  const trovati = ARGOMENTI.filter((a) => a.parole.test(testo)).map((a) => a.chiave)
  return trovati.length > 0 ? trovati : []
}

// ---------------------------------------------------------------------------
// Leggere la nota
// ---------------------------------------------------------------------------

const GIORNI_SETTIMANA = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
]

/**
 * Quando è successo, leggendolo dalla frase.
 *
 * "ieri ho trattato", "sabato ho seminato". Se non dice niente vale oggi.
 * Non si indovina mai in avanti: una nota parla di cose già fatte.
 */
export function proponiDataFatto(testo: string, oggi: Giorno): Giorno {
  const t = testo.toLowerCase()

  if (/\bl'altro\s*ieri\b|\baltroieri\b/.test(t)) return spostaGiorni(oggi, -2)
  if (/\bieri\b/.test(t)) return spostaGiorni(oggi, -1)
  if (/\boggi\b|\bstamattina\b|\bstamane\b|\bstasera\b/.test(t)) return oggi

  // "sabato", "lunedì": l'occorrenza più recente nel passato.
  for (let i = 0; i < GIORNI_SETTIMANA.length; i++) {
    const nome = GIORNI_SETTIMANA[i]
    const senzaAccento = nome.replace(/ì/g, 'i')
    if (new RegExp(`\\b(${nome}|${senzaAccento})\\b`).test(t)) {
      const giornoOggi = new Date(oggi + 'T12:00:00').getDay()
      let indietro = (giornoOggi - i + 7) % 7
      if (indietro === 0) indietro = 7
      return spostaGiorni(oggi, -indietro)
    }
  }

  // "il 12", "il 3/9"
  const esplicita = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (esplicita) {
    const giorno = Number(esplicita[1])
    const mese = Number(esplicita[2])
    let anno = esplicita[3] ? Number(esplicita[3]) : Number(oggi.slice(0, 4))
    if (anno < 100) anno += 2000
    if (giorno >= 1 && giorno <= 31 && mese >= 1 && mese <= 12) {
      const proposta = `${anno}-${pad(mese)}-${pad(giorno)}`
      if (proposta <= oggi) return proposta
    }
  }

  return oggi
}

const UNITA_TESTO: Record<string, UnitaMisura> = {
  l: 'l',
  litri: 'l',
  litro: 'l',
  ml: 'ml',
  kg: 'kg',
  chili: 'kg',
  chilo: 'kg',
  kili: 'kg',
  g: 'g',
  grammi: 'g',
  q: 'q',
  quintali: 'q',
  quintale: 'q',
  t: 't',
  tonnellate: 't',
}

/**
 * Quantità nominate nella frase: "3 quintali di urea", "150 ml di Pergado".
 * Se il nome del prodotto non si capisce resta vuoto e lo mette lui.
 */
export function proponiProdotti(
  testo: string,
  nomiConosciuti: string[] = [],
): { nome: string; quantita?: number; unitaMisura?: UnitaMisura }[] {
  const trovati: { nome: string; quantita?: number; unitaMisura?: UnitaMisura }[] = []
  const unita = Object.keys(UNITA_TESTO).join('|')
  const espressione = new RegExp(
    `(\\d+(?:[.,]\\d+)?)\\s*(${unita})\\b(?:\\s+(?:di|d')?\\s*([\\p{L}][\\p{L}\\d'’\\- ]{2,30}))?`,
    'giu',
  )

  for (const corrispondenza of testo.matchAll(espressione)) {
    const quantita = Number(corrispondenza[1].replace(',', '.'))
    const unitaMisura = UNITA_TESTO[corrispondenza[2].toLowerCase()]
    const grezzo = (corrispondenza[3] ?? '').trim()

    /*
     * "300 litri per ettaro" è una dose, non una merce comprata.
     * Prenderla per un prodotto riempirebbe il magazzino di roba che non
     * esiste — e il magazzino che sbaglia è peggio di nessun magazzino.
     */
    const dopo = testo.slice((corrispondenza.index ?? 0) + corrispondenza[0].length, (corrispondenza.index ?? 0) + corrispondenza[0].length + 24)
    const seguitoDaRapporto = /^\s*(\/\s*ha\b|per\s+ettar|a\s+ettar|all['’]ettar)/i.test(dopo)
    const nelNome = /^(per|a|all)\s*(ettaro|ettari|ha)\b/i.test(grezzo)
    if (seguitoDaRapporto || nelNome) continue

    // Se somiglia a un prodotto già usato in azienda, si scrive col nome giusto.
    const conosciuto = nomiConosciuti.find(
      (n) => grezzo && n.toLowerCase().startsWith(grezzo.toLowerCase().slice(0, 4)),
    )

    trovati.push({
      nome: conosciuto ?? ripulisciNome(grezzo),
      quantita: Number.isFinite(quantita) ? quantita : undefined,
      unitaMisura,
    })
  }

  return trovati
}

/** Parole che seguono la quantità ma non sono il prodotto. */
const NON_PRODOTTI =
  /^(per|su|sul|sulla|nel|nella|a|al|alla|in|con|e|ed|ettar|ha\b|acqua|miscela|circa|totali?)/i

function ripulisciNome(grezzo: string): string {
  if (!grezzo || NON_PRODOTTI.test(grezzo)) return ''
  return grezzo.replace(/\s+(per|su|sul|sulla|nel|nella|e|ed)\b.*$/i, '').trim()
}

/**
 * Il campo nominato nella frase, confrontato con quelli già usati.
 * Riconosce solo quelli che esistono già: inventarne di nuovi dal testo libero
 * farebbe nascere dieci campi per lo stesso pezzo di terra.
 */
export function proponiCampo(testo: string, campiConosciuti: string[]): string | undefined {
  const t = testo.toLowerCase()
  const candidati = campiConosciuti
    .filter((nome) => nome.length >= 3 && t.includes(nome.toLowerCase()))
    .sort((a, b) => b.length - a.length)
  return candidati[0]
}

export function proponiSuperficie(testo: string): number | undefined {
  const m = testo.match(/(\d+(?:[.,]\d+)?)\s*(?:ha\b|ettar)/i)
  if (!m) return undefined
  const n = Number(m[1].replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Legge la nota e propone tutto quello che riesce a capire. */
export function leggiNota(
  testo: string,
  contesto: { oggi: Giorno; campiConosciuti: string[]; prodottiConosciuti: string[] },
): { dataFatto: Giorno; argomenti: string[]; scheda: SchedaNota } {
  const prodotti = proponiProdotti(testo, contesto.prodottiConosciuti)
  return {
    dataFatto: proponiDataFatto(testo, contesto.oggi),
    argomenti: proponiArgomenti(testo),
    scheda: {
      campoNome: proponiCampo(testo, contesto.campiConosciuti),
      prodotti: prodotti.length > 0 ? prodotti : undefined,
      superficieHa: proponiSuperficie(testo),
    },
  }
}

function spostaGiorni(giorno: Giorno, giorni: number): Giorno {
  const [a, m, g] = giorno.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, g))
  d.setUTCDate(d.getUTCDate() + giorni)
  return d.toISOString().slice(0, 10)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
