import type { Documento, Giorno } from '../domain/types'
import { eRaccomandazione, nomePeriodo, type Nota } from '../domain/note'

/**
 * I promemoria che il telefono deve far suonare, anche ad app chiusa.
 *
 * Due sole cose, le stesse della scheda "Oggi": le **raccomandazioni** il
 * giorno in cui arriva il loro momento ("l'argine a febbraio" suona il 1°
 * febbraio), e le **scadenze dei documenti** (un mese prima e il giorno
 * stesso). Sempre alle 8 di mattina: prima di uscire, non durante il lavoro.
 *
 * Qui si decide solo *cosa* e *quando*; a farle suonare ci pensa
 * `core/notifiche`, che esiste solo nell'app installata.
 */

export interface Promemoria {
  /** Numero stabile ricavato dalla chiave: serve al telefono per sostituirlo o toglierlo. */
  id: number
  chiave: string
  titolo: string
  testo: string
  quando: Giorno
  percorso: string
}

const PREAVVISO_DOCUMENTI = 30
/** Più di così il telefono non ne tiene volentieri: si tengono i più vicini. */
export const MASSIMO_PROMEMORIA = 50

export function pianoPromemoria(note: Nota[], documenti: Documento[], oggi: Giorno): Promemoria[] {
  const piano: Omit<Promemoria, 'id'>[] = []

  for (const n of note) {
    if (n.annullatoIl || !eRaccomandazione(n) || n.fattaIl || !n.ricordaDal) continue
    if (n.ricordaDal <= oggi) continue // già arrivata: la dice la scheda "Oggi"
    piano.push({
      chiave: `racc:${n.id}`,
      titolo: `📌 Da fare a ${nomePeriodo(n.ricordaDal).split(' ')[0]}`,
      testo: n.testo.length > 140 ? `${n.testo.slice(0, 137)}…` : n.testo,
      quando: n.ricordaDal,
      percorso: `/quaderno/${n.id}`,
    })
  }

  for (const d of documenti) {
    if (d.annullatoIl || !d.scadeIl) continue
    const prima = aggiungiGiorni(d.scadeIl, -(d.preavvisoGiorni ?? PREAVVISO_DOCUMENTI))
    if (prima > oggi) {
      piano.push({
        chiave: `doc-prima:${d.id}`,
        titolo: '⚠️ Scadenza in arrivo',
        testo: `${d.descrizione}: scade il ${dataBreve(d.scadeIl)}.`,
        quando: prima,
        percorso: `/documenti/${d.id}`,
      })
    }
    if (d.scadeIl > oggi) {
      piano.push({
        chiave: `doc-oggi:${d.id}`,
        titolo: '❗ Scade oggi',
        testo: d.descrizione,
        quando: d.scadeIl,
        percorso: `/documenti/${d.id}`,
      })
    }
  }

  return piano
    .sort((a, b) => a.quando.localeCompare(b.quando))
    .slice(0, MASSIMO_PROMEMORIA)
    .map((p) => ({ ...p, id: numeroDa(p.chiave) }))
}

/** Un numero intero positivo a 31 bit, sempre lo stesso per la stessa chiave. */
export function numeroDa(chiave: string): number {
  let h = 2166136261
  for (let i = 0; i < chiave.length; i++) {
    h ^= chiave.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 1) || 1
}

function aggiungiGiorni(giorno: Giorno, giorni: number): Giorno {
  const [a, m, g] = giorno.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g + giorni)).toISOString().slice(0, 10)
}

function dataBreve(giorno: Giorno): string {
  const [a, m, g] = giorno.split('-')
  return `${g}/${m}/${a}`
}
