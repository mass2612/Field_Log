import { describe, expect, it } from 'vitest'
import { daCopiare, quandoModificato, vinceRemota } from './unisci'

const remota = (modificato_il: string) => ({ tabella: 'note', id: 'n1', dati: {}, modificato_il })

describe('la copia sul server', () => {
  it('vince la versione cambiata per ultima', () => {
    expect(vinceRemota(undefined, remota('2026-11-01T10:00:00Z'))).toBe(true)
    expect(vinceRemota({ modificatoIl: '2026-11-01T09:00:00.000Z' }, remota('2026-11-01T10:00:00+00:00'))).toBe(true)
    expect(vinceRemota({ modificatoIl: '2026-11-01T11:00:00.000Z' }, remota('2026-11-01T10:00:00+00:00'))).toBe(false)
    expect(vinceRemota({ modificatoIl: '2026-11-01T10:00:00.000Z' }, remota('2026-11-01T10:00:00+00:00'))).toBe(false)
  })

  it('le rettifiche si datano con avvenutaIl, e i dati dimostrativi non viaggiano', () => {
    expect(quandoModificato({ avvenutaIl: '2026-11-01' })).toBe('2026-11-01')
    expect(daCopiare({ dimostrativo: true })).toBe(false)
    expect(daCopiare({})).toBe(true)
  })
})
