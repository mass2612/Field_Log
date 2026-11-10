import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from './client'
import { sincronizza } from './sincronizza'

/**
 * Accesso con Google.
 *
 * Google, finito l'accesso, rimanda a un indirizzo con un `?code=…` che si
 * scambia con la sessione (flusso PKCE). Non si usa il ritorno con i token
 * nel `#`: l'app usa già il `#` per le pagine, e i due si pestavano i piedi.
 *
 * - Nel sito si torna alla pagina stessa.
 * - Nell'app installata Google si apre nel browser del telefono, e si torna
 *   all'app con l'indirizzo `it.agrizen.app://accesso` (dichiarato nel
 *   manifest Android).
 *
 * Gli indirizzi di ritorno vanno elencati anche su Supabase, in
 * Authentication → URL Configuration → Redirect URLs.
 */
export const RITORNO_APP = 'it.agrizen.app://accesso'

export async function entraConGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: RITORNO_APP, skipBrowserRedirect: true },
    })
    if (error) throw error
    if (data.url) await Browser.open({ url: data.url })
    return
  }
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw error
}

/** Completa l'accesso se l'indirizzo porta il codice di ritorno. */
async function completa(indirizzo: string): Promise<boolean> {
  const url = new URL(indirizzo)
  const codice = url.searchParams.get('code')
  if (!codice) return false
  const { error } = await supabase().auth.exchangeCodeForSession(codice)
  if (error) throw error
  void sincronizza().catch(() => undefined)
  return true
}

/** Da chiamare una volta, in cima all'app: raccoglie il ritorno da Google. */
export function useRitornoDaGoogle(): void {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const ascolto = App.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith(RITORNO_APP)) return
        void Browser.close().catch(() => undefined)
        void completa(url).catch(() => undefined)
      })
      return () => {
        void ascolto.then((a) => a.remove())
      }
    }

    if (new URLSearchParams(window.location.search).has('code')) {
      const indirizzo = window.location.href
      // Si toglie subito il codice dalla barra: vale una volta sola.
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      void completa(indirizzo).catch(() => undefined)
    }
    return undefined
  }, [])
}
