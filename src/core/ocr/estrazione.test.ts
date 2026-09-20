import { describe, expect, it } from 'vitest'
import {
  correggiCifre,
  estraiFattura,
  estraiScadenza,
  numeroItaliano,
  trovaDate,
} from './estrazione'
import { fiduciaComplessiva } from './tipi'

/**
 * I testi qui sotto sono scritti come li restituisce l'OCR da una foto fatta
 * col telefono: colonne appiattite, spazi sbagliati, qualche lettera al posto
 * di una cifra. Provare su un testo pulito non dimostrerebbe niente.
 */

const FATTURA_CONSORZIO = `
AGRIFORNITURE VALLE S.R.L.
Via Roma 14 - 26900 Lodi (LO)
P.IVA 01234567890

FATTURA N. 2026/0412 del 03/09/2026

Spett.le
AZIENDA AGRICOLA ROSSI MARIO
Cascina Bellavista - 26841 Casalpusterlengo

Cod. Descrizione        Q.ta UM  Prezzo   Importo
1104 POLTIGLIA BORDOLESE 25 kg   6,40     160,00
2201 ZOLFO BAGNABILE     50 kg   2,10     105,00
3310 UREA 46            1000 kg  0,55     550,00

Imponibile              815,00
IVA 4%                   32,60
TOTALE DOCUMENTO        847,60

Pagamento: bonifico 60 gg - scadenza 02/11/2026
`

const FATTURA_SPORCA = `
CQNSQRZIO AGRARIO LQMBARDQ S.C.
P. IVA 0 9 8 7 6 5 4 3 2 1 0
Ft. n 77/B del 12.O3.2O26
Descrizione       Qta  Prezzo  Tot
GASOLIO AGRICOLO  8OO   1,15   92O,OO
TOTALE            92O,OO
`

const PATENTINO = `
REGIONE LOMBARDIA
CERTIFICATO DI ABILITAZIONE
all'acquisto e all'utilizzo dei prodotti fitosanitari

Rilasciato a GREPPI MASSIMO
nato il 14/05/1971

N. LO-2021-004512
Data di rilascio 22/10/2021
Valido fino al 21/10/2026
`

describe('numeri all’italiana', () => {
  it('legge le migliaia col punto e i decimali con la virgola', () => {
    expect(numeroItaliano('1.234,56')).toBe(1234.56)
    expect(numeroItaliano('847,60')).toBe(847.6)
    expect(numeroItaliano('€ 92,00')).toBe(92)
  })

  it('non scambia le migliaia per decimali', () => {
    expect(numeroItaliano('1.000')).toBe(1000)
    expect(numeroItaliano('12.50')).toBe(12.5)
  })
})

describe('date', () => {
  it('trova i formati che compaiono sulle fatture', () => {
    const date = trovaDate('emessa il 03/09/2026, poi 12-03-26 e 5 settembre 2026')
    expect(date.map((d) => d.giorno)).toEqual(['2026-09-03', '2026-03-12', '2026-09-05'])
  })

  it('scarta le date impossibili invece di inventarle', () => {
    // 31 febbraio e mese 13: è l'OCR che ha sbagliato una cifra.
    expect(trovaDate('31/02/2026 e 12/13/2026')).toHaveLength(0)
  })
})

describe('correzione delle cifre', () => {
  it('raddrizza O e zero dentro i numeri', () => {
    expect(correggiCifre('12.O3.2O26')).toBe('12.03.2026')
    expect(correggiCifre('92O,OO')).toBe('920,00')
  })

  it('lascia in pace le parole', () => {
    expect(correggiCifre('POLTIGLIA BORDOLESE')).toBe('POLTIGLIA BORDOLESE')
    expect(correggiCifre('GASOLIO')).toBe('GASOLIO')
  })
})

describe('fattura leggibile', () => {
  const scheda = estraiFattura(FATTURA_CONSORZIO)

  it('prende il fornitore e non il cliente', () => {
    expect(scheda.fornitore?.valore).toContain('AGRIFORNITURE VALLE')
  })

  it('prende numero, data e partita IVA', () => {
    expect(scheda.numero?.valore).toBe('2026/0412')
    expect(scheda.data?.valore).toBe('2026-09-03')
    expect(scheda.partitaIva?.valore).toBe('01234567890')
  })

  it('prende il totale del documento, non l’IVA', () => {
    expect(scheda.totale?.valore).toBe(847.6)
    expect(scheda.imponibile?.valore).toBe(815)
  })

  it('riconosce le righe di merce con quantità e unità', () => {
    const descrizioni = scheda.righe.map((r) => r.descrizione)
    expect(descrizioni.some((d) => d.includes('POLTIGLIA BORDOLESE'))).toBe(true)
    expect(descrizioni.some((d) => d.includes('UREA'))).toBe(true)

    const poltiglia = scheda.righe.find((r) => r.descrizione.includes('POLTIGLIA'))
    expect(poltiglia?.quantita).toBe(25)
    expect(poltiglia?.unitaMisura).toBe('kg')
  })

  it('non scambia la scadenza di pagamento per la data della fattura', () => {
    expect(scheda.data?.valore).not.toBe('2026-11-02')
  })

  it('si dichiara affidabile', () => {
    expect(fiduciaComplessiva(scheda)).toBeGreaterThan(0.7)
  })
})

