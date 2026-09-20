import { db, oggi, traccia } from './db'
import { aggiungiGiorni } from '../rules/carenza'
import { leggiNota, type Nota } from '../domain/note'
import { annataCorrente } from './query'
import type {
  Attrezzo,
  Campo,
  Coltura,
  Documento,
  ID,
  Intervento,
  Lotto,
  MovimentoMagazzino,
  Operatore,
  Prodotto,
  Tracciato,
} from '../domain/types'

/**
 * Dati dimostrativi.
 *
 * Servono a vedere subito l'app al lavoro: un campo con la raccolta bloccata
 * dalla carenza, un patentino che scade fra tre settimane, un magazzino con
 * qualche giacenza. Sono dati inventati, non vanno confusi con quelli veri.
 */
export async function caricaDatiDimostrativi(aziendaId: ID): Promise<void> {
  const adesso = oggi()
  const annata = annataCorrente()

  const vigna = nuovo<Campo>({
    aziendaId,
    nome: 'Vigna sotto casa',
    superficieHa: 2.3,
    particelle: [{ comune: 'Esempio', foglio: '12', numero: '45', superficieHa: 2.3 }],
  })
  const frumento = nuovo<Campo>({
    aziendaId,
    nome: 'Campo grande',
    superficieHa: 7.8,
    particelle: [],
  })

  const colturaVigna = nuovo<Coltura>({
    campoId: vigna.id,
    annata,
    specie: 'Vite',
    varieta: 'Barbera',
  })
  const colturaFrumento = nuovo<Coltura>({
    campoId: frumento.id,
    annata,
    specie: 'Frumento tenero',
    varieta: 'Rebelde',
    precessione: 'Soia',
  })

  const titolare = nuovo<Operatore>({
    aziendaId,
    nome: 'Mario',
    cognome: 'Rossi',
    ruolo: 'titolare',
    attivo: true,
  })
  const dipendente = nuovo<Operatore>({
    aziendaId,
    nome: 'Luca',
    cognome: 'Bianchi',
    ruolo: 'dipendente',
    attivo: true,
  })

  const atomizzatore = nuovo<Attrezzo>({
    aziendaId,
    nome: 'Atomizzatore 1000',
    tipo: 'atomizzatore',
    capacitaLitri: 1000,
    attivo: true,
  })

  // Un patentino che scade fra 21 giorni: fa scattare l'avviso subito.
  const patentino = nuovo<Documento>({
    aziendaId,
    soggetto: { tipo: 'operatore', id: titolare.id },
    tipo: 'patentino_fitosanitari',
    descrizione: 'Patentino fitosanitari — Mario Rossi',
    numero: 'AB-12345',
    scadeIl: aggiungiGiorni(adesso, 21),
  })
  // Un controllo funzionale già scaduto: mostra la segnalazione rossa.
  const taratura = nuovo<Documento>({
    aziendaId,
    soggetto: { tipo: 'attrezzo', id: atomizzatore.id },
    tipo: 'controllo_funzionale',
    descrizione: 'Controllo funzionale — Atomizzatore 1000',
    scadeIl: aggiungiGiorni(adesso, -12),
    preavvisoGiorni: 90,
  })

  const rameico = nuovo<Prodotto>({
    aziendaId,
    nome: 'Poltiglia bordolese',
    tipo: 'fitosanitario',
    numeroRegistrazione: '00000',
    sostanzeAttive: [{ nome: 'Solfato di rame', percentuale: 20 }],
    unitaMisura: 'kg',
    tempoCarenzaGiorni: 20,
    tempoRientroOre: 48,
    interventiMaxAnnata: 4,
    doseMaxPerHa: 4,
    colturaAmmesse: ['Vite'],
    fonte: 'manuale',
  })
  const zolfo = nuovo<Prodotto>({
    aziendaId,
    nome: 'Zolfo bagnabile',
    tipo: 'fitosanitario',
    unitaMisura: 'kg',
    tempoCarenzaGiorni: 5,
    interventiMaxAnnata: 8,
    colturaAmmesse: ['Vite'],
    fonte: 'manuale',
  })
  const urea = nuovo<Prodotto>({
    aziendaId,
    nome: 'Urea 46',
    tipo: 'fertilizzante',
    unitaMisura: 'kg',
    fonte: 'manuale',
  })

  const lottoRame = nuovo<Lotto>({
    aziendaId,
    prodottoId: rameico.id,
    codiceLotto: 'R-2026-07',
    scadenza: aggiungiGiorni(adesso, 400),
    prezzoUnitario: 6.4,
    valuta: 'EUR',
  })
  const lottoZolfo = nuovo<Lotto>({
    aziendaId,
    prodottoId: zolfo.id,
    codiceLotto: 'Z-118',
    // Lotto già scaduto con giacenza: è il caso che ti frega a un controllo.
    scadenza: aggiungiGiorni(adesso, -30),
    prezzoUnitario: 2.1,
    valuta: 'EUR',
  })
  const lottoUrea = nuovo<Lotto>({
    aziendaId,
    prodottoId: urea.id,
    prezzoUnitario: 0.55,
    valuta: 'EUR',
  })

  const carichi = [
    nuovo<MovimentoMagazzino>({
      aziendaId,
      lottoId: lottoRame.id,
      data: aggiungiGiorni(adesso, -60),
      quantita: 50,
      unitaMisura: 'kg',
      causale: 'acquisto',
    }),
    nuovo<MovimentoMagazzino>({
      aziendaId,
      lottoId: lottoZolfo.id,
      data: aggiungiGiorni(adesso, -300),
      quantita: 25,
      unitaMisura: 'kg',
      causale: 'acquisto',
    }),
    nuovo<MovimentoMagazzino>({
      aziendaId,
      lottoId: lottoUrea.id,
      data: aggiungiGiorni(adesso, -120),
      quantita: 1500,
      unitaMisura: 'kg',
      causale: 'acquisto',
    }),
  ]

  // Trattamento recente: blocca la raccolta della vigna per i prossimi giorni.
  const dataRame = aggiungiGiorni(adesso, -6)
  const trattamento = nuovo<Intervento>({
    aziendaId,
    campoId: vigna.id,
    colturaId: colturaVigna.id,
    tipo: 'trattamento',
    data: dataRame,
    operatoreId: titolare.id,
    attrezzoId: atomizzatore.id,
    righe: [
      { prodottoId: rameico.id, lottoId: lottoRame.id, quantita: 6.9, unitaMisura: 'kg', avversita: 'Peronospora' },
    ],
    superficieTrattataHa: 2.3,
    volumeAcquaLHa: 300,
    origineCampo: 'manuale',
    raccoltaConsentitaDal: aggiungiGiorni(dataRame, 20),
    rientroConsentitoDal: undefined,
    note: 'Dopo la pioggia di lunedì.',
  })

  const concimazione = nuovo<Intervento>({
    aziendaId,
    campoId: frumento.id,
    colturaId: colturaFrumento.id,
    tipo: 'fertilizzazione',
    data: aggiungiGiorni(adesso, -40),
    operatoreId: dipendente.id,
    righe: [{ prodottoId: urea.id, lottoId: lottoUrea.id, quantita: 780, unitaMisura: 'kg' }],
    superficieTrattataHa: 7.8,
    origineCampo: 'manuale',
  })

  /*
   * Storico di tre annate sul Campo grande.
   *
   * Serve a far vedere la cosa per cui l'app esiste: nel 2025 ha seminato meno,
   * speso meno e raccolto di più. La domanda che ne nasce — è la varietà, la
   * precessione, o ha semplicemente smesso di sprecare seme? — è esattamente
   * quella che il quaderno deve far venire in mente.
   */
  const seme = nuovo<Prodotto>({
    aziendaId,
    nome: 'Seme frumento',
    tipo: 'sementi',
    unitaMisura: 'kg',
    fonte: 'manuale',
  })
  const lottoSeme = nuovo<Lotto>({
    aziendaId,
    prodottoId: seme.id,
    prezzoUnitario: 0.62,
    valuta: 'EUR',
  })

  const storico: { colture: Coltura[]; interventi: Intervento[] } = {
    colture: [],
    interventi: [],
  }

  const annate = [
    { anno: annata - 2, varieta: 'Bologna', precessione: 'Mais', tacca: '16', impostata: 200, reale: 218, resa: 58, proteine: 12.4, prezzo: 24.5 },
    { anno: annata - 1, varieta: 'Bologna', precessione: 'Soia', tacca: '14', impostata: 180, reale: 195, resa: 62, proteine: 13.1, prezzo: 25.2 },
  ]

  for (const a of annate) {
    const coltura = nuovo<Coltura>({
      campoId: frumento.id,
      annata: a.anno,
      specie: 'Frumento tenero',
      varieta: a.varieta,
      precessione: a.precessione,
      dataSemina: `${a.anno - 1}-10-22`,
    })
    storico.colture.push(coltura)

    storico.interventi.push(
      nuovo<Intervento>({
        aziendaId,
        campoId: frumento.id,
        colturaId: coltura.id,
        tipo: 'semina',
        data: `${a.anno}-01-15`,
        operatoreId: titolare.id,
        righe: [
          {
            prodottoId: seme.id,
            lottoId: lottoSeme.id,
            quantita: Math.round(a.reale * frumento.superficieHa),
            unitaMisura: 'kg',
            stimata: true,
          },
        ],
        superficieTrattataHa: frumento.superficieHa,
        origineCampo: 'manuale',
        dosePerHaImpostata: a.impostata,
        settaggi: {
          tacca: a.tacca,
          dose_impostata: a.impostata,
          velocita: 7,
          profondita: 3,
          interfila: 12.5,
        },
        note: 'Terreno in tempera.',
      }),
      nuovo<Intervento>({
        aziendaId,
        campoId: frumento.id,
        colturaId: coltura.id,
        tipo: 'raccolta',
        data: `${a.anno}-07-05`,
        operatoreId: titolare.id,
        righe: [],
        superficieTrattataHa: frumento.superficieHa,
        origineCampo: 'manuale',
        raccolta: {
          quantita: Math.round(a.resa * frumento.superficieHa),
          unitaMisura: 'q',
          resaPerHa: a.resa,
          proteinePct: a.proteine,
          umiditaPct: 13.2,
          prezzoUnitario: a.prezzo,
          valuta: 'EUR',
          acquirente: 'Consorzio',
        },
      }),
    )
  }

  const scarichi = [
    nuovo<MovimentoMagazzino>({
      aziendaId,
      lottoId: lottoRame.id,
      data: dataRame,
      quantita: -6.9,
      unitaMisura: 'kg',
      causale: 'utilizzo',
      interventoId: trattamento.id,
    }),
    nuovo<MovimentoMagazzino>({
      aziendaId,
      lottoId: lottoUrea.id,
      data: concimazione.data,
      quantita: -780,
      unitaMisura: 'kg',
      causale: 'utilizzo',
      interventoId: concimazione.id,
    }),
  ]

  /*
   * Qualche nota scritta come le scriverebbe lui: frasi normali, non moduli.
   * Servono a far vedere che l'app legge il testo — data, campo, argomenti e
   * quantità escono da soli.
   */
  const note = [
    {
      testo:
        'Trattato la vigna sotto casa con 6,9 kg di poltiglia bordolese contro la peronospora, dopo la pioggia di lunedì. Botte da 1000, 300 litri per ettaro.',
      giorni: -6,
      campo: vigna.nome,
    },
    {
      testo:
        'Seminato il campo grande, 7,8 ettari. Tacca 14, sono scesi più o meno 195 kg per ettaro. Terreno in tempera, profondità 3 cm.',
      giorni: -240,
      campo: frumento.nome,
    },
    {
      testo:
        'Si è rotto il trattore piccolo, cinghia dell’alternatore. Portato in officina, mi hanno detto giovedì.',
      giorni: -3,
      campo: undefined,
    },
    {
      testo:
        'Ieri messo 780 kg di urea sul campo grande. Vento poco, buona giornata.',
      giorni: -40,
      campo: frumento.nome,
    },
    {
      testo:
        'Girando nella vigna sotto casa ho visto qualche foglia con macchie gialle sulla fila verso la strada. Da tenere d’occhio.',
      giorni: -1,
      campo: vigna.nome,
    },
  ].map((n) => {
    const data = aggiungiGiorni(adesso, n.giorni)
    const letta = leggiNota(n.testo, {
      oggi: data,
      campiConosciuti: [vigna.nome, frumento.nome],
      prodottiConosciuti: [rameico.nome, zolfo.nome, urea.nome, seme.nome],
    })
    return nuovo<Nota>({
      aziendaId,
      testo: n.testo,
      dataFatto: data,
      campoNome: n.campo,
      argomenti: letta.argomenti,
      scheda: { ...letta.scheda, campoNome: n.campo },
    })
  })

  await db.transaction(
    'rw',
    [
      db.note,
      db.campi,
      db.colture,
      db.operatori,
      db.attrezzi,
      db.documenti,
      db.prodotti,
      db.lotti,
      db.movimenti,
      db.interventi,
    ],
    async () => {
      await db.note.bulkAdd(note)
      await db.campi.bulkAdd([vigna, frumento])
      await db.colture.bulkAdd([colturaVigna, colturaFrumento, ...storico.colture])
      await db.operatori.bulkAdd([titolare, dipendente])
      await db.attrezzi.add(atomizzatore)
      await db.documenti.bulkAdd([patentino, taratura])
      await db.prodotti.bulkAdd([rameico, zolfo, urea, seme])
      await db.lotti.bulkAdd([lottoRame, lottoZolfo, lottoUrea, lottoSeme])
      await db.movimenti.bulkAdd([...carichi, ...scarichi])
      await db.interventi.bulkAdd([trattamento, concimazione, ...storico.interventi])
    },
  )
}

/**
 * Ogni riga nasce marcata come dimostrativa, così il giorno che si comincia sul
 * serio si può togliere tutta la roba finta in un colpo senza toccare il resto.
 */
function nuovo<T extends Tracciato>(dati: Omit<T, keyof Tracciato>): T {
  return { ...traccia(dati), dimostrativo: true } as T
}
