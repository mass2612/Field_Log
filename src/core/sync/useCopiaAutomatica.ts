import { useEffect } from 'react'
import { sincronizza } from './sincronizza'

const OGNI = 5 * 60_000

/**
 * La copia parte da sola: all'avvio, ogni cinque minuti, quando torna la rete
 * e quando si chiude l'app. Senza account non fa niente. Un errore non si
 * mostra: in campo la rete va e viene, e ci si riprova al giro dopo.
 */
export function useCopiaAutomatica(): void {
  useEffect(() => {
    const prova = () => {
      if (navigator.onLine) sincronizza().catch(() => undefined)
    }
    const quandoNascosta = () => {
      if (document.visibilityState === 'hidden') prova()
    }

    prova()
    const timer = window.setInterval(prova, OGNI)
    window.addEventListener('online', prova)
    document.addEventListener('visibilitychange', quandoNascosta)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', prova)
      document.removeEventListener('visibilitychange', quandoNascosta)
    }
  }, [])
}
