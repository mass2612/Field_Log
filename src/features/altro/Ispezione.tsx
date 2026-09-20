import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import { db, oggi } from '../../core/db/db'
import { PACCHETTO_IT, righeRegistroTrattamenti } from '../../packs/it/registro'
import { scaricaCsv, toCsv } from '../../core/export/csv'
import { aggiungiGiorni } from '../../core/rules/carenza'
import { fmtData, t } from '../../core/i18n'

/**
 * Modalità controllo.
 *
 * Deve funzionare col telefono in mano, davanti a un ispettore, senza rete e
 * senza chiedere niente a nessuno. Per questo legge solo dal database locale e
 * non ha nessun passaggio di caricamento.
 */
export default function Ispezione({ azienda }: { azienda: Azienda }) {
  const dati = useLiveQuery(async () => {
    const dal = aggiungiGiorni(oggi(), -365 * PACCHETTO_IT.anniConservazione)

    const [interventi, campi, colture, prodotti, operatori, attrezzi, documenti] =
      await Promise.all([
        db.interventi.where('aziendaId').equals(azienda.id).toArray(),
        db.campi.where('aziendaId').equals(azienda.id).toArray(),
        db.colture.toArray(),
        db.prodotti.where('aziendaId').equals(azienda.id).toArray(),
        db.operatori.where('aziendaId').equals(azienda.id).toArray(),
        db.attrezzi.where('aziendaId').equals(azienda.id).toArray(),
        db.documenti.where('aziendaId').equals(azienda.id).toArray(),
      ])

    const nelPeriodo = interventi.filter((i) => i.data >= dal)

    const righe = righeRegistroTrattamenti(nelPeriodo, {
      campi: new Map(campi.map((c) => [c.id, c])),
      colture: new Map(colture.map((c) => [c.id, c])),
      prodotti: new Map(prodotti.map((p) => [p.id, p])),
      operatori: new Map(operatori.map((o) => [o.id, o])),
      attrezzi: new Map(attrezzi.map((a) => [a.id, a])),
    })

    return { righe, dal, documenti, campi, interventi: nelPeriodo }
  }, [azienda.id])

  if (!dati) return <p>Carico…</p>

  function esporta() {
    if (!dati) return
    scaricaCsv(
      `registro-trattamenti-${azienda.nome.replace(/\W+/g, '-').toLowerCase()}-${oggi()}.csv`,
      toCsv(dati.righe),
    )
  }

  return (
    <>
      <div className="scheda">
        <strong style={{ fontSize: 18 }}>{PACCHETTO_IT.nomeRegistro}</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          {t('ispezione.sottotitolo')}
        </p>
        <div className="riga-dato">
          <span className="etichetta">Periodo</span>
          <span className="valore">
            dal {fmtData(dati.dal)} a oggi ({PACCHETTO_IT.anniConservazione} anni)
          </span>
        </div>
        <div className="riga-dato">
          <span className="etichetta">Interventi registrati</span>
          <span className="valore">{dati.interventi.length}</span>
        </div>
        <div className="riga-dato">
          <span className="etichetta">Righe di registro</span>
          <span className="valore">{dati.righe.length}</span>
        </div>
        <div className="riga-dato">
          <span className="etichetta">Documenti archiviati</span>
          <span className="valore">{dati.documenti.length}</span>
        </div>
      </div>

      <div className="pila">
        <button className="pulsante-principale" onClick={esporta}>
          ⬇️ {t('ispezione.esportaCsv')}
        </button>
        <button className="pulsante-secondario" onClick={() => window.print()}>
          🖨️ Stampa / salva come PDF
        </button>
      </div>

      <h2 className="titolo-sezione">Riferimenti normativi</h2>
      <div className="scheda">
        {PACCHETTO_IT.riferimentiNormativi.map((r) => (
          <div key={r} className="riga-dato">
            <span className="etichetta">{r}</span>
          </div>
        ))}
        <p className="aiuto" style={{ marginTop: 10 }}>
          Da riverificare e aggiornare prima di affidarcisi: la materia cambia spesso e varia da
          regione a regione.
        </p>
      </div>

      <h2 className="titolo-sezione">Anteprima del registro</h2>
      {dati.righe.length === 0 ? (
        <p className="aiuto">Nessun trattamento registrato nel periodo.</p>
      ) : (
        dati.righe.slice(0, 20).map((r, i) => (
          <div key={i} className="scheda">
            <strong>
              {String(r['Data trattamento'])} — {String(r['Prodotto impiegato'] || '—')}
            </strong>
            <div className="riga-dato">
              <span className="etichetta">Campo</span>
              <span className="valore">{String(r['Appezzamento / Campo'] || '—')}</span>
            </div>
            <div className="riga-dato">
              <span className="etichetta">Coltura</span>
              <span className="valore">{String(r['Coltura'] || '—')}</span>
            </div>
            <div className="riga-dato">
              <span className="etichetta">Quantità</span>
              <span className="valore">
                {String(r['Quantità'] ?? '—')} {String(r['Unità di misura'] ?? '')}
              </span>
            </div>
            <div className="riga-dato">
              <span className="etichetta">Operatore</span>
              <span className="valore">{String(r['Operatore'] || '—')}</span>
            </div>
          </div>
        ))
      )}
      {dati.righe.length > 20 && (
        <p className="aiuto">…e altre {dati.righe.length - 20} righe nell’esportazione.</p>
      )}
    </>
  )
}
