import type { Documento, Giorno, Lotto, Prodotto } from '../domain/types'
import { differenzaGiorni } from './carenza'

export type GravitaAvviso = 'scaduto' | 'in_scadenza' | 'ok'

export interface Avviso {
  id: string
  gravita: GravitaAvviso
  titolo: string
  dettaglio: string
  scadeIl?: Giorno
  giorniMancanti?: number
  /** Dove portare l'utente quando tocca l'avviso. */
  percorso?: string
}

export const PREAVVISO_PREDEFINITO_GIORNI = 30

/**
 * Un documento scaduto non è un promemoria: è un lavoro che non puoi fare.
 * Il preavviso predefinito è di 30 giorni, come richiesto, ma resta configurabile
 * per documento (il controllo funzionale dell'irroratrice va prenotato con mesi
 * di anticipo).
 */
export function avvisoDocumento(documento: Documento, oggi: Giorno): Avviso | null {
  if (documento.annullatoIl || !documento.scadeIl) return null

  const preavviso = documento.preavvisoGiorni ?? PREAVVISO_PREDEFINITO_GIORNI
  const mancanti = differenzaGiorni(oggi, documento.scadeIl)
  if (mancanti > preavviso) return null

  return {
    id: `documento:${documento.id}`,
    gravita: mancanti < 0 ? 'scaduto' : 'in_scadenza',
    titolo: documento.descrizione,
    dettaglio:
      mancanti < 0
        ? `Scaduto da ${Math.abs(mancanti)} giorni`
        : mancanti === 0
          ? 'Scade oggi'
          : `Scade fra ${mancanti} giorni`,
    scadeIl: documento.scadeIl,
    giorniMancanti: mancanti,
    percorso: `/documenti/${documento.id}`,
  }
}

/**
 * Prodotti a magazzino che non si possono più usare, o stanno per non potersi più.
 * Due cause distinte, entrambe capaci di farti trovare in torto a un controllo:
 * la scadenza del lotto e la revoca dell'autorizzazione.
 */
export function avvisiMagazzino(
  lotti: Lotto[],
  prodotti: Map<string, Prodotto>,
  giacenze: Map<string, number>,
  oggi: Giorno,
  preavvisoGiorni = PREAVVISO_PREDEFINITO_GIORNI,
): Avviso[] {
  const avvisi: Avviso[] = []

  for (const lotto of lotti) {
    if (lotto.annullatoIl) continue
    const giacenza = giacenze.get(lotto.id) ?? 0
    if (giacenza <= 0) continue

    const prodotto = prodotti.get(lotto.prodottoId)
    const nome = prodotto?.nome ?? 'Prodotto sconosciuto'

    if (lotto.scadenza) {
      const mancanti = differenzaGiorni(oggi, lotto.scadenza)
      if (mancanti <= preavvisoGiorni) {
        avvisi.push({
          id: `lotto:${lotto.id}`,
          gravita: mancanti < 0 ? 'scaduto' : 'in_scadenza',
          titolo: `${nome} — lotto ${lotto.codiceLotto ?? 's.n.'}`,
          dettaglio:
            mancanti < 0
              ? `Scaduto da ${Math.abs(mancanti)} giorni, ne hai ancora ${giacenza}`
              : `Scade fra ${mancanti} giorni, ne hai ${giacenza}`,
          scadeIl: lotto.scadenza,
          giorniMancanti: mancanti,
          percorso: `/magazzino/${lotto.prodottoId}`,
        })
      }
    }

    // Revoca: dopo il termine di smaltimento scorte il prodotto in cantina
    // diventa un illecito, non solo un costo perso.
    const termine = prodotto?.utilizzabileFinoAl ?? prodotto?.revocatoDal
    if (termine) {
      const mancanti = differenzaGiorni(oggi, termine)
      if (mancanti <= preavvisoGiorni) {
        avvisi.push({
          id: `revoca:${lotto.id}`,
          gravita: mancanti < 0 ? 'scaduto' : 'in_scadenza',
          titolo: `${nome} — prodotto revocato`,
          dettaglio:
            mancanti < 0
              ? `Non più utilizzabile dal ${termine}. Hai ancora ${giacenza} da smaltire.`
              : `Utilizzabile solo fino al ${termine}: restano ${mancanti} giorni per ${giacenza}.`,
          scadeIl: termine,
          giorniMancanti: mancanti,
          percorso: `/magazzino/${lotto.prodottoId}`,
        })
      }
    }
  }

  return avvisi
}

/** Ordinamento: prima il già scaduto, poi ciò che scade prima. */
export function ordinaAvvisi(avvisi: Avviso[]): Avviso[] {
  return [...avvisi].sort((a, b) => (a.giorniMancanti ?? 0) - (b.giorniMancanti ?? 0))
}

export function contaGravi(avvisi: Avviso[]): number {
  return avvisi.filter((a) => a.gravita === 'scaduto' || a.gravita === 'in_scadenza').length
}
