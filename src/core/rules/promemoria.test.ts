import { describe, expect, it } from 'vitest'
import type { Nota } from '../domain/note'
import type { Documento } from '../domain/types'
import { numeroDa, pianoPromemoria } from './promemoria'

const t = { creatoIl: '2026-01-01T00:00:00Z', modificatoIl: '2026-01-01T00:00:00Z' }
const argine: Nota = {
  id: 'n1',
  aziendaId: 'a',
  testo: "L'argine della Marcita va rialzato a febbraio",
  dataFatto: '2026-11-04',
  argomenti: [],
  genere: 'raccomandazione',
  ricordaDal: '2027-02-01',
  ...t,
}
const patentino = {
  id: 'd1',
  aziendaId: 'a',
  descrizione: 'Patentino fitosanitari',
  scadeIl: '2027-03-15',
  ...t,
} as Documento

describe('i promemoria sul telefono', () => {
  it('la raccomandazione di febbraio suona il primo febbraio', () => {
    const [p] = pianoPromemoria([argine], [], '2026-11-04')
    expect(p.quando).toBe('2027-02-01')
    expect(p.titolo).toBe('📌 Da fare a febbraio')
    expect(p.percorso).toBe('/quaderno/n1')
  })

  it('non suonano quelle fatte, annullate o già arrivate', () => {
    expect(pianoPromemoria([{ ...argine, fattaIl: '2026-12-01T00:00:00Z' }], [], '2026-11-04')).toEqual([])
    expect(pianoPromemoria([{ ...argine, annullatoIl: '2026-12-01T00:00:00Z' }], [], '2026-11-04')).toEqual([])
    expect(pianoPromemoria([argine], [], '2027-02-01')).toEqual([])
  })

  it('il documento suona un mese prima e il giorno stesso, in ordine', () => {
    const piano = pianoPromemoria([argine], [patentino], '2026-11-04')
    expect(piano.map((p) => p.quando)).toEqual(['2027-02-01', '2027-02-13', '2027-03-15'])
  })

  it('lo stesso promemoria ha sempre lo stesso numero', () => {
    expect(numeroDa('racc:n1')).toBe(numeroDa('racc:n1'))
    expect(numeroDa('racc:n1')).not.toBe(numeroDa('racc:n2'))
    expect(numeroDa('racc:n1')).toBeGreaterThan(0)
    expect(numeroDa('racc:n1')).toBeLessThan(2 ** 31)
  })
})
