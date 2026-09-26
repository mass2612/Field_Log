/**
 * Note vocali.
 *
 * Regola non negoziabile: **l'audio si salva sempre e comunque**. La trascrizione
 * è un comodo di lettura, l'audio è la prova. Se la trascrizione sbaglia il nome
 * di un prodotto, il registro sarebbe falso: l'audio permette sempre di rimediare.
 *
 * Avvertenza tecnica: la Web Speech API di Chrome *non* è locale, manda l'audio
 * ai server di Google e senza rete non funziona. Per una vera trascrizione
 * offline servirà un modello incorporato nell'app (Whisper compilato in WASM o
 * simili): è previsto, non è ancora qui.
 *
 * Seconda avvertenza, imparata sbagliando: quando la trascrizione non riesce,
 * **il motivo va detto per quello che è.** La prima versione scriveva sempre
 * "manca la rete", anche quando la rete c'era e il problema era un altro. Un
 * messaggio che indovina la causa fa perdere ore a chi lo legge.
 */

export type StatoRegistrazione = 'ferma' | 'in_corso' | 'elaborazione'

/** Perché la trascrizione non c'è. Mai tirare a indovinare. */
export type MotivoMancataTrascrizione =
  | 'non_supportato'
  | 'senza_rete'
  | 'servizio_irraggiungibile'
  | 'permesso_negato'
  | 'microfono_occupato'
  | 'nessun_parlato'
  | 'troppo_breve'
  | 'sconosciuto'

export function spiegaMotivo(motivo: MotivoMancataTrascrizione): string {
  switch (motivo) {
    case 'non_supportato':
      return 'Questo browser non sa trascrivere. Su Android funziona con Chrome.'
    case 'senza_rete':
      return 'Il telefono risulta senza rete: la trascrizione ha bisogno della linea.'
    case 'servizio_irraggiungibile':
      return 'La rete c’è, ma il servizio di trascrizione non ha risposto. Riprova fra poco.'
    case 'permesso_negato':
      return 'Manca il permesso per il microfono. Vai nelle impostazioni del sito e concedilo.'
    case 'microfono_occupato':
      return 'Il microfono era occupato da un’altra applicazione.'
    case 'nessun_parlato':
      return 'Non ho sentito parlare: forse il pulsante si è rilasciato troppo presto.'
    case 'troppo_breve':
      return 'Registrazione troppo breve. Tieni premuto finché hai finito di parlare.'
    case 'sconosciuto':
      return 'Trascrizione non riuscita, e non sono riuscito a capire perché.'
  }
}

export interface EsitoRegistrazione {
  blob: Blob
  durataSec: number
  tipoMime: string
  /** Presente solo se il riconoscimento vocale ha funzionato. */
  trascrizioneImmediata?: string
  /** Presente quando la trascrizione manca: dice **perché**. */
  motivo?: MotivoMancataTrascrizione
}

interface RisultatoRiconoscimento {
  isFinal: boolean
  0: { transcript: string }
}

interface EventoRisultato {
  resultIndex: number
  results: ArrayLike<RisultatoRiconoscimento>
}

interface RiconoscimentoVocale extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: EventoRisultato) => void) | null
  onerror: ((e: { error?: string }) => void) | null
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
  /*
   * I risultati provvisori servono davvero: su una frase corta il risultato
   * definitivo spesso non fa in tempo ad arrivare prima che si rilasci il
   * pulsante. Meglio un testo provvisorio da rileggere che niente.
   */
  r.interimResults = true
  r.maxAlternatives = 1
  return r
}

export function trascrizioneImmediataDisponibile(): boolean {
  return creaRiconoscimento('it-IT') !== null && navigator.onLine
}

/** Codici della Web Speech API tradotti in cause comprensibili. */
function motivoDaCodice(codice?: string): MotivoMancataTrascrizione {
  switch (codice) {
    case 'network':
      return 'servizio_irraggiungibile'
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permesso_negato'
    case 'audio-capture':
      return 'microfono_occupato'
    case 'no-speech':
      return 'nessun_parlato'
    default:
      return 'sconosciuto'
  }
}

