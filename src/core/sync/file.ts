import { db } from '../db/db'
import type { Allegato } from '../domain/types'
import { supabase } from './client'

/**
 * Foto e registrazioni sul server.
 *
 * Le righe degli allegati (nome, tipo, dimensione, dove sta il file) viaggiano
 * con il resto del quaderno. Il file vero va a parte, nell'archivio file di
 * Supabase (bucket `allegati`), in una cartella per utente: `<utente>/<id>`.
 * Chi entra vede solo la sua cartella: lo garantisce il server
 * (`supabase/schema.sql`), non l'app.
 *
 * - **Caricare**: ogni giro di copia manda i file che non sono ancora su.
 * - **Scaricare**: su un telefono nuovo arrivano prima le righe, poi i file,
 *   un po' per giro, così le foto si vedono anche senza rete dopo.
 *
 * Un file che non passa (rete che cade) non ferma la copia: si riprova al giro
 * dopo.
 */
const BUCKET = 'allegati'
const PER_GIRO = 20

export function percorsoDi(utente: string, id: string): string {
  return `${utente}/${id}`
}

/** Manda sul server i file non ancora caricati. Ritorna quanti ne ha caricati. */
export async function caricaFile(utente: string): Promise<number> {
  const daCaricare = await db.allegati
    .filter((a) => !!a.blob && !a.percorsoRemoto && !(a as { dimostrativo?: boolean }).dimostrativo)
    .toArray()
  let caricati = 0

  for (const a of daCaricare) {
    const percorso = percorsoDi(utente, a.id)
    const { error } = await supabase()
      .storage.from(BUCKET)
      .upload(percorso, a.blob!, { contentType: a.tipoMime || undefined, upsert: true })
    if (error) continue
    // Cambia la riga: al prossimo invio parte anche lei, e l'altro telefono
    // saprà dove prendere il file.
    await db.allegati.update(a.id, { percorsoRemoto: percorso, modificatoIl: new Date().toISOString() })
    caricati++
  }
  return caricati
}

/** Scarica i file che sul telefono mancano. Ritorna quanti ne ha scaricati. */
export async function scaricaFile(): Promise<number> {
  const mancanti = await db.allegati
    .filter((a) => !a.blob && !!a.percorsoRemoto)
    .limit(PER_GIRO)
    .toArray()
  let scaricati = 0

  for (const a of mancanti) {
    const { data, error } = await supabase().storage.from(BUCKET).download(a.percorsoRemoto!)
    if (error || !data) continue
    // Senza toccare `modificatoIl`: il file è lo stesso, non va rimandato.
    await db.allegati.update(a.id, { blob: data })
    scaricati++
  }
  return scaricati
}

/** La riga da copiare sul server: tutto tranne il file. */
export function senzaFile(riga: Record<string, unknown>): Record<string, unknown> {
  const { blob: _blob, ...resto } = riga
  return resto
}

/** Arriva una riga dal server: il file già sul telefono non va perso. */
export function conFileLocale(remota: Record<string, unknown>, locale: Allegato | undefined): Record<string, unknown> {
  return locale?.blob ? { ...remota, blob: locale.blob } : remota
}
