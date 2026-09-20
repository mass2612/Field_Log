import type {
  AnalisiSuolo,
  Campo,
  Coltura,
  ID,
  Intervento,
  Prodotto,
} from '../domain/types'

/**
 * Confronto fra annate.
 *
 * È la schermata che giustifica l'app: mettere una accanto all'altra le annate
 * dello stesso campo e far venire la domanda giusta — *nel 2025 ho seminato
 * meno, speso meno e raccolto di più: perché?*
 *
 * L'app non risponde al posto dell'agricoltore. Mette le colonne in fila.
 * È già molto più di quello che ha oggi la gran parte delle aziende.
 */

export interface RiepilogoAnnata {
  annata: number
  campoId: ID
  campoNome: string
  superficieHa: number

  specie?: string
  varieta?: string
  precessione?: string
  dataSemina?: string

  /** Dose che era impostata sulla macchina. */
  seminaImpostataPerHa?: number
  /** Dose realmente scesa, dai sacchi usati sugli ettari fatti. */
  seminaRealePerHa?: number

  numeroTrattamenti: number
  numeroConcimazioni: number
  numeroIrrigazioni: number
  prodottiUsati: string[]
  /** Azoto distribuito per ettaro, quando il titolo dei concimi è noto. */
  azotoPerHa?: number

  costoProdotti?: number
  costoPerHa?: number

  resaTotale?: number
  resaPerHa?: number
  unitaResa?: string
  umiditaPct?: number
  proteinePct?: number
  prezzoUnitario?: number
  ricaviPerHa?: number
  /**
   * Ricavo meno il costo dei prodotti impiegati. **Non è il margine aziendale:**
   * mancano gasolio, manodopera, macchine, affitti. Va chiamato per quello che è,
   * altrimenti restituiamo all'agricoltore un numero che sa essere falso — e
   * perde fiducia in tutto il resto.
   */
  marginePerHa?: number

  ph?: number
  sostanzaOrganicaPct?: number
}

export interface ContestoConfronto {
  campi: Map<ID, Campo>
  colture: Coltura[]
  interventi: Intervento[]
  prodotti: Map<ID, Prodotto>
  /** Costo unitario medio per prodotto, dai prezzi di acquisto dei lotti. */
  costiProdotto: Map<ID, number>
  analisi: AnalisiSuolo[]
}

/**
 * Una riga per ogni annata di ogni campo, ordinate dalla più recente.
 */
export function riepilogaAnnate(ctx: ContestoConfronto): RiepilogoAnnata[] {
  const righe: RiepilogoAnnata[] = []

  for (const coltura of ctx.colture) {
    const campo = ctx.campi.get(coltura.campoId)
    if (!campo || campo.annullatoIl) continue

    const superficieHa = coltura.superficieHa ?? campo.superficieHa
    const interventi = ctx.interventi.filter(
      (i) =>
        !i.annullatoIl &&
        i.campoId === coltura.campoId &&
        Number(i.data.slice(0, 4)) === coltura.annata,
    )

    righe.push(
      componiRiga({
        coltura,
        campo,
        superficieHa,
        interventi,
        prodotti: ctx.prodotti,
        costiProdotto: ctx.costiProdotto,
        analisi: ctx.analisi.filter((a) => a.campoId === coltura.campoId),
      }),
    )
  }

  return righe.sort(
    (a, b) => b.annata - a.annata || a.campoNome.localeCompare(b.campoNome),
  )
}

