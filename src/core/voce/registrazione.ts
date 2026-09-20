/**
 * Note vocali.
 *
 * Regola non negoziabile: **l'audio si salva sempre e comunque**. La trascrizione
 * è un comodo di lettura, l'audio è la prova. Se la trascrizione sbaglia il nome
 * di un prodotto, il registro sarebbe falso: l'audio permette sempre di rimediare.
 *
 * Tre livelli, in ordine di affidabilità crescente:
 *   1. audio                    — sempre, anche senza rete
 *   2. trascrizione immediata   — quando il dispositivo la offre
 *   3. trascrizione dal server  — più accurata, in coda finché non torna la linea
 *
 * Avvertenza tecnica: la Web Speech API di Chrome *non* è locale, manda l'audio
 * ai server di Google e senza rete non funziona. Per una vera trascrizione
 * offline servirà un modello incorporato nell'app (Whisper compilato in WASM o
 * simili): è previsto, non è ancora qui. Finché non c'è, senza rete si registra
 * l'audio e la trascrizione resta in coda.
 */

export type StatoRegistrazione = 'ferma' | 'in_corso' | 'elaborazione'

export interface EsitoRegistrazione {
  blob: Blob
  durataSec: number
  tipoMime: string
  /** Presente solo se il riconoscimento vocale era disponibile in quel momento. */
  trascrizioneImmediata?: string
}

interface RiconoscimentoVocale extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}

function creaRiconoscimento(lingua: string): RiconoscimentoVocale | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RiconoscimentoVocale
    webkitSpeechRecognition?: new () => RiconoscimentoVocale
  }
  const Costruttore = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Costruttore) return null

  const r = new Costruttore()
  r.lang = lingua
  r.continuous = true
  r.interimResults = false
  return r
}

export function trascrizioneImmediataDisponibile(): boolean {
  return creaRiconoscimento('it-IT') !== null && navigator.onLine
}

/**
 * Registratore. Pensato per il pulsante "tieni premuto e parla": si avvia al
 * tocco, si ferma al rilascio, senza schermate intermedie.
 */
export class RegistratoreVocale {
  private mediaRecorder: MediaRecorder | null = null
  private pezzi: Blob[] = []
  private riconoscimento: RiconoscimentoVocale | null = null
  private testo = ''
  private iniziatoIl = 0
  private flusso: MediaStream | null = null

  stato: StatoRegistrazione = 'ferma'

  constructor(private lingua = 'it-IT') {}

  async avvia(): Promise<void> {
    if (this.stato !== 'ferma') return

    this.flusso = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.pezzi = []
    this.testo = ''
    this.iniziatoIl = Date.now()

    const tipoMime = this.scegliTipoMime()
    this.mediaRecorder = new MediaRecorder(
      this.flusso,
      tipoMime ? { mimeType: tipoMime } : undefined,
    )
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.pezzi.push(e.data)
    }
    this.mediaRecorder.start(1000)

    // Il riconoscimento è un di più: se fallisce, la registrazione prosegue.
    this.riconoscimento = creaRiconoscimento(this.lingua)
    if (this.riconoscimento && navigator.onLine) {
      this.riconoscimento.onresult = (e) => {
        for (let i = 0; i < e.results.length; i++) {
          const alternativa = e.results[i][0]
          if (alternativa?.transcript) this.testo += alternativa.transcript + ' '
        }
      }
      this.riconoscimento.onerror = () => {
        this.riconoscimento = null
      }
      try {
        this.riconoscimento.start()
      } catch {
        this.riconoscimento = null
      }
    }

    this.stato = 'in_corso'
  }

  async ferma(): Promise<EsitoRegistrazione> {
    if (this.stato !== 'in_corso' || !this.mediaRecorder) {
      throw new Error('Nessuna registrazione in corso')
    }
    this.stato = 'elaborazione'

    const registratore = this.mediaRecorder
    const tipoMime = registratore.mimeType || 'audio/webm'

    const blob = await new Promise<Blob>((risolvi) => {
      registratore.onstop = () => risolvi(new Blob(this.pezzi, { type: tipoMime }))
      registratore.stop()
    })

    try {
      this.riconoscimento?.stop()
    } catch {
      /* il riconoscimento può essere già chiuso: non è un problema */
    }

    this.flusso?.getTracks().forEach((t) => t.stop())
    this.flusso = null
    this.mediaRecorder = null
    this.stato = 'ferma'

    const trascrizione = this.testo.trim()
    return {
      blob,
      durataSec: Math.round((Date.now() - this.iniziatoIl) / 1000),
      tipoMime,
      trascrizioneImmediata: trascrizione.length > 0 ? trascrizione : undefined,
    }
  }

  annulla(): void {
    try {
      this.mediaRecorder?.stop()
      this.riconoscimento?.stop()
    } catch {
      /* nulla da fare */
    }
    this.flusso?.getTracks().forEach((t) => t.stop())
    this.flusso = null
    this.mediaRecorder = null
    this.pezzi = []
    this.stato = 'ferma'
  }

  private scegliTipoMime(): string | undefined {
    const candidati = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    return candidati.find((c) => MediaRecorder.isTypeSupported?.(c))
  }
}

/**
 * Piccolo aiuto alla trascrizione: i nomi commerciali dei prodotti non stanno in
 * nessun modello linguistico. Confrontiamo le parole dette con il magazzino
 * dell'azienda e correggiamo quelle abbastanza vicine.
 */
export function correggiConMagazzino(testo: string, nomiProdotti: string[]): string {
  if (!testo || nomiProdotti.length === 0) return testo

  return testo
    .split(/\s+/)
    .map((parola) => {
      if (parola.length < 4) return parola
      let migliore: { nome: string; distanza: number } | null = null
      for (const nome of nomiProdotti) {
        const d = distanzaLevenshtein(parola.toLowerCase(), nome.toLowerCase())
        const soglia = Math.floor(nome.length / 3)
        if (d <= soglia && (!migliore || d < migliore.distanza)) {
          migliore = { nome, distanza: d }
        }
      }
      return migliore ? migliore.nome : parola
    })
    .join(' ')
}

function distanzaLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  const precedente = Array.from({ length: b.length + 1 }, (_, i) => i)
  const corrente = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    corrente[0] = i
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      corrente[j] = Math.min(corrente[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + costo)
    }
    for (let j = 0; j <= b.length; j++) precedente[j] = corrente[j]
  }
  return precedente[b.length]
}
