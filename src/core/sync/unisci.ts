/**
 * Le regole per mettere insieme la copia del telefono e quella sul server.
 * Pure, senza database: si provano coi test.
 */

export interface RigaRemota {
  tabella: string
  id: string
  dati: Record<string, unknown>
  modificato_il: string
}

/**
 * Vince la versione cambiata per ultima. A parità si tiene quella del
 * telefono: riscriverla con sé stessa non serve.
 */
export function vinceRemota(locale: { modificatoIl?: string } | undefined, remota: RigaRemota): boolean {
  if (!locale) return true
  return Date.parse(remota.modificato_il) > Date.parse(locale.modificatoIl ?? '')
}

/** Il quando di una riga: le rettifiche non hanno `modificatoIl`, hanno `avvenutaIl`. */
export function quandoModificato(riga: Record<string, unknown>): string | undefined {
  return (riga.modificatoIl as string | undefined) ?? (riga.avvenutaIl as string | undefined)
}

/**
 * Le tabelle che non viaggiano. Oggi nessuna: anche `allegati` viaggia, ma
 * senza il file, che va a parte nell'archivio file (vedi `file.ts`).
 */
export const TABELLE_ESCLUSE = new Set<string>()

/** I dati dimostrativi non si copiano mai: sono una prova, non il quaderno. */
export function daCopiare(riga: Record<string, unknown>): boolean {
  return !riga.dimostrativo
}
