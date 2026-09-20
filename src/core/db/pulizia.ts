import Dexie from 'dexie'
import { db } from './db'

/**
 * Fare piazza pulita.
 *
 * Serve al passaggio dalla prova all'uso vero: quando l'azienda comincia a
 * tenere il quaderno sul serio, la roba dei tentativi non deve restare in
 * mezzo. Un registro che si porta dietro fatture finte e campi inventati è un
 * registro di cui non ci si fida — e in caso di controllo è peggio che inutile.
 *
 * Nota: i dati stanno **nel singolo dispositivo**. Svuotare qui non tocca
 * nessun altro telefono, e non esiste nessun server da ripulire.
 */

/** Tutte le tabelle, prese dal database stesso per non dimenticarne una. */
function tabelle() {
  return db.tables
}

export interface Conteggio {
  tabella: string
  totali: number
  dimostrativi: number
}

export async function contaRighe(): Promise<Conteggio[]> {
  const conteggi: Conteggio[] = []

  for (const tabella of tabelle()) {
    const righe = await tabella.toArray()
    conteggi.push({
      tabella: tabella.name,
      totali: righe.length,
      dimostrativi: righe.filter((r) => (r as { dimostrativo?: boolean }).dimostrativo).length,
    })
  }

  return conteggi.filter((c) => c.totali > 0)
}

/**
 * Toglie solo quello che è nato dalla prova, lasciando il resto.
 *
 * Utile quando si sono mescolate note vere e dati finti: si tolgono i finti e
 * il lavoro vero resta.
 */
export async function eliminaDatiDimostrativi(): Promise<number> {
  let eliminate = 0

  await db.transaction('rw', tabelle(), async () => {
    for (const tabella of tabelle()) {
      const righe = await tabella.toArray()
      const daTogliere = righe
        .filter((r) => (r as { dimostrativo?: boolean }).dimostrativo)
        .map((r) => (r as { id: string }).id)

      if (daTogliere.length > 0) {
        await tabella.bulkDelete(daTogliere)
        eliminate += daTogliere.length
      }
    }
  })

  return eliminate
}

/**
 * Svuota tutto e riparte da zero.
 *
 * Si cancella l'intero database invece di ripulire tabella per tabella: così
 * spariscono anche le foto e gli audio, che altrimenti resterebbero a occupare
 * spazio senza che niente li nomini più.
 */
export async function svuotaTutto(): Promise<void> {
  db.close()
  await Dexie.delete('quaderno-di-campagna')
}
