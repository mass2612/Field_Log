import { describe, expect, it } from 'vitest'
import type { Prodotto } from '../domain/types'
import { controllaDose, controllaDosiNota, converti } from './dose'

const rame = {
  id: 'p1', aziendaId: 'a', nome: 'Poltiglia bordolese', tipo: 'fitosanitario',
  unitaMisura: 'kg', doseMaxPerHa: 4, creatoIl: '', modificatoIl: '',
} as Prodotto

describe('dose per ettaro', () => {
  it('avvisa quando si va oltre il massimo', () => {
    const e = controllaDose(rame, 6, 'kg', 1)!
    expect(e.oltre).toBe(true)
    expect(e.messaggio).toContain('oltre il massimo di 4')
  })

  it('tace quando si sta dentro', () => {
    expect(controllaDose(rame, 7, 'kg', 2)!.oltre).toBe(false)
  })

  it('converte le unità: 6000 g su un ettaro sono 6 kg', () => {
    expect(controllaDose(rame, 6000, 'g', 1)!.dosePerEttaro).toBe(6)
  })

  it('non confronta chili con litri', () => {
    expect(controllaDose(rame, 6, 'l', 1)).toBeUndefined()
    expect(converti(1, 'kg', 'l')).toBeUndefined()
  })

  it('senza dose massima o senza ettari non dice niente', () => {
    expect(controllaDose({ ...rame, doseMaxPerHa: undefined }, 6, 'kg', 1)).toBeUndefined()
    expect(controllaDose(rame, 6, 'kg', undefined)).toBeUndefined()
  })

  it('in una nota controlla solo i prodotti riconosciuti', () => {
    const esiti = controllaDosiNota(
      [
        { nome: 'poltiglia bordolese', quantita: 10, unitaMisura: 'kg' },
        { nome: 'Sconosciuto', quantita: 99, unitaMisura: 'kg' },
      ],
      2,
      [rame],
    )
    expect(esiti).toHaveLength(1)
    expect(esiti[0].oltre).toBe(true)
  })
})
