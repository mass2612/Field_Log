import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import type { Avviso } from '../../core/rules/scadenze'
import { db, oggi } from '../../core/db/db'
import { cosaDireOggi } from '../../core/rules/oggi'

/**
 * La scheda "Oggi": l'assistente, ridotto all'osso.
 *
 * Due o tre righe, toccabili, con quello che conta stamattina. Se non c'è
 * niente da dire non compare affatto: meglio uno spazio vuoto che una frase di
 * circostanza che insegna a non leggere. Le regole stanno in
 * `core/rules/oggi.ts`.
 */
export default function Oggi({ azienda, avvisi }: { azienda: Azienda; avvisi: Avviso[] }) {
  const righe = useLiveQuery(async () => {
    const note = await db.note.where('aziendaId').equals(azienda.id).toArray()
    return cosaDireOggi(note, avvisi, oggi())
  }, [azienda.id, avvisi])

  if (!righe || righe.length === 0) return null

  return (
    <div className="scheda oggi">
      <strong className="oggi-titolo">Oggi</strong>
      {righe.map((r) => (
        <Link key={`${r.tipo}-${r.percorso}`} to={r.percorso} className={`oggi-riga oggi-${r.tipo}`}>
          <span aria-hidden className="oggi-icona">
            {r.icona}
          </span>
          <span>{r.testo}</span>
        </Link>
      ))}
    </div>
  )
}
