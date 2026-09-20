import { useEffect, useState } from 'react'
import type { Azienda, Giorno } from '../domain/types'
import { oggi } from '../db/db'

/**
 * Il tempo.
 *
 * Non agganciato alla singola nota: **registrato tutti i giorni, da solo.**
 * Perché la domanda dell'anno dopo non è "che tempo faceva il giorno che ho
 * trattato", ma "quanta acqua è venuta giù ad aprile" e "quanti giorni sopra i
 * trenta gradi a giugno". Se il diario del tempo c'è, il confronto fra annate
 * smette di dire solo cosa hai fatto e comincia a dire che stagione era.
 *
 * Fonte: Open-Meteo, che non chiede chiavi né registrazioni. Senza rete non
 * succede niente di male: si riprende quando torna.
 */

export interface MeteoGiorno {
  giorno: Giorno
  temperaturaC: number
  temperaturaMinC?: number
  temperaturaMaxC?: number
  pioggiaMm: number
  ventoKmh?: number
  codice?: number
  icona: string
}

const CHIAVE_CACHE = 'meteo-oggi'

export function useMeteoOggi(azienda?: Azienda): MeteoGiorno | undefined {
  const [meteo, setMeteo] = useState<MeteoGiorno | undefined>(() => leggiCache())

  useEffect(() => {
    const posizione = azienda?.posizione
    if (!posizione) return

    const giorno = oggi()
    const inCache = leggiCache()
    if (inCache?.giorno === giorno) {
      setMeteo(inCache)
      return
    }
    if (!navigator.onLine) return

    let annullato = false
    void (async () => {
      const risultato = await scaricaMeteo(posizione.lat, posizione.lon, giorno)
      if (annullato || !risultato) return
      localStorage.setItem(CHIAVE_CACHE, JSON.stringify(risultato))
      setMeteo(risultato)
    })()

    return () => {
      annullato = true
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

export async function scaricaMeteo(
  lat: number,
  lon: number,
  giorno: Giorno,
): Promise<MeteoGiorno | undefined> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,precipitation,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=1`

    const risposta = await fetch(url)
    if (!risposta.ok) return undefined

    const dati = (await risposta.json()) as {
      current?: {
        temperature_2m?: number
        precipitation?: number
        weather_code?: number
        wind_speed_10m?: number
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
    }
  } catch {
    // Senza rete si sta zitti: non è un errore, è la campagna.
    return undefined
  }
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
