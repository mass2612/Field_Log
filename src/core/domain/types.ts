/**
 * Modello di dominio — NUCLEO.
 *
 * Questo file non contiene nulla di specificamente italiano: è il modello valido
 * in tutta l'Unione. Le regole nazionali (quali campi sono obbligatori, quali
 * stampe, quali export) vivono in `src/packs/<paese>` e leggono queste strutture.
 *
 * Regola d'oro: il registro non cancella e non sovrascrive. Ogni record porta con
 * sé quando è stato scritto, oltre a quando è avvenuto il fatto.
 */

export type ID = string

/** Data e ora in formato ISO 8601 (UTC). */
export type Istante = string

/** Data civile `YYYY-MM-DD`, senza fuso orario: le date agronomiche sono giorni. */
export type Giorno = string

/** Campi presenti su ogni record archiviato. */
export interface Tracciato {
  id: ID
  /** Quando la riga è stata effettivamente scritta. Non modificabile. */
  creatoIl: Istante
  /** Ultima modifica. Le modifiche restano visibili nel registro rettifiche. */
  modificatoIl: Istante
  /** Ultima sincronizzazione andata a buon fine col server. */
  sincronizzatoIl?: Istante
  /**
   * Annullamento logico. Una registrazione di legge non si cancella:
   * si annulla motivandolo, e resta leggibile.
   */
  annullatoIl?: Istante
  motivoAnnullamento?: string

  /**
   * Roba nata in fase di prova: dati dimostrativi, fatture finte, tentativi.
   *
   * Serve a poterla togliere tutta insieme il giorno che l'azienda comincia a
   * usare l'app sul serio. Un quaderno vero che si porta dietro la "Vigna sotto
   * casa" inventata non è un quaderno di cui ci si fida.
   */
  dimostrativo?: boolean
}

// ---------------------------------------------------------------------------
// Azienda, campi, colture
// ---------------------------------------------------------------------------

export interface Azienda extends Tracciato {
  nome: string
  /** ISO 3166-1 alpha-2: determina quale pacchetto normativo si applica. */
  paese: string
  /** Suddivisione amministrativa (regione IT, département FR, comunidad ES...). */
  regione?: string
  partitaIva?: string
  /** Codice unico aziendale, CUAA in Italia. */
  codiceAziendale?: string
  indirizzo?: string
  biologico?: boolean
  /**
   * Dove sta l'azienda. Si segna una volta e non se ne parla più.
   *
   * Non serve a sapere in che campo sei — il GPS di un telefono non ci arriva,
   * e chi dice il contrario vende fumo. Serve a sapere **che tempo fa qui**:
   * temperatura e pioggia sono i dati che l'anno dopo spiegano l'annata.
   */
  posizione?: Coordinate
}

/** Riferimento catastale di una particella. Struttura variabile per paese. */
export interface Particella {
  comune?: string
  foglio?: string
  numero?: string
  superficieHa?: number
}

export interface Campo extends Tracciato {
  aziendaId: ID
  /** Il nome che usa l'agricoltore: "Vigna sotto casa". È questa l'identità. */
  nome: string
  superficieHa: number
  particelle: Particella[]
  /** Contorno del campo in GeoJSON, se disegnato o importato. */
  geometria?: GeoJSONPoligono
  /** Centro del campo: usato per il riconoscimento GPS quando manca il contorno. */
  centro?: Coordinate
  /** Raggio in metri entro cui il GPS suggerisce questo campo. */
  raggioSuggerimentoM?: number
  colore?: string
  note?: string
}

export interface Coordinate {
  lat: number
  lon: number
  /** Precisione dichiarata dal dispositivo, in metri. */
  precisioneM?: number
  quotaM?: number
}

export interface GeoJSONPoligono {
  type: 'Polygon'
  /** [lon, lat] come da specifica GeoJSON. */
  coordinates: number[][][]
}

/**
 * Una coltura su un campo in una data annata. È l'unità su cui si confrontano
 * le stagioni: costi, interventi e rese si aggregano qui.
 */
export interface Coltura extends Tracciato {
  campoId: ID
  /** Annata agraria, non necessariamente l'anno solare. */
  annata: number
  /** Specie: vite, frumento tenero, mais... */
  specie: string
  varieta?: string
  /** Lotto delle sementi: serve alla tracciabilità a monte. */
  lottoSementi?: string
  /**
   * Cosa c'era sul campo l'annata prima.
   *
   * Pesa moltissimo su resa e fertilità, ed è una delle prime cose che la
   * ricerca agronomica guarda per spiegare un risultato. Nessuno se la ricorda
   * a tre anni di distanza: va scritta adesso, anche se oggi non la guarda
   * nessuno. I dati del 2026 o li raccogli nel 2026 o non esistono.
   */
  precessione?: string
  dataSemina?: Giorno
  dataRaccoltaPrevista?: Giorno
  /** Superficie effettiva se diversa da quella del campo. */
  superficieHa?: number
  note?: string
}

