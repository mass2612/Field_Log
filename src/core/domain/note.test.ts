import { describe, expect, it } from 'vitest'
import { nomePeriodo, proponiAvversita, proponiCampo, proponiPeriodo, prossimiMesi } from './note'

describe('riconoscere il campo nella frase', () => {
  const campi = ['Il pero', 'La marcita', 'Vigna sotto casa']

  it('trova il campo anche quando l’articolo cambia: “al pero”, “nella marcita”', () => {
    expect(proponiCampo('dato il rame al pero', campi)).toBe('Il pero')
    expect(proponiCampo('erba alta nella marcita', campi)).toBe('La marcita')
  })

  it('trova il nome intero com’è scritto', () => {
    expect(proponiCampo('trattata la vigna sotto casa', campi)).toBe('Vigna sotto casa')
  })

  it('non scatta dentro altre parole', () => {
    expect(proponiCampo('però oggi piove', campi)).toBeUndefined()
    expect(proponiCampo('pagato l’operaio', campi)).toBeUndefined()
  })
})

describe('avversità dalla frase', () => {
  it('la riconosce', () => {
    expect(proponiAvversita('dato il rame al pero per la ticchiolatura')).toBe('ticchiolatura')
    expect(proponiAvversita('trattato contro il ragnetto rosso')).toBe('ragnetto rosso')
  })
  it('non la inventa', () => {
    expect(proponiAvversita('dato il rame al pero')).toBeUndefined()
  })
})

describe('quando ricordare una raccomandazione', () => {
  it('a novembre, "febbraio" è il febbraio che viene', () => {
    expect(proponiPeriodo('argine da rialzare a febbraio', '2026-11-02')).toBe('2027-02-01')
  })
  it('il mese in corso vale adesso', () => {
    expect(proponiPeriodo('entro novembre', '2026-11-02')).toBe('2026-11-01')
  })
  it('le stagioni e il mese prossimo', () => {
    expect(proponiPeriodo('in primavera rifare il fosso', '2026-11-02')).toBe('2027-03-01')
    expect(proponiPeriodo('il mese prossimo', '2026-12-10')).toBe('2027-01-01')
  })
  it('senza un periodo non inventa niente', () => {
    expect(proponiPeriodo('argine da rialzare quando faccio i lavori', '2026-11-02')).toBeUndefined()
  })
  it('i prossimi dodici mesi partono da questo', () => {
    const m = prossimiMesi('2026-11-02')
    expect(m[0]).toBe('2026-11-01')
    expect(m[3]).toBe('2027-02-01')
    expect(nomePeriodo(m[3])).toBe('febbraio 2027')
  })
})
