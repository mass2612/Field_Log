import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import { db, oggi } from '../../core/db/db'
import { righeQdca, righeQdcaPerCsv, type RigaQdca } from '../../packs/it/qdca'
import { scaricaCsv, toCsv } from '../../core/export/csv'
import { fmtData, fmtNumero } from '../../core/i18n'
import { Link } from 'react-router-dom'

/**
 * L'elenco per il quaderno di campagna digitale (SIAN).
 *
 * Si forma dalle note, da solo. Prima di tutto dice **quanto è pronto**: quante
 * righe sono complete e cosa manca nelle altre. Chi deve caricare i dati sul
 * portale — l'agricoltore o il CAA — vuole sapere questo, non sfogliare righe.
 */
export default function ElencoQdca({ azienda }: { azienda: Azienda }) {
  const [tutte, setTutte] = useState(false)

  const righe = useLiveQuery(async () => {
    const [note, campi, prodotti, documenti] = await Promise.all([
      db.note.where('aziendaId').equals(azienda.id).toArray(),
      db.campi.where('aziendaId').equals(azienda.id).toArray(),
      db.prodotti.where('aziendaId').equals(azienda.id).toArray(),
      db.documenti.where('aziendaId').equals(azienda.id).toArray(),
    ])
    const colture = await db.colture.where('campoId').anyOf(campi.map((c) => c.id)).toArray()
    return righeQdca(note, { campi, colture, prodotti, documenti })
  }, [azienda.id])

  if (!righe) return null

  const complete = righe.filter((r) => r.mancano.length === 0).length
  const conteggioMancanze = new Map<string, number>()
  for (const r of righe) for (const m of r.mancano) conteggioMancanze.set(m, (conteggioMancanze.get(m) ?? 0) + 1)
  const mancanzePrincipali = [...conteggioMancanze.entries()].sort((a, b) => b[1] - a[1])

  const daMostrare = tutte ? righe : righe.slice(0, 10)

  return (
    <>
      <div className="scheda" style={{ borderColor: 'var(--verde)' }}>
        <strong style={{ fontSize: 18 }}>Elenco per il quaderno digitale (SIAN)</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          Trattamenti e concimazioni presi dalle tue note, con i dati che chiedono il regolamento
          europeo e AGEA. Obbligatorio dal 1° gennaio 2027.
        </p>

        {righe.length === 0 ? (
          <p className="aiuto">
            Nessun trattamento né concimazione nelle note. Scrivi una nota come “dato il rame al
            pero” e compare qui.
          </p>
        ) : (
          <>
            <div className="riga-dato">
              <span className="etichetta">Righe</span>
              <span className="valore">{righe.length}</span>
            </div>
            <div className="riga-dato">
              <span className="etichetta">Complete</span>
              <span className="valore">
                {complete} su {righe.length}
              </span>
            </div>

            {mancanzePrincipali.length > 0 && (
              <>
                <p style={{ margin: '12px 0 4px', fontWeight: 700 }}>Cosa manca più spesso</p>
                {mancanzePrincipali.slice(0, 6).map(([cosa, quante]) => (
                  <div key={cosa} className="riga-dato">
                    <span className="etichetta">{cosa}</span>
                    <span className="valore" style={{ color: 'var(--rosso)' }}>
                      in {quante} {quante === 1 ? 'riga' : 'righe'}
                    </span>
                  </div>
                ))}
                {conteggioMancanze.has('aggancio all’appezzamento PAC') && (
                  <p className="aiuto" style={{ marginTop: 8 }}>
                    L’appezzamento PAC si aggancia una volta per campo, dalla scheda del campo in{' '}
                    <Link to="/campi">Campi</Link>.
                  </p>
                )}
              </>
            )}

            <button
              className="pulsante-principale"
              style={{ marginTop: 14 }}
              onClick={() =>
                scaricaCsv(
                  `elenco-qdca-${azienda.nome.replace(/\W+/g, '-').toLowerCase()}-${oggi()}.csv`,
                  toCsv(righeQdcaPerCsv(righe)),
                )
              }
            >
              ⬇️ Scarica l’elenco (foglio di calcolo)
            </button>
          </>
        )}
      </div>

      {daMostrare.map((r, i) => (
        <RigaElenco key={`${r.notaId}-${i}`} riga={r} />
      ))}
      {righe.length > 10 && (
        <button className="pulsante-secondario" onClick={() => setTutte(!tutte)}>
          {tutte ? 'Mostra meno' : `Mostra tutte le ${righe.length} righe`}
        </button>
      )}
    </>
  )
}

function RigaElenco({ riga: r }: { riga: RigaQdca }) {
  const dato = (etichetta: string, valore: string) => (
    <div className="riga-dato">
      <span className="etichetta">{etichetta}</span>
      <span className="valore">{valore || '—'}</span>
    </div>
  )

  return (
    <Link to={`/quaderno/${r.notaId}`} className="scheda scheda-cliccabile">
      <strong>
        {r.tipo === 'Trattamento' ? '💧' : '🌱'} {fmtData(r.data)}
        {r.oraInizio && ` · ore ${r.oraInizio}`} — {r.prodotto || 'prodotto?'}
      </strong>
      {dato('Campo', r.campo + (r.appezzamentoPac ? ` (PAC ${r.appezzamentoPac})` : ''))}
      {dato('Coltura', r.coltura)}
      {dato(
        'Quantità',
        r.quantita != null
          ? `${fmtNumero(r.quantita)} ${r.unitaMisura}` +
              (r.dosePerEttaro != null ? ` · ${fmtNumero(r.dosePerEttaro)} ${r.unitaMisura}/ha` : '')
          : '',
      )}
      {r.tipo === 'Trattamento' && dato('Avversità', r.avversita)}
      {r.tipo === 'Trattamento' && dato('N. autorizzazione', r.numeroAutorizzazione)}
      {r.mancano.length > 0 ? (
        <p className="aiuto" style={{ color: 'var(--rosso)', marginTop: 8 }}>
          Manca: {r.mancano.join(', ')}
        </p>
      ) : (
        <p className="aiuto" style={{ color: 'var(--verde)', marginTop: 8 }}>
          ✓ Completa
        </p>
      )}
    </Link>
  )
}
