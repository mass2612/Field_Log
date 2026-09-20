import { db } from './db'
import type { Campo, Giorno, ID, Intervento, Prodotto } from '../domain/types'
import { statoCarenzaCampo, type StatoCarenza } from '../rules/carenza'
import { avvisiMagazzino, avvisoDocumento, ordinaAvvisi, type Avviso } from '../rules/scadenze'
import { oggi } from './db'

/** Giacenza per lotto, ricavata dai movimenti: mai un contatore da aggiornare a mano. */
export async function giacenzePerLotto(aziendaId: ID): Promise<Map<ID, number>> {
  const movimenti = await db.movimenti.where('aziendaId').equals(aziendaId).toArray()
  const giacenze = new Map<ID, number>()
  for (const m of movimenti) {
    if (m.annullatoIl) continue
    giacenze.set(m.lottoId, (giacenze.get(m.lottoId) ?? 0) + m.quantita)
  }
  return giacenze
}

/** Giacenza aggregata per prodotto, sommando i lotti. */
export async function giacenzePerProdotto(aziendaId: ID): Promise<Map<ID, number>> {
  const [lotti, perLotto] = await Promise.all([
    db.lotti.where('aziendaId').equals(aziendaId).toArray(),
    giacenzePerLotto(aziendaId),
  ])
  const giacenze = new Map<ID, number>()
  for (const lotto of lotti) {
    const q = perLotto.get(lotto.id) ?? 0
    giacenze.set(lotto.prodottoId, (giacenze.get(lotto.prodottoId) ?? 0) + q)
  }
  return giacenze
}

export async function mappaProdotti(aziendaId: ID): Promise<Map<ID, Prodotto>> {
  const prodotti = await db.prodotti.where('aziendaId').equals(aziendaId).toArray()
  return new Map(prodotti.map((p) => [p.id, p]))
}

/**
 * Tutti gli avvisi dell'azienda in un'unica lista: documenti in scadenza,
 * prodotti scaduti o revocati. È quello che alimenta il punto esclamativo.
 */
export async function avvisiAzienda(aziendaId: ID, aOggi: Giorno = oggi()): Promise<Avviso[]> {
  const [documenti, lotti, prodotti, giacenzeLotto] = await Promise.all([
    db.documenti.where('aziendaId').equals(aziendaId).toArray(),
    db.lotti.where('aziendaId').equals(aziendaId).toArray(),
    mappaProdotti(aziendaId),
    giacenzePerLotto(aziendaId),
  ])

  const avvisi: Avviso[] = []
  for (const d of documenti) {
    const a = avvisoDocumento(d, aOggi)
    if (a) avvisi.push(a)
  }
  avvisi.push(...avvisiMagazzino(lotti, prodotti, giacenzeLotto, aOggi))

  return ordinaAvvisi(avvisi)
}

export async function interventiDelCampo(campoId: ID): Promise<Intervento[]> {
  const interventi = await db.interventi.where('campoId').equals(campoId).toArray()
  return interventi.sort((a, b) => b.data.localeCompare(a.data))
}

/** Lo stato di carenza da mostrare in cima alla scheda del campo. */
export async function carenzaDelCampo(
  campo: Campo,
  aOggi: Giorno = oggi(),
): Promise<StatoCarenza> {
  const [interventi, prodotti] = await Promise.all([
    interventiDelCampo(campo.id),
    mappaProdotti(campo.aziendaId),
  ])
  return statoCarenzaCampo(interventi, prodotti, aOggi)
}

export async function ultimiInterventi(aziendaId: ID, quanti = 10): Promise<Intervento[]> {
  const interventi = await db.interventi.where('aziendaId').equals(aziendaId).toArray()
  return interventi
    .filter((i) => !i.annullatoIl)
    .sort((a, b) => b.data.localeCompare(a.data) || b.creatoIl.localeCompare(a.creatoIl))
    .slice(0, quanti)
}

export async function bozzeDaCompletare(aziendaId: ID): Promise<Intervento[]> {
  const interventi = await db.interventi.where('aziendaId').equals(aziendaId).toArray()
  return interventi.filter((i) => i.daCompletare && !i.annullatoIl)
}

/** Annata agraria corrente: per ora l'anno solare, da rendere configurabile. */
export function annataCorrente(aOggi: Giorno = oggi()): number {
  return Number(aOggi.slice(0, 4))
}

export async function interventiAnnata(
  aziendaId: ID,
  campoId: ID,
  annata: number,
): Promise<Intervento[]> {
  const interventi = await db.interventi.where('campoId').equals(campoId).toArray()
  return interventi.filter((i) => i.aziendaId === aziendaId && Number(i.data.slice(0, 4)) === annata)
}
