/**
 * Note vocali.
 *
 * ## Il difetto da cui nasce questo file
 *
 * La prima versione avviava **insieme** il registratore audio e il
 * riconoscimento vocale. Sul telefono non funziona: i due si contendono il
 * microfono, il registratore lo prende per primo e la trascrizione resta a
 * bocca asciutta. Risultato: registrava e non trascriveva mai.
 *
 * Da qui la regola: **uno alla volta.**
 *
 *   1. si prova a **trascrivere** — il microfono lo prende il riconoscimento,
 *      e nessun altro. È la strada normale, e non lascia audio da conservare:
 *      poche decine di byte invece di qualche centinaio di migliaia.
 *   2. se il riconoscimento non c'è o fallisce, si **registra l'audio** e basta,
 *      così almeno quello che è stato detto non si perde.
 *
 * L'app si ricorda com'è andata su questo telefono: se la trascrizione non
 * funziona, smette di riprovare a ogni nota e lo dice, invece di far finta.
 */

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
      return 'Il telefono è senza rete: la trascrizione ha bisogno della linea.'
    case 'servizio_irraggiungibile':
      return 'La rete c’è, ma il servizio di trascrizione non ha risposto.'
    case 'permesso_negato':
      return 'Manca il permesso per il microfono: vai nelle impostazioni del sito e concedilo.'
    case 'microfono_occupato':
      return 'Il microfono era occupato da un’altra applicazione.'
    case 'nessun_parlato':
      return 'Non ho sentito parlare.'
    case 'troppo_breve':
      return 'Troppo breve: tieni premuto finché hai finito di parlare.'
    case 'sconosciuto':
      return 'Trascrizione non riuscita, e non sono riuscito a capire perché.'
  }
}

/** Com'è finita una registrazione. */
export type EsitoVoce =
  | { tipo: 'testo'; testo: string; durataSec: number }
  | {
      tipo: 'audio'
      blob: Blob
      tipoMime: string
      durataSec: number
      motivo: MotivoMancataTrascrizione
    }
  | { tipo: 'niente'; motivo: MotivoMancataTrascrizione; durataSec: number }

// ---------------------------------------------------------------------------
// Memoria di come va su questo telefono
// ---------------------------------------------------------------------------

const CHIAVE_MEMORIA = 'trascrizione-funziona'

export type EsperienzaTrascrizione = 'da_provare' | 'funziona' | 'non_funziona'

export function comeVaQui(): EsperienzaTrascrizione {
  try {
    return (localStorage.getItem(CHIAVE_MEMORIA) as EsperienzaTrascrizione) ?? 'da_provare'
  } catch {
    return 'da_provare'
  }
}

const CHIAVE_MOTIVO = 'trascrizione-motivo'

export function ricordaEsito(esito: EsperienzaTrascrizione, motivo?: MotivoMancataTrascrizione): void {
  try {
    localStorage.setItem(CHIAVE_MEMORIA, esito)
    // Si ricorda **anche il perché**: altrimenti alla registrazione successiva
    // l'app raccontava un motivo a caso ("questo browser non sa trascrivere")
    // anche quando il problema era un altro.
    if (motivo) localStorage.setItem(CHIAVE_MOTIVO, motivo)
    else localStorage.removeItem(CHIAVE_MOTIVO)
  } catch {
    /* se il telefono non vuole ricordare, pazienza: si riprova ogni volta */
  }
}

export function motivoRicordato(): MotivoMancataTrascrizione {
  try {
    return (localStorage.getItem(CHIAVE_MOTIVO) as MotivoMancataTrascrizione) ?? 'sconosciuto'
  } catch {
    return 'sconosciuto'
  }
}

/** Fa dimenticare: si riprova a trascrivere alla prossima nota. */
export function riprovaTrascrizione(): void {
  try {
    localStorage.removeItem(CHIAVE_MEMORIA)
    localStorage.removeItem(CHIAVE_MOTIVO)
  } catch {
    /* nulla da fare */
  }
}

// ---------------------------------------------------------------------------
// Riconoscimento vocale
// ---------------------------------------------------------------------------

interface RisultatoRiconoscimento {
  isFinal: boolean
  0: { transcript: string }
}

interface EventoRisultato {
  resultIndex: number
  results: ArrayLike<RisultatoRiconoscimento>
}

