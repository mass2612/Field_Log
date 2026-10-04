import { useEffect, useState } from 'react'
import type { Azienda, Giorno } from '../domain/types'
import { oggi } from '../db/db'

/**
 * Il tempo: com'è adesso e come sarà nelle prossime ore.
 *
 * ## Cosa è stato deciso, e perché (04/10/2026)
 *
 * **Niente meteo attaccato alle note.** Tre numeri presi dall'app nel momento in
 * cui si scrive non dicono niente: la nota si scrive spesso la sera, e il dato
 * viene da un modello con celle di qualche chilometro, non dal campo. Quando
 * l'agricoltore vorrà incrociare i lavori col tempo, il dato si prende allora
 * dallo storico — Open-Meteo lo tiene per anni — senza averlo accumulato prima.
 *
 * **La previsione in home, sì.** Quella serve davvero, ogni mattina: "tratto
 * oggi o piove?", "c'è vento?". La versione di base è gratuita; il di più
 * (più giorni, avvisi, stazione propria) è candidato alla versione a pagamento.
 *
 * Fonte: Open-Meteo, senza chiavi né registrazioni. **Attenzione: gratis solo
 * per uso non commerciale.** Il giorno che l'app si vende serve l'abbonamento
 * o un'altra fonte. Senza rete si mostra l'ultima previsione scaricata, con
 * l'ora a cui risale: una previsione vecchia che sembra fresca è peggio di
 * nessuna previsione.
 */

export interface OraMeteo {
  /** Ora locale dell'azienda, "15:00". */
  ora: string
  temperaturaC: number
  /** Probabilità di pioggia, 0-100. */
  probabilitaPioggia?: number
  pioggiaMm: number
  ventoKmh?: number
  raffiche?: number
  icona: string
}

export interface MeteoGiorno {
  giorno: Giorno
  temperaturaC: number
  temperaturaMinC?: number
  temperaturaMaxC?: number
  pioggiaMm: number
  ventoKmh?: number
  codice?: number
  icona: string
  /** Le prossime ore, da adesso in avanti. */
  ore?: OraMeteo[]
  /** Quando è stata scaricata: dice quanto ci si può fidare. */
  scaricatoIl?: number
}

const CHIAVE_CACHE = 'meteo-oggi'
/** Oltre quest'età la previsione si riscarica, se c'è rete. */
const VALIDITA_MS = 60 * 60 * 1000
const ORE_DA_MOSTRARE = 12

export function useMeteoOggi(azienda?: Azienda): MeteoGiorno | undefined {
  const [meteo, setMeteo] = useState<MeteoGiorno | undefined>(() => leggiCache())

  useEffect(() => {
    const posizione = azienda?.posizione
    if (!posizione) return

    let annullato = false
    const aggiorna = async () => {
      const inCache = leggiCache()
      const fresca =
        inCache?.giorno === oggi() &&
        inCache.ore &&
        Date.now() - (inCache.scaricatoIl ?? 0) < VALIDITA_MS
      if (fresca || !navigator.onLine) return

      const risultato = await scaricaMeteo(posizione.lat, posizione.lon, oggi())
      if (annullato || !risultato) return
      try {
        localStorage.setItem(CHIAVE_CACHE, JSON.stringify(risultato))
      } catch {
        /* senza cache si riscarica la prossima volta */
      }
      setMeteo(risultato)
    }

    void aggiorna()
    // Chi tiene l'app aperta tutta la mattina deve vedere la previsione che
    // cambia, non quella delle sette.
    const orologio = setInterval(() => void aggiorna(), 15 * 60 * 1000)
    window.addEventListener('online', aggiorna)
    return () => {
      annullato = true
      clearInterval(orologio)
      window.removeEventListener('online', aggiorna)
    }
  }, [azienda?.posizione, azienda?.posizione?.lat, azienda?.posizione?.lon])

  return meteo
}

function leggiCache(): MeteoGiorno | undefined {
  try {
    const grezzo = localStorage.getItem(CHIAVE_CACHE)
    return grezzo ? (JSON.parse(grezzo) as MeteoGiorno) : undefined
  } catch {
    return undefined
  }
}

/** Le ore della previsione da adesso in avanti: quelle passate non servono. */
export function oreDaAdesso(meteo: MeteoGiorno, adesso = new Date()): OraMeteo[] {
  const ore = meteo.ore ?? []
  // Una previsione scaricata ieri non dice niente su oggi.
  if (meteo.giorno !== oggi()) return []
  const oraAttuale = `${String(adesso.getHours()).padStart(2, '0')}:00`
  return ore.filter((o) => o.ora >= oraAttuale).slice(0, ORE_DA_MOSTRARE)
}

