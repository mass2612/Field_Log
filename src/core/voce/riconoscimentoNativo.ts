import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import type { PluginListenerHandle } from '@capacitor/core'

/**
 * Il riconoscimento vocale dell'app installata.
 *
 * Dentro l'app Android la pagina gira in una WebView, e lì il riconoscimento
 * del browser **c'è ma non funziona**: esiste il costruttore, poi ogni
 * tentativo finisce in errore. Si usa allora quello del telefono, attraverso
 * il plugin, travestito da riconoscimento del browser: così `Trascrittore`
 * non sa la differenza, e tutte le regole costruite a fatica sul telefono
 * (sessioni che si riaprono, frasi riprese) valgono uguale.
 *
 * Una istanza = una sessione di ascolto, come nel browser.
 */
export class RiconoscimentoNativo {
  lang = 'it-IT'
  continuous = true
  interimResults = true
  maxAlternatives = 1
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null
  onerror: ((e: { error?: string }) => void) | null = null
  onend: (() => void) | null = null

  private ascolti: PluginListenerHandle[] = []
  private ultimo = ''
  private finito = false

  start(): void {
    void this.avvia()
  }

  stop(): void {
    void SpeechRecognition.stop().catch(() => this.chiudi())
  }

  abort(): void {
    this.onresult = null
    void SpeechRecognition.stop().catch(() => undefined)
    this.chiudi()
  }

  private async avvia(): Promise<void> {
    try {
      let permesso = await SpeechRecognition.checkPermissions()
      if (permesso.speechRecognition !== 'granted') {
        permesso = await SpeechRecognition.requestPermissions()
      }
      if (permesso.speechRecognition !== 'granted') {
        this.onerror?.({ error: 'not-allowed' })
        this.chiudi()
        return
      }

      this.ascolti.push(
        await SpeechRecognition.addListener('partialResults', ({ matches }) => {
          if (matches?.[0]) this.emetti(matches[0], false)
        }),
        await SpeechRecognition.addListener('listeningState', ({ status }) => {
          if (status === 'stopped') this.chiudi()
        }),
      )

      const esito = await SpeechRecognition.start({
        language: this.lang,
        partialResults: true,
        popup: false,
        maxResults: 1,
      })
      if (esito?.matches?.[0]) this.emetti(esito.matches[0], true)
    } catch (e) {
      const messaggio = e instanceof Error ? e.message : String(e)
      // I testi sono quelli di Android: "No match", "No speech input" dopo una
      // pausa; "Client side error" o "busy" quando si riapre troppo in fretta.
      const errore = /permission/i.test(messaggio)
        ? 'not-allowed'
        : /match|speech input|timeout/i.test(messaggio)
          ? 'no-speech'
          : /client|busy/i.test(messaggio)
            ? 'aborted'
            : 'network'
      this.onerror?.({ error: errore })
      this.chiudi()
    }
  }

  private emetti(testo: string, definitivo: boolean): void {
    this.ultimo = testo
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: definitivo, 0: { transcript: testo } }] })
  }

  private chiudi(): void {
    if (this.finito) return
    this.finito = true
    // L'ultimo pezzo sentito si dà per definitivo: è quello che c'è.
    if (this.ultimo) this.emetti(this.ultimo, true)
    const ascolti = this.ascolti
    this.ascolti = []
    ascolti.forEach((a) => void a.remove())
    this.onend?.()
  }
}