function componiRiga(args: {
  coltura: Coltura
  campo: Campo
  superficieHa: number
  interventi: Intervento[]
  prodotti: Map<ID, Prodotto>
  costiProdotto: Map<ID, number>
  analisi: AnalisiSuolo[]
}): RiepilogoAnnata {
  const { coltura, campo, superficieHa, interventi, prodotti, costiProdotto } = args

  const semina = interventi.find((i) => i.tipo === 'semina')
  const raccolta = interventi.find((i) => i.tipo === 'raccolta' && i.raccolta)

  let costoProdotti = 0
  let azoto = 0
  let azotoNoto = false
  const nomiProdotti = new Set<string>()

  for (const intervento of interventi) {
    const haIntervento = intervento.superficieTrattataHa ?? superficieHa

    for (const riga of intervento.righe) {
      const prodotto = prodotti.get(riga.prodottoId)
      if (prodotto) nomiProdotti.add(prodotto.nome)

      const costoUnitario = costiProdotto.get(riga.prodottoId)
      if (costoUnitario != null) costoProdotti += costoUnitario * riga.quantita

      // Azoto: si ricava dal titolo, quando è scritto nel nome della sostanza.
      if (prodotto?.tipo === 'fertilizzante' && haIntervento > 0) {
        const titolo = titoloAzoto(prodotto)
        if (titolo != null) {
          azoto += (riga.quantita * titolo) / 100 / haIntervento
          azotoNoto = true
        }
      }
    }
  }

  const seminaRealePerHa = semina ? dosePerHa(semina, superficieHa) : undefined
  const resa = raccolta?.raccolta
  const resaPerHa =
    resa?.resaPerHa ??
    (resa?.quantita != null && superficieHa > 0
      ? arrotonda(resa.quantita / superficieHa)
      : undefined)

  const ricaviPerHa =
    resaPerHa != null && resa?.prezzoUnitario != null
      ? arrotonda(resaPerHa * resa.prezzoUnitario)
      : undefined
  const costoPerHa = superficieHa > 0 && costoProdotti > 0
    ? arrotonda(costoProdotti / superficieHa)
    : undefined

  // Analisi del terreno più recente precedente alla raccolta di quell'annata.
  const analisi = args.analisi
    .filter((a) => Number(a.data.slice(0, 4)) <= coltura.annata)
    .sort((a, b) => b.data.localeCompare(a.data))[0]

  return {
    annata: coltura.annata,
    campoId: campo.id,
    campoNome: campo.nome,
    superficieHa,
    specie: coltura.specie,
    varieta: coltura.varieta,
    precessione: coltura.precessione,
    dataSemina: coltura.dataSemina ?? semina?.data,
    seminaImpostataPerHa:
      semina?.dosePerHaImpostata ?? numeroSettaggio(semina, 'dose_impostata'),
    seminaRealePerHa,
    numeroTrattamenti: interventi.filter((i) => i.tipo === 'trattamento').length,
    numeroConcimazioni: interventi.filter((i) => i.tipo === 'fertilizzazione').length,
    numeroIrrigazioni: interventi.filter((i) => i.tipo === 'irrigazione').length,
    prodottiUsati: [...nomiProdotti],
    azotoPerHa: azotoNoto ? arrotonda(azoto) : undefined,
    costoProdotti: costoProdotti > 0 ? arrotonda(costoProdotti) : undefined,
    costoPerHa,
    resaTotale: resa?.quantita,
    resaPerHa,
    unitaResa: resa?.unitaMisura,
    umiditaPct: resa?.umiditaPct,
    proteinePct: resa?.proteinePct,
    prezzoUnitario: resa?.prezzoUnitario,
    ricaviPerHa,
    marginePerHa:
      ricaviPerHa != null && costoPerHa != null ? arrotonda(ricaviPerHa - costoPerHa) : undefined,
    ph: analisi?.ph,
    sostanzaOrganicaPct: analisi?.sostanzaOrganicaPct,
  }
}

/** Quantità realmente impiegata per ettaro in un intervento. */
export function dosePerHa(intervento: Intervento, superficieCampoHa: number): number | undefined {
  const ha = intervento.superficieTrattataHa ?? superficieCampoHa
  if (!ha || ha <= 0) return undefined
  const totale = intervento.righe.reduce((s, r) => s + r.quantita, 0)
  if (totale <= 0) return undefined
  return arrotonda(totale / ha)
}

