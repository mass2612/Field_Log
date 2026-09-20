import { useRef, useState } from 'react'
import {
  RegistratoreVocale,
  correggiConMagazzino,
  type EsitoRegistrazione,
} from '../core/voce/registrazione'
import { t } from '../core/i18n'

export interface NotaVocaleRegistrata {
  blob: Blob
  tipoMime: string
  durataSec: number
  trascrizione?: string
  /** Vero se la trascrizione non si è potuta fare ora e resta in coda. */
  inCodaServer: boolean
}

/**
 * Pulsante "tieni premuto e parla".
 *
 * Un solo gesto, nessuna schermata intermedia, funziona con i guanti perché il
 * bersaglio è grande e non richiede precisione. Se la trascrizione non è
 * possibile, l'audio viene comunque salvato e non si perde niente.
 */
export default function BottoneVocale({
  nomiProdotti = [],
  onRegistrata,
}: {
  nomiProdotti?: string[]
  onRegistrata: (nota: NotaVocaleRegistrata) => void
}) {
  const registratore = useRef<RegistratoreVocale | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function avvia() {
    setErrore(null)
    try {
      registratore.current = new RegistratoreVocale('it-IT')
      await registratore.current.avvia()
      setInCorso(true)
      if ('vibrate' in navigator) navigator.vibrate(40)
    } catch {
      setErrore('Non riesco ad accedere al microfono. Controlla i permessi.')
      registratore.current = null
    }
  }

  async function ferma() {
    if (!registratore.current || !inCorso) return
    setInCorso(false)
    try {
      const esito: EsitoRegistrazione = await registratore.current.ferma()
      const grezza = esito.trascrizioneImmediata
      const trascrizione = grezza ? correggiConMagazzino(grezza, nomiProdotti) : undefined

      onRegistrata({
        blob: esito.blob,
        tipoMime: esito.tipoMime,
        durataSec: esito.durataSec,
        trascrizione,
        inCodaServer: !trascrizione,
      })
      if ('vibrate' in navigator) navigator.vibrate([30, 60, 30])
    } catch {
      setErrore('Registrazione non riuscita.')
    } finally {
      registratore.current = null
    }
  }

  return (
    <>
      <button
        type="button"
        className={`bottone-voce ${inCorso ? 'registra' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault()
          void avvia()
        }}
        onPointerUp={(e) => {
          e.preventDefault()
          void ferma()
        }}
        onPointerLeave={() => {
          if (inCorso) void ferma()
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span style={{ fontSize: 30 }} aria-hidden>
          {inCorso ? '⏺' : '🎙️'}
        </span>
        {inCorso ? t('voce.inCorso') : t('voce.registra')}
      </button>
      {errore && <p className="aiuto" style={{ color: 'var(--rosso)' }}>{errore}</p>}
    </>
  )
}
