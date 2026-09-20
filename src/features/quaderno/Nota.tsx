import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { argomentoDi } from '../../core/domain/note'
import { annulla, db } from '../../core/db/db'
import { fmtData, fmtIstante } from '../../core/i18n'

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

  return (
    <>
      <div className="nota-intestazione" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 20 }}>{fmtData(nota.dataFatto)}</strong>
        {nota.campoNome && (
          <Link
            to={`/campi/nome/${encodeURIComponent(nota.campoNome)}`}
            className="etichetta-piccola"
          >
            {nota.campoNome}
          </Link>
        )}
      </div>

      <div className="scheda">
        <p className="nota-testo-intero">{nota.testo}</p>
      </div>

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
        <Link to={`/quaderno/${nota.id}/modifica`} className="pulsante pulsante-principale">
          ✏️ Modifica
        </Link>
        <Link to="/quaderno" className="pulsante pulsante-secondario">
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
        Cancella questa nota
      </button>
      <p className="aiuto">
        Sparisce dal quaderno ma resta recuperabile: se ti accorgi dopo che serviva, si ritrova.
      </p>
    </>
  )
}