export class RegistratoreVocale {
  private mediaRecorder: MediaRecorder | null = null
  private pezzi: Blob[] = []
  private riconoscimento: RiconoscimentoVocale | null = null
  private testoFinale = ''
  private testoProvvisorio = ''
  private motivo: MotivoMancataTrascrizione | undefined
  private fineRiconoscimento: Promise<void> = Promise.resolve()
  private iniziatoIl = 0
  private flusso: MediaStream | null = null

  stato: StatoRegistrazione = 'ferma'

  constructor(private lingua = 'it-IT') {}

  async avvia(): Promise<void> {
    if (this.stato !== 'ferma') return

    this.flusso = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.pezzi = []
    this.testoFinale = ''
    this.testoProvvisorio = ''
    this.motivo = undefined
    this.iniziatoIl = Date.now()

    const tipoMime = this.scegliTipoMime()
    this.mediaRecorder = new MediaRecorder(
      this.flusso,
      tipoMime ? { mimeType: tipoMime } : undefined,
    )
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.pezzi.push(e.data)
    }
    this.mediaRecorder.start(500)

    this.avviaRiconoscimento()
    this.stato = 'in_corso'
  }

  private avviaRiconoscimento(): void {
    this.riconoscimento = creaRiconoscimento(this.lingua)

    if (!this.riconoscimento) {
      this.motivo = 'non_supportato'
      return
    }
    if (!navigator.onLine) {
      this.motivo = 'senza_rete'
      this.riconoscimento = null
      return
    }

    // Si tiene una promessa che si chiude quando il riconoscimento ha finito:
    // i risultati arrivano dopo lo `stop()`, e leggere il testo subito
    // significava leggerlo sempre vuoto. Era il difetto principale.
    let chiudi: () => void = () => {}
    this.fineRiconoscimento = new Promise<void>((risolvi) => {
      chiudi = risolvi
    })

    this.riconoscimento.onresult = (e) => {
      // Si riparte da `resultIndex`, non da zero: altrimenti a ogni evento si
      // riscrivevano anche i pezzi già presi, e il testo usciva triplicato.
      let provvisorio = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const risultato = e.results[i]
        const testo = risultato[0]?.transcript ?? ''
        if (risultato.isFinal) this.testoFinale += testo + ' '
        else provvisorio += testo
      }
      this.testoProvvisorio = provvisorio
    }

    this.riconoscimento.onerror = (e) => {
      this.motivo = motivoDaCodice(e?.error)
      chiudi()
    }

    this.riconoscimento.onend = () => chiudi()

    try {
      this.riconoscimento.start()
    } catch {
      this.motivo = 'sconosciuto'
      this.riconoscimento = null
      chiudi()
    }
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

    // Si chiede al riconoscimento di concludere e **lo si aspetta**, ma non
    // all'infinito: se entro due secondi non ha finito si prende quello che c'è.
    try {
      this.riconoscimento?.stop()
    } catch {
      /* può essere già chiuso: non è un problema */
    }
    await Promise.race([this.fineRiconoscimento, attendi(2000)])

    this.flusso?.getTracks().forEach((t) => t.stop())
    this.flusso = null
    this.mediaRecorder = null
    this.stato = 'ferma'

    const durataSec = Math.round((Date.now() - this.iniziatoIl) / 1000)
    const trascrizione = (this.testoFinale + ' ' + this.testoProvvisorio).trim()

    let motivo = this.motivo
    if (!trascrizione && !motivo) {
      motivo = durataSec < 1 ? 'troppo_breve' : 'nessun_parlato'
    }

    return {
      blob,
      durataSec,
      tipoMime,
      trascrizioneImmediata: trascrizione.length > 0 ? trascrizione : undefined,
      motivo: trascrizione.length > 0 ? undefined : motivo,
    }
  }

  annulla(): void {
    try {
      this.mediaRecorder?.stop()
      this.riconoscimento?.abort()
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

function attendi(millisecondi: number): Promise<void> {
  return new Promise((risolvi) => setTimeout(risolvi, millisecondi))
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
