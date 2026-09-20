import type { Settaggi, TipoAttrezzo, TipoIntervento } from './types'

/**
 * Quali regolazioni esistono, per famiglia di attrezzo.
 *
 * Qui sta l'elenco; il dato salvato è una semplice mappa chiave-valore. Così
 * aggiungere una macchina nuova vuol dire aggiungere uno schema, non toccare il
 * modello dati né le schermate.
 *
 * I nomi sono quelli che userebbe un agricoltore: "tacca del cambio", non
 * "coefficiente di dosaggio".
 */

export interface CampoSettaggio {
  chiave: string
  etichetta: string
  unita?: string
  tipo: 'numero' | 'testo'
  /** Suggerimento mostrato nel campo vuoto. */
  esempio?: string
  aiuto?: string
  /** Regolazioni che quasi tutti compilano: le altre stanno sotto "altro". */
  principale?: boolean
}

export interface SchemaSettaggi {
  /** Famiglie di attrezzo a cui si applica. */
  attrezzi: TipoAttrezzo[]
  /** Tipi di intervento per cui ha senso proporlo. */
  interventi: TipoIntervento[]
  titolo: string
  campi: CampoSettaggio[]
}

export const SCHEMI_SETTAGGI: SchemaSettaggi[] = [
  {
    attrezzi: ['seminatrice'],
    interventi: ['semina'],
    titolo: 'Regolazioni della seminatrice',
    campi: [
      {
        chiave: 'tacca',
        etichetta: 'Tacca del cambio',
        tipo: 'testo',
        esempio: '14',
        principale: true,
        aiuto: 'La posizione che hai messo in campo. È il dato che l’anno prossimo non ricordi.',
      },
      {
        chiave: 'dose_impostata',
        etichetta: 'Dose impostata',
        unita: 'kg/ha',
        tipo: 'numero',
        esempio: '180',
        principale: true,
      },
      { chiave: 'velocita', etichetta: 'Velocità', unita: 'km/h', tipo: 'numero', esempio: '7', principale: true },
      { chiave: 'profondita', etichetta: 'Profondità', unita: 'cm', tipo: 'numero', esempio: '3', principale: true },
      { chiave: 'interfila', etichetta: 'Interfila', unita: 'cm', tipo: 'numero', esempio: '12,5' },
      { chiave: 'distanza_fila', etichetta: 'Distanza sulla fila', unita: 'cm', tipo: 'numero' },
      { chiave: 'pressione_falcione', etichetta: 'Pressione assolcatori', tipo: 'testo' },
    ],
  },
  {
    attrezzi: ['irroratrice', 'atomizzatore'],
    interventi: ['trattamento'],
    titolo: 'Regolazioni dell’irroratrice',
    campi: [
      {
        chiave: 'ugelli',
        etichetta: 'Ugelli',
        tipo: 'testo',
        esempio: 'blu antideriva 110-03',
        principale: true,
      },
      { chiave: 'ugelli_aperti', etichetta: 'Quanti aperti', tipo: 'numero', principale: true },
      { chiave: 'pressione', etichetta: 'Pressione', unita: 'bar', tipo: 'numero', esempio: '8', principale: true },
      { chiave: 'velocita', etichetta: 'Velocità', unita: 'km/h', tipo: 'numero', esempio: '6', principale: true },
      {
        chiave: 'volume',
        etichetta: 'Volume distribuito',
        unita: 'l/ha',
        tipo: 'numero',
        esempio: '300',
        principale: true,
        aiuto: 'Serve anche al calcolo della miscela.',
      },
      { chiave: 'giri_ventola', etichetta: 'Giri ventola', unita: 'giri/min', tipo: 'numero' },
      { chiave: 'altezza_barra', etichetta: 'Altezza barra', unita: 'cm', tipo: 'numero' },
      { chiave: 'orientamento_getti', etichetta: 'Orientamento dei getti', tipo: 'testo' },
    ],
  },
  {
    attrezzi: ['spandiconcime'],
    interventi: ['fertilizzazione'],
    titolo: 'Regolazioni dello spandiconcime',
    campi: [
      { chiave: 'apertura', etichetta: 'Apertura paratia', tipo: 'testo', esempio: '32', principale: true },
      {
        chiave: 'dose_impostata',
        etichetta: 'Dose impostata',
        unita: 'kg/ha',
        tipo: 'numero',
        esempio: '200',
        principale: true,
      },
      { chiave: 'larghezza', etichetta: 'Larghezza di lavoro', unita: 'm', tipo: 'numero', esempio: '24', principale: true },
      { chiave: 'velocita', etichetta: 'Velocità', unita: 'km/h', tipo: 'numero', esempio: '10', principale: true },
      { chiave: 'giri_pdf', etichetta: 'Giri presa di forza', unita: 'giri/min', tipo: 'numero', esempio: '540' },
      { chiave: 'dischi', etichetta: 'Dischi / palette', tipo: 'testo' },
    ],
  },
  {
    attrezzi: ['trattore', 'altro'],
    interventi: ['lavorazione'],
    titolo: 'Regolazioni della lavorazione',
    campi: [
      { chiave: 'profondita', etichetta: 'Profondità', unita: 'cm', tipo: 'numero', esempio: '30', principale: true },
      { chiave: 'velocita', etichetta: 'Velocità', unita: 'km/h', tipo: 'numero', principale: true },
      { chiave: 'larghezza', etichetta: 'Larghezza di lavoro', unita: 'm', tipo: 'numero' },
      { chiave: 'attrezzo_usato', etichetta: 'Attrezzo', tipo: 'testo', esempio: 'erpice a dischi' },
    ],
  },
  {
    attrezzi: ['altro'],
    interventi: ['raccolta'],
    titolo: 'Regolazioni della mietitrebbia',
    campi: [
      { chiave: 'giri_battitore', etichetta: 'Giri battitore', unita: 'giri/min', tipo: 'numero', principale: true },
      { chiave: 'controbattitore', etichetta: 'Apertura controbattitore', tipo: 'testo', principale: true },
      { chiave: 'ventola', etichetta: 'Ventola', tipo: 'testo' },
      { chiave: 'setacci', etichetta: 'Setacci', tipo: 'testo' },
    ],
  },
]

