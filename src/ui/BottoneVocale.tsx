import { useEffect, useRef, useState } from 'react'
import {
  RegistratoreAudio,
  Trascrittore,
  comeVaQui,
  correggiConMagazzino,
  motivoRicordato,
  ricordaEsito,
  type EsitoVoce,
  type MotivoMancataTrascrizione,
} from '../core/voce/registrazione'

type Modo = 'fermo' | 'tenuto' | 'bloccato'

/**
 * Il microfono.
 *
 * Volutamente **piccolo**: è un modo di scrivere, non un'azione importante come
 * salvare. Prima era un riquadro grande quanto il pulsante Salva e appiccicato
 * al testo: il pollice ci finiva sopra per sbaglio, e la schermata sembrava
 * avere due comandi principali. Sulla schermata di scrittura il pulsante grande
 * dev'essere uno solo, e deve essere Salva.
 *
 * Due gesti, come nelle applicazioni di messaggi:
 *   - **tieni premuto e parla**, si ferma quando molli;
 *   - **un tocco secco** e resta acceso finché non tocchi di nuovo.
 */
export default function BottoneVocale({
  nomiProdotti = [],
  onEsito,
}: {
  nomiProdotti?: string[]
  onEsito: (esito: EsitoVoce) => void
}) {
  const trascrittore = useRef<Trascrittore | null>(null)
  const registratore = useRef<RegistratoreAudio | null>(null)
  const motivoRipiego = useRef<MotivoMancataTrascrizione>('sconosciuto')
  const premutoIl = useRef(0)

  const [modo, setModo] = useState<Modo>('fermo')
  const [secondi, setSecondi] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)

  const inCorso = modo !== 'fermo'
  const soloAudio = comeVaQui() === 'non_funziona'

  useEffect(() => {
    if (!inCorso) return
    setSecondi(0)
    const orologio = setInterval(() => setSecondi((s) => s + 1), 1000)
    return () => clearInterval(orologio)
  }, [inCorso])

  /** Registra l'audio e basta: si usa quando trascrivere non è possibile. */
  async function avviaSoloAudio(motivo: MotivoMancataTrascrizione) {
    motivoRipiego.current = motivo
    registratore.current = new RegistratoreAudio()
    try {
      await registratore.current.avvia()
    } catch {
      registratore.current = null
      setErrore('Non riesco ad accedere al microfono. Controlla il permesso per questo sito.')
      setModo('fermo')
    }
  }

  async function avvia() {
    setErrore(null)

    // Se su questo telefono la trascrizione ha già fallito, non si finge:
    // si registra l'audio direttamente.
    if (soloAudio) {
      await avviaSoloAudio(motivoRicordato())
      return
    }

    const nuovo = new Trascrittore('it-IT')
    if (nuovo.avvia()) {
      trascrittore.current = nuovo
      if ('vibrate' in navigator) navigator.vibrate(40)
      return
    }

    // Il browser non sa trascrivere: si ripiega sull'audio.
    await avviaSoloAudio('non_supportato')
  }

  async function ferma() {
    const t = trascrittore.current
    const r = registratore.current
    trascrittore.current = null
    registratore.current = null
    setModo('fermo')

    try {
      let esito: EsitoVoce | null = null
      if (t) esito = await t.ferma()
      else if (r) esito = await r.ferma(motivoRipiego.current)
      if (!esito) return

      if (esito.tipo === 'testo') {
        ricordaEsito('funziona')
        onEsito({
          ...esito,
          testo: correggiConMagazzino(esito.testo, nomiProdotti),
        })
      } else {
        /*
         * Si ricorda solo quello che dipende dal telefono. "Non ho sentito
         * parlare" è colpa del gesto, non dell'apparecchio: smettere di
         * trascrivere per quello sarebbe una resa ingiusta.
         */
        const colpaDelTelefono: MotivoMancataTrascrizione[] = [
          'non_supportato',
          'servizio_irraggiungibile',
          'permesso_negato',
          'microfono_occupato',
        ]
        if (colpaDelTelefono.includes(esito.motivo)) ricordaEsito('non_funziona', esito.motivo)
        onEsito(esito)
      }

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

    // Il dito resta agganciato al pulsante anche se la mano si sposta.
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
    if (Date.now() - premutoIl.current < 500) setModo('bloccato')
    else void ferma()
  }

  return (
    <>
      <button
        type="button"
        className={`microfono ${inCorso ? 'registra' : ''}`}
        onPointerDown={premuto}
        onPointerUp={rilasciato}
        onPointerCancel={() => {
          if (modo === 'tenuto') void ferma()
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={inCorso ? 'Sto registrando, tocca per finire' : 'Detta la nota'}
        title={
          soloAudio
            ? 'Su questo telefono la trascrizione non funziona: registro l’audio'
            : 'Tieni premuto e parla, oppure un tocco secco'
        }
      >
        <span aria-hidden style={{ fontSize: 26 }}>
          {inCorso ? '⏺' : '🎙️'}
        </span>
        {inCorso && <span className="microfono-tempo">{secondi}s</span>}
      </button>

      {errore && (
        <p className="aiuto" style={{ color: 'var(--rosso)' }}>
          {errore}
        </p>
      )}
    </>
  )
}