/**
 * Analisi del terreno.
 *
 * Si fa ogni qualche anno e costa: proprio per questo il referto non deve finire
 * in un cassetto. È una delle variabili con cui si spiega una resa.
 */
export interface AnalisiSuolo extends Tracciato {
  aziendaId: ID
  campoId: ID
  data: Giorno
  laboratorio?: string
  ph?: number
  sostanzaOrganicaPct?: number
  /** Sabbia / limo / argilla, o la classe tessiturale. */
  tessitura?: string
  calcareTotalePct?: number
  azotoTotalePct?: number
  fosforoPpm?: number
  potassioPpm?: number
  /** Capacità di scambio cationico, meq/100 g. */
  cec?: number
  allegatoId?: ID
  note?: string
}

// ---------------------------------------------------------------------------
// Persone e macchine
// ---------------------------------------------------------------------------

export interface Operatore extends Tracciato {
  aziendaId: ID
  nome: string
  cognome: string
  ruolo: 'titolare' | 'dipendente' | 'contoterzista' | 'consulente'
  /** Azienda esterna, quando l'operatore non è dell'azienda. */
  aziendaEsterna?: string
  telefono?: string
  attivo: boolean
}

export type TipoAttrezzo =
  | 'irroratrice'
  | 'atomizzatore'
  | 'spandiconcime'
  | 'seminatrice'
  | 'trattore'
  | 'altro'

export interface Attrezzo extends Tracciato {
  aziendaId: ID
  nome: string
  tipo: TipoAttrezzo
  marca?: string
  modello?: string
  targa?: string
  /** Capacità della botte in litri: serve al calcolatore della miscela. */
  capacitaLitri?: number
  /** Larghezza di lavoro in metri. */
  larghezzaLavoroM?: number
  attivo: boolean
}

/**
 * Regolazioni della macchina al momento del lavoro.
 *
 * È il dato che oggi sta su un foglietto in cabina e sparisce con la pioggia,
 * ed è metà del valore del quaderno originale: l'anno prossimo vuoi sapere a
 * che tacca eri, non quanto dice la tabella del costruttore.
 *
 * Salvate come coppie chiave-valore, non come struttura fissa: quali
 * regolazioni esistano lo dice lo schema della famiglia di attrezzo
 * (`src/core/domain/settaggi.ts`). Aggiungere una macchina nuova significa
 * aggiungere uno schema, non toccare il modello dati.
 */
export type Settaggi = Record<string, string | number>

export type TipoTaratura = 'semina' | 'distribuzione' | 'irrorazione'

/**
 * Prova di taratura: la misura che trasforma un'impressione in un dato.
 *
 * Si fa scendere il prodotto su una distanza nota, si pesa quello raccolto, e si
 * scopre quanto la macchina stia davvero facendo. Resta agganciata all'attrezzo
 * **e ai settaggi con cui è stata fatta**, perché è quella coppia che vale.
 */
export interface Taratura extends Tracciato {
  aziendaId: ID
  attrezzoId: ID
  data: Giorno
  tipo: TipoTaratura
  /** Le regolazioni in uso durante la prova. */
  settaggi: Settaggi
  /** Quanto era impostato sulla macchina, per ettaro. */
  dosePerHaImpostata?: number
  /** Distanza percorsa durante la prova, in metri. */
  distanzaM?: number
  /** Larghezza di lavoro durante la prova, in metri. */
  larghezzaM?: number
  /** Quantità raccolta nella prova, in grammi. */
  quantitaRaccoltaG?: number
  /** Risultato della prova: quantità reale per ettaro. */
  dosePerHaReale?: number
  unitaMisura: UnitaMisura
  prodottoId?: ID
  note?: string
}

// ---------------------------------------------------------------------------
// Documenti e scadenze
// ---------------------------------------------------------------------------

export type TipoDocumento =
  | 'patentino_fitosanitari'
  | 'controllo_funzionale'
  | 'revisione_macchina'
  | 'assicurazione'
  | 'formazione'
  | 'visita_medica'
  | 'certificazione'
  | 'altro'

/** A cosa è agganciato un documento: una persona, una macchina o l'azienda. */
export type SoggettoDocumento =
  | { tipo: 'operatore'; id: ID }
  | { tipo: 'attrezzo'; id: ID }
  | { tipo: 'azienda'; id: ID }

export interface Documento extends Tracciato {
  aziendaId: ID
  soggetto: SoggettoDocumento
  tipo: TipoDocumento
  descrizione: string
  numero?: string
  rilasciatoIl?: Giorno
  scadeIl?: Giorno
  /** Riferimento all'immagine archiviata (foto del documento). */
  allegatoId?: ID
  /** Giorni di preavviso. Se assente vale il valore predefinito dell'azienda. */
  preavvisoGiorni?: number
  note?: string
}

