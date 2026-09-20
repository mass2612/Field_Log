import type { Giorno } from '../domain/types'
import type {
  CampoEstratto,
  RigaFattura,
  SchedaFattura,
  SchedaScadenza,
} from './tipi'

/**
 * Dal testo grezzo ai campi della scheda.
 *
 * Nessun OCR qui dentro: solo testo. Per questo si può provare per davvero,
 * senza fotografare niente, e per questo resta valido il giorno che si cambia
 * motore di lettura.
 *
 * Regola di fondo: **meglio un campo vuoto che un campo inventato.** Un numero
 * sbagliato che sembra giusto è peggio di nessun numero, perché nessuno lo va
 * a controllare.
 */

// ---------------------------------------------------------------------------
// Ripulire quello che l'OCR ha sbagliato
// ---------------------------------------------------------------------------

const SOSTITUZIONI: Record<string, string> = {
  O: '0', o: '0',
  I: '1', l: '1',
  S: '5', s: '5',
  B: '8', b: '8',
  Z: '2', z: '2',
}

/**
 * L'OCR confonde sempre le stesse coppie: O con 0, I e l con 1, S con 5.
 *
 * Attenzione, perché **anche la correzione sbaglia**: la prima versione di
 * questa funzione trasformava il numero di patentino `LO-2021-004512` in
 * `L0-2021-004512`, cioè rovinava un dato che era giusto. Da lì la regola:
 *
 *   si correggono solo le lettere che vengono **dopo la prima cifra**.
 *
 * Un prefisso di lettere ("LO-", "FT") è quasi sempre un codice vero e si
 * lascia stare; una lettera in mezzo alle cifre è quasi sempre un errore.
 * Nel dubbio non si tocca: meglio un dato non corretto che un dato corrotto.
 */
export function correggiCifre(testo: string): string {
  return testo.replace(/[0-9OoIlSsBbZz][0-9OoIlSsBbZz.,/-]{2,}/g, (pezzo) => {
    const primaCifra = pezzo.search(/[0-9]/)
    if (primaCifra < 0) return pezzo

    const prefisso = pezzo.slice(0, primaCifra)
    const resto = pezzo.slice(primaCifra)
    const corretto = resto.replace(/[OoIlSsBbZz]/g, (c) => SOSTITUZIONI[c])

    // Si accetta solo se il risultato è davvero un numero (con separatori).
    if (!/^[\d.,/-]+$/.test(corretto)) return pezzo
    return prefisso + corretto
  })
}

export function righeDi(testo: string): string[] {
  return testo
    .split(/\r?\n/)
    // L'OCR infila spazi dentro i numeri: "0, 55" e "550, 00" vanno ricuciti,
    // altrimenti un prezzo diventa due numeri e la riga di merce salta.
    .map((r) => r.replace(/(\d)\s*,\s+(\d{2})\b/g, '$1,$2').replace(/\s+/g, ' ').trim())
    .filter((r) => r.length > 0)
}

/** "1.234,56" → 1234.56. In Italia il punto separa le migliaia. */
export function numeroItaliano(grezzo: string): number | undefined {
  const pulito = grezzo.replace(/[^\d.,-]/g, '')
  if (!pulito) return undefined

  const haVirgola = pulito.includes(',')
  const normalizzato = haVirgola
    ? pulito.replace(/\./g, '').replace(',', '.')
    : // Senza virgola, un punto con due decimali è decimale; altrimenti migliaia.
      /\.\d{1,2}$/.test(pulito)
      ? pulito
      : pulito.replace(/\./g, '')

  const n = Number(normalizzato)
  return Number.isFinite(n) ? n : undefined
}

const MESI: Record<string, number> = {
  gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6,
  lug: 7, ago: 8, set: 9, sett: 9, ott: 10, nov: 11, dic: 12,
}

export interface DataTrovata {
  giorno: Giorno
  riga: string
  fiducia: number
}

