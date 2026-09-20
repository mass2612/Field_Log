import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Allegato,
  Azienda,
  Documento,
  ID,
  TipoDocumento,
  Tracciato,
} from '../../core/domain/types'
import { db, modificaTracciata, oggi, traccia } from '../../core/db/db'
import {
  leggiDocumento,
  type CampoEstratto,
  type EsitoOcr,
  type GenereDocumento,
} from '../../core/ocr'
import { fmtData, fmtIstante } from '../../core/i18n'

/**
 * Documenti.
 *
 * L'archivio vero dell'agricoltore è una scatola di scarpe. Qui dentro ci butta
 * tutto — patentini, fatture, certificati — e l'app ne ricava una **scheda**.
 * Stesso gesto della nota vocale: tu butti dentro, la macchina struttura, tu
 * correggi se ha capito male.
 *
 * La lettura avviene **sul telefono**, non su un server: niente costo per foto e
 * nessun documento che esce dall'azienda. In cambio sbaglia più di un servizio
 * a pagamento — e per questo ogni campo dice quanto se ne fida e da quale riga
 * l'ha preso, e resta correggibile.
 */

const TIPI: { valore: TipoDocumento; etichetta: string; icona: string; preavviso?: number }[] = [
  { valore: 'patentino_fitosanitari', etichetta: 'Patentino fitosanitari', icona: '🪪' },
  { valore: 'certificazione', etichetta: 'Patente / abilitazione', icona: '🪪' },
  { valore: 'controllo_funzionale', etichetta: 'Controllo irroratrice', icona: '🔧', preavviso: 90 },
  { valore: 'revisione_macchina', etichetta: 'Revisione macchina', icona: '🚜', preavviso: 60 },
  { valore: 'assicurazione', etichetta: 'Assicurazione', icona: '📋' },
  { valore: 'formazione', etichetta: 'Corso / formazione', icona: '🎓' },
  { valore: 'visita_medica', etichetta: 'Visita medica', icona: '🩺' },
  { valore: 'altro', etichetta: 'Fattura o altro', icona: '🧾' },
]

export default function Documenti({ azienda }: { azienda: Azienda }) {
  const [inserimento, setInserimento] = useState(false)

  const documenti = useLiveQuery(async () => {
    const tutti = await db.documenti.where('aziendaId').equals(azienda.id).toArray()
    return tutti
      .filter((d) => !d.annullatoIl)
      .sort((a, b) => (a.scadeIl ?? '9999').localeCompare(b.scadeIl ?? '9999'))
  }, [azienda.id])

  if (!documenti) return <p>Carico…</p>

  return (
    <>
      <div className="azioni-pagina">
        <button className="pulsante-principale" onClick={() => setInserimento(true)}>
          📷 Fotografa un documento
        </button>
      </div>

      {inserimento && (
        <NuovoDocumento azienda={azienda} onFatto={() => setInserimento(false)} />
      )}

      {documenti.length === 0 && !inserimento ? (
        <div className="elenco-vuoto">
          <span className="icona" aria-hidden>
            📄
          </span>
          Nessun documento.
          <p className="aiuto">
            Fotografa il patentino una volta sola: da lì in poi ti avvisa da solo un mese prima
            della scadenza.
          </p>
        </div>
      ) : (
        documenti.map((d) => <SchedaDocumento key={d.id} documento={d} aziendaId={azienda.id} />)
      )}
    </>
  )
}

