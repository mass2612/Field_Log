import type { Giorno } from '../domain/types'
import { eRaccomandazione, nomePeriodo, type Nota } from '../domain/note'
import type { Avviso } from './scadenze'

/**
 * Cosa dire stamattina: la scheda "Oggi" in cima alla home.
 *
 * ## Le regole, decise il 02/11/2026
 *
 * - **Al massimo tre righe.** Un assistente che parla troppo si spegne dopo
 *   una settimana: si smette di leggerlo.
 * - **Se non c'è niente da dire, non dice niente.** Niente frasi di riempimento.
 * - **Parla solo dei dati dell'agricoltore e dei fatti** (scadenze, cose che si
 *   è promesso di fare, cosa ha fatto un anno fa). Mai consigli di campo:
 *   niente consulenza, deciso da Max.
 *
 * L'ordine dice cosa conta di più: prima quello che si era promesso di fare
 * ed è arrivato il momento, poi le scadenze, poi il ricordo dell'anno scorso.
 */

export interface RigaOggi {
  tipo: 'raccomandazione' | 'scadenza' | 'anno-fa'
  icona: string
  testo: string
  /** Dove porta il tocco. */
  percorso: string
}

const MASSIMO = 3

export function cosaDireOggi(note: Nota[], avvisi: Avviso[], oggi: Giorno): RigaOggi[] {
  const vive = note.filter((n) => !n.annullatoIl)
  const righe: RigaOggi[] = []

  // 1. Le raccomandazioni il cui momento è arrivato, le più vecchie prima.
  const dovute = vive
    .filter((n) => eRaccomandazione(n) && !n.fattaIl && n.ricordaDal && n.ricordaDal <= oggi)
    .sort((a, b) => a.ricordaDal!.localeCompare(b.ricordaDal!))
  for (const n of dovute) {
    righe.push({
      tipo: 'raccomandazione',
      icona: '📌',
      testo: `Da fare (${nomePeriodo(n.ricordaDal!).split(' ')[0]}): ${riassunto(n)}`,
      percorso: `/quaderno/${n.id}`,
    })
  }

  // 2. Le scadenze: prima quelle già passate, poi le vicine. Una sola, la più urgente.
  const scadenza = [...avvisi].sort(
    (a, b) => peso(a) - peso(b) || (a.giorniMancanti ?? 0) - (b.giorniMancanti ?? 0),
  )[0]
  if (scadenza && scadenza.gravita !== 'ok') {
    righe.push({
      tipo: 'scadenza',
      icona: scadenza.gravita === 'scaduto' ? '❗' : '⚠️',
      testo: `${scadenza.titolo} — ${scadenza.dettaglio.toLowerCase()}`,
      percorso: scadenza.percorso ?? '/avvisi',
    })
  }

  // 3. Un anno fa: la nota più vicina a questa data, l'anno scorso, entro una settimana.
  const annoFa = unAnnoFa(vive, oggi)
  if (annoFa) {
    righe.push({
      tipo: 'anno-fa',
      icona: '🕰️',
      testo: `Un anno fa${annoFa.campoNome ? `, ${annoFa.campoNome}` : ''}: ${riassunto(annoFa)}`,
      percorso: `/quaderno/${annoFa.id}`,
    })
  }

  return righe.slice(0, MASSIMO)
}

/** La nota dell'anno scorso più vicina a oggi, entro sette giorni. Solo note, non raccomandazioni. */
export function unAnnoFa(note: Nota[], oggi: Giorno): Nota | undefined {
  const [a, m, g] = oggi.split('-').map(Number)
  const riferimento = Date.UTC(a - 1, m - 1, g)
  const GIORNO = 86_400_000

  let migliore: { nota: Nota; distanza: number } | undefined
  for (const n of note) {
    if (eRaccomandazione(n) || n.annullatoIl) continue
    const [na, nm, ng] = n.dataFatto.split('-').map(Number)
    const distanza = Math.abs(Date.UTC(na, nm - 1, ng) - riferimento) / GIORNO
    if (distanza <= 7 && (!migliore || distanza < migliore.distanza)) migliore = { nota: n, distanza }
  }
  return migliore?.nota
}

/**
 * Le raccomandazioni ancora da fare su un campo: tornano utili quando ci si
 * scrive una nota sopra ("sulla Marcita avevi segnato: argine da rialzare").
 */
export function raccomandazioniSulCampo(note: Nota[], nomeCampo: string): Nota[] {
  const nome = nomeCampo.trim().toLowerCase()
  if (!nome) return []
  return note.filter(
    (n) =>
      !n.annullatoIl &&
      eRaccomandazione(n) &&
      !n.fattaIl &&
      (n.campoNome ?? n.scheda?.campoNome ?? '').toLowerCase() === nome,
  )
}

function peso(a: Avviso): number {
  return a.gravita === 'scaduto' ? 0 : a.gravita === 'in_scadenza' ? 1 : 2
}

/** La prima frase della nota, accorciata: in una riga ci deve stare. */
function riassunto(n: Nota): string {
  const prima = n.testo.split(/(?<=[.!?])\s/)[0].trim()
  return prima.length > 90 ? `${prima.slice(0, 87).trimEnd()}…` : prima
}