/**
 * Tutte le date del documento, in ordine di comparsa.
 *
 * Si accettano solo date plausibili: un anno prima del 1990 o dopo il 2100 è
 * quasi sempre l'OCR che ha sbagliato una cifra, non una data vera.
 */
export function trovaDate(testo: string): DataTrovata[] {
  const trovate: DataTrovata[] = []

  for (const riga of righeDi(testo)) {
    // 12/09/2026 · 12-09-26 · 12.09.2026
    for (const m of riga.matchAll(/\b(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{2,4})\b/g)) {
      const giorno = componiData(Number(m[1]), Number(m[2]), Number(m[3]))
      if (giorno) trovate.push({ giorno, riga, fiducia: 0.9 })
    }
    // 12 settembre 2026
    for (const m of riga.matchAll(
      /\b(\d{1,2})\s+(gen|feb|mar|apr|mag|giu|lug|ago|sett?|ott|nov|dic)[a-z]*\.?\s+(\d{2,4})\b/gi,
    )) {
      const mese = MESI[m[2].toLowerCase().slice(0, 4)] ?? MESI[m[2].toLowerCase().slice(0, 3)]
      const giorno = componiData(Number(m[1]), mese, Number(m[3]))
      if (giorno) trovate.push({ giorno, riga, fiducia: 0.85 })
    }
  }

  return trovate
}

function componiData(g: number, m: number, a: number): Giorno | undefined {
  if (!g || !m || !a) return undefined
  if (g < 1 || g > 31 || m < 1 || m > 12) return undefined
  const anno = a < 100 ? 2000 + a : a
  if (anno < 1990 || anno > 2100) return undefined

  // Rifiuta il 31 febbraio e simili: sarebbe una cifra letta male.
  const prova = new Date(Date.UTC(anno, m - 1, g))
  if (prova.getUTCDate() !== g || prova.getUTCMonth() !== m - 1) return undefined

  const p = (n: number) => String(n).padStart(2, '0')
  return `${anno}-${p(m)}-${p(g)}`
}

// ---------------------------------------------------------------------------
// Fatture
// ---------------------------------------------------------------------------

const FORME_SOCIETARIE =
  /\b(s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|soc\.?\s*coop|cooperativa|consorzio|azienda agricola|ditta)\b/i

export function estraiFattura(testoGrezzo: string): SchedaFattura {
  const testo = correggiCifre(testoGrezzo)
  const righe = righeDi(testo)

  return {
    tipo: 'fattura',
    fornitore: trovaFornitore(righe),
    numero: trovaNumeroFattura(righe),
    data: trovaDataFattura(testo),
    partitaIva: trovaPartitaIva(righe),
    imponibile: trovaImporto(righe, /\b(imponibile|totale imponibile|netto merce)\b/i),
    totale: trovaImporto(
      righe,
      /\b(totale documento|totale fattura|totale a pagare|tot\.?\s*doc|totale)\b/i,
    ),
    righe: trovaRigheMerce(righe),
  }
}

/**
 * Il fornitore sta in alto, e quasi sempre la riga contiene la forma societaria.
 * Si guardano solo le prime righe: più giù comincia il cliente, e prendere il
 * cliente per il fornitore è l'errore classico.
 */
function trovaFornitore(righe: string[]): CampoEstratto<string> | undefined {
  const testa = righe.slice(0, 8)

  const conForma = testa.find((r) => FORME_SOCIETARIE.test(r) && r.length < 70)
  if (conForma) {
    return { valore: ripulisci(conForma), fiducia: 0.8, riga: conForma }
  }

  // Ripiego: la prima riga con abbastanza lettere e nessun importo.
  const plausibile = testa.find(
    (r) => /[A-Za-zÀ-ÿ]{4,}/.test(r) && !/\d{2}[/.\-]\d{2}/.test(r) && r.length >= 5 && r.length < 60,
  )
  return plausibile ? { valore: ripulisci(plausibile), fiducia: 0.4, riga: plausibile } : undefined
}

