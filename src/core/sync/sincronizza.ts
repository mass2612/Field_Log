import type { Table } from 'dexie'
import { db } from '../db/db'
import { supabase } from './client'
import { daCopiare, quandoModificato, TABELLE_ESCLUSE, vinceRemota, type RigaRemota } from './unisci'

/**
 * La copia dei dati sul server.
 *
 * Il telefono resta la fonte di verità: in campo non c'è rete, e l'app deve
 * funzionare uguale con o senza account. Il server è una copia, che serve a
 * due cose: non perdere il quaderno col telefono, e ritrovarlo su un
 * telefono nuovo.
 *
 * Due passi, sempre in quest'ordine:
 * 1. **si manda** quello che è cambiato sul telefono dall'ultima volta;
 * 2. **si scarica** quello che è arrivato sul server dall'ultima volta (da un
 *    altro telefono, o dal recupero), e lo si tiene se è più recente.
 *
 * Limiti, detti chiari:
 * - le **foto e gli audio** non viaggiano ancora (vedi `TABELLE_ESCLUSE`);
 * - una riga **cancellata davvero** dal telefono resta sul server. Nel
 *   quaderno però non si cancella: si annulla, e l'annullamento viaggia.
 */

const PAGINA = 500

export interface EsitoCopia {
  inviate: number
  ricevute: number
}

let inCorso: Promise<EsitoCopia> | undefined

/** Una copia alla volta: se ne è già partita una, si aspetta quella. */
export function sincronizza(): Promise<EsitoCopia> {
  inCorso ??= esegui().finally(() => {
    inCorso = undefined
  })
  return inCorso
}

async function esegui(): Promise<EsitoCopia> {
  const { data } = await supabase().auth.getSession()
  if (!data.session) return { inviate: 0, ricevute: 0 }
  const utente = data.session.user.id
  const inviate = await invia(utente)
  const ricevute = await ricevi(utente)
  if (ricevute > 0) await riunisciAziende()
  localStorage.setItem('sync-ultima-copia', new Date().toISOString())
  return { inviate, ricevute }
}

function tabelleDaCopiare(): Table[] {
  return db.tables.filter((t) => !TABELLE_ESCLUSE.has(t.name))
}

async function invia(utente: string): Promise<number> {
  // L'ora si prende prima di leggere: quello che cambia mentre si manda partirà la volta dopo.
  const inizio = new Date().toISOString()
  const dal = localStorage.getItem(`sync-inviato-fino:${utente}`) ?? ''
  let totale = 0

  for (const tabella of tabelleDaCopiare()) {
    const righe = (await tabella.toArray()) as Record<string, unknown>[]
    const cambiate = righe.filter((r) => daCopiare(r) && (quandoModificato(r) ?? '') > dal)
    for (let i = 0; i < cambiate.length; i += PAGINA) {
      const blocco = cambiate.slice(i, i + PAGINA).map((r) => ({
        tabella: tabella.name,
        id: String(r.id),
        dati: r,
        modificato_il: quandoModificato(r) ?? inizio,
      }))
      const { error } = await supabase()
        .from('record')
        .upsert(blocco, { onConflict: 'utente,tabella,id' })
      if (error) throw new Error(`Copia non riuscita: ${error.message}`)
      totale += blocco.length
    }
  }

  localStorage.setItem(`sync-inviato-fino:${utente}`, inizio)
  return totale
}

async function ricevi(utente: string): Promise<number> {
  const chiave = `sync-ricevuto-fino:${utente}`
  let dal = localStorage.getItem(chiave) ?? '1970-01-01T00:00:00Z'
  const perNome = new Map(db.tables.map((t) => [t.name, t]))
  let applicate = 0

  for (;;) {
    const { data, error } = await supabase()
      .from('record')
      .select('tabella,id,dati,modificato_il,ricevuto_il')
      .gt('ricevuto_il', dal)
      .order('ricevuto_il')
      .limit(PAGINA)
    if (error) throw new Error(`Recupero non riuscito: ${error.message}`)
    if (!data || data.length === 0) break

    for (const riga of data as (RigaRemota & { ricevuto_il: string })[]) {
      const tabella = perNome.get(riga.tabella)
      if (!tabella || TABELLE_ESCLUSE.has(riga.tabella)) continue
      const locale = (await tabella.get(riga.id)) as Record<string, unknown> | undefined
      const confronto = locale && { modificatoIl: quandoModificato(locale) }
      if (vinceRemota(confronto, riga)) {
        await tabella.put(riga.dati)
        applicate++
      }
    }

    dal = data[data.length - 1].ricevuto_il
    localStorage.setItem(chiave, dal)
    if (data.length < PAGINA) break
  }
  return applicate
}

/**
 * Un telefono nuovo, al primo avvio, si crea un'azienda vuota. Quando poi
 * arriva dal server quella vera, sul telefono ce ne sono due: si tiene la più
 * vecchia (quella con la storia) e ci si spostano sopra le righe dell'altra.
 * Oggi un telefono tiene una sola azienda; quando ne terrà più d'una (il
 * contoterzista) questa regola andrà rivista.
 */
async function riunisciAziende(): Promise<void> {
  const aziende = await db.aziende.orderBy('id').toArray()
  if (aziende.length < 2) return
  const [vera, ...altre] = aziende
  const daSpostare = new Set(altre.map((a) => a.id))
  const adesso = new Date().toISOString()

  await db.transaction('rw', db.tables, async () => {
    for (const tabella of db.tables) {
      if (tabella.name === 'aziende') continue
      const righe = (await tabella.toArray()) as { aziendaId?: string; modificatoIl?: string }[]
      const sue = righe.filter((r) => r.aziendaId && daSpostare.has(r.aziendaId))
      if (sue.length === 0) continue
      await tabella.bulkPut(
        sue.map((r) => ({ ...r, aziendaId: vera.id, ...(r.modificatoIl ? { modificatoIl: adesso } : {}) })),
      )
    }
    await db.aziende.bulkDelete([...daSpostare])
  })
}

export function ultimaCopia(): string | null {
  return localStorage.getItem('sync-ultima-copia')
}
