import type { Campo, Coltura, Documento, Prodotto } from '../../core/domain/types'
import type { Nota } from '../../core/domain/note'

/**
 * L'elenco per il quaderno di campagna digitale (QDCA, sul SIAN).
 *
 * ## Da dove vengono le colonne
 *
 * Verificato il 10/10/2026 su due testi:
 *
 * - **Reg. di esecuzione (UE) 2023/564**, allegato, per i trattamenti di
 *   superfici: denominazione del prodotto e numero di autorizzazione; data e,
 *   *se pertinente*, ora di inizio; dose; ubicazione dell'area trattata,
 *   identificata con l'unità fondiaria della domanda di aiuto geospaziale (la
 *   domanda PAC sulla mappa); ettari trattati; quantità per ettaro; coltura
 *   (codici EPPO) ed eventualmente stadio BBCH.
 * - **AGEA, Istruzioni operative n. 58 del 21/05/2024**: per i trattamenti su
 *   colture "data e ora di inizio", quantità per ettaro, **avversità**; per gli
 *   operatori il numero del patentino; per le macchine la data del controllo
 *   funzionale. Comprende anche le concimazioni.
 *
 * ## Cosa fa
 *
 * Dalle **note** (non dai vecchi "interventi": il registro di prima leggeva
 * solo quelli, e un trattamento scritto come nota non ci finiva) tira fuori una
 * riga per prodotto, e per ogni riga dice **cosa manca**. Non inventa niente:
 * un dato che non c'è resta vuoto e finisce fra i mancanti. Un elenco che
 * sembra completo e non lo è è peggio di un elenco con i buchi in vista.
 */

export interface RigaQdca {
  notaId: string
  tipo: 'Trattamento' | 'Concimazione'
  data: string
  /** Solo se la nota la dice ("alle 7"): non si ricava dall'ora in cui è stata scritta. */
  oraInizio: string
  campo: string
  appezzamentoPac: string
  coltura: string
  ettari?: number
  prodotto: string
  numeroAutorizzazione: string
  quantita?: number
  unitaMisura: string
  /** Calcolata: quantità diviso ettari. */
  dosePerEttaro?: number
  avversita: string
  operatore: string
  patentino: string
  dataControlloFunzionale: string
  mancano: string[]
}

export interface ContestoQdca {
  campi: Campo[]
  colture: Coltura[]
  prodotti: Prodotto[]
  documenti: Documento[]
}

/** "alle 7", "alle 7:30", "ore 18.15": l'ora del lavoro, quando la frase la dice. */
export function oraDallaNota(testo: string): string {
  const m = testo.match(/\b(?:alle|ore|verso le)\s+(\d{1,2})(?:[:.,](\d{2}))?\b/i)
  if (!m) return ''
  const ore = Number(m[1])
  const minuti = m[2] ? Number(m[2]) : 0
  if (ore > 23 || minuti > 59) return ''
  return `${String(ore).padStart(2, '0')}:${String(minuti).padStart(2, '0')}`
}

