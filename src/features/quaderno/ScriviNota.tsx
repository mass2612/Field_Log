import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Allegato, Azienda, Tracciato } from '../../core/domain/types'
import type { Nota } from '../../core/domain/note'
import { ARGOMENTI, leggiNota, proponiArgomenti } from '../../core/domain/note'
import { db, modificaTracciata, oggi, traccia } from '../../core/db/db'
import { nomiDeiCampi } from '../../core/db/note'
import BottoneVocale from '../../ui/BottoneVocale'
import {
  comeVaQui,
  riprovaTrascrizione,
  spiegaMotivo,
  type MotivoMancataTrascrizione,
} from '../../core/voce/registrazione'
import { fmtData } from '../../core/i18n'

/**
 * Scrivere una nota.
 *
 * Due campi soli: dove, in piccolo e facoltativo; cosa, in grande.
 * Nient'altro davanti. Tutto il resto — argomenti, data del fatto, prodotti
 * nominati — lo ricava l'app dal testo e lo mostra **sotto**, dove non
 * interrompe: si guarda se si vuole.
 */
export default function ScriviNota({ azienda }: { azienda: Azienda }) {
  const naviga = useNavigate()
  const { notaId } = useParams<{ notaId: string }>()
  const [parametri] = useSearchParams()
  const areaTesto = useRef<HTMLTextAreaElement>(null)

  const inModifica = Boolean(notaId)

  const contesto = useLiveQuery(async () => {
    const [note, prodotti, campi] = await Promise.all([
      db.note.where('aziendaId').equals(azienda.id).toArray(),
      db.prodotti.where('aziendaId').equals(azienda.id).toArray(),
      db.campi.where('aziendaId').equals(azienda.id).toArray(),
    ])
    return {
      campiConosciuti: nomiDeiCampi(note, campi),
      prodottiConosciuti: prodotti.map((p) => p.nome),
    }
  }, [azienda.id])

  const esistente = useLiveQuery(
    async () => (notaId ? ((await db.note.get(notaId)) ?? null) : null),
    [notaId],
  )

  const [campoNome, setCampoNome] = useState(parametri.get('campo') ?? '')
  const [testo, setTesto] = useState('')
  const [dataFatto, setDataFatto] = useState(oggi())
  const [dataToccata, setDataToccata] = useState(false)
  const [argomenti, setArgomenti] = useState<string[]>([])
  const [argomentiToccati, setArgomentiToccati] = useState(false)
  const [caricata, setCaricata] = useState(false)
  const [daRileggere, setDaRileggere] = useState(false)
  const [salvato, setSalvato] = useState(false)
  /*
   * Le registrazioni non trascritte si **accumulano**: se uno detta tre volte
   * perché non va, le prime due non devono sparire. La versione precedente
   * teneva solo l'ultima e buttava le altre senza dire niente.
   */
  const [registrazioni, setRegistrazioni] = useState<RegistrazioneInAttesa[]>([])
  const [avvisoVoce, setAvvisoVoce] = useState<MotivoMancataTrascrizione | null>(null)

  // In modifica il modulo si riempie una volta sola.
  useEffect(() => {
    if (!inModifica || !esistente || caricata) return
    setCampoNome(esistente.campoNome ?? '')
    setTesto(esistente.testo)
    setDataFatto(esistente.dataFatto)
    setArgomenti(esistente.argomenti)
    setArgomentiToccati(Boolean(esistente.argomentiConfermati))
    setDataToccata(true)
    setCaricata(true)
  }, [inModifica, esistente, caricata])

  /*
   * L'app legge mentre lui scrive, ma non tocca mai quello che ha già deciso:
   * se ha corretto la data o gli argomenti a mano, da lì in poi sono suoi.
   */
  const letta = useMemo(
    () =>
      contesto && testo.trim()
        ? leggiNota(testo, {
            oggi: oggi(),
            campiConosciuti: contesto.campiConosciuti,
            prodottiConosciuti: contesto.prodottiConosciuti,
          })
        : null,
    [testo, contesto],
  )

  useEffect(() => {
    if (!letta) return
    if (!dataToccata) setDataFatto(letta.dataFatto)
    if (!argomentiToccati) setArgomenti(proponiArgomenti(testo))
  }, [letta, testo, dataToccata, argomentiToccati])

  const campoProposto = letta?.scheda.campoNome
  const prodottiLetti = letta?.scheda.prodotti ?? []

  async function salva() {
    if (!testo.trim()) return

    const campo = campoNome.trim() || campoProposto || undefined
    const campoCollegato = campo
      ? (await db.campi.where('aziendaId').equals(azienda.id).toArray()).find(
          (c) => c.nome.toLowerCase() === campo.toLowerCase(),
        )?.id
      : undefined

    /*
     * L'audio si archivia solo quando la trascrizione non è riuscita: è lì che
     * serve, perché senza si perderebbe quello che è stato detto.
     */
    const audioAllegatiId: string[] = []
    for (const [indice, registrazione] of registrazioni.entries()) {
      const allegato = traccia<Omit<Allegato, keyof Tracciato>>({
        aziendaId: azienda.id,
        nomeFile: `nota-${dataFatto}-${indice + 1}.webm`,
        tipoMime: registrazione.tipoMime,
        dimensioneByte: registrazione.blob.size,
        blob: registrazione.blob,
      }) as Allegato
      await db.allegati.add(allegato)
      audioAllegatiId.push(allegato.id)
    }

    const dati = {
      aziendaId: azienda.id,
      testo: testo.trim(),
      dataFatto,
      campoNome: campo,
      campoId: campoCollegato,
      argomenti,
      argomentiConfermati: argomentiToccati || undefined,
      scheda: letta
        ? { ...letta.scheda, campoNome: campo, confermata: esistente?.scheda?.confermata }
        : undefined,
      daVoce: registrazioni.length > 0 || daRileggere || undefined,
      audioAllegatiId: audioAllegatiId.length > 0 ? audioAllegatiId : undefined,
      trascrizioneDaRileggere: daRileggere || undefined,
    }

    if (inModifica && notaId) {
      await modificaTracciata(db.note, 'note', notaId, dati, { aziendaId: azienda.id })
    } else {
      await db.note.add(traccia<Omit<Nota, keyof Tracciato>>(dati) as Nota)
    }

    setSalvato(true)
    setTimeout(() => naviga('/quaderno', { replace: true }), 400)
  }

  function aggiungiTesto(nuovo: string) {
    setTesto((precedente) => (precedente ? `${precedente.trim()} ${nuovo}` : nuovo))
    areaTesto.current?.focus()
  }

  return (
    <>
      {/* Dove. Piccolo, in cima, e si può saltare. */}
      <input
        className="campo-campo"
        value={campoNome}
        onChange={(e) => setCampoNome(e.target.value)}
        placeholder="Indica campo — facoltativo"
        list="campi-conosciuti"
        autoComplete="off"
      />
      <datalist id="campi-conosciuti">
        {(contesto?.campiConosciuti ?? []).map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {campoProposto && !campoNome.trim() && (
        <button
          type="button"
          className="link-testo"
          onClick={() => setCampoNome(campoProposto)}
          style={{ marginTop: -6 }}
        >
          Hai scritto “{campoProposto}”: lo metto come campo?
        </button>
      )}

      {/*
        Cosa. Grande. È questa la nota.
        Il microfono sta **dentro** il riquadro, in un angolo: è un modo di
        scrivere, non un comando che compete con Salva.
      */}
      <div className="riquadro-nota">
        <textarea
          ref={areaTesto}
          className="campo-nota"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Scrivi cosa hai fatto, oppure tieni premuto il microfono e raccontalo."
          autoFocus={!inModifica}
        />
        <div className="angolo-microfono">
          <BottoneVocale
            nomiProdotti={contesto?.prodottiConosciuti ?? []}
            onEsito={(esito) => {
              if (esito.tipo === 'testo') {
                aggiungiTesto(esito.testo)
                setDaRileggere(true)
                setAvvisoVoce(null)
              } else if (esito.tipo === 'audio') {
                setRegistrazioni((precedenti) => [...precedenti, { ...esito, creataIl: Date.now() }])
                setAvvisoVoce(esito.motivo)
              } else {
                setAvvisoVoce(esito.motivo)
              }
            }}
          />
        </div>
      </div>

      {daRileggere && (
        <p className="aiuto">
          ✏️ Rileggi quello che ha scritto: sui nomi commerciali sbaglia spesso.
        </p>
      )}

      {/* Un solo pulsante grande sulla schermata, ed è questo. */}
      <div className="pila" style={{ marginTop: 18 }}>
        <button
          className="pulsante-principale"
          onClick={() => void salva()}
          disabled={!testo.trim() || salvato}
        >
          {salvato ? '✓ Salvata' : 'Salva'}
        </button>
        <button className="pulsante-secondario" onClick={() => naviga(-1)}>
          Lascia stare
        </button>
      </div>

      {/* Niente più "manca la rete" sparato a caso: si dice cosa è successo. */}
      {avvisoVoce && registrazioni.length === 0 && (
        <div className="rilievo rilievo-avviso" style={{ marginTop: 16 }}>
          <strong>🎙️ Non sono riuscito a trascrivere</strong>
          <small>
            {spiegaMotivo(avvisoVoce)}{' '}
            {comeVaQui() === 'non_funziona'
              ? 'Da adesso, su questo telefono, registro direttamente l’audio: premi di nuovo il microfono e parla.'
              : 'Riprova.'}
          </small>
        </div>
      )}

      {/* Se l'app ha smesso di provarci, si deve poter tornare indietro. */}
      {comeVaQui() === 'non_funziona' && (
        <button
          type="button"
          className="link-testo"
          onClick={() => {
            riprovaTrascrizione()
            setAvvisoVoce(null)
          }}
        >
          Riprova a trascrivere invece di registrare
        </button>
      )}

      {registrazioni.length > 0 && (
        <>
          <h2 className="titolo-sezione">
            Registrazioni da riscrivere ({registrazioni.length})
          </h2>
          <p className="aiuto" style={{ marginTop: -4 }}>
            {avvisoVoce ? spiegaMotivo(avvisoVoce) : ''} Riascolta e scrivi tu sopra: l’audio
            resta allegato alla nota, non si perde niente.
          </p>

          {registrazioni.map((r, i) => (
            <Registrazione
              key={r.creataIl}
              registrazione={r}
              numero={i + 1}
              onButta={() =>
                setRegistrazioni((precedenti) => precedenti.filter((x) => x !== r))
              }
            />
          ))}
        </>
      )}

      {/* Quello che l'app ha capito. Sotto, mai davanti. */}
      {testo.trim() && (
        <>
          <h2 className="titolo-sezione">Quello che ho capito</h2>

          <div className="scheda">
            <div className="gruppo-campo">
              <label htmlFor="data-fatto">Quando è successo</label>
              <input
                id="data-fatto"
                type="date"
                value={dataFatto}
                max={oggi()}
                onChange={(e) => {
                  setDataFatto(e.target.value)
                  setDataToccata(true)
                }}
              />
              {!dataToccata && dataFatto !== oggi() && (
                <p className="aiuto">Letto dalla frase: {fmtData(dataFatto)}. Cambialo se sbaglio.</p>
              )}
            </div>

            <label>Argomenti</label>
            <div className="etichette">
              {ARGOMENTI.map((a) => {
                const attivo = argomenti.includes(a.chiave)
                return (
                  <button
                    key={a.chiave}
                    type="button"
                    className={`etichetta-scelta ${attivo ? 'attiva' : ''}`}
                    onClick={() => {
                      setArgomentiToccati(true)
                      setArgomenti(
                        attivo
                          ? argomenti.filter((x) => x !== a.chiave)
                          : [...argomenti, a.chiave],
                      )
                    }}
                  >
                    {a.icona} {a.etichetta}
                  </button>
                )
              })}
            </div>
            <p className="aiuto">
              Li propongo leggendo la nota. Toccali per aggiungerli o toglierli: da quel momento
              non ci metto più mano.
            </p>

            {prodottiLetti.length > 0 && (
              <>
                <label style={{ marginTop: 16 }}>Prodotti nominati</label>
                {prodottiLetti.map((p, i) => (
                  <div key={i} className="riga-dato">
                    <span className="etichetta">{p.nome || '(prodotto non capito)'}</span>
                    <span className="valore">
                      {p.quantita} {p.unitaMisura}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

/** Una registrazione che aspetta di essere riscritta a mano. */
interface RegistrazioneInAttesa {
  tipo: 'audio'
  blob: Blob
  tipoMime: string
  durataSec: number
  motivo: MotivoMancataTrascrizione
  /** Serve solo come chiave stabile nell'elenco. */
  creataIl: number
}

function Registrazione({
  registrazione,
  numero,
  onButta,
}: {
  registrazione: RegistrazioneInAttesa
  numero: number
  onButta: () => void
}) {
  // L'indirizzo temporaneo per riascoltare, liberato quando non serve più.
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const indirizzo = URL.createObjectURL(registrazione.blob)
    setUrl(indirizzo)
    return () => URL.revokeObjectURL(indirizzo)
  }, [registrazione.blob])

  return (
    <div className="scheda">
      <div className="nota-intestazione">
        <strong>
          🎙️ Registrazione {numero} — {registrazione.durataSec}s
        </strong>
        <button type="button" className="link-testo" onClick={onButta}>
          butta
        </button>
      </div>
      <audio controls src={url ?? undefined} style={{ width: '100%', marginTop: 10 }} />
    </div>
  )
}