describe('fattura letta male dall’OCR', () => {
  const scheda = estraiFattura(FATTURA_SPORCA)

  it('recupera la data nonostante le O al posto degli zeri', () => {
    expect(scheda.data?.valore).toBe('2026-03-12')
  })

  it('recupera il totale', () => {
    expect(scheda.totale?.valore).toBe(920)
  })

  it('recupera la partita IVA anche spaziata', () => {
    expect(scheda.partitaIva?.valore).toBe('09876543210')
  })

  it('sul fornitore storpiato resta prudente invece di fingere sicurezza', () => {
    // "CQNSQRZIO" non si può raddrizzare: si prende la riga, ma con poca fiducia.
    expect(scheda.fornitore).toBeDefined()
    expect(scheda.fornitore!.fiducia).toBeLessThan(0.85)
  })
})

describe('patentino', () => {
  const scheda = estraiScadenza(PATENTINO, '2026-09-20')

  it('prende la scadenza, che è il dato che serve', () => {
    expect(scheda.scadeIl?.valore).toBe('2026-10-21')
    expect(scheda.scadeIl?.fiducia).toBeGreaterThan(0.8)
  })

  it('non scambia la data di nascita per il rilascio', () => {
    expect(scheda.rilasciatoIl?.valore).toBe('2021-10-22')
  })

  it('prende numero e intestatario', () => {
    expect(scheda.numero?.valore).toBe('LO-2021-004512')
    expect(scheda.intestatario?.valore).toContain('GREPPI MASSIMO')
  })

  it('dice da quale riga ha preso la scadenza', () => {
    expect(scheda.scadeIl?.riga).toContain('Valido fino al')
  })
})

/**
 * Questi casi non me li sono inventati: sono usciti facendo girare Tesseract
 * sul serio su una fattura. Il testo qui sotto è la sua uscita vera, sbavature
 * comprese — "PFPOLTIGLIA" e i numeri spezzati da uno spazio dopo la virgola.
 */
const USCITA_VERA_TESSERACT = `AGRIFORNITURE VALLE S.R.L.

Via Roma 14 - 26900 Lodi (LO)

P.IVA 01234567890

FATTURA N. 2026/0412 del 03/09/2026

Spett.le AZIENDA AGRICOLA ROSSI MARIO

Cascina Bellavista - 26841 Casalpusterlengo

Cod. Descrizione Q.ta UM Prezzo Importo
1104 PFPOLTIGLIA BORDOLESE 25 kg 6,40 160,00
2201 ZOLFO BAGNABILE 50 kg 2,10 105,00
3310 UREA 46 1000 kg 0, 55 550, 00
Imponibile 815,00
IVA 4% 32, 60
TOTALE DOCUMENTO 847,60
Pagamento: bonifico 60 gg - scadenza 02/11/2026`

describe('uscita vera di Tesseract', () => {
  const scheda = estraiFattura(USCITA_VERA_TESSERACT)

  it('non mette l’indirizzo e il numero di fattura fra la merce', () => {
    const descrizioni = scheda.righe.map((r) => r.descrizione)
    expect(descrizioni.some((d) => /via roma/i.test(d))).toBe(false)
    expect(descrizioni.some((d) => /fattura/i.test(d))).toBe(false)
    expect(scheda.righe).toHaveLength(3)
  })

  it('legge i numeri da destra, così "UREA 46" non diventa 46 chili', () => {
    const urea = scheda.righe.find((r) => r.descrizione.includes('UREA'))
    expect(urea?.quantita).toBe(1000)
    expect(urea?.prezzoUnitario).toBe(0.55)
    expect(urea?.importo).toBe(550)
  })

  it('ricuce i numeri spezzati dallo spazio dopo la virgola', () => {
    expect(scheda.totale?.valore).toBe(847.6)
    const urea = scheda.righe.find((r) => r.descrizione.includes('UREA'))
    expect(urea?.importo).toBe(550)
  })

  it('tiene buone le righe pulite', () => {
    const zolfo = scheda.righe.find((r) => r.descrizione.includes('ZOLFO'))
    expect(zolfo?.quantita).toBe(50)
    expect(zolfo?.prezzoUnitario).toBe(2.1)
    expect(zolfo?.importo).toBe(105)
    expect(zolfo?.unitaMisura).toBe('kg')
  })
})

describe('quando non c’è niente da leggere', () => {
  it('non si inventa i campi', () => {
    const scheda = estraiFattura('foto venuta mossa, non si legge niente')
    expect(scheda.numero).toBeUndefined()
    expect(scheda.totale).toBeUndefined()
    expect(fiduciaComplessiva(scheda)).toBeLessThan(0.3)
  })

  it('senza date non inventa una scadenza', () => {
    const scheda = estraiScadenza('CERTIFICATO', '2026-09-20')
    expect(scheda.scadeIl).toBeUndefined()
  })
})