// ---------------------------------------------------------------------------
// Prodotti e magazzino
// ---------------------------------------------------------------------------

export type UnitaMisura = 'l' | 'ml' | 'kg' | 'g' | 'q' | 't' | 'pz'

export type TipoProdotto = 'fitosanitario' | 'fertilizzante' | 'sementi' | 'altro'

/**
 * Scheda prodotto. I campi normativi (carenza, rientro, limiti) arrivano dal
 * registro ufficiale del paese quando disponibile, altrimenti sono inseriti a
 * mano: in quel caso `fonte` vale 'manuale' e l'app non li tratta come certi.
 */
export interface Prodotto extends Tracciato {
  aziendaId: ID
  nome: string
  tipo: TipoProdotto
  /** Numero di autorizzazione/registrazione nazionale. */
  numeroRegistrazione?: string
  produttore?: string
  sostanzeAttive?: { nome: string; percentuale?: number }[]
  unitaMisura: UnitaMisura
  /** Giorni che devono passare fra il trattamento e la raccolta. */
  tempoCarenzaGiorni?: number
  /** Ore prima di poter rientrare in campo senza dispositivi di protezione. */
  tempoRientroOre?: number
  /** Numero massimo di interventi ammessi per annata. */
  interventiMaxAnnata?: number
  /** Dose massima autorizzata, nell'unità del prodotto, per ettaro. */
  doseMaxPerHa?: number
  /** Distanza minima da corpi idrici, in metri. */
  fasciaRispettoM?: number
  colturaAmmesse?: string[]
  /** Data dalla quale il prodotto è revocato: dopo, non si può più acquistare. */
  revocatoDal?: Giorno
  /** Termine ultimo per lo smaltimento delle scorte già in magazzino. */
  utilizzabileFinoAl?: Giorno
  fonte: 'manuale' | 'registro_ufficiale'
  /** Chiave del record nel registro ufficiale, per gli aggiornamenti. */
  chiaveRegistro?: string
  note?: string
}

/**
 * Lotto fisico a magazzino. La tracciabilità richiede il lotto, non solo il
 * prodotto: un richiamo colpisce un lotto.
 */
export interface Lotto extends Tracciato {
  aziendaId: ID
  prodottoId: ID
  codiceLotto?: string
  scadenza?: Giorno
  /** Prezzo unitario di acquisto: alimenta il costo per ettaro. */
  prezzoUnitario?: number
  valuta?: string
  fatturaId?: ID
}

export type CausaleMovimento =
  | 'acquisto'
  | 'utilizzo'
  | 'rettifica_inventario'
  | 'smaltimento'
  | 'reso'

export interface MovimentoMagazzino extends Tracciato {
  aziendaId: ID
  lottoId: ID
  data: Giorno
  /** Positiva in carico, negativa in scarico. */
  quantita: number
  unitaMisura: UnitaMisura
  causale: CausaleMovimento
  /** Intervento che ha generato lo scarico, quando applicabile. */
  interventoId?: ID
  note?: string
}

export interface Fattura extends Tracciato {
  aziendaId: ID
  fornitore?: string
  numero?: string
  data?: Giorno
  imponibile?: number
  totale?: number
  valuta?: string
  /** Foto o PDF della fattura. */
  allegatoId?: ID
  /** Esito della lettura automatica: serve a sapere cosa va ricontrollato. */
  statoLettura: 'da_leggere' | 'letta_automatica' | 'confermata_a_mano'
}

// ---------------------------------------------------------------------------
// Interventi — il centro del quaderno
// ---------------------------------------------------------------------------

export type TipoIntervento =
  | 'trattamento'
  | 'fertilizzazione'
  | 'irrigazione'
  | 'semina'
  | 'lavorazione'
  | 'raccolta'
  | 'osservazione'

/** Una riga di prodotto impiegato in un intervento. */
export interface RigaProdotto {
  prodottoId: ID
  lottoId?: ID
  /** Quantità complessivamente impiegata sul campo. */
  quantita: number
  unitaMisura: UnitaMisura
  /**
   * Vero quando la quantità è una stima e non una misura.
   *
   * Quanto sia sceso davvero non lo sa nessuno al litro: l'app non deve fingere
   * una precisione che non ha. Un dato dichiarato stimato è un dato onesto, e
   * resta correggibile quando si sa di più.
   */
  stimata?: boolean
  /** Dose di etichetta dichiarata, per riferimento (es. "150 ml/hl"). */
  doseEtichetta?: string
  avversita?: string
}

