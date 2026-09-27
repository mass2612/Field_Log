import { describe, expect, it } from 'vitest'
import { componiTrascrizione, correggiConMagazzino } from './registrazione'

/**
 * Il difetto che questi test bloccano.
 *
 * Sul telefono usciva questo, da una frase sola:
 *
 *   "vediamo Vediamo Vediamo cosa Vediamo cosa scrive Vediamo cosa scrive 15 kg"
 *
 * Il riconoscimento **rimanda gli stessi risultati più volte** mentre uno parla,
 * e li ripropone quando li dà per definitivi. La prima versione li sommava a
 * ogni rinvio, e la frase ricresceva.
 */

/** Costruisce un elenco di risultati come lo passa il browser. */
function risultati(...voci: [string, boolean][]) {
  return voci.map(([transcript, isFinal]) =>
    Object.assign([{ transcript }], { isFinal }),
  ) as unknown as ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

describe('composizione della trascrizione', () => {
  it('mette insieme i pezzi definitivi', () => {
    const { finale } = componiTrascrizione(
      risultati(['dato il rame', true], ['alla vigna', true]),
    )
    expect(finale).toBe('dato il rame alla vigna')
  })

  it('tiene i provvisori separati dai definitivi', () => {
    const { finale, provvisorio } = componiTrascrizione(
      risultati(['dato il rame', true], ['alla vi', false]),
    )
    expect(finale).toBe('dato il rame')
    expect(provvisorio).toBe('alla vi')
  })

  it('ripetuta sugli stessi risultati dà sempre lo stesso esito', () => {
    // È la proprietà che rende impossibile la ricrescita: chiamarla dieci
    // volte deve valere quanto chiamarla una.
    const elenco = risultati(['Vediamo cosa scrive', true], ['15 kg', true])
    const primo = componiTrascrizione(elenco)
    for (let i = 0; i < 10; i++) {
      expect(componiTrascrizione(elenco)).toEqual(primo)
    }
    expect(primo.finale).toBe('Vediamo cosa scrive 15 kg')
  })

  it('non ricresce quando il riconoscimento rimanda i risultati', () => {
    /*
     * La sequenza vera osservata su Android: il testo si allunga a ogni
     * evento, e l'elenco contiene sempre tutto dall'inizio.
     */
    const sequenza = [
      risultati(['vediamo', false]),
      risultati(['Vediamo cosa', false]),
      risultati(['Vediamo cosa scrive', false]),
      risultati(['Vediamo cosa scrive 15', false]),
      risultati(['Vediamo cosa scrive 15 kg', true]),
      // Rinvio dello stesso risultato definitivo: capita, ed è qui che prima
      // si rompeva tutto.
      risultati(['Vediamo cosa scrive 15 kg', true]),
    ]

    let ultimo = { finale: '', provvisorio: '' }
    for (const evento of sequenza) ultimo = componiTrascrizione(evento)

    const testo = (ultimo.finale + ' ' + ultimo.provvisorio).trim()
    expect(testo).toBe('Vediamo cosa scrive 15 kg')
    expect(testo).not.toMatch(/Vediamo.*Vediamo/)
  })

  it('Android: la frase ripresa da capo a ogni risultato si legge una volta sola', () => {
    /*
     * Ricostruita dallo schermo del telefono (27/09), dettando "proviamo di
     * nuovo e vediamo cosa legge". Il test di sopra imitava il telefono come
     * lo immaginavo; questo com'era. Ogni risultato riparte dall'inizio, ed è
     * già marcato definitivo. L'ultimo corregge: sparisce la "e".
     */
    const elenco = risultati(
      ['proviamo', true],
      ['proviamo', true],
      ['proviamo di', true],
      ['proviamo di nuovo', true],
      ['proviamo di nuovo e', true],
      ['proviamo di nuovo e', true],
      ['proviamo di nuovo e vediamo', true],
      ['proviamo di nuovo e vediamo', true],
      ['proviamo di nuovo e vediamo cosa', true],
      ['proviamo di nuovo vediamo cosa legge', true],
    )
    const { finale, provvisorio } = componiTrascrizione(elenco)
    expect(finale).toBe('proviamo di nuovo vediamo cosa legge')
    expect(provvisorio).toBe('')
  })

  it('Android: anche con l’ultimo pezzo ancora provvisorio', () => {
    const { finale, provvisorio } = componiTrascrizione(
      risultati(['dato il', true], ['dato il rame', true], ['Dato il rame alla vi', false]),
    )
    expect((finale + ' ' + provvisorio).trim()).toBe('Dato il rame alla vi')
  })

  it('due frasi diverse che si somigliano restano due frasi', () => {
    const { finale } = componiTrascrizione(
      risultati(['dato il rame alla vigna', true], ['dato il rame al frutteto', true]),
    )
    expect(finale).toBe('dato il rame alla vigna dato il rame al frutteto')
  })

  it('non si confonde con i risultati vuoti', () => {
    const { finale } = componiTrascrizione(risultati(['', true], ['rame', true], ['', false]))
    expect(finale).toBe('rame')
  })

  it('senza risultati non inventa niente', () => {
    expect(componiTrascrizione(risultati())).toEqual({ finale: '', provvisorio: '' })
  })
})

describe('correzione coi nomi del magazzino', () => {
  it('raddrizza un nome commerciale storpiato', () => {
    expect(correggiConMagazzino('dato il rondap', ['Roundup', 'Zolfo bagnabile'])).toContain(
      'Roundup',
    )
  })

  it('lascia in pace le parole normali', () => {
    expect(correggiConMagazzino('dato il rame alla vigna', ['Roundup'])).toBe(
      'dato il rame alla vigna',
    )
  })
})
