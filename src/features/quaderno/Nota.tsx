import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { argomentoDi, eRaccomandazione } from '../../core/domain/note'
import { annulla, db, modificaTracciata } from '../../core/db/db'
import { FotoArchiviate } from '../../ui/foto'
import { fmtData, fmtIstante, fmtScritta } from '../../core/i18n'

/**
 * Una nota aperta.
 *
 * Si legge; per cambiarla c'è **Modifica** qui dentro, non nell'elenco. Delle
 * correzioni si mostra solo "modificato il…", come deve essere: l'elenco dei
 * ripensamenti non interessa a nessuno, tantomeno a chi controlla.
 */
export default function Nota() {
  const { notaId } = useParams<{ notaId: string }>()
  const naviga = useNavigate()

  const nota = useLiveQuery(
    async () => (notaId ? ((await db.note.get(notaId)) ?? null) : null),
    [notaId],
  )

  if (nota === undefined) return <p>Carico…</p>
  if (nota === null) return <p>Nota non trovata.</p>

  const modificata = nota.modificatoIl !== nota.creatoIl
  const prodotti = nota.scheda?.prodotti ?? []
  const raccomandazione = eRaccomandazione(nota)
  const cosa = raccomandazione ? 'raccomandazione' : 'nota'

  return (
    <>
      <div className="nota-intestazione" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 20 }}>
          {fmtData(nota.dataFatto)}{' '}
          <span className="nota-ora">· {fmtScritta(nota.creatoIl, nota.dataFatto)}</span>
        </strong>
        {nota.campoNome && (
          <Link
            to={`/campi/nome/${encodeURIComponent(nota.campoNome)}`}
            className="etichetta-piccola"
          >
            {nota.campoNome}
          </Link>
        )}
      </div>

      {raccomandazione && (
        <div className="rilievo" style={{ borderColor: 'var(--blu)' }}>
          <strong style={{ color: 'var(--blu)' }}>
            📌 Raccomandazione{nota.fattaIl ? ` — fatta il ${fmtIstante(nota.fattaIl)}` : ' — da fare'}
          </strong>
        </div>
      )}

      <div className="scheda">
        <p className="nota-testo-intero">{nota.testo}</p>
      </div>

      {nota.fotoAllegatiId && nota.fotoAllegatiId.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <FotoArchiviate ids={nota.fotoAllegatiId} />
        </div>
      )}

      <div className="etichette">
        {nota.argomenti.map((chiave) => {
          const a = argomentoDi(chiave)
          return a ? (
            <span key={chiave} className="etichetta-scelta attiva">
              {a.icona} {a.etichetta}
            </span>
          ) : null
        })}
      </div>

      {prodotti.length > 0 && (
        <>
          <h2 className="titolo-sezione">Prodotti nominati</h2>
          <div className="scheda">
            {prodotti.map((p, i) => (
              <div key={i} className="riga-dato">
                <span className="etichetta">{p.nome || '(non capito)'}</span>
                <span className="valore">
                  {p.quantita} {p.unitaMisura}
                </span>
              </div>
            ))}
            <p className="aiuto">
              Letti dalla nota. Servono al magazzino e al registro: controllali se non tornano.
            </p>
          </div>
        </>
      )}

      <div className="pila" style={{ marginTop: 18 }}>
        {raccomandazione && (
          <button
            className={nota.fattaIl ? 'pulsante-secondario' : 'pulsante-principale pulsante-raccomandazione'}
            onClick={() =>
              void modificaTracciata(
                db.note,
                'note',
                nota.id,
                { fattaIl: nota.fattaIl ? undefined : new Date().toISOString() },
                { aziendaId: nota.aziendaId },
              )
            }
          >
            {nota.fattaIl ? 'Rimetti fra le cose da fare' : '✓ Fatto'}
          </button>
        )}
        <Link to={`/quaderno/${nota.id}/modifica`} className="pulsante pulsante-principale">
          ✏️ Modifica
        </Link>
        <Link
          to={raccomandazione ? '/quaderno?sezione=raccomandazioni' : '/quaderno'}
          className="pulsante pulsante-secondario"
        >
          Torna al quaderno
        </Link>
      </div>

      <p className="aiuto" style={{ marginTop: 16 }}>
        Scritta il {fmtIstante(nota.creatoIl, true)}
        {modificata && ` · modificato il ${fmtIstante(nota.modificatoIl, true)}`}
      </p>

      <button
        className="pulsante-pericolo"
        style={{ marginTop: 10, width: '100%' }}
        onClick={async () => {
          if (!notaId) return
          await annulla(db.note, 'note', notaId, 'Cancellata dall’utente')
          naviga('/quaderno', { replace: true })
        }}
      >
        Cancella questa {cosa}
      </button>
      <p className="aiuto">
        Sparisce dal quaderno ma resta recuperabile: se ti accorgi dopo che serviva, si ritrova.
      </p>
    </>
  )
}
