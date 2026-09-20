/**
 * Traduzioni.
 *
 * Esiste dal primo giorno perché aggiungere le lingue dopo significa riscrivere
 * ogni schermata. L'italiano è la lingua di riferimento: le altre possono essere
 * incomplete e ricadono sull'italiano senza rompere nulla.
 *
 * Attenzione: qui stanno solo le parole dell'interfaccia. I termini *normativi*
 * (nomi dei registri, diciture obbligatorie sulle stampe) stanno nei pacchetti
 * paese, perché non sono traduzioni ma testi di legge diversi.
 */

export const LINGUE = {
  it: 'Italiano',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
} as const

export type Lingua = keyof typeof LINGUE

const it = {
  'app.nome': 'Quaderno di Campagna',

  'nav.oggi': 'Oggi',
  'nav.campi': 'Campi',
  'nav.registra': 'Registra',
  'nav.magazzino': 'Magazzino',
  'nav.altro': 'Altro',

  'oggi.titolo': 'Oggi',
  'oggi.daSistemare': 'Da sistemare',
  'oggi.nienteDaSegnalare': 'Niente da segnalare. Buon lavoro.',
  'oggi.ultimiInterventi': 'Ultimi interventi',
  'oggi.nessunIntervento': 'Non hai ancora registrato niente.',
  'oggi.bozze': 'Bozze da completare',

  'azione.registraTrattamento': 'Trattamento',
  'azione.registraConcimazione': 'Concimazione',
  'azione.registraRaccolta': 'Raccolta',
  'azione.registraNota': 'Nota',

  'campi.titolo': 'Campi',
  'campi.nuovo': 'Nuovo campo',
  'campi.nessuno': 'Nessun campo. Comincia da qui.',
  'campi.superficie': 'Superficie',
  'campi.coltura': 'Coltura',
  'campi.raccoltaConsentitaDal': 'Raccolta consentita dal',
  'campi.raccoltaLibera': 'Nessun vincolo di raccolta',
  'campi.carenzaIncompleta': 'Manca il tempo di carenza di qualche prodotto',
  'campi.storico': 'Storico',

  'intervento.nuovo': 'Nuovo intervento',
  'intervento.tipo': 'Tipo',
  'intervento.campo': 'Campo',
  'intervento.data': 'Data',
  'intervento.operatore': 'Chi ha lavorato',
  'intervento.attrezzo': 'Attrezzo',
  'intervento.prodotti': 'Prodotti',
  'intervento.aggiungiProdotto': 'Aggiungi prodotto',
  'intervento.superficieTrattata': 'Superficie trattata (ha)',
  'intervento.note': 'Note',
  'intervento.salva': 'Salva',
  'intervento.salvaBozza': 'Salva come bozza',
  'intervento.posizione': 'Posizione',
  'intervento.rilevaPosizione': 'Rileva posizione',
  'intervento.campoSuggerito': 'Campo suggerito dal GPS',
  'intervento.confermaCampo': 'Conferma il campo',

  'voce.registra': 'Tieni premuto per parlare',
  'voce.inCorso': 'Sto registrando…',
  'voce.trascrizioneInCorso': 'Trascrivo…',
  'voce.riascolta': 'Riascolta',
  'voce.audioConservato': 'L’audio resta salvato',

  'miscela.titolo': 'Calcolo miscela',
  'miscela.dose': 'Dose',
  'miscela.perHa': 'per ettaro',
  'miscela.perHl': 'per ettolitro',
  'miscela.volumeAcqua': 'Acqua (l/ha)',
  'miscela.capacitaBotte': 'Botte (l)',
  'miscela.perBotte': 'Per ogni botte piena',
  'miscela.totale': 'Totale prodotto',

  'magazzino.titolo': 'Magazzino',
  'magazzino.giacenza': 'Giacenza',
  'magazzino.nessunProdotto': 'Magazzino vuoto.',
  'magazzino.caricaFattura': 'Carica da fattura',

  'scadenze.titolo': 'Scadenze',
  'scadenze.scaduto': 'Scaduto',
  'scadenze.inScadenza': 'In scadenza',
  'scadenze.nessuna': 'Nessuna scadenza in vista.',

  'ispezione.titolo': 'Modalità controllo',
  'ispezione.sottotitolo': 'Tutto quello che serve a un’ispezione, anche senza rete',
  'ispezione.registroTrattamenti': 'Registro dei trattamenti',
  'ispezione.esportaPdf': 'Esporta PDF',
  'ispezione.esportaCsv': 'Esporta CSV',

  'comune.salva': 'Salva',
  'comune.annulla': 'Annulla',
  'comune.elimina': 'Elimina',
  'comune.modifica': 'Modifica',
  'comune.chiudi': 'Chiudi',
  'comune.avanti': 'Avanti',
  'comune.indietro': 'Indietro',
  'comune.obbligatorio': 'obbligatorio',
  'comune.facoltativo': 'facoltativo',
  'comune.nessunDato': 'Nessun dato',
  'comune.offline': 'Senza rete — i dati restano sul telefono',
} as const

