import { useState } from 'react'
import { ultimaDettaturaGrezza } from '../../core/voce/registrazione'

/**
 * Cosa ha mandato il telefono nell'ultima dettatura, così com'è arrivato.
 *
 * Non serve all'agricoltore: serve a capire un difetto della voce partendo dai
 * dati veri, invece che da come si immagina che funzioni il telefono. Si copia
 * con un tocco e si incolla a chi deve correggere.
 */
export default function UltimaDettatura() {
  const [aperta, setAperta] = useState(false)
  const [copiata, setCopiata] = useState(false)
  const d = aperta ? ultimaDettaturaGrezza() : null

  const testo = d
    ? [
        `Dettatura del ${new Date(d.quando).toLocaleString('it-IT')}`,
        `Risultato: «${d.risultato}»`,
        d.errore ? `Errore: ${d.errore}` : '',
        ...d.sessioni.map(
          (sessione, i) =>
            `Sessione ${i + 1}:\n` +
            sessione.map((r) => `  ${r.definitivo ? '✔' : '…'} «${r.testo}»`).join('\n'),
        ),
        navigator.userAgent,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div className="scheda">
      <button type="button" className="link-testo" onClick={() => setAperta((a) => !a)}>
        🎙️ Cosa ha mandato il telefono nell’ultima dettatura {aperta ? '▲' : '▼'}
      </button>
      {aperta && !d && <p className="aiuto">Ancora nessuna dettatura su questo telefono.</p>}
      {aperta && d && (
        <>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 13,
              marginTop: 8,
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            {testo}
          </pre>
          <button
            type="button"
            className="pulsante-secondario"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(testo)
                setCopiata(true)
              } catch {
                setCopiata(false)
              }
            }}
          >
            {copiata ? '✓ Copiato' : 'Copia'}
          </button>
        </>
      )}
    </div>
  )
}
