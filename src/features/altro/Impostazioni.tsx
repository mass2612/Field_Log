import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import type { Azienda } from '../../core/domain/types'
import { db, oggi } from '../../core/db/db'
import { modificaTracciata } from '../../core/db/db'
import { leggiPosizione } from '../../core/rules/posizione'
import { righeAnalisiGestionale } from '../../packs/it/registro'
import { scaricaCsv, scaricaJson, toCsv } from '../../core/export/csv'
import { giacenzePerLotto } from '../../core/db/query'
import { LINGUE, getLingua, impostaLingua, t, type Lingua } from '../../core/i18n'
import { caricaDatiDimostrativi } from '../../core/db/dimostrativo'
import { contaRighe, eliminaDatiDimostrativi, svuotaTutto } from '../../core/db/pulizia'

export default function Impostazioni({ azienda }: { azienda: Azienda }) {
  const [nome, setNome] = useState(azienda.nome)
  const [lingua, setLingua] = useState<Lingua>(getLingua())
  const [messaggio, setMessaggio] = useState<string | null>(null)

  async function salvaNome() {
    if (nome.trim() && nome !== azienda.nome) {
      await modificaTracciata(db.aziende, 'aziende', azienda.id, { nome: nome.trim() })
      setMessaggio('Nome aggiornato.')
    }
  }

  /** Export gestionale: il foglio su cui si ragiona a dicembre. */
  async function esportaAnalisi() {
    const [interventi, campi, colture, prodotti, operatori, attrezzi, lotti] = await Promise.all([
      db.interventi.where('aziendaId').equals(azienda.id).toArray(),
      db.campi.where('aziendaId').equals(azienda.id).toArray(),
      db.colture.toArray(),
      db.prodotti.where('aziendaId').equals(azienda.id).toArray(),
      db.operatori.where('aziendaId').equals(azienda.id).toArray(),
      db.attrezzi.where('aziendaId').equals(azienda.id).toArray(),
      db.lotti.where('aziendaId').equals(azienda.id).toArray(),
    ])

    // Costo medio ponderato per prodotto, dai prezzi di acquisto dei lotti.
    const costi = new Map<string, number>()
    for (const lotto of lotti) {
      if (lotto.prezzoUnitario == null) continue
      const attuale = costi.get(lotto.prodottoId)
      costi.set(
        lotto.prodottoId,
        attuale == null ? lotto.prezzoUnitario : (attuale + lotto.prezzoUnitario) / 2,
      )
    }

    const righe = righeAnalisiGestionale(
      interventi.filter((i) => !i.annullatoIl),
      {
        campi: new Map(campi.map((c) => [c.id, c])),
        colture: new Map(colture.map((c) => [c.id, c])),
        prodotti: new Map(prodotti.map((p) => [p.id, p])),
        operatori: new Map(operatori.map((o) => [o.id, o])),
        attrezzi: new Map(attrezzi.map((a) => [a.id, a])),
      },
      costi,
    )

    scaricaCsv(`analisi-gestionale-${oggi()}.csv`, toCsv(righe))
  }

  /**
   * Export integrale. I dati sono dell'agricoltore: deve poterli portare via
   * per intero, in un formato leggibile, senza chiedere permesso a nessuno.
   */
  async function esportaTutto() {
    /*
     * Si scorrono le tabelle del database invece di elencarle a mano.
     *
     * La versione precedente le elencava una per una e **si era dimenticata le
     * note** — cioè proprio il dato principale dell'app. Chi avesse salvato una
     * copia prima di svuotare avrebbe perso tutto il quaderno. Elencare a mano
     * un insieme che cresce è un errore che si ripete: meglio chiederlo al
     * database, che le sa sempre tutte.
     */
    const contenuto: Record<string, unknown[]> = {}

    for (const tabella of db.tables) {
      // Le foto e gli audio restano fuori: in JSON non ci stanno, e
      // gonfierebbero il file fino a renderlo inapribile.
      if (tabella.name === 'allegati') continue
      contenuto[tabella.name] = await tabella.toArray()
    }

    scaricaJson(`quaderno-completo-${oggi()}.json`, {
      esportatoIl: new Date().toISOString(),
      versioneFormato: 2,
      avvertenza: 'Foto e audio non sono inclusi: restano nel dispositivo.',
      ...contenuto,
    })
  }

  async function esportaMagazzino() {
    const [prodotti, lotti, giacenze] = await Promise.all([
      db.prodotti.where('aziendaId').equals(azienda.id).toArray(),
      db.lotti.where('aziendaId').equals(azienda.id).toArray(),
      giacenzePerLotto(azienda.id),
    ])
    const mappa = new Map(prodotti.map((p) => [p.id, p]))

    scaricaCsv(
      `magazzino-${oggi()}.csv`,
      toCsv(
        lotti.map((l) => ({
          Prodotto: mappa.get(l.prodottoId)?.nome ?? '',
          'N. registrazione': mappa.get(l.prodottoId)?.numeroRegistrazione ?? '',
          Lotto: l.codiceLotto ?? '',
          Scadenza: l.scadenza ?? '',
          Giacenza: giacenze.get(l.id) ?? 0,
          'Unità': mappa.get(l.prodottoId)?.unitaMisura ?? '',
          'Prezzo unitario': l.prezzoUnitario ?? '',
        })),
      ),
    )
  }

  return (
    <>
      {/* In cima quello che serve all'agricoltore, non quello che serve all'ispettore. */}
      <Link to="/confronto" className="scheda scheda-cliccabile">
        <strong style={{ fontSize: 18 }}>📈 Confronto fra annate</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          Quanto hai messo, quanto è sceso davvero, quanto hai raccolto
        </p>
      </Link>

      <Link to="/ispezione" className="scheda scheda-cliccabile">
        <strong style={{ fontSize: 18 }}>🛡️ {t('ispezione.titolo')}</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          {t('ispezione.sottotitolo')}
        </p>
      </Link>

      <Link to="/anagrafiche" className="scheda scheda-cliccabile">
        <strong style={{ fontSize: 18 }}>👥 Anagrafiche</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          Operatori, attrezzi, patentini e scadenze
        </p>
      </Link>

      <Link to="/avvisi" className="scheda scheda-cliccabile">
        <strong style={{ fontSize: 18 }}>⚠️ {t('scadenze.titolo')}</strong>
      </Link>

      <h2 className="titolo-sezione">Esportazioni</h2>
      <div className="pila">
        <button className="pulsante-secondario" onClick={() => void esportaAnalisi()}>
          📊 Analisi gestionale (CSV)
        </button>
        <button className="pulsante-secondario" onClick={() => void esportaMagazzino()}>
          📦 Magazzino (CSV)
        </button>
        <button className="pulsante-secondario" onClick={() => void esportaTutto()}>
          💾 Tutti i dati (JSON)
        </button>
      </div>
      <p className="aiuto">
        I file si aprono con qualunque foglio di calcolo. L’esportazione integrale contiene tutto
        il quaderno: i dati sono tuoi e devi poterli portare via.
      </p>

      <h2 className="titolo-sezione">Azienda</h2>
      <div className="scheda">
        <div className="gruppo-campo">
          <label htmlFor="an">Nome dell’azienda</label>
          <input
            id="an"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => void salvaNome()}
          />
        </div>

        {/* Una volta sola, e non se ne parla più. Non serve a sapere in che
            campo sei — serve a sapere che tempo fa qui. */}
        <div className="gruppo-campo">
          <label>Dov’è l’azienda</label>
          <button
            className="pulsante-secondario"
            onClick={async () => {
              try {
                const posizione = await leggiPosizione()
                await modificaTracciata(db.aziende, 'aziende', azienda.id, { posizione })
                setMessaggio('Posizione salvata: da adesso registro il tempo di qui.')
              } catch {
                setMessaggio('Non riesco a leggere la posizione.')
              }
            }}
          >
            📍{' '}
            {azienda.posizione
              ? `Segnata (${azienda.posizione.lat.toFixed(3)}, ${azienda.posizione.lon.toFixed(3)})`
              : 'Segna dove sei adesso'}
          </button>
          <p className="aiuto">
            Serve solo al meteo: temperatura e pioggia, registrate ogni giorno da sole. Sono i
            dati che fra due anni spiegano l’annata. Nessun tracciamento, mai.
          </p>
        </div>

        <div className="gruppo-campo">
          <label htmlFor="lingua">Lingua</label>
          <select
            id="lingua"
            value={lingua}
            onChange={(e) => {
              const nuova = e.target.value as Lingua
              setLingua(nuova)
              impostaLingua(nuova)
              location.reload()
            }}
          >
            {Object.entries(LINGUE).map(([codice, etichetta]) => (
              <option key={codice} value={codice}>
                {etichetta}
              </option>
            ))}
          </select>
          <p className="aiuto">
            Italiano e inglese sono pronti. Le altre lingue ricadono sull’italiano finché non
            vengono tradotte.
          </p>
        </div>
      </div>

      <h2 className="titolo-sezione">Prova</h2>
      <Link to="/prova-lettura" className="scheda scheda-cliccabile">
        <strong style={{ fontSize: 18 }}>🔬 Banco di prova della lettura</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          Fotografa una fattura e guarda cosa ne ricava
        </p>
      </Link>
      <button
        className="pulsante-secondario"
        onClick={async () => {
          await caricaDatiDimostrativi(azienda.id)
          setMessaggio('Dati dimostrativi caricati.')
        }}
      >
        🌱 Carica dati dimostrativi
      </button>
      <p className="aiuto">
        Crea due campi, qualche prodotto, un patentino in scadenza e alcuni interventi, per vedere
        subito come si comporta l’app.
      </p>

      {messaggio && <p className="aiuto" style={{ color: 'var(--verde)' }}>{messaggio}</p>}

      <FarePiazzaPulita onEsporta={() => void esportaTutto()} />
    </>
  )
}

