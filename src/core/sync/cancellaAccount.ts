import { db } from '../db/db'
import { supabase } from './client'

/**
 * Cancella l'account e tutto quello che c'è sul server.
 *
 * Google Play lo pretende per le app con registrazione (e comunque è giusto:
 * i dati sono dell'agricoltore). L'ordine conta:
 * 1. **i file** (foto, registrazioni): Supabase non lascia cancellarli dal
 *    database, solo dall'archivio file, quindi li toglie l'app;
 * 2. **le righe e l'utente**: con la funzione `cancella_account()` sul server
 *    (`supabase/schema.sql`), che toglie l'utente; le righe se ne vanno con
 *    lui.
 *
 * Il quaderno sul telefono **resta**: l'app funziona anche senza account, e
 * chi vuole togliere anche quello disinstalla l'app.
 */
const BUCKET = 'allegati'

export async function cancellaAccount(): Promise<void> {
  const client = supabase()
  const { data } = await client.auth.getUser()
  const utente = data.user?.id
  if (!utente) throw new Error('Non sei collegato a nessun account.')

  // 1. I file, a blocchi: la lista ne restituisce al massimo 1000 per volta.
  for (;;) {
    const { data: file, error } = await client.storage.from(BUCKET).list(utente, { limit: 1000 })
    if (error) throw new Error('Non riesco a cancellare le foto dal server. Riprova con la rete.')
    if (!file || file.length === 0) break
    const { error: errRimozione } = await client.storage
      .from(BUCKET)
      .remove(file.map((f) => `${utente}/${f.name}`))
    if (errRimozione) throw new Error('Non riesco a cancellare le foto dal server. Riprova con la rete.')
  }

  // 2. Le righe e l'utente.
  const { error } = await client.rpc('cancella_account')
  if (error) throw new Error("Non riesco a cancellare l'account. Riprova con la rete.")

  await client.auth.signOut({ scope: 'local' })

  // Sul telefono si dimentica il server: se un giorno si rientra con un
  // account nuovo, foto e righe ripartono da capo.
  await db.allegati.toCollection().modify((a) => {
    delete a.percorsoRemoto
  })
  try {
    for (const chiave of ['sync-ultima-copia', `sync-inviato-fino:${utente}`, `sync-ricevuto-fino:${utente}`]) {
      localStorage.removeItem(chiave)
    }
  } catch {
    /* niente */
  }
}