/** La scheda ricavata dal documento — sempre correggibile. */
function SchedaDocumento({ documento, aziendaId }: { documento: Documento; aziendaId: ID }) {
  const [apertaModifica, setApertaModifica] = useState(false)
  const [descrizione, setDescrizione] = useState(documento.descrizione)
  const [numero, setNumero] = useState(documento.numero ?? '')
  const [scadenza, setScadenza] = useState(documento.scadeIl ?? '')

  const immagine = useLiveQuery(
    async () => (documento.allegatoId ? await db.allegati.get(documento.allegatoId) : undefined),
    [documento.allegatoId],
  )

  const tipo = TIPI.find((x) => x.valore === documento.tipo)
  const modificato = documento.modificatoIl !== documento.creatoIl

  async function salva() {
    await modificaTracciata(db.documenti, 'documenti', documento.id, {
      descrizione: descrizione.trim(),
      numero: numero.trim() || undefined,
      scadeIl: scadenza || undefined,
    }, { aziendaId })
    setApertaModifica(false)
  }

  return (
    <div className="scheda">
      <div className="nota-intestazione">
        <strong>
          {tipo?.icona} {documento.descrizione}
        </strong>
      </div>

      {immagine?.blob && (
        <img
          src={URL.createObjectURL(immagine.blob)}
          alt={documento.descrizione}
          className="foto-documento"
        />
      )}

      {apertaModifica ? (
        <>
          <div className="gruppo-campo" style={{ marginTop: 12 }}>
            <label htmlFor={`d-${documento.id}`}>Descrizione</label>
            <input
              id={`d-${documento.id}`}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="riga-campi">
            <div className="gruppo-campo">
              <label htmlFor={`n-${documento.id}`}>Numero</label>
              <input
                id={`n-${documento.id}`}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
            <div className="gruppo-campo">
              <label htmlFor={`s-${documento.id}`}>Scade il</label>
              <input
                id={`s-${documento.id}`}
                type="date"
                value={scadenza}
                onChange={(e) => setScadenza(e.target.value)}
              />
            </div>
          </div>
          <div className="pila">
            <button className="pulsante-principale" onClick={() => void salva()}>
              Salva
            </button>
            <button className="pulsante-secondario" onClick={() => setApertaModifica(false)}>
              Lascia stare
            </button>
          </div>
        </>
      ) : (
        <>
          {documento.numero && (
            <div className="riga-dato">
              <span className="etichetta">Numero</span>
              <span className="valore">{documento.numero}</span>
            </div>
          )}
          <div className="riga-dato">
            <span className="etichetta">Scade il</span>
            <span className="valore">{fmtData(documento.scadeIl)}</span>
          </div>

          <button className="link-testo" onClick={() => setApertaModifica(true)}>
            ✏️ Correggi la scheda
          </button>

          {modificato && (
            <p className="aiuto">modificato il {fmtIstante(documento.modificatoIl)}</p>
          )}
        </>
      )}
    </div>
  )
}