/**
 * La prima ora in cui è attesa pioggia vera, nelle prossime ore.
 * È la domanda che ci si fa la mattina prima di trattare.
 */
export function primaPioggia(ore: OraMeteo[]): OraMeteo | undefined {
  return ore.find((o) => o.pioggiaMm >= 0.5 || (o.probabilitaPioggia ?? 0) >= 60)
}

export async function scaricaMeteo(
  lat: number,
  lon: number,
  giorno: Giorno,
): Promise<MeteoGiorno | undefined> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,precipitation,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=auto&forecast_days=2`

    const risposta = await fetch(url)
    if (!risposta.ok) return undefined

    const dati = (await risposta.json()) as {
      current?: {
        temperature_2m?: number
        precipitation?: number
        weather_code?: number
        wind_speed_10m?: number
      }
      hourly?: {
        time?: string[]
        temperature_2m?: number[]
        precipitation_probability?: (number | null)[]
        precipitation?: number[]
        weather_code?: number[]
        wind_speed_10m?: number[]
        wind_gusts_10m?: number[]
      }
      daily?: {
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
        precipitation_sum?: number[]
      }
    }

    const corrente = dati.current
    if (!corrente || corrente.temperature_2m == null) return undefined

    return {
      giorno,
      temperaturaC: corrente.temperature_2m,
      temperaturaMaxC: dati.daily?.temperature_2m_max?.[0],
      temperaturaMinC: dati.daily?.temperature_2m_min?.[0],
      pioggiaMm: dati.daily?.precipitation_sum?.[0] ?? corrente.precipitation ?? 0,
      ventoKmh: corrente.wind_speed_10m,
      codice: corrente.weather_code,
      icona: iconaMeteo(corrente.weather_code),
      ore: leggiOre(dati.hourly, giorno),
      scaricatoIl: Date.now(),
    }
  } catch {
    // Senza rete si sta zitti: non è un errore, è la campagna.
    return undefined
  }
}

/**
 * Le ore arrivano come colonne parallele ("2026-10-04T15:00" in ora locale
 * dell'azienda, grazie a `timezone=auto`). Si tengono quelle di oggi e di
 * domattina: alle dieci di sera interessa sapere se piove all'alba.
 */
function leggiOre(
  h:
    | {
        time?: string[]
        temperature_2m?: number[]
        precipitation_probability?: (number | null)[]
        precipitation?: number[]
        weather_code?: number[]
        wind_speed_10m?: number[]
        wind_gusts_10m?: number[]
      }
    | undefined,
  giorno: Giorno,
): OraMeteo[] {
  if (!h?.time) return []
  const ore: OraMeteo[] = []
  h.time.forEach((istante, i) => {
    const [data, ora] = istante.split('T')
    const temperatura = h.temperature_2m?.[i]
    if (temperatura == null || !ora) return
    // Le ore di domani si scrivono "24:00", "25:00"... così l'ordinamento e il
    // confronto con l'ora attuale restano semplici confronti di testo.
    const oraOrdinabile =
      data === giorno ? ora : `${String(24 + Number(ora.slice(0, 2))).padStart(2, '0')}:00`
    if (data !== giorno && Number(ora.slice(0, 2)) >= 12) return
    ore.push({
      ora: oraOrdinabile,
      temperaturaC: temperatura,
      probabilitaPioggia: h.precipitation_probability?.[i] ?? undefined,
      pioggiaMm: h.precipitation?.[i] ?? 0,
      ventoKmh: h.wind_speed_10m?.[i],
      raffiche: h.wind_gusts_10m?.[i],
      icona: iconaMeteo(h.weather_code?.[i]),
    })
  })
  return ore
}

/** "25:00" → "01": le ore di domani tornano ore normali quando si mostrano. */
export function oraLeggibile(ora: string): string {
  const h = Number(ora.slice(0, 2)) % 24
  return String(h).padStart(2, '0')
}

/** Codici WMO, raggruppati in quello che serve sapere a chi lavora fuori. */
function iconaMeteo(codice?: number): string {
  if (codice == null) return '🌡️'
  if (codice === 0) return '☀️'
  if (codice <= 2) return '🌤️'
  if (codice === 3) return '☁️'
  if (codice <= 48) return '🌫️'
  if (codice <= 57) return '🌦️'
  if (codice <= 67) return '🌧️'
  if (codice <= 77) return '❄️'
  if (codice <= 82) return '🌧️'
  if (codice <= 86) return '🌨️'
  return '⛈️'
}