/**
 * Il passaggio dalla prova all'uso vero.
 *
 * Un quaderno vero che si porta dietro la "Vigna sotto casa" inventata in fase
 * di prova non è un quaderno di cui ci si fida — e davanti a un controllo è
 * peggio che inutile. Quindi due comandi distinti: togliere solo il finto, o
 * ripartire da zero.
 */
function FarePiazzaPulita({ onEsporta }: { onEsporta: () => void }) {
  const [conferma, setConferma] = useState<'niente' | 'dimostrativi' | 'tutto'>('niente')
  const [esito, setEsito] = useState<string | null>(null)

  const conteggi = useLiveQuery(() => contaRighe(), [])
  const dimostrativi = (conteggi ?? []).reduce((s, c) => s + c.dimostrativi, 0)
  const totali = (conteggi ?? []).reduce((s, c) => s + c.totali, 0)

  return (
    <>
      <h2 className="titolo-sezione">Quando si comincia sul serio</h2>

      <div className="scheda">
        <p className="aiuto" style={{ marginTop: 0 }}>
          Nel telefono ci sono <strong>{totali}</strong> righe, di cui{' '}
          <strong>{dimostrativi}</strong> nate dai dati dimostrativi. I dati stanno solo qui:
          svuotare non tocca nessun altro telefono.
        </p>

        {esito && <p className="aiuto" style={{ color: 'var(--verde)' }}>{esito}</p>}

        {conferma === 'niente' && (
          <div className="pila">
            <button
              className="pulsante-secondario"
              onClick={() => setConferma('dimostrativi')}
              disabled={dimostrativi === 0}
            >
              🧹 Togli solo i dati dimostrativi ({dimostrativi})
            </button>
            <button className="pulsante-pericolo" onClick={() => setConferma('tutto')}>
              🗑️ Svuota tutto il quaderno
            </button>
          </div>
        )}

        {conferma !== 'niente' && (
          <div className="rilievo rilievo-blocco">
            <strong>
              {conferma === 'tutto'
                ? `Cancello tutte le ${totali} righe, foto e audio compresi. Non si torna indietro.`
                : `Tolgo le ${dimostrativi} righe dimostrative. Quello che hai scritto tu resta.`}
            </strong>
            <small>Se non sei sicuro, salva prima una copia di tutto.</small>

            <div className="pila" style={{ marginTop: 12 }}>
              <button className="pulsante-secondario" onClick={onEsporta}>
                💾 Prima salvo una copia
              </button>
              <button
                className="pulsante-pericolo"
                onClick={async () => {
                  if (conferma === 'tutto') {
                    await svuotaTutto()
                    location.reload()
                  } else {
                    const quante = await eliminaDatiDimostrativi()
                    setEsito(`Tolte ${quante} righe dimostrative.`)
                    setConferma('niente')
                  }
                }}
              >
                Sì, procedi
              </button>
              <button className="pulsante-secondario" onClick={() => setConferma('niente')}>
                Lascia stare
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="aiuto">
        Per provare la lettura delle fatture usa il <strong>banco di prova</strong>: legge e
        mostra il risultato, ma <strong>non salva niente</strong>. Così puoi fare tutte le prove
        che vuoi senza sporcare il quaderno.
      </p>
    </>
  )
}
