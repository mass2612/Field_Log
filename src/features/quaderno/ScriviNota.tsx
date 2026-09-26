import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Allegato, Azienda, Tracciato } from '../../core/domain/types'
import type { Nota } from '../../core/domain/note'
import { ARGOMENTI, leggiNota, proponiArgomenti } from '../../core/domain/note'
import { db, modificaTracciata, oggi, traccia } from '../../core/db/db'
import { nomiDeiCampi } from '../../core/db/note'
import BottoneVocale, { type NotaVocaleRegistrata } from '../../ui/BottoneVocale'
import { spiegaMotivo, type MotivoMancataTrascrizione } from '../../core/voce/registrazione'
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
  const [audio, setAudio] = useState<NotaVocaleRegistrata | null>(null)
  const [motivoVocale, setMotivoVocale] = useState<MotivoMancataTrascrizione | null>(null)

  // L'indirizzo temporaneo per riascoltare, liberato quando non serve più.
  const [urlAudio, setUrlAudio] = useState<string | null>(null)
  useEffect(() => {
    if (!audio) {
      setUrlAudio(null)
      return
    }
    const url = URL.createObjectURL(audio.blob)
    setUrlAudio(url)
    return () => URL.revokeObjectURL(url)
  }, [audio])

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
    let audioAllegatoId: string | undefined
    if (audio) {
      const allegato = traccia<Omit<Allegato, keyof Tracciato>>({
        aziendaId: azienda.id,
        nomeFile: `nota-${dataFatto}.webm`,
        tipoMime: audio.tipoMime,
        dimensioneByte: audio.blob.size,
        blob: audio.blob,
      }) as Allegato
      await db.allegati.add(allegato)
      audioAllegatoId = allegato.id
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
      daVoce: audio != null || daRileggere || undefined,
      audioAllegatoId,
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

      {/* Cosa. Grande. È questa la nota. */}
      <textarea
        ref={areaTesto}
        className="campo-nota"
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        placeholder="Scrivi cosa hai fatto, oppure premi il microfono e raccontalo."
        autoFocus={!inModifica}
      />

      <BottoneVocale
        nomiProdotti={contesto?.prodottiConosciuti ?? []}
        onRegistrata={(nota) => {
          if (nota.trascrizione) {
            /*
             * Trascrizione riuscita: l'audio si può buttare. Sono pochi byte
             * risparmiati per nota, ma su tre note al giorno per dieci anni la
             * differenza si vede.
             */
            aggiungiTesto(nota.trascrizione)
            setAudio(null)
            setMotivoVocale(null)
            setDaRileggere(true)
          } else {
            /*
             * Trascrizione fallita: **l'audio si tiene.** È l'unico caso in cui
             * buttarlo farebbe perdere la nota per davvero.
             */
            setAudio(nota)
            setMotivoVocale(nota.motivo ?? 'sconosciuto')
          }
        }}
      />

      {daRileggere && !audio && (
        <p className="aiuto">
          ✏️ Rileggi quello che ha scritto: sui nomi commerciali sbaglia spesso.
        </p>
      )}

      {/* Niente più "manca la rete" sparato a caso: si dice cosa è successo. */}
      {audio && motivoVocale && (
        <div className="scheda">
          <strong>🎙️ Registrato {audio.durataSec}s, ma senza trascrizione</strong>
          <p className="aiuto" style={{ marginTop: 6 }}>
            {spiegaMotivo(motivoVocale)}
          </p>

          <audio controls src={urlAudio ?? undefined} style={{ width: '100%', marginTop: 10 }} />

          <p className="aiuto">
            L’audio resta salvato insieme alla nota: riascoltalo e scrivi tu quello che hai detto.
            Niente è andato perso.
          </p>

          <button type="button" className="link-testo" onClick={() => setAudio(null)}>
            Butta la registrazione
          </button>
        </div>
      )}

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
