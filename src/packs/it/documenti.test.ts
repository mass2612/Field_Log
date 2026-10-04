import { describe, expect, it } from 'vitest'
import { propostaLegale, serveAllaLegge } from './documenti'

const fattura = (testoLetto: string) => ({
  tipo: 'altro' as const,
  descrizione: 'Fattura',
  testoLetto,
  genereLettura: 'fattura',
})

describe('quali documenti servono alla legge', () => {
  it('il patentino sì', () => {
    expect(propostaLegale({ tipo: 'patentino_fitosanitari', descrizione: 'Patentino' }).serve).toBe(
      true,
    )
  })

  it('il controllo dell’irroratrice sì', () => {
    expect(propostaLegale({ tipo: 'controllo_funzionale', descrizione: 'Controllo' }).serve).toBe(
      true,
    )
  })

  it('la fattura del consorzio con rame e zolfo sì', () => {
    const p = propostaLegale(
      fattura(`AGRIFORNITURE VALLE S.R.L.
1104 POLTIGLIA BORDOLESE 25 kg 6,40 160,00
2201 ZOLFO BAGNABILE 50 kg 2,10 105,00`),
    )
    expect(p.serve).toBe(true)
    expect(p.motivo).toMatch(/fitosanitari/)
  })

  it('riconosce un nome commerciale che l’azienda ha in magazzino', () => {
    const p = propostaLegale(fattura('1 SCORE 25 EC 1 l 89,00'), ['Score 25 EC'])
    expect(p.serve).toBe(true)
    expect(p.motivo).toContain('Score 25 EC')
  })

  it('la fattura dei concimi sì', () => {
    expect(propostaLegale(fattura('3310 UREA 46 1000 kg 0,55 550,00')).serve).toBe(true)
  })

  it('la bolletta dell’acqua no — è quella che ha fatto nascere la domanda', () => {
    const p = propostaLegale(
      fattura(`SERVIZIO IDRICO INTEGRATO
fattura n° 2026/00300138 del 04/06/2026
TOTALE DA PAGARE € 181,26`),
    )
    expect(p.serve).toBe(false)
    expect(p.motivo).toMatch(/bolletta/)
  })

  it('la bolletta della luce no', () => {
    expect(propostaLegale(fattura('Energia elettrica consumo 312 kWh')).serve).toBe(false)
  })

  it('un documento qualunque no, e lo dice', () => {
    const p = propostaLegale({ tipo: 'assicurazione', descrizione: 'Polizza trattore' })
    expect(p.serve).toBe(false)
    expect(p.motivo).toBeTruthy()
  })

  it('la scelta dell’agricoltore vince sulla proposta', () => {
    const bolletta = { ...fattura('SERVIZIO IDRICO INTEGRATO'), perLaLegge: true }
    const esito = serveAllaLegge(bolletta)
    expect(esito.serve).toBe(true)
    expect(esito.decisoDaTe).toBe(true)
  })
})
