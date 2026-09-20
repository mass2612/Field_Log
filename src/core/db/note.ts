import type { Campo, ID } from '../domain/types'
import type { Nota } from '../domain/note'

/**
 * I campi dell'azienda nascono dalle note.
 *
 * Non c'è un'anagrafica da compilare prima: scrivi "vigna sotto casa" e da quel
 * momento quel campo esiste. Qui si mettono insieme i nomi trovati nelle note e
 * quelli dei campi già registrati per bene, senza doppioni.
 */
export function nomiDeiCampi(note: Nota[], campi: Campo[] = []): string[] {
  const visti = new Map<string, string>()

  for (const campo of campi) {
    if (campo.annullatoIl) continue
    visti.set(campo.nome.toLowerCase(), campo.nome)
  }
  for (const nota of note) {
    if (nota.annullatoIl || !nota.campoNome) continue
    const chiave = nota.campoNome.toLowerCase()
    if (!visti.has(chiave)) visti.set(chiave, nota.campoNome)
  }

  return [...visti.values()].sort((a, b) => a.localeCompare(b))
}

export interface CampoDalleNote {
  nome: string
  /** Presente solo se esiste anche un campo registrato con superficie e dati. */
  campoId?: ID
  superficieHa?: number
  numeroNote: number
  ultimaNota?: string
  argomenti: Set<string>
}

/**
 * Il riepilogo per la schermata Campi: si aggiorna da solo man mano che si
 * scrivono le note, senza che nessuno compili un'anagrafica.
 */
export function campiDalleNote(note: Nota[], campi: Campo[] = []): CampoDalleNote[] {
  const mappa = new Map<string, CampoDalleNote>()

  const aggiungi = (nome: string): CampoDalleNote => {
    const chiave = nome.toLowerCase()
    let voce = mappa.get(chiave)
    if (!voce) {
      voce = { nome, numeroNote: 0, argomenti: new Set() }
      mappa.set(chiave, voce)
    }
    return voce
  }

  for (const campo of campi) {
    if (campo.annullatoIl) continue
    const voce = aggiungi(campo.nome)
    voce.campoId = campo.id
    voce.superficieHa = campo.superficieHa
  }

  for (const nota of note) {
    if (nota.annullatoIl || !nota.campoNome) continue
    const voce = aggiungi(nota.campoNome)
    voce.numeroNote += 1
    if (!voce.ultimaNota || nota.dataFatto > voce.ultimaNota) voce.ultimaNota = nota.dataFatto
    for (const argomento of nota.argomenti) voce.argomenti.add(argomento)
  }

  return [...mappa.values()].sort(
    (a, b) => (b.ultimaNota ?? '').localeCompare(a.ultimaNota ?? '') || a.nome.localeCompare(b.nome),
  )
}

/** Ricerca a testo pieno sulle note: il testo è corto, basta scorrerle. */
export function cercaNote(note: Nota[], query: string): Nota[] {
  const parole = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (parole.length === 0) return note

  return note.filter((nota) => {
    const dove = `${nota.testo} ${nota.campoNome ?? ''} ${nota.argomenti.join(' ')}`.toLowerCase()
    return parole.every((p) => dove.includes(p))
  })
}
