import { describe, expect, it } from 'vitest'
import type { Nota } from '../domain/note'
import type { Avviso } from './scadenze'
import { cosaDireOggi, raccomandazioniSulCampo, unAnnoFa } from './oggi'

const t = { creatoIl: '2026-01-01T00:00:00Z', modificatoIl: '2026-01-01T00:00:00Z' }
let n = 0
function nota(p: Partial<Nota>): Nota {
  return { id: `n${++n}`, aziendaId: 'a', testo: 'x', dataFatto: '2026-01-01', argomenti: [], ...t, ...p }
}

const argine = nota({
  genere: 'raccomandazione',
  testo: 'Argine della Marcita da rialzare. Portare la terra dal fosso.',
  campoNome: 'La marcita',
  ricordaDal: '2027-02-01',
})

describe('la scheda Oggi', () => {
  it('a febbraio ricorda la raccomandazione scritta a novembre', () => {
    const [r] = cosaDireOggi([argine], [], '2027-02-03')
    expect(r.tipo).toBe('raccomandazione')
    expect(r.testo).toBe('Da fare (febbraio): Argine della Marcita da rialzare.')
  })

  it('prima del momento non la dice', () => {
    expect(cosaDireOggi([argine], [], '2027-01-31')).toEqual([])
  })

  it('una volta fatta non la ripete', () => {
    expect(cosaDireOggi([{ ...argine, fattaIl: '2027-02-04T08:00:00Z' }], [], '2027-02-10')).toEqual([])
  })

  it('una scadenza sola, la più urgente', () => {
    const avvisi: Avviso[] = [
      { id: '1', gravita: 'in_scadenza', titolo: 'Revisione trattore', dettaglio: 'Fra 20 giorni', giorniMancanti: 20 },
      { id: '2', gravita: 'scaduto', titolo: 'Patentino', dettaglio: 'Scaduto da 3 giorni', giorniMancanti: -3 },
    ]
    const righe = cosaDireOggi([], avvisi, '2027-02-03')
    expect(righe).toHaveLength(1)
    expect(righe[0].testo).toContain('Patentino')
  })

  it('mai più di tre righe, e niente se non c’è niente da dire', () => {
    const tante = [1, 2, 3, 4].map(() => ({ ...argine, id: `r${++n}` }))
    expect(cosaDireOggi(tante, [], '2027-02-03')).toHaveLength(3)
    expect(cosaDireOggi([], [], '2027-02-03')).toEqual([])
  })
})

describe('un anno fa', () => {
  const semina = nota({ testo: 'Seminato frumento, 180 kg/ha', dataFatto: '2025-11-04', campoNome: 'La marcita' })

  it('trova la nota dell’anno scorso vicina a oggi', () => {
    expect(unAnnoFa([semina], '2026-11-02')?.id).toBe(semina.id)
    expect(cosaDireOggi([semina], [], '2026-11-02')[0].testo).toBe(
      'Un anno fa, La marcita: Seminato frumento, 180 kg/ha',
    )
  })

  it('oltre una settimana di distanza tace', () => {
    expect(unAnnoFa([semina], '2026-11-20')).toBeUndefined()
  })
})

describe('raccomandazioni sul campo', () => {
  it('quando scrivi sulla Marcita ti ricorda l’argine', () => {
    expect(raccomandazioniSulCampo([argine], 'la marcita')).toHaveLength(1)
    expect(raccomandazioniSulCampo([argine], 'il pero')).toHaveLength(0)
  })
})
