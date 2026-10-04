import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  CampoLetto,
  Allegato,
  Azienda,
  Documento,
  ID,
  TipoDocumento,
  Tracciato,
} from '../../core/domain/types'
import { db, modificaTracciata, oggi, traccia } from '../../core/db/db'
import {
  campiDellaScheda,
  interpretaTesto,
  leggiDocumento,
  type CampoEstratto,
  type EsitoOcr,
  type GenereDocumento,
} from '../../core/ocr'
import SceltaFoto from '../../ui/SceltaFoto'
import { fmtData, fmtIstante } from '../../core/i18n'
import { serveAllaLegge } from '../../packs/it/documenti'

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

  // I fitosanitari che l'azienda ha già: un nome commerciale sulla fattura
  // dice "serve alla legge" meglio di qualunque parola generica.
  const nomiFitosanitari = useLiveQuery(
    async () =>
      (await db.prodotti.where('aziendaId').equals(azienda.id).toArray())
        .filter((p) => p.tipo === 'fitosanitario' && !p.annullatoIl)
        .map((p) => p.nome),
    [azienda.id],
  )

  if (!documenti) return <p>Carico…</p>

  /*
   * Due gruppi: quelli che servono alla legge sul quaderno, e tutti gli altri.
   * Li divide l'app leggendo il documento; l'agricoltore sposta con un tocco
   * quelli che ha messo nel posto sbagliato.
   */
  const conEsito = documenti.map((d) => ({ d, legale: serveAllaLegge(d, nomiFitosanitari ?? []) }))
  const perLaLegge = conEsito.filter((x) => x.legale.serve)
  const altri = conEsito.filter((x) => !x.legale.serve)

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
        <>
          {perLaLegge.length > 0 && (
            <>
              <h2 className="titolo-sezione">⚖️ Servono alla legge ({perLaLegge.length})</h2>
              <p className="aiuto" style={{ marginTop: -4 }}>
                Patentino, controllo dell’irroratrice, fatture di fitosanitari e concimi. Le
                fatture vanno conservate tre anni.
              </p>
              {perLaLegge.map(({ d, legale }) => (
                <SchedaDocumento key={d.id} documento={d} aziendaId={azienda.id} legale={legale} />
              ))}
            </>
          )}
          {altri.length > 0 && (
            <>
              <h2 className="titolo-sezione">📁 Altri documenti ({altri.length})</h2>
              {altri.map(({ d, legale }) => (
                <SchedaDocumento key={d.id} documento={d} aziendaId={azienda.id} legale={legale} />
              ))}
            </>
          )}
        </>
      )}
    </>
  )
}

