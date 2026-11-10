import { describe, expect, it } from 'vitest'
import { conFileLocale, percorsoDi, senzaFile } from './file'
import type { Allegato } from '../domain/types'

describe('foto e registrazioni sul server', () => {
  it('la riga parte senza il file', () => {
    const riga = { id: 'a1', nomeFile: 'foto.jpg', blob: new Blob(['x']) }
    expect(senzaFile(riga)).toEqual({ id: 'a1', nomeFile: 'foto.jpg' })
  })

  it('la riga che arriva non cancella il file già sul telefono', () => {
    const blob = new Blob(['foto'])
    const locale = { id: 'a1', blob } as Allegato
    const remota = { id: 'a1', nomeFile: 'foto.jpg', percorsoRemoto: 'u/a1' }
    expect(conFileLocale(remota, locale).blob).toBe(blob)
    expect(conFileLocale(remota, undefined).blob).toBeUndefined()
  })

  it('ogni utente ha la sua cartella', () => {
    expect(percorsoDi('utente-1', 'a1')).toBe('utente-1/a1')
  })
})