export interface Meteo {
  temperaturaC?: number
  umiditaPct?: number
  ventoKmh?: number
  direzioneVento?: string
  pioggiaMm24hPrima?: number
  pioggiaMm24hDopo?: number
  fonte?: string
  rilevatoIl?: Istante
}

/** Nota vocale: l'audio si conserva sempre, la trascrizione può sbagliare. */
export interface NotaVocale {
  allegatoId: ID
  durataSec?: number
  /** Prima trascrizione, fatta sul dispositivo, anche senza rete. */
  trascrizioneLocale?: string
  /** Trascrizione più accurata ottenuta dal server quando torna la linea. */
  trascrizioneServer?: string
  statoTrascrizione: 'assente' | 'locale' | 'in_coda_server' | 'server'
  /** Testo eventualmente corretto a mano: se presente, vince su tutto. */
  testoCorretto?: string
}

/**
 * Dati della raccolta: chiudono il ciclo.
 *
 * Senza questi il confronto fra annate non esiste, e l'app resta un registro.
 */
export interface DatiRaccolta {
  quantita?: number
  unitaMisura?: UnitaMisura
  /** Resa per ettaro, calcolata ma memorizzata per lo storico. */
  resaPerHa?: number
  /**
   * Qualità misurata, strutturata invece che in testo libero: sono i numeri con
   * cui si spiega una resa, e in testo libero non si possono confrontare.
   * Quali abbiano senso dipende dalla coltura — umidità e proteine per il
   * frumento, grado zuccherino per l'uva.
   */
  umiditaPct?: number
  proteinePct?: number
  pesoSpecifico?: number
  gradoZuccherino?: number
  /** Qualunque altra misura, come coppie chiave-valore. */
  altreMisure?: Record<string, number>
  qualita?: string
  prezzoUnitario?: number
  valuta?: string
  acquirente?: string
}

export interface Intervento extends Tracciato {
  aziendaId: ID
  campoId: ID
  colturaId?: ID
  tipo: TipoIntervento

  /** Giorno in cui il lavoro è stato fatto: può differire da `creatoIl`. */
  data: Giorno
  oraInizio?: string
  oraFine?: string

  operatoreId?: ID
  attrezzoId?: ID

  righe: RigaProdotto[]

  /** Superficie effettivamente trattata, se inferiore al campo. */
  superficieTrattataHa?: number
  /** Volume d'acqua distribuito, in litri per ettaro. */
  volumeAcquaLHa?: number

  /** Regolazioni della macchina durante questo lavoro. */
  settaggi?: Settaggi
  /**
   * Quanto era impostato sulla macchina, per ettaro.
   * Il confronto con la quantità effettivamente impiegata è il primo dato utile
   * che l'app può restituire: è lì che si nascondono gli errori che nessuno vede.
   */
  dosePerHaImpostata?: number
  /** Prova di taratura di riferimento, quando esiste. */
  taraturaId?: ID
  /** Stadio fenologico della coltura al momento dell'intervento. */
  stadioFenologico?: string

  posizione?: Coordinate
  /**
   * Come è stato attribuito il campo. Serve a distinguere un dato rilevato da
   * uno dichiarato: con i dipendenti il GPS del titolare non vale.
   */
  origineCampo: 'gps' | 'manuale' | 'ripetuto'
  meteo?: Meteo

  note?: string
  notaVocale?: NotaVocale
  allegatiId?: ID[]

  raccolta?: DatiRaccolta

  /**
   * Data prima della quale non si può raccogliere, calcolata dal tempo di
   * carenza più lungo fra i prodotti impiegati. Memorizzata perché il registro
   * deve restare leggibile anche se l'etichetta del prodotto cambia in futuro.
   */
  raccoltaConsentitaDal?: Giorno
  rientroConsentitoDal?: Istante

  /** Bozza inserita al volo in campo, ancora da completare. */
  daCompletare?: boolean
}

// ---------------------------------------------------------------------------
// Allegati e registro delle rettifiche
// ---------------------------------------------------------------------------

export interface Allegato extends Tracciato {
  aziendaId: ID
  nomeFile: string
  tipoMime: string
  dimensioneByte: number
  /** Il contenuto resta sul dispositivo finché non viene sincronizzato. */
  blob?: Blob
  urlRemota?: string
  /** Dove è stata scattata la foto, quando disponibile. */
  posizione?: Coordinate
}

/**
 * Registro append-only delle modifiche. Un quaderno che si può riscrivere a
 * posteriori non ha valore probatorio: qui ogni rettifica resta scritta.
 */
export interface Rettifica {
  id: ID
  aziendaId: ID
  tabella: string
  recordId: ID
  campo: string
  valorePrecedente: string
  valoreNuovo: string
  motivo?: string
  operatoreId?: ID
  avvenutaIl: Istante
}