export function righeQdca(note: Nota[], ctx: ContestoQdca): RigaQdca[] {
  const vivi = <T extends { annullatoIl?: string }>(xs: T[]) => xs.filter((x) => !x.annullatoIl)
  const documenti = vivi(ctx.documenti)

  // Patentino e controllo dell'irroratrice: di solito uno per azienda. Se ce
  // n'è più d'uno non si tira a indovinare quale valga per quel trattamento.
  const patentini = documenti.filter((d) => d.tipo === 'patentino_fitosanitari' && d.numero)
  const controlli = documenti.filter((d) => d.tipo === 'controllo_funzionale')
  const patentino = patentini.length === 1 ? patentini[0].numero! : ''
  const controllo =
    controlli.length === 1 ? (controlli[0].rilasciatoIl ?? dataLetta(controlli[0], 'rilasciatoIl')) : ''

  const righe: RigaQdca[] = []

  for (const nota of vivi(note)) {
    const tratta = nota.argomenti.includes('trattamento')
    const concima = nota.argomenti.includes('concimazione')
    if (!tratta && !concima) continue

    const nomeCampo = nota.scheda?.campoNome ?? nota.campoNome ?? ''
    const campo =
      ctx.campi.find((c) => c.id === nota.campoId) ??
      ctx.campi.find((c) => nomeCampo && c.nome.toLowerCase() === nomeCampo.toLowerCase())
    const annata = Number(nota.dataFatto.slice(0, 4))
    const coltura = campo
      ? ctx.colture.find((c) => c.campoId === campo.id && c.annata === annata && !c.annullatoIl)
      : undefined
    const ettari = nota.scheda?.superficieHa ?? coltura?.superficieHa ?? campo?.superficieHa
    const prodotti = nota.scheda?.prodotti?.length ? nota.scheda.prodotti : [undefined]

    for (const p of prodotti) {
      const anagrafica = p?.nome
        ? ctx.prodotti.find((x) => x.nome.toLowerCase() === p.nome.toLowerCase())
        : undefined
      const tipo = tratta ? 'Trattamento' : 'Concimazione'
      const dose = p?.quantita != null && ettari ? arrotonda(p.quantita / ettari) : undefined

      const riga: RigaQdca = {
        notaId: nota.id,
        tipo,
        data: nota.dataFatto,
        oraInizio: oraDallaNota(nota.testo),
        campo: nomeCampo,
        appezzamentoPac: campo?.appezzamentoPac ?? '',
        coltura: coltura?.specie ?? '',
        ettari,
        prodotto: p?.nome ?? '',
        numeroAutorizzazione: anagrafica?.numeroRegistrazione ?? '',
        quantita: p?.quantita,
        unitaMisura: p?.unitaMisura ?? '',
        dosePerEttaro: dose,
        avversita: nota.scheda?.avversita ?? '',
        operatore: nota.scheda?.operatore ?? '',
        patentino: tratta ? patentino : '',
        dataControlloFunzionale: tratta ? controllo : '',
        mancano: [],
      }
      riga.mancano = mancanti(riga, patentini.length, controlli.length)
      righe.push(riga)
    }
  }

  return righe.sort((a, b) => a.data.localeCompare(b.data) || a.oraInizio.localeCompare(b.oraInizio))
}

/**
 * Cosa manca perché la riga sia accettabile. L'ora non c'è: per l'Europa serve
 * solo "se pertinente", e che serva davvero è una delle domande per il CAA.
 */
function mancanti(r: RigaQdca, quantiPatentini: number, quantiControlli: number): string[] {
  const m: string[] = []
  if (!r.campo) m.push('campo')
  else if (!r.appezzamentoPac) m.push('aggancio all’appezzamento PAC')
  if (!r.coltura) m.push('coltura')
  if (!r.ettari) m.push('ettari')
  if (!r.prodotto) m.push('prodotto')
  if (r.quantita == null) m.push('quantità')
  if (r.tipo === 'Trattamento') {
    if (r.prodotto && !r.numeroAutorizzazione) m.push('numero di autorizzazione')
    if (!r.avversita) m.push('avversità')
    if (!r.patentino) m.push(quantiPatentini > 1 ? 'quale patentino' : 'patentino')
    if (!r.dataControlloFunzionale)
      m.push(quantiControlli > 1 ? 'quale irroratrice' : 'controllo dell’irroratrice')
  }
  return m
}

/** La data letta dalla foto, se non è stata ancora riportata nella scheda. */
function dataLetta(d: Documento, chiave: string): string {
  return d.campiLetti?.find((c) => c.chiave === chiave)?.valore ?? ''
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100
}

/** Le righe come le vuole un foglio di calcolo: intestazioni leggibili. */
export function righeQdcaPerCsv(righe: RigaQdca[]): Record<string, string | number>[] {
  return righe.map((r) => ({
    Tipo: r.tipo,
    Data: r.data,
    'Ora inizio': r.oraInizio,
    'Campo (nome aziendale)': r.campo,
    'Appezzamento PAC': r.appezzamentoPac,
    Coltura: r.coltura,
    'Ettari trattati': r.ettari ?? '',
    Prodotto: r.prodotto,
    'N. autorizzazione': r.numeroAutorizzazione,
    Quantità: r.quantita ?? '',
    'Unità di misura': r.unitaMisura,
    'Dose per ettaro (calcolata)': r.dosePerEttaro ?? '',
    Avversità: r.avversita,
    Operatore: r.operatore,
    'N. patentino': r.patentino,
    'Data controllo funzionale': r.dataControlloFunzionale,
    'Dati mancanti': r.mancano.join(', '),
  }))
}
