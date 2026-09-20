import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import { argomentoDi } from '../../core/domain/note'
import { db, oggi } from '../../core/db/db'
import { campiDalleNote } from '../../core/db/note'
import { mappaProdotti } from '../../core/db/query'
import { statoCarenzaCampo } from '../../core/rules/carenza'
import { fmtData, fmtNumero } from '../../core/i18n'

/**
 * I campi.
 *
 * **Non c'è un'anagrafica da compilare.** I campi nascono dalle note: scrivi
 * "vigna sotto casa" e da quel momento quel campo esiste, con il suo storico.
 * Registrarlo per bene — ettari, particelle — serve solo quando si vuole il
 * confronto fra annate, ed è un passo in più, non un dazio d'ingresso.
 */
export default function Campi({ azienda }: { azienda: Azienda }) {
  const { nomeCampo } = useParams<{ nomeCampo: string }>()
  const filtro = nomeCampo ? decodeURIComponent(nomeCampo) : undefined

  const dati = useLiveQuery(async () => {
    const [note, campi, interventi, prodotti] = await Promise.all([
      db.note.where('aziendaId').equals(azienda.id).toArray(),
      db.campi.where('aziendaId').equals(azienda.id).toArray(),
      db.interventi.where('aziendaId').equals(azienda.id).toArray(),
      mappaProdotti(azienda.id),
    ])

    const vive = note.filter((n) => !n.annullatoIl)

    return {
      elenco: campiDalleNote(vive, campi),
      note: vive,
      carenzaPerCampo: new Map(
        campi.map((c) => [
          c.nome.toLowerCase(),
          statoCarenzaCampo(
            interventi.filter((i) => i.campoId === c.id),
            prodotti,
            oggi(),
          ),
        ]),
      ),
    }
  }, [azienda.id])

  if (!dati) return <p>Carico…</p>

  if (filtro) {
    const note = dati.note
      .filter((n) => n.campoNome?.toLowerCase() === filtro.toLowerCase())
      .sort((a, b) => b.dataFatto.localeCompare(a.dataFatto))

    return (
      <>
        <h2 style={{ margin: '0 0 14px' }}>{filtro}</h2>
        {note.length === 0 ? (
          <p className="aiuto">Nessuna nota su questo campo.</p>
        ) : (
          note.map((n) => (
            <Link key={n.id} to={`/quaderno/${n.id}`} className="scheda scheda-cliccabile nota">
              <div className="nota-intestazione">
                <span className="nota-data">{fmtData(n.dataFatto)}</span>
              </div>
              <p className="nota-testo">{n.testo}</p>
            </Link>
          ))
        )}
        <Link
          to={`/quaderno/scrivi?campo=${encodeURIComponent(filtro)}`}
          className="pulsante pulsante-principale"
          style={{ marginTop: 14 }}
        >
          ✏️ Scrivi su questo campo
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="azioni-pagina">
        <Link to="/confronto" className="pulsante pulsante-principale">
          📈 Confronta le annate
        </Link>
        <Link to="/campi/nuovo" className="pulsante pulsante-secondario" style={{ maxWidth: 160 }}>
          ➕ Registra
        </Link>
      </div>

      {dati.elenco.length === 0 ? (
        <div className="elenco-vuoto">
          <span className="icona" aria-hidden>
            🗺️
          </span>
          Ancora nessun campo.
          <p className="aiuto">
            Non devi compilare niente: scrivi una nota e indica il campo, e comparirà qui da solo.
          </p>
        </div>
      ) : (
        dati.elenco.map((campo) => {
          const carenza = dati.carenzaPerCampo.get(campo.nome.toLowerCase())
          return (
            <Link
              key={campo.nome}
              to={
                campo.campoId
                  ? `/campi/${campo.campoId}`
                  : `/campi/nome/${encodeURIComponent(campo.nome)}`
              }
              className="scheda scheda-cliccabile"
            >
              <div className="nota-intestazione">
                <strong style={{ fontSize: 18 }}>{campo.nome}</strong>
                {campo.superficieHa != null && (
                  <span style={{ color: 'var(--testo-tenue)' }}>
                    {fmtNumero(campo.superficieHa)} ha
                  </span>
                )}
              </div>

              <p className="aiuto" style={{ marginTop: 4 }}>
                {campo.numeroNote > 0
                  ? `${campo.numeroNote} note · ultima ${fmtData(campo.ultimaNota)}`
                  : 'registrato, ancora senza note'}
                {campo.superficieHa == null && ' · ettari non indicati'}
              </p>

              {campo.argomenti.size > 0 && (
                <div className="nota-piede">
                  {[...campo.argomenti].map((chiave) => {
                    const a = argomentoDi(chiave)
                    return a ? <span key={chiave}>{a.icona}</span> : null
                  })}
                </div>
              )}

              {carenza?.bloccata && (
                <div style={{ marginTop: 10, color: 'var(--rosso)', fontWeight: 650 }}>
                  ⛔ Raccolta consentita dal {fmtData(carenza.dal)}
                </div>
              )}
            </Link>
          )
        })
      )}
    </>
  )
}
