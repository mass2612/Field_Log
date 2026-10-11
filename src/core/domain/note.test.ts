import { describe, expect, it } from 'vitest'
import { proponiAvversita, proponiCampo } from './note'

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