function NuovoDocumento({ azienda, onFatto }: { azienda: Azienda; onFatto: () => void }) {
  const [tipo, setTipo] = useState<TipoDocumento>('patentino_fitosanitari')
  const [descrizione, setDescrizione] = useState('')
  const [numero, setNumero] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [foto, setFoto] = useState<File | null>(null)

  const [lettura, setLettura] = useState<EsitoOcr | null>(null)
  const [inLettura, setInLettura] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [erroreLettura, setErroreLettura] = useState<string | null>(null)

  const definizione = TIPI.find((x) => x.valore === tipo)!
  const genere: GenereDocumento = tipo === 'altro' ? 'fattura' : 'scadenza'

  /**
   * Il gesto dell'app: tu butti dentro la foto, la macchina la legge, tu
   * correggi. La scheda si riempie da sola ma **resta tutta modificabile**, e
   * ogni campo dice da quale riga è stato preso.
   */
  async function leggiLaFoto(file: File) {
    setInLettura(true)
    setErroreLettura(null)
    setProgresso(0)

    try {
      const esito = await leggiDocumento(file, genere, {
        oggi: oggi(),
        onProgresso: setProgresso,
      })
      setLettura(esito)

      if (esito.scheda.tipo === 'scadenza') {
        if (esito.scheda.scadeIl) setScadenza(esito.scheda.scadeIl.valore)
        if (esito.scheda.numero) setNumero(esito.scheda.numero.valore)
        if (esito.scheda.intestatario) {
          setDescrizione(`${definizione.etichetta} — ${esito.scheda.intestatario.valore}`)
        }
      } else {
        if (esito.scheda.numero) setNumero(esito.scheda.numero.valore)
        if (esito.scheda.fornitore) {
          setDescrizione(
            `Fattura ${esito.scheda.fornitore.valore}` +
              (esito.scheda.data ? ` del ${fmtData(esito.scheda.data.valore)}` : ''),
          )
        }
      }
    } catch {
      setErroreLettura(
        'Non sono riuscito a leggere la foto. La prima volta serve la rete per scaricare la lingua italiana; poi funziona anche senza.',
      )
    } finally {
      setInLettura(false)
    }
  }

  async function salva() {
    let allegatoId: ID | undefined

    if (foto) {
      const allegato = traccia<Omit<Allegato, keyof Tracciato>>({
        aziendaId: azienda.id,
        nomeFile: foto.name,
        tipoMime: foto.type,
        dimensioneByte: foto.size,
        blob: foto,
      }) as Allegato
      await db.allegati.add(allegato)
      allegatoId = allegato.id
    }

    await db.documenti.add(
      traccia<Omit<Documento, keyof Tracciato>>({
        aziendaId: azienda.id,
        soggetto: { tipo: 'azienda', id: azienda.id },
        tipo,
        descrizione: descrizione.trim() || definizione.etichetta,
        numero: numero.trim() || undefined,
        scadeIl: scadenza || undefined,
        preavvisoGiorni: definizione.preavviso,
        allegatoId,
      }) as Documento,
    )

    onFatto()
  }

  return (
    <div className="scheda">
      <div className="gruppo-campo">
        <label htmlFor="nd-foto">Foto del documento</label>
        <input
          id="nd-foto"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            setFoto(file)
            setLettura(null)
            if (file) void leggiLaFoto(file)
          }}
        />
        <p className="aiuto">
          {foto
            ? `${foto.name} — la foto resta sul telefono`
            : 'La foto resta sul telefono: viene letta qui, non su un server.'}
        </p>
      </div>

      {inLettura && (
        <div className="scheda">
          <strong>🔎 Sto leggendo la foto…</strong>
          <div className="barra-progresso">
            <div style={{ width: `${Math.round(progresso * 100)}%` }} />
          </div>
          <p className="aiuto">
            La prima volta scarica la lingua italiana e ci mette un po’. Dalla seconda è più
            veloce, e funziona anche senza rete.
          </p>
        </div>
      )}

      {erroreLettura && (
        <div className="rilievo rilievo-avviso">
          <strong>⚠️ {erroreLettura}</strong>
          <small>Puoi comunque compilare i campi a mano qui sotto.</small>
        </div>
      )}

      {lettura && <EsitoLettura esito={lettura} />}

      <div className="gruppo-campo">
        <label htmlFor="nd-tipo">Che cos’è</label>
        <select
          id="nd-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoDocumento)}
        >
          {TIPI.map((x) => (
            <option key={x.valore} value={x.valore}>
              {x.icona} {x.etichetta}
            </option>
          ))}
        </select>
      </div>

      <div className="gruppo-campo">
        <label htmlFor="nd-desc">Descrizione</label>
        <input
          id="nd-desc"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder={definizione.etichetta}
        />
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="nd-num">Numero</label>
          <input id="nd-num" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="nd-scad">Scade il</label>
          <input
            id="nd-scad"
            type="date"
            value={scadenza}
            onChange={(e) => setScadenza(e.target.value)}
          />
        </div>
      </div>

      <p className="aiuto">
        Se metti la scadenza, ti avviso un mese prima. E poi te lo ricordo ancora.
      </p>

      <div className="pila">
        <button className="pulsante-principale" onClick={() => void salva()}>
          Salva
        </button>
        <button className="pulsante-secondario" onClick={onFatto}>
          Lascia stare
        </button>
      </div>
    </div>
  )
}

