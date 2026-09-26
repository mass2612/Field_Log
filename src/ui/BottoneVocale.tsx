import { useEffect, useRef, useState } from 'react'
import {
  RegistratoreVocale,
  correggiConMagazzino,
  spiegaMotivo,
  type EsitoRegistrazione,
  type MotivoMancataTrascrizione,
} from '../core/voce/registrazione'

export interface NotaVocaleRegistrata {
  blob: Blob
  tipoMime: string
  durataSec: number
  trascrizione?: string
  /** Se la trascrizione manca, **perché** manca. Mai tirare a indovinare. */
  motivo?: MotivoMancataTrascrizione
}

type Modo = 'fermo' | 'tenuto' | 'bloccato'

/**
 * Il pulsante per parlare.
 *
 * Due gesti, come nelle applicazioni di messaggi che tutti conoscono:
 *   - **tieni premuto e parla**, si ferma quando molli;
 *   - **un tocco secco** e la registrazione resta accesa finché non ritocchi.
 *
 * Il secondo non è un vezzo: tenere premuto per un minuto, con i guanti e la
 * mano che trema, non è una cosa che si chiede a un uomo di settant'anni.
 *
 * Dettaglio che sembrava un dettaglio e non lo era: il dito va **agganciato**
 * al pulsante. Prima bastava spostarlo di un millimetro per far uscire il
 * puntatore dal bottone e fermare tutto dopo mezzo secondo — sul telefono
 * succedeva quasi sempre, e la nota usciva vuota.
 */
export default function BottoneVocale({
  nomiProdotti = [],
  onRegistrata,
}: {
  nomiProdotti?: string[]
  onRegistrata: (nota: NotaVocaleRegistrata) => void
}) {
  const registratore = useRef<RegistratoreVocale | null>(null)
  const premutoIl = useRef(0)
  const [modo, setModo] = useState<Modo>('fermo')
  const [secondi, setSecondi] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)

  const inCorso = modo !== 'fermo'

  // Il cronometro serve a far vedere che sta davvero registrando: senza, non si
  // capisce se il pulsante ha preso o no.
  useEffect(() => {
    if (!inCorso) return
    setSecondi(0)
    const orologio = setInterval(() => setSecondi((s) => s + 1), 1000)
    return () => clearInterval(orologio)
  }, [inCorso])

  async function avvia() {
    setErrore(null)
    try {
      registratore.current = new RegistratoreVocale('it-IT')
      await registratore.current.avvia()
      if ('vibrate' in navigator) navigator.vibrate(40)
      return true
    } catch {
      setErrore(
        'Non riesco ad accedere al microfono. Controlla di aver dato il permesso a questo sito.',
      )
      registratore.current = null
      setModo('fermo')
      return false
    }
  }

  async function ferma() {
    const corrente = registratore.current
    registratore.current = null
    setModo('fermo')
    if (!corrente) return

    try {
      const esito: EsitoRegistrazione = await corrente.ferma()
      const grezza = esito.trascrizioneImmediata
      const trascrizione = grezza ? correggiConMagazzino(grezza, nomiProdotti) : undefined

      onRegistrata({
        blob: esito.blob,
        tipoMime: esito.tipoMime,
        durataSec: esito.durataSec,
        trascrizione,
        motivo: esito.motivo,
      })
      if ('vibrate' in navigator) navigator.vibrate([30, 60, 30])
    } catch {
      setErrore('Registrazione non riuscita.')
    }
  }

  function premuto(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()

    if (modo === 'bloccato') {
      void ferma()
      return
    }
    if (modo === 'tenuto') return

    // Si aggancia il dito al pulsante: da qui in poi gli eventi arrivano qui
    // anche se la mano si sposta.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* se non si può agganciare si prosegue lo stesso */
    }

    premutoIl.current = Date.now()
    setModo('tenuto')
    void avvia()
  }

  function rilasciato(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (modo !== 'tenuto') return

    // Tocco secco: resta acceso. Pressione lunga: si ferma al rilascio.
    if (Date.now() - premutoIl.current < 500) setModo('bloccato')
    else void ferma()
  }

  return (
    <>
      <button
        type="button"
        className={`bottone-voce ${inCorso ? 'registra' : ''}`}
        onPointerDown={premuto}
        onPointerUp={rilasciato}
        onPointerCancel={() => {
          if (modo === 'tenuto') void ferma()
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span style={{ fontSize: 30 }} aria-hidden>
          {inCorso ? '⏺' : '🎙️'}
        </span>
        {modo === 'fermo' && 'Tieni premuto e parla'}
        {modo === 'tenuto' && `Sto registrando… ${secondi}s`}
        {modo === 'bloccato' && `Sto registrando… ${secondi}s — tocca per finire`}
      </button>

      {modo === 'fermo' && (
        <p className="aiuto">Oppure un tocco secco: registra finché non tocchi di nuovo.</p>
      )}

      {errore && (
        <p className="aiuto" style={{ color: 'var(--rosso)' }}>
          {errore}
        </p>
      )}
    </>
  )
}

export { spiegaMotivo }
