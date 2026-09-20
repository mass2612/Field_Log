import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda } from '../../core/domain/types'
import { db, oggi } from '../../core/db/db'
import { annataCorrente, mappaProdotti } from '../../core/db/query'
import { statoCarenzaCampo } from '../../core/rules/carenza'
import { testoNota } from '../../packs/it/registro'
import { riassumiSettaggi, schemaPer } from '../../core/domain/settaggi'
import { fmtData, fmtNumero, t } from '../../core/i18n'

const ETICHETTE_TIPO: Record<string, string> = {
  trattamento: 'Trattamento',
  fertilizzazione: 'Concimazione',
  irrigazione: 'Irrigazione',
  semina: 'Semina',
  lavorazione: 'Lavorazione',
  raccolta: 'Raccolta',
  osservazione: 'Nota',
}

export default function DettaglioCampo({ azienda }: { azienda: Azienda }) {
  const { campoId } = useParams<{ campoId: string }>()

  const dati = useLiveQuery(async () => {
    if (!campoId) return null
    const campo = await db.campi.get(campoId)
    if (!campo) return null

    const [colture, interventi, prodotti, operatori, attrezzi] = await Promise.all([
      db.colture.where('campoId').equals(campoId).toArray(),
      db.interventi.where('campoId').equals(campoId).toArray(),
      mappaProdotti(azienda.id),
      db.operatori.where('aziendaId').equals(azienda.id).toArray(),
      db.attrezzi.where('aziendaId').equals(azienda.id).toArray(),
    ])

    return {
      campo,
      colture: colture.sort((a, b) => b.annata - a.annata),
      interventi: interventi
        .filter((i) => !i.annullatoIl)
        .sort((a, b) => b.data.localeCompare(a.data)),
      prodotti,
      operatori: new Map(operatori.map((o) => [o.id, o])),
      attrezzi: new Map(attrezzi.map((a) => [a.id, a])),
      carenza: statoCarenzaCampo(interventi, prodotti, oggi()),
    }
  }, [campoId, azienda.id])

  if (dati === undefined) return <p>Carico…</p>
  if (dati === null) return <p>Campo non trovato.</p>

  const { campo, colture, interventi, prodotti, operatori, attrezzi, carenza } = dati
  const colturaCorrente = colture.find((c) => c.annata === annataCorrente())

  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>{campo.nome}</h2>
      <p className="aiuto" style={{ marginTop: 0 }}>
        {fmtNumero(campo.superficieHa)} ha
        {colturaCorrente ? ` · ${colturaCorrente.specie}` : ''}
        {colturaCorrente?.varieta ? ` (${colturaCorrente.varieta})` : ''}
      </p>

      {/* Il primo dato che deve saltare all'occhio. */}
      {carenza.bloccata ? (
        <div className="fascia-carenza carenza-bloccata">
          ⛔ {t('campi.raccoltaConsentitaDal')} <strong>{fmtData(carenza.dal)}</strong>
          <div style={{ fontWeight: 400, marginTop: 4 }}>
            Mancano {carenza.giorniMancanti} giorni
            {carenza.prodottoVincolante ? ` — vincolo di ${carenza.prodottoVincolante}` : ''}
          </div>
        </div>
      ) : (
        <div className="fascia-carenza carenza-libera">✅ {t('campi.raccoltaLibera')}</div>
      )}

      {carenza.incompleto && (
        <div className="fascia-carenza carenza-incompleta">
          ⚠️ {t('campi.carenzaIncompleta')}. Il calcolo qui sopra potrebbe non essere completo.
        </div>
      )}

      <Link
        to={`/registra?campo=${campo.id}&tipo=trattamento`}
        className="pulsante pulsante-principale"
      >
        ➕ Registra un intervento
      </Link>

      <h2 className="titolo-sezione">{t('campi.storico')}</h2>
      {interventi.length === 0 ? (
        <p className="aiuto">Nessun intervento registrato su questo campo.</p>
      ) : (
        interventi.map((i) => (
          <div key={i.id} className="scheda">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{ETICHETTE_TIPO[i.tipo] ?? i.tipo}</strong>
              <span style={{ color: 'var(--testo-tenue)' }}>{fmtData(i.data)}</span>
            </div>

            {i.righe.map((r, idx) => (
              <div key={idx} className="riga-dato">
                <span className="etichetta">
                  {prodotti.get(r.prodottoId)?.nome ?? 'prodotto sconosciuto'}
                  {r.avversita ? ` · ${r.avversita}` : ''}
                </span>
                <span className="valore">
                  {fmtNumero(r.quantita)} {r.unitaMisura}
                </span>
              </div>
            ))}

            {i.raccolta?.quantita != null && (
              <div className="riga-dato">
                <span className="etichetta">Resa</span>
                <span className="valore">
                  {fmtNumero(i.raccolta.quantita)} {i.raccolta.unitaMisura ?? ''}
                  {i.raccolta.resaPerHa ? ` (${fmtNumero(i.raccolta.resaPerHa)}/ha)` : ''}
                </span>
              </div>
            )}

            {/* I settaggi: il motivo per cui l'anno prossimo questo quaderno serve. */}
            {i.settaggi && Object.keys(i.settaggi).length > 0 && (
              <p className="aiuto">
                ⚙️ {riassumiSettaggi(i.settaggi, schemaPer(i.tipo, attrezzi.get(i.attrezzoId ?? '')?.tipo))}
              </p>
            )}

            {testoNota(i) && <p className="aiuto">🗒️ {testoNota(i)}</p>}

            <p className="aiuto">
              {i.operatoreId
                ? `${operatori.get(i.operatoreId)?.nome ?? ''} ${operatori.get(i.operatoreId)?.cognome ?? ''}`
                : 'operatore non indicato'}
              {i.origineCampo === 'gps' ? ' · 📍 campo rilevato da GPS' : ''}
              {i.notaVocale?.statoTrascrizione === 'in_coda_server'
                ? ' · 🎙️ trascrizione in coda'
                : ''}
            </p>

            <Link to={`/interventi/${i.id}/correggi`} className="link-testo">
              Correggi
            </Link>
          </div>
        ))
      )}

      {colture.length > 1 && (
        <>
          <h2 className="titolo-sezione">Annate precedenti</h2>
          {colture.map((c) => (
            <div key={c.id} className="riga-dato">
              <span className="etichetta">{c.annata}</span>
              <span className="valore">
                {c.specie}
                {c.varieta ? ` — ${c.varieta}` : ''}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )
}