/** La scheda ricavata dal documento — sempre correggibile. */
function SchedaDocumento({
  documento,
  aziendaId,
  legale,
}: {
  documento: Documento
  aziendaId: ID
  legale: ReturnType<typeof serveAllaLegge>
}) {
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

  /** Sposta il documento nell'altro gruppo: la scelta dell'agricoltore vince. */
  async function sposta() {
    await modificaTracciata(
      db.documenti,
      'documenti',
      documento.id,
      { perLaLegge: !legale.serve },
      { aziendaId },
    )
  }

  return (
    <div className="scheda">
      <div className="nota-intestazione">
        <strong>
          {tipo?.icona} {documento.descrizione}
        </strong>
      </div>

      <p className="aiuto" style={{ marginTop: 4 }}>
        {legale.motivo}{' '}
        <button type="button" className="link-testo" onClick={() => void sposta()}>
          {legale.serve ? 'Non serve alla legge? Spostalo' : 'Serve alla legge? Spostalo'}
        </button>
      </p>

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
          <div className="riga-dato">
            <span className="etichetta">Scade il</span>
            <span className="valore">{fmtData(documento.scadeIl)}</span>
          </div>

          {/*
            Tutto quello che è stato letto, sempre visibile e sempre
            correggibile. Prima spariva dopo il salvataggio, e un numero
            sbagliato restava sbagliato per sempre.
          */}
          <CampiLetti documento={documento} aziendaId={aziendaId} />

          <button className="link-testo" onClick={() => setApertaModifica(true)}>
            ✏️ Correggi descrizione e scadenza
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
  /*
   * Il tipo scelto nel menù **non** decide più come si legge il documento: lo
   * decide quello che c'è scritto sopra. Una bolletta letta come patentino
   * tirava fuori una scadenza del 2028 presa a caso.
   */

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
      const esito = await leggiDocumento(file, 'auto', {
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
        // Il menù partiva da "Patentino": una bolletta salvata senza toccarlo
        // diventava un patentino, e finiva fra i documenti per la legge.
        setTipo('altro')
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
        // Si archivia tutto quello che è stato letto, col testo grezzo: così
        // la scheda resta correggibile e rileggibile anche fra sei mesi.
        campiLetti: lettura ? campiDellaScheda(lettura.scheda) : undefined,
        testoLetto: lettura?.lettura.testoGrezzo,
        fiduciaLettura: lettura?.fiducia,
        genereLettura: lettura?.scheda.tipo,
      }) as Documento,
    )

    onFatto()
  }

  return (
    <div className="scheda">
      <div className="gruppo-campo">
        <label>Foto del documento</label>
        <SceltaFoto
          disabilitato={inLettura}
          onFoto={(file) => {
            setFoto(file)
            setLettura(null)
            void leggiLaFoto(file)
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

/**
 * I campi ricavati dalla foto, **sempre modificabili**.
 *
 * Era la falla segnalata provando una bolletta: durante l'inserimento l'app
 * mostrava tutto quello che aveva letto, con la percentuale e la riga di
 * provenienza; dopo il salvataggio restavano solo numero e scadenza, e il resto
 * non si poteva più né vedere né correggere.
 *
 * Il principio dell'app è che si corregge sempre, non solo nei trenta secondi
 * in cui si fotografa.
 */
function CampiLetti({ documento, aziendaId }: { documento: Documento; aziendaId: ID }) {
  const [inModifica, setInModifica] = useState<string | null>(null)
  const [bozza, setBozza] = useState('')
  const [rileggendo, setRileggendo] = useState(false)

  const campi = documento.campiLetti ?? []
  if (campi.length === 0 && !documento.testoLetto) return null

  /** Salva la correzione di un campo, e allinea i dati che fanno scattare gli avvisi. */
  async function salvaCampo(campo: CampoLetto) {
    const aggiornati = campi.map((c) =>
      c.chiave === campo.chiave
        ? { ...c, valore: bozza.trim(), fiducia: 1, corretto: true, riga: c.riga }
        : c,
    )

    const modifiche: Partial<Documento> = { campiLetti: aggiornati }
    // I campi che contano per le scadenze vanno tenuti allineati, altrimenti
    // si corregge la data e l'avviso continua a suonare su quella vecchia.
    if (campo.chiave === 'scadeIl') modifiche.scadeIl = bozza.trim() || undefined
    if (campo.chiave === 'numero') modifiche.numero = bozza.trim() || undefined

    await modificaTracciata(db.documenti, 'documenti', documento.id, modifiche, { aziendaId })
    setInModifica(null)
  }

  /** Rilegge dal testo già acquisito: non serve rifotografare. */
  async function rileggiCome(genere: GenereDocumento) {
    if (!documento.testoLetto) return
    setRileggendo(true)
    try {
      const scheda = interpretaTesto(documento.testoLetto, genere, oggi())
      const nuovi = campiDellaScheda(scheda)
      const scadenza = nuovi.find((c) => c.chiave === 'scadeIl')?.valore
      const numero = nuovi.find((c) => c.chiave === 'numero')?.valore

      await modificaTracciata(
        db.documenti,
        'documenti',
        documento.id,
        {
          campiLetti: nuovi,
          genereLettura: genere,
          ...(scadenza ? { scadeIl: scadenza } : {}),
          ...(numero ? { numero } : {}),
        },
        { aziendaId },
      )
    } finally {
      setRileggendo(false)
    }
  }

  const genere = documento.genereLettura ?? 'scadenza'
  const altroGenere: GenereDocumento = genere === 'fattura' ? 'scadenza' : 'fattura'

  return (
    <>
      <h2 className="titolo-sezione">Letto dalla foto</h2>

      {campi.map((campo) => (
        <div key={campo.chiave} className="dato-letto">
          {inModifica === campo.chiave ? (
            <>
              <label htmlFor={`c-${documento.id}-${campo.chiave}`}>{campo.etichetta}</label>
              <input
                id={`c-${documento.id}-${campo.chiave}`}
                value={bozza}
                onChange={(e) => setBozza(e.target.value)}
                type={campo.chiave.endsWith('Il') || campo.chiave === 'data' ? 'date' : 'text'}
                autoFocus
              />
              <div className="pila" style={{ marginTop: 8 }}>
                <button className="pulsante-principale" onClick={() => void salvaCampo(campo)}>
                  Salva
                </button>
                <button className="pulsante-secondario" onClick={() => setInModifica(null)}>
                  Lascia stare
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="riga-dato" style={{ borderBottom: 'none', paddingBottom: 2 }}>
                <span className="etichetta">{campo.etichetta}</span>
                <span className="valore">
                  {campo.valore}
                  <span
                    className={`bollino-fiducia ${campo.fiducia < 0.6 ? 'incerto' : ''}`}
                    title={campo.corretto ? 'corretto a mano' : 'letto dalla foto'}
                  >
                    {campo.corretto ? '✓' : `${Math.round(campo.fiducia * 100)}%`}
                  </span>
                </span>
              </div>
              {campo.riga && <p className="riga-origine">letto da: «{campo.riga}»</p>}
              <button
                type="button"
                className="link-testo"
                onClick={() => {
                  setBozza(campo.valore)
                  setInModifica(campo.chiave)
                }}
              >
                correggi
              </button>
            </>
          )}
        </div>
      ))}

      {documento.testoLetto && (
        <>
          <p className="aiuto" style={{ marginTop: 12 }}>
            Interpretato come <strong>{genere === 'fattura' ? 'fattura' : 'documento con scadenza'}</strong>.
            Se i dati non tornano, quasi sempre è perché è stato letto col criterio sbagliato.
          </p>
          <button
            type="button"
            className="pulsante-secondario"
            onClick={() => void rileggiCome(altroGenere)}
            disabled={rileggendo}
          >
            🔁 {rileggendo ? 'Rileggo…' : `Rileggi come ${altroGenere === 'fattura' ? 'fattura' : 'documento con scadenza'}`}
          </button>
          <p className="aiuto">Non serve rifotografare: il testo è già qui.</p>
        </>
      )}
    </>
  )
}
