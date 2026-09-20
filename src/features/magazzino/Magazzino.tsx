import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Azienda,
  ID,
  Lotto,
  MovimentoMagazzino,
  Tracciato,
} from '../../core/domain/types'
import { db, oggi, traccia } from '../../core/db/db'
import { giacenzePerLotto, mappaProdotti } from '../../core/db/query'
import { fmtData, fmtNumero, t } from '../../core/i18n'

export default function Magazzino({ azienda }: { azienda: Azienda }) {
  const [caricoPer, setCaricoPer] = useState<ID | null>(null)

  const dati = useLiveQuery(async () => {
    const [prodotti, lotti, giacenzeLotto] = await Promise.all([
      mappaProdotti(azienda.id),
      db.lotti.where('aziendaId').equals(azienda.id).toArray(),
      giacenzePerLotto(azienda.id),
    ])

    const perProdotto = [...prodotti.values()]
      .filter((p) => !p.annullatoIl)
      .map((prodotto) => {
        const suoi = lotti.filter((l) => l.prodottoId === prodotto.id && !l.annullatoIl)
        return {
          prodotto,
          lotti: suoi.map((l) => ({ lotto: l, giacenza: giacenzeLotto.get(l.id) ?? 0 })),
          totale: suoi.reduce((s, l) => s + (giacenzeLotto.get(l.id) ?? 0), 0),
        }
      })
      .sort((a, b) => a.prodotto.nome.localeCompare(b.prodotto.nome))

    return perProdotto
  }, [azienda.id])

  if (!dati) return <p>Carico…</p>

  return (
    <>
      <div className="scheda">
        <strong>📄 {t('magazzino.caricaFattura')}</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          La lettura automatica della fattura è prevista nella fase 2. Per ora il carico si
          registra a mano, prodotto per prodotto.
        </p>
      </div>

      {dati.length === 0 ? (
        <div className="elenco-vuoto">
          <span className="icona" aria-hidden>
            📦
          </span>
          {t('magazzino.nessunProdotto')}
          <p className="aiuto">
            I prodotti si creano registrando un intervento, oppure caricando una fattura.
          </p>
        </div>
      ) : (
        dati.map(({ prodotto, lotti, totale }) => (
          <div key={prodotto.id} className="scheda">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{prodotto.nome}</strong>
              <span
                style={{
                  fontWeight: 700,
                  color: totale > 0 ? 'var(--verde)' : 'var(--testo-tenue)',
                }}
              >
                {fmtNumero(totale)} {prodotto.unitaMisura}
              </span>
            </div>

            <p className="aiuto">
              {prodotto.tipo}
              {prodotto.numeroRegistrazione ? ` · reg. ${prodotto.numeroRegistrazione}` : ''}
              {prodotto.tempoCarenzaGiorni != null
                ? ` · carenza ${prodotto.tempoCarenzaGiorni} gg`
                : ''}
            </p>

            {lotti.map(({ lotto, giacenza }) => (
              <div key={lotto.id} className="riga-dato">
                <span className="etichetta">
                  Lotto {lotto.codiceLotto ?? 's.n.'}
                  {lotto.scadenza ? ` · scade ${fmtData(lotto.scadenza)}` : ''}
                </span>
                <span className="valore">
                  {fmtNumero(giacenza)} {prodotto.unitaMisura}
                </span>
              </div>
            ))}

            {caricoPer === prodotto.id ? (
              <FormCarico
                aziendaId={azienda.id}
                prodottoId={prodotto.id}
                unita={prodotto.unitaMisura}
                onFatto={() => setCaricoPer(null)}
              />
            ) : (
              <button
                type="button"
                className="pulsante-secondario"
                style={{ marginTop: 10 }}
                onClick={() => setCaricoPer(prodotto.id)}
              >
                ➕ Carico
              </button>
            )}
          </div>
        ))
      )}
    </>
  )
}

/** Carico a magazzino: crea un lotto e il suo movimento in entrata. */
function FormCarico({
  aziendaId,
  prodottoId,
  unita,
  onFatto,
}: {
  aziendaId: ID
  prodottoId: ID
  unita: MovimentoMagazzino['unitaMisura']
  onFatto: () => void
}) {
  const [quantita, setQuantita] = useState('')
  const [codice, setCodice] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [prezzo, setPrezzo] = useState('')

  async function salva() {
    const q = Number(quantita.replace(',', '.'))
    if (!(q > 0)) return

    await db.transaction('rw', [db.lotti, db.movimenti], async () => {
      const lotto = traccia<Omit<Lotto, keyof Tracciato>>({
        aziendaId,
        prodottoId,
        codiceLotto: codice.trim() || undefined,
        scadenza: scadenza || undefined,
        prezzoUnitario: prezzo.trim() ? Number(prezzo.replace(',', '.')) : undefined,
        valuta: 'EUR',
      }) as Lotto
      await db.lotti.add(lotto)

      const movimento = traccia<Omit<MovimentoMagazzino, keyof Tracciato>>({
        aziendaId,
        lottoId: lotto.id,
        data: oggi(),
        quantita: q,
        unitaMisura: unita,
        causale: 'acquisto',
      }) as MovimentoMagazzino
      await db.movimenti.add(movimento)
    })

    onFatto()
  }

  return (
    <div style={{ marginTop: 12, borderTop: '2px solid var(--bordo)', paddingTop: 12 }}>
      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="cq">Quantità ({unita})</label>
          <input
            id="cq"
            inputMode="decimal"
            value={quantita}
            onChange={(e) => setQuantita(e.target.value)}
            autoFocus
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="cp">Prezzo unitario</label>
          <input
            id="cp"
            inputMode="decimal"
            value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)}
            placeholder="€"
          />
        </div>
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="cl">Lotto</label>
          <input id="cl" value={codice} onChange={(e) => setCodice(e.target.value)} />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="cs">Scadenza</label>
          <input
            id="cs"
            type="date"
            value={scadenza}
            onChange={(e) => setScadenza(e.target.value)}
          />
        </div>
      </div>

      <p className="aiuto">
        Il prezzo serve al costo per ettaro: senza, il confronto fra annate resta a metà.
      </p>

      <div className="pila">
        <button className="pulsante-principale" onClick={() => void salva()}>
          {t('comune.salva')}
        </button>
        <button className="pulsante-secondario" onClick={onFatto}>
          {t('comune.annulla')}
        </button>
      </div>
    </div>
  )
}