function trovaNumeroFattura(righe: string[]): CampoEstratto<string> | undefined {
  for (const riga of righe) {
    const m = riga.match(
      /\b(?:fattura|ft|f\.t\.|documento|doc)\b[^A-Za-z0-9]{0,12}(?:n(?:umero)?[°º.]?|nr\.?)?[^A-Za-z0-9]{0,6}([A-Z0-9][A-Z0-9/\-]{0,19})/i,
    )
    if (m && /\d/.test(m[1])) {
      return { valore: m[1].toUpperCase(), fiducia: 0.85, riga }
    }
  }

  // Senza la parola "fattura": una riga con "N. <qualcosa>" in alto.
  for (const riga of righe.slice(0, 12)) {
    const m = riga.match(/\bn[°º.]\s*([0-9][0-9/\-]{0,19})\b/i)
    if (m) return { valore: m[1], fiducia: 0.5, riga }
  }
  return undefined
}

/**
 * La data della fattura è quella vicino alla parola "data" o al numero; in
 * mancanza, la più vecchia fra quelle trovate — le scadenze di pagamento sono
 * più avanti nel tempo.
 */
function trovaDataFattura(testo: string): CampoEstratto<Giorno> | undefined {
  const date = trovaDate(testo)
  if (date.length === 0) return undefined

  const vicinoAllaParola = date.find((d) => /\bdata\b|\bdel\b|\bemess/i.test(d.riga))
  if (vicinoAllaParola) {
    return { valore: vicinoAllaParola.giorno, fiducia: 0.85, riga: vicinoAllaParola.riga }
  }

  const piuVecchia = [...date].sort((a, b) => a.giorno.localeCompare(b.giorno))[0]
  return { valore: piuVecchia.giorno, fiducia: 0.5, riga: piuVecchia.riga }
}

function trovaPartitaIva(righe: string[]): CampoEstratto<string> | undefined {
  for (const riga of righe) {
    // Le cifre possono arrivare spaziate una a una: l'OCR fa spesso così.
    const m = riga.match(/\b(?:p(?:artita)?\.?\s*i(?:va)?\.?|vat)\b\D{0,12}(\d[\d\s.]{9,28}\d)/i)
    if (m) {
      const cifre = m[1].replace(/\D/g, '')
      if (cifre.length === 11) return { valore: cifre, fiducia: 0.9, riga }
    }
  }
  return undefined
}

