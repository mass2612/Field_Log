import { describe, expect, it } from 'vitest'
import type { Nota } from '../domain/note'
import type { Prodotto } from '../domain/types'
import { usoDalleNote } from './usoDalleNote'

const t = { creatoIl: '2026-01-01T00:00:00Z', modificatoIl: '2026-01-01T00:00:00Z' }
const rame: Prodotto = { id: 'p1', aziendaId: 'a', nome: 'Rame ossicloruro', tipo: 'fitosanitario', unitaMisura: 'kg', fonte: 'manuale', ...t }
let n = 0
function nota(prodotti: NonNullable<Nota['scheda']>['prodotti'], p: Partial<Nota> = {}): Nota {
  return { id: `n${++n}`, aziendaId: 'a', testo: 'x', dataFatto: '2026-05-0' + n, argomenti: [], scheda: { prodotti }, ...t, ...p }
}

describe('il magazzino si scarica dalle note', () => {
  it('somma quanto usato, convertendo le unità', () => {
    const r = usoDalleNote(
      [nota([{ nome: 'rame  ossicloruro', quantita: 2.5, unitaMisura: 'kg' }]), nota([{ nome: 'Rame ossicloruro', quantita: 500, unitaMisura: 'g' }])],
      [rame],
    )
    expect(r.perProdotto.get('p1')?.totale).toBe(3)
    expect(r.perProdotto.get('p1')?.usi).toHaveLength(2)
  })

  it('non contano raccomandazioni e note annullate', () => {
    const r = usoDalleNote(
      [
        nota([{ nome: 'Rame ossicloruro', quantita: 2, unitaMisura: 'kg' }], { genere: 'raccomandazione' }),
        nota([{ nome: 'Rame ossicloruro', quantita: 2, unitaMisura: 'kg' }], { annullatoIl: '2026-05-01T00:00:00Z' }),
      ],
      [rame],
    )
    expect(r.perProdotto.size).toBe(0)
  })

  it('i prodotti che non ci sono finiscono a parte, e i litri su un prodotto in kg sono da controllare', () => {
    const r = usoDalleNote(
      [nota([{ nome: 'Urea', quantita: 3, unitaMisura: 'q' }]), nota([{ nome: 'Rame ossicloruro', quantita: 2, unitaMisura: 'l' }])],
      [rame],
    )
    expect(r.sconosciuti).toEqual([expect.objectContaining({ nome: 'Urea', totale: 3, unitaMisura: 'q' })])
    expect(r.daControllare).toHaveLength(1)
    expect(r.perProdotto.size).toBe(0)
  })
})
