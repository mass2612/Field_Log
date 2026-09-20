/**
 * PACCHETTO ITALIA
 *
 * Qui, e solo qui, sta ciò che è italiano. Il nucleo non sa nulla del DPR 55/2012:
 * quando si aggiungerà la Francia si scriverà `src/packs/fr` senza toccare il resto.
 *
 * Riferimenti (da riverificare prima del rilascio — la materia cambia spesso e
 * varia da regione a regione):
 *   - Reg. (CE) 1107/2009 art. 67 — obbligo di registrazione, conservazione 3 anni
 *   - D.Lgs. 150/2012 e PAN — uso sostenibile dei prodotti fitosanitari
 *   - DPR 55/2012 — registro dei trattamenti
 */

import type { Riga } from '../../core/export/csv'
import type {
  Attrezzo,
  Campo,
  Coltura,
  ID,
  Intervento,
  Operatore,
  Prodotto,
} from '../../core/domain/types'

export const PACCHETTO_IT = {
  paese: 'IT',
  nomeRegistro: 'Registro dei trattamenti',
  /** Anni di conservazione obbligatoria dei dati. */
  anniConservazione: 3,
  riferimentiNormativi: [
    'Reg. (CE) 1107/2009, art. 67',
    'D.Lgs. 150/2012 (PAN)',
    'DPR 55/2012',
  ],
} as const

export interface ContestoRegistro {
  campi: Map<ID, Campo>
  colture: Map<ID, Coltura>
  prodotti: Map<ID, Prodotto>
  operatori: Map<ID, Operatore>
  attrezzi: Map<ID, Attrezzo>
}

/**
 * Righe del registro dei trattamenti nella forma attesa da un controllo.
 * Una riga per prodotto impiegato: è così che viene chiesto in ispezione.
 */
export interface OpzioniRegistro {
  /**
   * Aggiunge le colonne interne: quando la riga è stata scritta, come è stato
   * attribuito il campo, le correzioni successive.
   *
   * **Spento di default, ed è una scelta.** Queste informazioni le teniamo per
   * l'agricoltore — per ricostruire cosa è successo — non per consegnarle a chi
   * controlla. Un registro di carta corretto col bianchetto non mostra nulla:
   * non c'è ragione che il nostro esponga di più. Chi vuole consegnarle può
   * accendere l'opzione.
   */
  includiTracciamento?: boolean
}

export function righeRegistroTrattamenti(
  interventi: Intervento[],
  ctx: ContestoRegistro,
  opzioni: OpzioniRegistro = {},
): Riga[] {
  const righe: Riga[] = []

  for (const intervento of interventi) {
    if (intervento.tipo !== 'trattamento' && intervento.tipo !== 'fertilizzazione') continue

    const campo = ctx.campi.get(intervento.campoId)
    const coltura = intervento.colturaId ? ctx.colture.get(intervento.colturaId) : undefined
    const operatore = intervento.operatoreId ? ctx.operatori.get(intervento.operatoreId) : undefined
    const attrezzo = intervento.attrezzoId ? ctx.attrezzi.get(intervento.attrezzoId) : undefined
    const superficie = intervento.superficieTrattataHa ?? campo?.superficieHa

    for (const riga of intervento.righe) {
      const prodotto = ctx.prodotti.get(riga.prodottoId)
      righe.push({
        'Data trattamento': intervento.data,
        Coltura: coltura?.specie ?? '',
        Varietà: coltura?.varieta ?? '',
        'Appezzamento / Campo': campo?.nome ?? '',
        'Superficie trattata (ha)': superficie ?? '',
        Avversità: riga.avversita ?? '',
        'Prodotto impiegato': prodotto?.nome ?? '',
        'N. registrazione': prodotto?.numeroRegistrazione ?? '',
        'Sostanze attive': prodotto?.sostanzeAttive?.map((s) => s.nome).join(' + ') ?? '',
        Quantità: riga.quantita,
        'Unità di misura': riga.unitaMisura,
        'Dose etichetta': riga.doseEtichetta ?? '',
        'Volume acqua (l/ha)': intervento.volumeAcquaLHa ?? '',
        'Tempo di carenza (gg)': prodotto?.tempoCarenzaGiorni ?? '',
        'Raccolta consentita dal': intervento.raccoltaConsentitaDal ?? '',
        Operatore: operatore ? `${operatore.nome} ${operatore.cognome}` : '',
        'Ruolo operatore': operatore?.ruolo ?? '',
        Attrezzatura: attrezzo?.nome ?? '',
        Note: testoNota(intervento),
        Annullato: intervento.annullatoIl ? `Sì — ${intervento.motivoAnnullamento ?? ''}` : '',
        ...(opzioni.includiTracciamento
          ? {
              'Registrato il': intervento.creatoIl,
              'Campo attribuito da': etichettaOrigine(intervento.origineCampo),
            }
          : {}),
      })
    }

    if (intervento.righe.length === 0) {
      righe.push({
        'Data trattamento': intervento.data,
        'Appezzamento / Campo': campo?.nome ?? '',
        Note: testoNota(intervento),
        ...(opzioni.includiTracciamento ? { 'Registrato il': intervento.creatoIl } : {}),
      })
    }
  }

  return righe.sort((a, b) =>
    String(a['Data trattamento']).localeCompare(String(b['Data trattamento'])),
  )
}