function trovaImporto(righe: string[], etichetta: RegExp): CampoEstratto<number> | undefined {
  // Si scorre dal fondo: i totali stanno in fondo alla fattura.
  for (let i = righe.length - 1; i >= 0; i--) {
    const riga = righe[i]
    if (!etichetta.test(riga)) continue

    const importi = [...riga.matchAll(/(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/g)]
    if (importi.length === 0) continue

    // Su una riga di totale, il numero che conta è l'ultimo.
    const valore = numeroItaliano(importi[importi.length - 1][1])
    if (valore != null) return { valore, fiducia: 0.8, riga }
  }
  return undefined
}

const UNITA_RIGA: Record<string, RigaFattura['unitaMisura']> = {
  l: 'l', lt: 'l', litri: 'l', ml: 'ml',
  kg: 'kg', kgs: 'kg', g: 'g', gr: 'g',
  q: 'q', ql: 'q', t: 't',
  pz: 'pz', nr: 'pz', n: 'pz', cf: 'pz', conf: 'pz',
}

/**
 * Le righe di merce.
 *
 * È la parte che riesce peggio, e va detto: senza sapere dove sono le colonne
 * si tira a indovinare su quale numero sia la quantità e quale il prezzo. Per
 * questo la fiducia qui non supera mai 0,6 — la scheda le mostra sempre come
 * da controllare.
 */
const INTESTAZIONE_TABELLA =
  /(descrizione|articolo)|((q\.?t[àa]?|quantit[àa])\b.*\b(prezzo|importo|um)\b)/i
const FINE_TABELLA = /\b(imponibile|totale|iva\s|sconto|spese|trasporto|pagamento|iban)\b/i
const SEMBRA_INDIRIZZO = /\b(via|viale|v\.le|piazza|p\.zza|corso|localit[àa]|strada|fraz)\b|\b\d{5}\b/i

export function trovaRigheMerce(righe: string[]): RigaFattura[] {
  const trovate: RigaFattura[] = []

  /*
   * Si legge solo dentro la tabella della merce.
   *
   * Senza questo, l'indirizzo del fornitore e la riga del numero di fattura
   * finivano fra i prodotti: "Via Roma 14 = 26900". Ridicolo, e soprattutto
   * inquinava il magazzino con merce che non esiste.
   */
  const inizio = righe.findIndex((r) => INTESTAZIONE_TABELLA.test(r))
  const daCui = inizio >= 0 ? inizio + 1 : 0
  const finaleRelativo = righe.slice(daCui).findIndex((r) => FINE_TABELLA.test(r))
  const aCui = finaleRelativo >= 0 ? daCui + finaleRelativo : righe.length

  for (const riga of righe.slice(daCui, aCui)) {
    if (FINE_TABELLA.test(riga)) continue
    // Senza un'intestazione riconosciuta si è più prudenti: via gli indirizzi.
    if (inizio < 0 && SEMBRA_INDIRIZZO.test(riga)) continue

    /*
     * La riga comincia quasi sempre col codice articolo ("1104 POLTIGLIA…").
     * Prendere come descrizione "quello che sta prima del primo numero"
     * lasciava la descrizione vuota e buttava via la riga. Si cerca invece il
     * primo blocco di lettere lungo abbastanza: quella è la merce, e i numeri
     * che contano vengono dopo.
     */
    const descrizioneTrovata = riga.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.\-/ ]{3,}/)
    if (!descrizioneTrovata) continue

    const descrizione = ripulisci(descrizioneTrovata[0])
    if (descrizione.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 4) continue

    const dopoDescrizione = (descrizioneTrovata.index ?? 0) + descrizioneTrovata[0].length
    const numeri = [...riga.slice(dopoDescrizione).matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => ({
      testo: m[1],
      valore: numeroItaliano(m[1]),
      indice: m.index ?? 0,
    }))
    if (numeri.length < 2) continue

    const unitaTrovata = riga.match(/\b(l|lt|litri|ml|kg|kgs|g|gr|q|ql|t|pz|nr|n|cf|conf)\b/i)

    /*
     * Si leggono i numeri **da destra**, non da sinistra.
     *
     * In fondo alla riga ci sono sempre importo e prezzo unitario, mentre a
     * sinistra può esserci di tutto: il codice articolo, o un numero che fa
     * parte del nome. Su "UREA 46 1000 kg 0,55 550,00" leggere da sinistra
     * dava quantità 46 — che è il titolo del concime, non i chili.
     */
    const ultimo = numeri.length - 1
    const importo = numeri[ultimo]?.valore
    const prezzoUnitario = numeri.length >= 3 ? numeri[ultimo - 1]?.valore : undefined
    const quantita =
      numeri.length >= 3 ? numeri[ultimo - 2]?.valore : numeri[ultimo - 1]?.valore

    trovate.push({
      descrizione,
      quantita,
      unitaMisura: unitaTrovata ? UNITA_RIGA[unitaTrovata[1].toLowerCase()] : undefined,
      prezzoUnitario,
      importo,
      // Mai sopra 0,6: senza sapere dove sono le colonne è un'interpretazione.
      fiducia: numeri.length >= 3 ? 0.6 : 0.4,
      riga,
    })
  }

  return trovate
}

// ---------------------------------------------------------------------------
// Patentini, patenti, certificati
// ---------------------------------------------------------------------------

