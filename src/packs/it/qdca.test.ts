import { describe, expect, it } from 'vitest'
import type { Campo, Coltura, Documento, Prodotto } from '../../core/domain/types'
import type { Nota } from '../../core/domain/note'
import { oraDallaNota, righeQdca } from './qdca'

const t = { creatoIl: '2026-06-10T18:00:00Z', modificatoIl: '2026-06-10T18:00:00Z' }

function nota(parziale: Partial<Nota>): Nota {
  return {
    id: 'n1',
    aziendaId: 'a',
    testo: '',
    dataFatto: '2026-06-10',
    argomenti: ['trattamento'],
    ...t,
    ...parziale,
  }
}

const pero: Campo = {
  id: 'c1', aziendaId: 'a', nome: 'Il pero', superficieHa: 2, particelle: [], ...t,
}
const coltura: Coltura = { id: 'k1', campoId: 'c1', annata: 2026, specie: 'pero', ...t }
const rame: Prodotto = {
  id: 'p1', aziendaId: 'a', nome: 'Poltiglia bordolese', tipo: 'fitosanitario',
  unitaMisura: 'kg', numeroRegistrazione: '12345', ...t,
} as Prodotto
const patentino = {
  id: 'd1', aziendaId: 'a', tipo: 'patentino_fitosanitari', numero: 'LO-2021-004512',
  descrizione: 'Patentino', soggetto: { tipo: 'azienda', id: 'a' }, ...t,
} as Documento
const controllo = {
  id: 'd2', aziendaId: 'a', tipo: 'controllo_funzionale', rilasciatoIl: '2025-03-01',
  descrizione: 'Controllo', soggetto: { tipo: 'azienda', id: 'a' }, ...t,
} as Documento

describe('ora di inizio dalla frase', () => {
  it('la prende quando c’è', () => {
    expect(oraDallaNota('stamattina alle 7 ho dato il rame')).toBe('07:00')
    expect(oraDallaNota('iniziato verso le 18.30')).toBe('18:30')
  })
  it('non la inventa quando manca', () => {
    expect(oraDallaNota('dato il rame al pero')).toBe('')
    expect(oraDallaNota('alle 27')).toBe('')
  })
})

describe('elenco per il quaderno digitale', () => {
  it('una nota completa diventa una riga senza mancanze', () => {
    const [r] = righeQdca(
      [
        nota({
          testo: 'alle 7 dato 4 kg di poltiglia bordolese al pero per la ticchiolatura',
          campoNome: 'Il pero',
          scheda: {
            prodotti: [{ nome: 'Poltiglia bordolese', quantita: 4, unitaMisura: 'kg' }],
            avversita: 'ticchiolatura',
            operatore: 'Mario',
          },
        }),
      ],
      {
        campi: [{ ...pero, appezzamentoPac: 'APP-001' }],
        colture: [coltura],
        prodotti: [rame],
        documenti: [patentino, controllo],
      },
    )
    expect(r.oraInizio).toBe('07:00')
    expect(r.numeroAutorizzazione).toBe('12345')
    expect(r.dosePerEttaro).toBe(2)
    expect(r.patentino).toBe('LO-2021-004512')
    expect(r.dataControlloFunzionale).toBe('2025-03-01')
    expect(r.mancano).toEqual([])
  })

  it('una nota scarna dice cosa manca, invece di inventare', () => {
    const [r] = righeQdca([nota({ testo: 'trattato il pero', campoNome: 'Il pero' })], {
      campi: [pero],
      colture: [],
      prodotti: [],
      documenti: [],
    })
    expect(r.mancano).toEqual(
      expect.arrayContaining([
        'aggancio all’appezzamento PAC',
        'coltura',
        'prodotto',
        'quantità',
        'avversità',
        'patentino',
        'controllo dell’irroratrice',
      ]),
    )
    expect(r.oraInizio).toBe('')
  })

  it('una riga per prodotto', () => {
    const righe = righeQdca(
      [
        nota({
          scheda: {
            prodotti: [
              { nome: 'Poltiglia bordolese', quantita: 4, unitaMisura: 'kg' },
              { nome: 'Zolfo', quantita: 6, unitaMisura: 'kg' },
            ],
          },
        }),
      ],
      { campi: [], colture: [], prodotti: [], documenti: [] },
    )
    expect(righe.map((r) => r.prodotto)).toEqual(['Poltiglia bordolese', 'Zolfo'])
  })

  it('le concimazioni ci sono, senza chiedere patentino né avversità', () => {
    const [r] = righeQdca(
      [nota({ argomenti: ['concimazione'], scheda: { prodotti: [{ nome: 'Urea', quantita: 300 }] } })],
      { campi: [], colture: [], prodotti: [], documenti: [] },
    )
    expect(r.tipo).toBe('Concimazione')
    expect(r.mancano).not.toContain('patentino')
    expect(r.mancano).not.toContain('avversità')
  })

  it('le note che non sono trattamenti né concimazioni restano fuori', () => {
    expect(
      righeQdca([nota({ argomenti: ['lavorazione'] })], {
        campi: [], colture: [], prodotti: [], documenti: [],
      }),
    ).toEqual([])
  })

  it('con due patentini non sceglie a caso', () => {
    const [r] = righeQdca([nota({})], {
      campi: [], colture: [], prodotti: [],
      documenti: [patentino, { ...patentino, id: 'd3', numero: 'LO-2022-000001' }],
    })
    expect(r.patentino).toBe('')
    expect(r.mancano).toContain('quale patentino')
  })
})
