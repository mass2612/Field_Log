import Dexie, { type Table } from 'dexie'
import type {
  Allegato,
  AnalisiSuolo,
  Attrezzo,
  Azienda,
  Campo,
  Coltura,
  Documento,
  Fattura,
  ID,
  Intervento,
  Lotto,
  MovimentoMagazzino,
  Operatore,
  Prodotto,
  Rettifica,
  Taratura,
  Tracciato,
} from '../domain/types'
import type { Nota } from '../domain/note'

/**
 * Database locale. In campo non c'è rete: questa è la fonte di verità, il
 * server è una copia. Ogni tabella tiene `modificatoIl` per la sincronizzazione
 * differenziale che arriverà in seguito.
 */
class QuadernoDB extends Dexie {
  aziende!: Table<Azienda, ID>
  campi!: Table<Campo, ID>
  colture!: Table<Coltura, ID>
  operatori!: Table<Operatore, ID>
  attrezzi!: Table<Attrezzo, ID>
  documenti!: Table<Documento, ID>
  prodotti!: Table<Prodotto, ID>
  lotti!: Table<Lotto, ID>
  movimenti!: Table<MovimentoMagazzino, ID>
  fatture!: Table<Fattura, ID>
  interventi!: Table<Intervento, ID>
  allegati!: Table<Allegato, ID>
  rettifiche!: Table<Rettifica, ID>
  tarature!: Table<Taratura, ID>
  note!: Table<Nota, ID>
  analisiSuolo!: Table<AnalisiSuolo, ID>

  constructor() {
    super('quaderno-di-campagna')
    this.version(1).stores({
      aziende: 'id, nome, paese, modificatoIl',
      campi: 'id, aziendaId, nome, modificatoIl',
      colture: 'id, campoId, annata, specie, modificatoIl',
      operatori: 'id, aziendaId, cognome, attivo, modificatoIl',
      attrezzi: 'id, aziendaId, tipo, attivo, modificatoIl',
      documenti: 'id, aziendaId, tipo, scadeIl, modificatoIl',
      prodotti: 'id, aziendaId, nome, tipo, modificatoIl',
      lotti: 'id, aziendaId, prodottoId, scadenza, modificatoIl',
      movimenti: 'id, aziendaId, lottoId, data, interventoId, modificatoIl',
      fatture: 'id, aziendaId, data, statoLettura, modificatoIl',
      interventi: 'id, aziendaId, campoId, colturaId, data, tipo, daCompletare, modificatoIl',
      allegati: 'id, aziendaId, modificatoIl',
      rettifiche: 'id, aziendaId, recordId, avvenutaIl',
    })

    // v2 — il quaderno agronomico: prove di taratura e analisi del terreno.
    // Dexie porta avanti da sola i dati esistenti: si aggiungono solo tabelle.
    this.version(2).stores({
      tarature: 'id, aziendaId, attrezzoId, data, tipo, modificatoIl',
      analisiSuolo: 'id, aziendaId, campoId, data, modificatoIl',
    })

    // v3 — le note diventano il primitivo dell'app: tutto il quaderno è fatto
    // di note, e la struttura si ricava da quelle.
    this.version(3).stores({
      note: 'id, aziendaId, dataFatto, campoNome, campoId, *argomenti, creatoIl, modificatoIl',
    })
  }
}

export const db = new QuadernoDB()

/** Identificativi ordinabili nel tempo: comodi per la sincronizzazione. */
export function nuovoId(): ID {
  const tempo = Date.now().toString(36).padStart(9, '0')
  const caso = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `${tempo}${caso}`
}

export function adesso(): string {
  return new Date().toISOString()
}

export function oggi(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Aggiunge i campi di tracciamento a un record nuovo. */
export function traccia<T extends object>(dati: T): T & Tracciato {
  const t = adesso()
  return { ...dati, id: nuovoId(), creatoIl: t, modificatoIl: t }
}

/**
 * Modifica un record registrando ogni campo cambiato nel registro rettifiche.
 * Le correzioni restano visibili: un quaderno riscrivibile non prova nulla.
 */
export async function modificaTracciata<T extends Tracciato>(
  tabella: Table<T, ID>,
  nomeTabella: string,
  id: ID,
  modifiche: Partial<T>,
  contesto?: { aziendaId?: ID; operatoreId?: ID; motivo?: string },
): Promise<void> {
  await db.transaction('rw', tabella, db.rettifiche, async () => {
    const precedente = await tabella.get(id)
    if (!precedente) throw new Error(`Record ${nomeTabella}/${id} non trovato`)

    const avvenutaIl = adesso()
    const righe: Rettifica[] = []

    for (const [campo, valoreNuovo] of Object.entries(modifiche)) {
      const valorePrecedente = (precedente as Record<string, unknown>)[campo]
      if (JSON.stringify(valorePrecedente) === JSON.stringify(valoreNuovo)) continue
      righe.push({
        id: nuovoId(),
        aziendaId:
          contesto?.aziendaId ?? ((precedente as Record<string, unknown>).aziendaId as ID) ?? '',
        tabella: nomeTabella,
        recordId: id,
        campo,
        valorePrecedente: JSON.stringify(valorePrecedente ?? null),
        valoreNuovo: JSON.stringify(valoreNuovo ?? null),
        motivo: contesto?.motivo,
        operatoreId: contesto?.operatoreId,
        avvenutaIl,
      })
    }

    if (righe.length === 0) return
    await tabella.update(id, { ...modifiche, modificatoIl: avvenutaIl } as never)
    await db.rettifiche.bulkAdd(righe)
  })
}

/**
 * Annullamento logico. Una registrazione obbligatoria per legge non si cancella:
 * si annulla motivandolo e resta leggibile nel registro.
 */
export async function annulla<T extends Tracciato>(
  tabella: Table<T, ID>,
  nomeTabella: string,
  id: ID,
  motivo: string,
): Promise<void> {
  await modificaTracciata(
    tabella,
    nomeTabella,
    id,
    { annullatoIl: adesso(), motivoAnnullamento: motivo } as Partial<T>,
    { motivo },
  )
}