interface RiconoscimentoVocale {
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

function costruttoreRiconoscimento(): (new () => RiconoscimentoVocale) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => RiconoscimentoVocale
    webkitSpeechRecognition?: new () => RiconoscimentoVocale
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function creaRiconoscimento(lingua: string): RiconoscimentoVocale | null {
  const Costruttore = costruttoreRiconoscimento()
  if (!Costruttore) return null

  const r = new Costruttore()
  r.lang = lingua
  r.continuous = true
  // I risultati provvisori salvano le frasi corte: il definitivo spesso non fa
  // in tempo ad arrivare prima che si rilasci il pulsante.
  r.interimResults = true
  r.maxAlternatives = 1
  return r
}

export function trascrizioneDisponibile(): boolean {
  return costruttoreRiconoscimento() !== undefined
}

/**
 * Ricompone l'intera trascrizione dall'elenco dei risultati.
 *
 * ## Perché si rifà tutto da capo ogni volta
 *
 * La versione precedente sommava i pezzi man mano che arrivavano
 * (`testoFinale += ...`). Sembra ragionevole e invece produce questo:
 *
 *     vediamo Vediamo Vediamo cosa Vediamo cosa scrive Vediamo cosa scrive 15 kg
 *
 * Il motivo: il riconoscimento **rimanda gli stessi risultati più volte** — li
 * corregge mentre uno parla, e quando li dà per definitivi li ripropone. Ogni
 * rinvio veniva sommato di nuovo, e la frase ricresceva a ogni giro.
 *
 * `e.results` contiene sempre **tutti** i risultati della sessione, dal primo.
 * Quindi la cosa giusta è ricostruire da zero e assegnare, mai sommare: così
 * la funzione si può ripetere quante volte si vuole senza cambiare l'esito.
 *
 * ## Il secondo difetto: Chrome su Android
 *
 * Ricostruire da zero non bastava. Dettando "proviamo di nuovo e vediamo cosa
 * legge" usciva:
 *
 *     proviamo proviamo proviamo di proviamo di nuovo proviamo di nuovo e ...
 *
 * Su Android l'elenco dei risultati non contiene pezzi di frase uno dopo
 * l'altro, come sul computer: contiene **la stessa frase ripresa da capo e
 * allungata a ogni risultato** — "proviamo", "proviamo di", "proviamo di
 * nuovo"... E ognuno arriva già marcato come definitivo. Metterli in fila dava
 * la frase ripetuta dieci volte.
 *
 * Regola: se un risultato **riprende** quello prima (ne contiene quasi tutte le
 * parole, nello stesso ordine) allora lo sostituisce; se no, lo segue. Il
 * "quasi" serve perché nel riprendere il riconoscimento corregge: una volta ha
 * scritto "e vediamo cosa", la volta dopo "vediamo cosa legge", senza la "e".
 */
export function componiTrascrizione(risultati: ArrayLike<RisultatoRiconoscimento>): {
  finale: string
  provvisorio: string
} {
  const pezzi: { testo: string; definitivo: boolean }[] = []

  for (let i = 0; i < risultati.length; i++) {
    const risultato = risultati[i]
    const testo = (risultato?.[0]?.transcript ?? '').trim()
    if (!testo) continue
    const pezzo = { testo, definitivo: Boolean(risultato.isFinal) }

    const precedente = pezzi[pezzi.length - 1]
    if (precedente && riprende(testo, precedente.testo)) pezzi[pezzi.length - 1] = pezzo
    else pezzi.push(pezzo)
  }

  const unisci = (definitivo: boolean) =>
    pezzi
      .filter((p) => p.definitivo === definitivo)
      .map((p) => p.testo)
      .join(' ')

  return { finale: unisci(true), provvisorio: unisci(false) }
}

function parole(testo: string): string[] {
  return testo
    .toLowerCase()
    .replace(/[.,;:!?«»"“”']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Vero se `nuovo` è la stessa frase di `vecchio`, ripresa e magari allungata o
 * corretta di una parola.
 *
 * Due frasi diverse che si somigliano ("dato il rame alla vigna" e poi "dato il
 * rame al frutteto") **non** devono fondersi: per questo si chiede che quasi
 * tutto il vecchio ci sia, e non solo metà.
 */
function riprende(nuovo: string, vecchio: string): boolean {
  const n = parole(nuovo)
  const v = parole(vecchio)
  if (v.length === 0) return true
  if (n.length < v.length - 1) return false
  const comuni = sottosequenzaComune(n, v)
  return comuni >= Math.max(1, Math.ceil(v.length * 0.8))
}

/** Quante parole di `a` e `b` compaiono in tutti e due, nello stesso ordine. */
function sottosequenzaComune(a: string[], b: string[]): number {
  const riga = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    let diagonale = 0
    for (let j = 1; j <= b.length; j++) {
      const sopra = riga[j]
      riga[j] = a[i - 1] === b[j - 1] ? diagonale + 1 : Math.max(riga[j], riga[j - 1])
      diagonale = sopra
    }
  }
  return riga[b.length]
}

// ---------------------------------------------------------------------------
// Cosa ha mandato davvero il telefono
// ---------------------------------------------------------------------------

/**
 * Il difetto qui sopra l'avevo "corretto" una volta con un test che imitava il
 * telefono **come immaginavo che fosse**, non com'era. Il test era verde e sul
 * telefono non cambiava niente.
 *
 * Da qui questo registro: l'ultima dettatura si tiene così com'è arrivata, e si
 * può leggere dalle Impostazioni. La prossima volta si parte dai dati veri.
 */
const CHIAVE_GREZZO = 'ultima-dettatura-grezza'

export interface DettaturaGrezza {
  quando: number
  /** Una voce per sessione di ascolto: l'ultimo elenco di risultati ricevuto. */
  sessioni: { testo: string; definitivo: boolean }[][]
  errore?: string
  risultato: string
}

export function ultimaDettaturaGrezza(): DettaturaGrezza | null {
  try {
    const s = localStorage.getItem(CHIAVE_GREZZO)
    return s ? (JSON.parse(s) as DettaturaGrezza) : null
  } catch {
    return null
  }
}

function salvaDettaturaGrezza(d: DettaturaGrezza): void {
  try {
    localStorage.setItem(CHIAVE_GREZZO, JSON.stringify(d))
  } catch {
    /* è solo un aiuto per capire: se non si salva, pazienza */
  }
}

function copiaRisultati(
  risultati: ArrayLike<RisultatoRiconoscimento>,
): { testo: string; definitivo: boolean }[] {
  return Array.from({ length: risultati.length }, (_, i) => ({
    testo: risultati[i]?.[0]?.transcript ?? '',
    definitivo: Boolean(risultati[i]?.isFinal),
  }))
}

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

/**
 * Trascrive mentre si parla. **Non tocca il microfono con nient'altro**: è
 * tutto il punto.
 */
const RIAVVII_MASSIMI = 20

export class Trascrittore {
  private riconoscimento: RiconoscimentoVocale | null = null
  /** Testo delle sessioni già chiuse: non va perso quando se ne apre una nuova. */
  private accumulato = ''
  private testoFinale = ''
  private testoProvvisorio = ''
  private motivo: MotivoMancataTrascrizione | undefined
  private fine: Promise<void> = Promise.resolve()
  private iniziatoIl = 0
  private chiudi: () => void = () => {}
  private fermatoDaNoi = false
  private riavvii = 0
  /** Quello che il telefono ha mandato, così com'è: vedi `DettaturaGrezza`. */
  private grezzo: { testo: string; definitivo: boolean }[][] = []
  private codiceErrore: string | undefined

  constructor(private lingua = 'it-IT') {}

  /** Falso se il browser non sa trascrivere: allora si passa all'audio. */
  avvia(): boolean {
    // Si controlla solo se il browser ce l'ha, senza costruirne uno a vuoto.
    if (!costruttoreRiconoscimento()) {
      this.motivo = 'non_supportato'
      return false
    }

    this.accumulato = ''
    this.testoFinale = ''
    this.testoProvvisorio = ''
    this.motivo = undefined
    this.fermatoDaNoi = false
    this.riavvii = 0
    this.grezzo = []
    this.codiceErrore = undefined
    this.iniziatoIl = Date.now()
    this.fine = new Promise<void>((risolvi) => {
      this.chiudi = risolvi
    })

    return this.apriSessione()
  }

  /**
   * Apre una sessione di ascolto.
   *
   * Il riconoscimento si chiude da solo dopo una pausa un po' lunga — succede
   * di continuo mentre si racconta qualcosa pensandoci su. Quando capita si
   * mette da parte quello che ha già capito e si riapre: senza, il pezzo di
   * frase detto prima della pausa andrebbe perso.
   */
  private apriSessione(): boolean {
    const r = creaRiconoscimento(this.lingua)
    if (!r) return false
    this.riconoscimento = r
    const sessione = this.grezzo.length
    this.grezzo.push([])

    r.onresult = (e) => {
      this.grezzo[sessione] = copiaRisultati(e.results)
      // Si riscrive tutto da capo: sommare i pezzi faceva ricrescere la frase
      // a ogni rinvio. Vedi `componiTrascrizione`.
      const { finale, provvisorio } = componiTrascrizione(e.results)
      this.testoFinale = finale
      this.testoProvvisorio = provvisorio
    }

    r.onerror = (e) => {
      this.codiceErrore = e?.error
      this.motivo = motivoDaCodice(e?.error)
      // Su un errore non si riprova: se il servizio non risponde, riaprire
      // venti volte non lo fa rispondere, e intanto scalda la batteria.
      this.fermatoDaNoi = true
      this.chiudi()
    }

    r.onend = () => {
      if (this.fermatoDaNoi || this.riavvii >= RIAVVII_MASSIMI) {
        this.chiudi()
        return
      }
      this.riavvii++
      this.metteDaParte()
      if (!this.apriSessione()) this.chiudi()
    }

    try {
      r.start()
      return true
    } catch {
      this.motivo = 'sconosciuto'
      this.riconoscimento = null
      this.chiudi()
      return false
    }
  }

  private metteDaParte(): void {
    const pezzo = (this.testoFinale + ' ' + this.testoProvvisorio).trim()
    if (pezzo) this.accumulato = (this.accumulato + ' ' + pezzo).trim()
    this.testoFinale = ''
    this.testoProvvisorio = ''
  }

  async ferma(): Promise<EsitoVoce> {
    // Prima si dichiara che la chiusura è voluta, poi si ferma: altrimenti
    // `onend` riaprirebbe una sessione nuova invece di concludere.
    this.fermatoDaNoi = true
    try {
      this.riconoscimento?.stop()
    } catch {
      /* può essere già chiuso */
    }

    // I risultati arrivano **dopo** lo stop: si aspetta, ma non all'infinito.
    await Promise.race([this.fine, attendi(2500)])

    const durataSec = Math.round((Date.now() - this.iniziatoIl) / 1000)
    const testo = [this.accumulato, this.testoFinale, this.testoProvvisorio]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    salvaDettaturaGrezza({
      quando: Date.now(),
      sessioni: this.grezzo.filter((s) => s.length > 0),
      errore: this.codiceErrore,
      risultato: testo,
    })

    if (testo) return { tipo: 'testo', testo, durataSec }

    const motivo = this.motivo ?? (durataSec < 1 ? 'troppo_breve' : 'nessun_parlato')
    return { tipo: 'niente', motivo, durataSec }
  }

  annulla(): void {
    this.fermatoDaNoi = true
    try {
      this.riconoscimento?.abort()
    } catch {
      /* nulla da fare */
    }
    this.chiudi()
  }
}

// ---------------------------------------------------------------------------
// Registrazione dell'audio, quando la trascrizione non è possibile
// ---------------------------------------------------------------------------

export class RegistratoreAudio {
  private mediaRecorder: MediaRecorder | null = null
  private pezzi: Blob[] = []
  private flusso: MediaStream | null = null
  private iniziatoIl = 0

  async avvia(): Promise<void> {
    this.flusso = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.pezzi = []
    this.iniziatoIl = Date.now()

    const tipoMime = scegliTipoMime()
    this.mediaRecorder = new MediaRecorder(
      this.flusso,
      tipoMime ? { mimeType: tipoMime } : undefined,
    )
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.pezzi.push(e.data)
    }
    this.mediaRecorder.start(500)
  }

  async ferma(motivo: MotivoMancataTrascrizione): Promise<EsitoVoce> {
    const registratore = this.mediaRecorder
    if (!registratore) return { tipo: 'niente', motivo, durataSec: 0 }

    const tipoMime = registratore.mimeType || 'audio/webm'
    const blob = await new Promise<Blob>((risolvi) => {
      registratore.onstop = () => risolvi(new Blob(this.pezzi, { type: tipoMime }))
      registratore.stop()
    })

    this.liberaMicrofono()
    return {
      tipo: 'audio',
      blob,
      tipoMime,
      durataSec: Math.round((Date.now() - this.iniziatoIl) / 1000),
      motivo,
    }
  }

  annulla(): void {
    try {
      this.mediaRecorder?.stop()
    } catch {
      /* nulla da fare */
    }
    this.liberaMicrofono()
    this.pezzi = []
  }

  private liberaMicrofono(): void {
    this.flusso?.getTracks().forEach((t) => t.stop())
    this.flusso = null
    this.mediaRecorder = null
  }
}

function scegliTipoMime(): string | undefined {
  const candidati = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidati.find((c) => MediaRecorder.isTypeSupported?.(c))
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