export type ChiaveTesto = keyof typeof it

type Dizionario = Partial<Record<ChiaveTesto, string>>

const en: Dizionario = {
  'app.nome': 'Field Log',
  'nav.oggi': 'Today',
  'nav.campi': 'Fields',
  'nav.registra': 'Record',
  'nav.magazzino': 'Store',
  'nav.altro': 'More',
  'oggi.titolo': 'Today',
  'oggi.daSistemare': 'Needs attention',
  'oggi.nienteDaSegnalare': 'Nothing to report.',
  'oggi.ultimiInterventi': 'Recent operations',
  'oggi.nessunIntervento': 'Nothing recorded yet.',
  'oggi.bozze': 'Drafts to finish',
  'azione.registraTrattamento': 'Spray',
  'azione.registraConcimazione': 'Fertiliser',
  'azione.registraRaccolta': 'Harvest',
  'azione.registraNota': 'Note',
  'campi.titolo': 'Fields',
  'campi.nuovo': 'New field',
  'campi.nessuno': 'No fields yet. Start here.',
  'campi.superficie': 'Area',
  'campi.coltura': 'Crop',
  'campi.raccoltaConsentitaDal': 'Harvest allowed from',
  'campi.raccoltaLibera': 'No harvest restriction',
  'campi.storico': 'History',
  'intervento.nuovo': 'New operation',
  'intervento.salva': 'Save',
  'voce.registra': 'Hold to speak',
  'voce.inCorso': 'Recording…',
  'magazzino.titolo': 'Store',
  'scadenze.titolo': 'Expiries',
  'ispezione.titolo': 'Inspection mode',
  'comune.salva': 'Save',
  'comune.annulla': 'Cancel',
  'comune.chiudi': 'Close',
  'comune.offline': 'Offline — data stays on this phone',
}

const dizionari: Record<Lingua, Dizionario> = { it, en, fr: {}, es: {}, de: {} }

let linguaCorrente: Lingua = rilevaLingua()

function rilevaLingua(): Lingua {
  const salvata = localStorage.getItem('lingua') as Lingua | null
  if (salvata && salvata in dizionari) return salvata
  const browser = navigator.language.slice(0, 2) as Lingua
  return browser in dizionari ? browser : 'it'
}

export function impostaLingua(lingua: Lingua): void {
  linguaCorrente = lingua
  localStorage.setItem('lingua', lingua)
  document.documentElement.lang = lingua
}

export function getLingua(): Lingua {
  return linguaCorrente
}

/** Traduce, ricadendo sull'italiano quando la lingua non copre la chiave. */
export function t(chiave: ChiaveTesto, sostituzioni?: Record<string, string | number>): string {
  let testo: string = dizionari[linguaCorrente][chiave] ?? it[chiave] ?? chiave
  if (sostituzioni) {
    for (const [k, v] of Object.entries(sostituzioni)) {
      testo = testo.replace(`{${k}}`, String(v))
    }
  }
  return testo
}

/** Formattazione locale di numeri e date: cambia da paese a paese. */
export function fmtNumero(n: number, decimali = 2): string {
  return new Intl.NumberFormat(linguaCorrente, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimali,
  }).format(n)
}

/**
 * Data e ora di un istante ISO, **nel fuso di chi guarda**.
 *
 * Gli istanti si salvano in UTC, ma vanno mostrati in ora locale: un lavoro
 * fatto stasera alle undici non deve comparire come fatto ieri. Sono i dettagli
 * da cui si capisce se un'app è affidabile.
 */
export function fmtIstante(iso?: string, conOra = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(linguaCorrente, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(conOra ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d)
}

export function fmtData(giorno?: string): string {
  if (!giorno) return '—'
  const [a, m, g] = giorno.split('-').map(Number)
  return new Intl.DateTimeFormat(linguaCorrente, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(a, m - 1, g))
}
