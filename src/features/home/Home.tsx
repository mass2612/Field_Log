import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import type { Avviso } from '../../core/rules/scadenze'
import { db, oggi } from '../../core/db/db'
import { campiDalleNote } from '../../core/db/note'
import { giacenzePerProdotto } from '../../core/db/query'
import { differenzaGiorni } from '../../core/rules/carenza'
import { fmtNumero } from '../../core/i18n'

/**
 * La home: quattro bottoni grossi, in colonna.
 *
 * Ogni bottone porta con sé **cosa sta succedendo lì dentro**, e si colora da
 * solo quando c'è qualcosa che non va. Così il punto esclamativo non dice solo
 * *che* c'è un problema: si vede subito *dove*. Per un anziano vale più di una
 * campanella in alto che apre un elenco.
 */
export default function Home({ azienda, avvisi }: { azienda: Azienda; avvisi: Avviso[] }) {
  const stato = useLiveQuery(async () => {
    const [note, campi, giacenze, documenti] = await Promise.all([
      db.note.where('aziendaId').equals(azienda.id).toArray(),
      db.campi.where('aziendaId').equals(azienda.id).toArray(),
      giacenzePerProdotto(azienda.id),
      db.documenti.where('aziendaId').equals(azienda.id).toArray(),
    ])

    const vive = note.filter((n) => !n.annullatoIl)
    const ultima = vive
      .map((n) => n.dataFatto)
      .sort()
      .pop()

    return {
      numeroNote: vive.length,
      ultimaNota: ultima,
      numeroCampi: campiDalleNote(vive, campi).length,
      prodottiConGiacenza: [...giacenze.values()].filter((q) => q > 0).length,
      numeroDocumenti: documenti.filter((d) => !d.annullatoIl).length,
    }
  }, [azienda.id])

  const avvisiDocumenti = avvisi.filter((a) => a.id.startsWith('documento:'))
  const avvisiMagazzino = avvisi.filter((a) => !a.id.startsWith('documento:'))

  return (
    <div className="piastrelle">
      <Piastrella
        a="/quaderno"
        icona="📓"
        titolo="Quaderno di campagna"
        descrizione="Scrivi cosa hai fatto"
        stato={
          stato
            ? stato.numeroNote === 0
              ? 'nessuna nota — comincia da qui'
              : `${stato.numeroNote} note · ultima ${quando(stato.ultimaNota)}`
            : undefined
        }
      />

      <Piastrella
        a="/documenti"
        icona="📄"
        titolo="Documenti"
        descrizione="Fatture, patentini, certificati"
        stato={
          avvisiDocumenti.length > 0
            ? avvisiDocumenti[0].titolo + ' — ' + avvisiDocumenti[0].dettaglio.toLowerCase()
            : stato
              ? `${stato.numeroDocumenti} archiviati`
              : undefined
        }
        allarme={avvisiDocumenti[0]?.gravita}
      />

      <Piastrella
        a="/magazzino"
        icona="📦"
        titolo="Magazzino"
        descrizione="Quello che ti resta"
        stato={
          avvisiMagazzino.length > 0
            ? avvisiMagazzino[0].titolo + ' — ' + avvisiMagazzino[0].dettaglio.toLowerCase()
            : stato
              ? `${stato.prodottiConGiacenza} prodotti in casa`
              : undefined
        }
        allarme={avvisiMagazzino[0]?.gravita}
      />

      <Piastrella
        a="/campi"
        icona="🗺️"
        titolo="Campi"
        descrizione="Come è andata, annata per annata"
        stato={
          stato
            ? stato.numeroCampi === 0
              ? 'nascono da soli quando li nomini in una nota'
              : `${stato.numeroCampi} campi`
            : undefined
        }
      />
    </div>
  )
}

function Piastrella({
  a,
  icona,
  titolo,
  descrizione,
  stato,
  allarme,
}: {
  a: string
  icona: string
  titolo: string
  descrizione: string
  stato?: string
  allarme?: 'scaduto' | 'in_scadenza' | 'ok'
}) {
  const classeAllarme =
    allarme === 'scaduto' ? 'piastrella-rossa' : allarme === 'in_scadenza' ? 'piastrella-gialla' : ''

  return (
    <Link to={a} className={`piastrella ${classeAllarme}`}>
      <span className="piastrella-icona" aria-hidden>
        {icona}
      </span>
      <span className="piastrella-testo">
        <span className="piastrella-titolo">{titolo}</span>
        <span className="piastrella-descrizione">{descrizione}</span>
        {stato && (
          <span className="piastrella-stato">
            {allarme === 'scaduto' ? '❗ ' : allarme === 'in_scadenza' ? '⚠️ ' : ''}
            {stato}
          </span>
        )}
      </span>
    </Link>
  )
}

function quando(giorno?: string): string {
  if (!giorno) return '—'
  const differenza = differenzaGiorni(giorno, oggi())
  if (differenza === 0) return 'oggi'
  if (differenza === 1) return 'ieri'
  if (differenza < 7) return `${differenza} giorni fa`
  if (differenza < 60) return `${fmtNumero(Math.round(differenza / 7), 0)} settimane fa`
  return `${fmtNumero(Math.round(differenza / 30), 0)} mesi fa`
}