/**
 * Quello che la macchina ha letto, con quanto se ne fida e **da quale riga**
 * ha preso ogni cosa.
 *
 * La provenienza non è un dettaglio da nerd: è ciò che permette di controllare
 * un numero in due secondi invece di rileggere tutta la fattura. Un dato senza
 * provenienza è un dato che nessuno verifica.
 */
function EsitoLettura({ esito }: { esito: EsitoOcr }) {
  const [testoAperto, setTestoAperto] = useState(false)
  const { scheda } = esito

  const campi: { etichetta: string; campo?: CampoEstratto<string | number> }[] =
    scheda.tipo === 'fattura'
      ? [
          { etichetta: 'Fornitore', campo: scheda.fornitore },
          { etichetta: 'Numero', campo: scheda.numero },
          { etichetta: 'Data', campo: scheda.data },
          { etichetta: 'Partita IVA', campo: scheda.partitaIva },
          { etichetta: 'Imponibile', campo: scheda.imponibile },
          { etichetta: 'Totale', campo: scheda.totale },
        ]
      : [
          { etichetta: 'Intestatario', campo: scheda.intestatario },
          { etichetta: 'Numero', campo: scheda.numero },
          { etichetta: 'Rilasciato il', campo: scheda.rilasciatoIl },
          { etichetta: 'Scade il', campo: scheda.scadeIl },
        ]

  const trovati = campi.filter((c) => c.campo)

  return (
    <div className="scheda">
      <div
        className={`fascia-carenza ${esito.daControllare ? 'carenza-incompleta' : 'carenza-libera'}`}
      >
        {esito.daControllare ? '⚠️ Ho capito poco — controlla tutto' : '✅ Letto bene'}
        <div style={{ fontWeight: 400, marginTop: 4 }}>
          {trovati.length} dati su {campi.length} · sicurezza{' '}
          {Math.round(esito.fiducia * 100)}% · {(esito.lettura.durataMs / 1000).toFixed(1)}s
        </div>
      </div>

      {trovati.length === 0 ? (
        <p className="aiuto">
          Non sono riuscito a ricavare niente. Capita con le foto storte o poco illuminate:
          riprova più da vicino, oppure scrivi tu i campi qui sotto.
        </p>
      ) : (
        trovati.map(({ etichetta, campo }) => (
          <div key={etichetta} className="dato-letto">
            <div className="riga-dato" style={{ borderBottom: 'none', paddingBottom: 2 }}>
              <span className="etichetta">{etichetta}</span>
              <span className="valore">
                {String(campo!.valore)}
                <span
                  className={`bollino-fiducia ${campo!.fiducia < 0.6 ? 'incerto' : ''}`}
                  title={`sicurezza ${Math.round(campo!.fiducia * 100)}%`}
                >
                  {Math.round(campo!.fiducia * 100)}%
                </span>
              </span>
            </div>
            <p className="riga-origine">letto da: «{campo!.riga}»</p>
          </div>
        ))
      )}

      {scheda.tipo === 'fattura' && scheda.righe.length > 0 && (
        <>
          <h2 className="titolo-sezione">Merce letta ({scheda.righe.length} righe)</h2>
          {scheda.righe.map((r, i) => (
            <div key={i} className="riga-dato">
              <span className="etichetta">{r.descrizione}</span>
              <span className="valore">
                {r.quantita} {r.unitaMisura ?? ''}
                {r.importo != null && ` · ${r.importo.toFixed(2)} €`}
              </span>
            </div>
          ))}
          <p className="aiuto">
            Le righe di merce sono la parte che riesce peggio: senza sapere dove sono le colonne
            si tira a indovinare quale numero sia la quantità. Controllale sempre.
          </p>
        </>
      )}

      <button type="button" className="link-testo" onClick={() => setTestoAperto(!testoAperto)}>
        {testoAperto ? 'Nascondi' : 'Vedi'} il testo grezzo
      </button>
      {testoAperto && <pre className="testo-grezzo">{esito.lettura.testoGrezzo}</pre>}
    </div>
  )
}