function numeroSettaggio(intervento: Intervento | undefined, chiave: string): number | undefined {
  const valore = intervento?.settaggi?.[chiave]
  if (valore == null || valore === '') return undefined
  const n = typeof valore === 'number' ? valore : Number(String(valore).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/**
 * Titolo di azoto del concime.
 *
 * Si prova a leggerlo dalle sostanze attive ("Azoto 46%") o dal nome
 * commerciale ("Urea 46"). È un'euristica, non una certezza: finché non c'è un
 * registro dei fertilizzanti, meglio un valore mancante che uno inventato.
 */
function titoloAzoto(prodotto: Prodotto): number | undefined {
  const daSostanze = prodotto.sostanzeAttive?.find((s) => /azoto|^n$|nitric|ureic/i.test(s.nome))
  if (daSostanze?.percentuale != null) return daSostanze.percentuale

  const daNome = prodotto.nome.match(/(?:^|\s)(\d{1,2}(?:[.,]\d)?)\s*(?:%|$|\s)/)
  if (daNome && /urea|nitrato|ammonio|azoto/i.test(prodotto.nome)) {
    const n = Number(daNome[1].replace(',', '.'))
    if (n > 0 && n <= 82) return n
  }
  return undefined
}

export interface Differenza {
  etichetta: string
  precedente?: string
  attuale?: string
  /** Variazione percentuale, quando entrambi i valori sono numerici. */
  variazionePct?: number
  /** Vero quando un aumento è un bene (resa), falso quando è un male (costi). */
  aumentoPositivo?: boolean
}

/**
 * Confronto fra due annate dello stesso campo.
 * Mostra solo quello che è davvero cambiato: un elenco di cose uguali non serve.
 */
export function confronta(precedente: RiepilogoAnnata, attuale: RiepilogoAnnata): Differenza[] {
  const differenze: Differenza[] = []

  const testo = (etichetta: string, a?: string, b?: string) => {
    if ((a ?? '') === (b ?? '')) return
    differenze.push({ etichetta, precedente: a, attuale: b })
  }

  const numero = (
    etichetta: string,
    a: number | undefined,
    b: number | undefined,
    unita = '',
    aumentoPositivo?: boolean,
  ) => {
    if (a == null && b == null) return
    if (a === b) return
    differenze.push({
      etichetta,
      precedente: a != null ? `${fmt(a)}${unita}` : undefined,
      attuale: b != null ? `${fmt(b)}${unita}` : undefined,
      variazionePct:
        a != null && b != null && a !== 0 ? Math.round(((b - a) / a) * 1000) / 10 : undefined,
      aumentoPositivo,
    })
  }

  testo('Varietà', precedente.varieta, attuale.varieta)
  testo('Precessione', precedente.precessione, attuale.precessione)
  numero('Semina impostata', precedente.seminaImpostataPerHa, attuale.seminaImpostataPerHa, ' kg/ha')
  numero('Semina reale', precedente.seminaRealePerHa, attuale.seminaRealePerHa, ' kg/ha')
  numero('Azoto', precedente.azotoPerHa, attuale.azotoPerHa, ' kg/ha')
  numero('Trattamenti', precedente.numeroTrattamenti, attuale.numeroTrattamenti, '', false)
  numero('Costo prodotti', precedente.costoPerHa, attuale.costoPerHa, ' €/ha', false)
  // L'unità la prende da chi ce l'ha: se manca la raccolta di quest'annata,
  // quella dell'anno prima è comunque l'unità giusta per il confronto.
  const unitaResa = attuale.unitaResa ?? precedente.unitaResa
  numero(
    'Resa',
    precedente.resaPerHa,
    attuale.resaPerHa,
    unitaResa ? ` ${unitaResa}/ha` : '/ha',
    true,
  )
  numero('Proteine', precedente.proteinePct, attuale.proteinePct, ' %', true)
  numero(
    'Ricavo meno prodotti',
    precedente.marginePerHa,
    attuale.marginePerHa,
    ' €/ha',
    true,
  )

  return differenze
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100
}