/** Il testo definitivo della nota: la correzione a mano vince su tutto. */
export function testoNota(intervento: Intervento): string {
  const vocale = intervento.notaVocale
  const trascritto =
    vocale?.testoCorretto ?? vocale?.trascrizioneServer ?? vocale?.trascrizioneLocale
  return [intervento.note, trascritto].filter(Boolean).join(' — ')
}

function etichettaOrigine(origine: Intervento['origineCampo']): string {
  switch (origine) {
    case 'gps':
      return 'GPS'
    case 'manuale':
      return 'Indicato a mano'
    case 'ripetuto':
      return 'Ripetuto da intervento precedente'
  }
}

/**
 * Export "tutto quello che serve all'ufficio": una riga per intervento, con i
 * costi. Non è un modello di legge, è il foglio su cui si ragiona a dicembre.
 */
export function righeAnalisiGestionale(
  interventi: Intervento[],
  ctx: ContestoRegistro,
  costoPerProdotto: Map<ID, number>,
): Riga[] {
  return interventi.map((intervento) => {
    const campo = ctx.campi.get(intervento.campoId)
    const coltura = intervento.colturaId ? ctx.colture.get(intervento.colturaId) : undefined
    const ha = intervento.superficieTrattataHa ?? campo?.superficieHa ?? 0

    let costo = 0
    for (const riga of intervento.righe) {
      const unitario = costoPerProdotto.get(riga.prodottoId)
      if (unitario != null) costo += unitario * riga.quantita
    }

    return {
      Annata: Number(intervento.data.slice(0, 4)),
      Data: intervento.data,
      Campo: campo?.nome ?? '',
      'Superficie (ha)': ha || '',
      Coltura: coltura?.specie ?? '',
      Tipo: intervento.tipo,
      Prodotti: intervento.righe
        .map((r) => ctx.prodotti.get(r.prodottoId)?.nome ?? '?')
        .join(' + '),
      'Costo prodotti': costo ? Math.round(costo * 100) / 100 : '',
      'Costo per ha': costo && ha ? Math.round((costo / ha) * 100) / 100 : '',
      'Resa': intervento.raccolta?.quantita ?? '',
      'Resa per ha': intervento.raccolta?.resaPerHa ?? '',
      'Prezzo unitario': intervento.raccolta?.prezzoUnitario ?? '',
      Operatore: intervento.operatoreId
        ? (ctx.operatori.get(intervento.operatoreId)?.cognome ?? '')
        : '',
      Note: testoNota(intervento),
    }
  })
}