/**
 * Lo schema adatto a questa combinazione di attrezzo e tipo di intervento.
 * Il tipo di intervento ha la precedenza: è quello che l'utente ha appena scelto.
 */
export function schemaPer(
  tipoIntervento: TipoIntervento,
  tipoAttrezzo?: TipoAttrezzo,
): SchemaSettaggi | undefined {
  const candidati = SCHEMI_SETTAGGI.filter((s) => s.interventi.includes(tipoIntervento))
  if (candidati.length === 0) return undefined
  if (tipoAttrezzo) {
    const preciso = candidati.find((s) => s.attrezzi.includes(tipoAttrezzo))
    if (preciso) return preciso
  }
  return candidati[0]
}

export function etichettaSettaggio(schema: SchemaSettaggi, chiave: string): string {
  const campo = schema.campi.find((c) => c.chiave === chiave)
  if (!campo) return chiave
  return campo.unita ? `${campo.etichetta} (${campo.unita})` : campo.etichetta
}

/** Riassunto leggibile, per mostrare i settaggi in una riga di storico. */
export function riassumiSettaggi(settaggi: Settaggi, schema?: SchemaSettaggi): string {
  const voci = Object.entries(settaggi).filter(([, v]) => v !== '' && v != null)
  if (voci.length === 0) return ''

  return voci
    .map(([chiave, valore]) => {
      const campo = schema?.campi.find((c) => c.chiave === chiave)
      const nome = campo?.etichetta ?? chiave
      return `${nome} ${valore}${campo?.unita ? ' ' + campo.unita : ''}`
    })
    .join(' · ')
}

/**
 * Calcolo della prova di taratura.
 *
 *   superficie di prova (m²) = distanza (m) × larghezza (m)
 *   dose reale (kg/ha)       = grammi × 10 ÷ superficie (m²)
 *
 * Restituisce `undefined` quando i dati non bastano: meglio niente che un numero
 * inventato, perché su questo numero poi ci si regola davvero.
 */
export function calcolaDoseReale(prova: {
  distanzaM?: number
  larghezzaM?: number
  quantitaRaccoltaG?: number
}): number | undefined {
  const { distanzaM, larghezzaM, quantitaRaccoltaG } = prova
  if (!distanzaM || !larghezzaM || !quantitaRaccoltaG) return undefined
  const superficieMq = distanzaM * larghezzaM
  if (superficieMq <= 0) return undefined
  return Math.round(((quantitaRaccoltaG * 10) / superficieMq) * 100) / 100
}

/**
 * Scarto fra quello che hai impostato e quello che la macchina fa davvero.
 * È la prima cosa utile che l'app può dire all'agricoltore sulle sue macchine.
 */
export function scartoPercentuale(impostata?: number, reale?: number): number | undefined {
  if (!impostata || !reale || impostata <= 0) return undefined
  return Math.round(((reale - impostata) / impostata) * 1000) / 10
}
