import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import { ARGOMENTI, argomentoDi, type Nota } from '../../core/domain/note'
import { db } from '../../core/db/db'
import { cercaNote } from '../../core/db/note'
import { fmtData, fmtIstante } from '../../core/i18n'

/**
 * Il quaderno: le note in ordine di tempo.
 *
 * In cima due bottoni soli — Scrivi e Cerca. "Modifica" non sta qui: sta dentro
 * la nota, perché una modalità di modifica a livello di elenco è un concetto in
 * più da spiegare, e per un anziano è il classico "in che modalità sono?".
 */
export default function Quaderno({ azienda }: { azienda: Azienda }) {
  const [ricerca, setRicerca] = useState('')
  const [ricercaAperta, setRicercaAperta] = useState(false)
  const [argomentoScelto, setArgomentoScelto] = useState<string>('')

  const note = useLiveQuery(async () => {
    const tutte = await db.note.where('aziendaId').equals(azienda.id).toArray()
    return tutte
      .filter((n) => !n.annullatoIl)
      .sort((a, b) => b.dataFatto.localeCompare(a.dataFatto) || b.creatoIl.localeCompare(a.creatoIl))
  }, [azienda.id])

  if (!note) return <p>Carico…</p>

  const conteggi = new Map<string, number>()
  for (const nota of note) {
    for (const argomento of nota.argomenti) {
      conteggi.set(argomento, (conteggi.get(argomento) ?? 0) + 1)
    }
  }

  const filtrate = cercaNote(
    argomentoScelto ? note.filter((n) => n.argomenti.includes(argomentoScelto)) : note,
    ricerca,
  )

  const argomentoAttivo = argomentoScelto ? argomentoDi(argomentoScelto) : undefined

  return (
    <>
      <div className="azioni-pagina">
        <Link to="/quaderno/scrivi" className="pulsante pulsante-principale">
          ✏️ Scrivi
        </Link>
        <button
          className="pulsante-secondario"
          onClick={() => setRicercaAperta(!ricercaAperta)}
          style={{ maxWidth: 140 }}
        >
          🔍 Cerca
        </button>
      </div>

      {ricercaAperta && (
        <input
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca nelle note: rame, vigna, guasto…"
          autoFocus
          style={{ marginBottom: 14 }}
        />
      )}

      {/* Raggruppamenti. "Trattamenti" è uno di questi: stesso posto degli altri,
          conseguenze diverse sotto. */}
      {note.length > 0 && (
        <div className="etichette" style={{ marginBottom: 16 }}>
          <button
            className={`etichetta-scelta ${argomentoScelto === '' ? 'attiva' : ''}`}
            onClick={() => setArgomentoScelto('')}
          >
            Tutte ({note.length})
          </button>
          {ARGOMENTI.filter((a) => conteggi.get(a.chiave)).map((a) => (
            <button
              key={a.chiave}
              className={`etichetta-scelta ${argomentoScelto === a.chiave ? 'attiva' : ''}`}
              onClick={() => setArgomentoScelto(a.chiave)}
            >
              {a.icona} {a.etichetta} ({conteggi.get(a.chiave)})
            </button>
          ))}
        </div>
      )}

      {/* L'unica schermata burocratica dell'app, e si apre solo se la cerchi. */}
      {argomentoAttivo?.legale && (
        <div className="scheda" style={{ borderColor: 'var(--verde)' }}>
          <strong>Questo gruppo serve anche alla legge</strong>
          <p className="aiuto" style={{ marginTop: 6 }}>
            Da queste note esce il registro dei trattamenti. Non devi compilarlo: si forma da solo.
          </p>
          <Link to="/ispezione" className="pulsante pulsante-secondario" style={{ marginTop: 10 }}>
            Vedi ed esporta il registro
          </Link>
        </div>
      )}

      {filtrate.length === 0 ? (
        <div className="elenco-vuoto">
          <span className="icona" aria-hidden>
            📓
          </span>
          {note.length === 0
            ? 'Il quaderno è vuoto. Scrivi la prima nota.'
            : 'Nessuna nota con questi filtri.'}
        </div>
      ) : (
        filtrate.map((nota) => <RigaNota key={nota.id} nota={nota} />)
      )}
    </>
  )
}

function RigaNota({ nota }: { nota: Nota }) {
  const modificata = nota.modificatoIl !== nota.creatoIl

  return (
    <Link to={`/quaderno/${nota.id}`} className="scheda scheda-cliccabile nota">
      <div className="nota-intestazione">
        <span className="nota-data">{fmtData(nota.dataFatto)}</span>
        {nota.campoNome && <span className="etichetta-piccola">{nota.campoNome}</span>}
      </div>

      <p className="nota-testo">{nota.testo}</p>

      <div className="nota-piede">
        {nota.argomenti.map((chiave) => {
          const a = argomentoDi(chiave)
          return a ? <span key={chiave}>{a.icona}</span> : null
        })}
        {nota.daVoce && <span>🎙️</span>}
        {nota.trascrizioneDaRileggere && <span title="da rileggere">✏️</span>}
        {modificata && (
          <span className="nota-modificata">modificato il {fmtIstante(nota.modificatoIl)}</span>
        )}
      </div>
    </Link>
  )
}