/**
 * Qui serve una data sola, ed è quella che conta davvero: **la scadenza.**
 *
 * Se il documento la dice a parole ("valido fino al"), si prende quella. Se no
 * si prende la data futura più lontana: un certificato in corso di validità ha
 * la scadenza avanti nel tempo e il rilascio indietro.
 */
export function estraiScadenza(testoGrezzo: string, oggi: Giorno): SchedaScadenza {
  const testo = correggiCifre(testoGrezzo)
  const righe = righeDi(testo)
  const date = trovaDate(testo)

  const perParola = date.find((d) =>
    /\b(scadenz|valid[oa]\s+fino|vale\s+fino|fino\s+al|expiry|scade)\b/i.test(d.riga),
  )

  const future = date.filter((d) => d.giorno > oggi).sort((a, b) => b.giorno.localeCompare(a.giorno))
  const passate = date.filter((d) => d.giorno <= oggi).sort((a, b) => a.giorno.localeCompare(b.giorno))

  const scadeIl: CampoEstratto<Giorno> | undefined = perParola
    ? { valore: perParola.giorno, fiducia: 0.9, riga: perParola.riga }
    : future[0]
      ? { valore: future[0].giorno, fiducia: 0.55, riga: future[0].riga }
      : undefined

  const rilascio = date.find((d) => /\brilasci|\bemess|\bdata di rilascio\b/i.test(d.riga))
  const rilasciatoIl: CampoEstratto<Giorno> | undefined = rilascio
    ? { valore: rilascio.giorno, fiducia: 0.85, riga: rilascio.riga }
    : passate[0]
      ? { valore: passate[0].giorno, fiducia: 0.45, riga: passate[0].riga }
      : undefined

  return {
    tipo: 'scadenza',
    intestatario: trovaIntestatario(righe),
    numero: trovaNumeroDocumento(righe),
    rilasciatoIl,
    scadeIl,
  }
}

/** Enti che rilasciano: stanno in alto e in maiuscolo, ma non sono l'intestatario. */
const ENTI =
  /\b(regione|provincia|comune|ministero|repubblica|prefettura|camera di commercio|asl|ats|ente|servizio|settore|direzione|certificato|abilitazione)\b/i

function trovaIntestatario(righe: string[]): CampoEstratto<string> | undefined {
  for (const riga of righe) {
    const m = riga.match(
      /\b(?:intestat[oa]\s+a|rilasciat[oa]\s+a|cognome\s+e\s+nome|nome\s+e\s+cognome|sig\.?r?a?\.?)\b[:.\s]+([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]{3,40})/i,
    )
    if (m) return { valore: ripulisci(m[1]), fiducia: 0.75, riga }
  }

  /*
   * Ripiego: una riga tutta in maiuscolo con due parole, di solito è il nome.
   * Ma prima si escludono gli enti: "REGIONE LOMBARDIA" ha la stessa forma di
   * "GREPPI MASSIMO", e senza questo controllo l'app intestava il patentino
   * alla Regione.
   */
  const maiuscola = righe.find(
    (r) => /^[A-ZÀ-Ý][A-ZÀ-Ý' ]{5,40}$/.test(r) && r.split(' ').length >= 2 && !ENTI.test(r),
  )
  return maiuscola ? { valore: ripulisci(maiuscola), fiducia: 0.35, riga: maiuscola } : undefined
}

function trovaNumeroDocumento(righe: string[]): CampoEstratto<string> | undefined {
  for (const riga of righe) {
    const m = riga.match(
      /\b(?:n[°º.]|numero|nr\.?|cod(?:ice)?\.?|matricola)\s*[:.]?\s*([A-Z0-9][A-Z0-9/\-]{3,19})/i,
    )
    if (m && /\d/.test(m[1])) return { valore: m[1].toUpperCase(), fiducia: 0.7, riga }
  }
  return undefined
}

function ripulisci(testo: string): string {
  return testo
    .replace(/[|_*]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9.)]+$/g, '')
    .trim()
}
