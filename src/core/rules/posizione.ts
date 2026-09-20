import type { Campo, Coordinate, GeoJSONPoligono } from '../domain/types'

const RAGGIO_TERRA_M = 6_371_000

/** Distanza fra due punti in metri (formula dell'emisenoverso). */
export function distanzaM(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * RAGGIO_TERRA_M * Math.asin(Math.sqrt(h))
}

/** Punto dentro poligono, con il metodo del raggio. Coordinate GeoJSON: [lon, lat]. */
export function dentroPoligono(punto: Coordinate, poligono: GeoJSONPoligono): boolean {
  const anello = poligono.coordinates[0]
  if (!anello || anello.length < 3) return false

  let dentro = false
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
    const [xi, yi] = anello[i]
    const [xj, yj] = anello[j]
    const attraversa =
      yi > punto.lat !== yj > punto.lat &&
      punto.lon < ((xj - xi) * (punto.lat - yi)) / (yj - yi) + xi
    if (attraversa) dentro = !dentro
  }
  return dentro
}

export interface SuggerimentoCampo {
  campo: Campo
  /** Da 0 a 1. Non è una certezza: è un suggerimento da confermare. */
  confidenza: number
  motivo: 'dentro_confine' | 'vicino_al_centro'
  distanzaM?: number
}

/**
 * Suggerisce il campo a partire dalla posizione.
 *
 * Deliberatamente un *suggerimento*: il GPS sbaglia, il telefono resta in cabina,
 * e soprattutto il titolare può registrare un lavoro fatto da un dipendente
 * dall'altra parte dell'azienda. L'utente conferma sempre.
 */
export function suggerisciCampi(
  posizione: Coordinate,
  campi: Campo[],
  massimo = 3,
): SuggerimentoCampo[] {
  const suggerimenti: SuggerimentoCampo[] = []

  for (const campo of campi) {
    if (campo.annullatoIl) continue

    if (campo.geometria && dentroPoligono(posizione, campo.geometria)) {
      suggerimenti.push({ campo, confidenza: 0.95, motivo: 'dentro_confine' })
      continue
    }

    if (campo.centro) {
      const d = distanzaM(posizione, campo.centro)
      // Raggio predefinito ricavato dalla superficie: un campo di N ettari ha
      // un raggio equivalente di circa sqrt(N * 10000 / pi) metri.
      const raggio =
        campo.raggioSuggerimentoM ??
        Math.max(120, Math.sqrt((campo.superficieHa * 10_000) / Math.PI) * 1.5)
      if (d <= raggio) {
        suggerimenti.push({
          campo,
          confidenza: Math.max(0.2, 1 - d / raggio) * 0.8,
          motivo: 'vicino_al_centro',
          distanzaM: Math.round(d),
        })
      }
    }
  }

  return suggerimenti.sort((a, b) => b.confidenza - a.confidenza).slice(0, massimo)
}

/** Legge la posizione una volta sola: nessun tracciamento continuo. */
export function leggiPosizione(timeoutMs = 10_000): Promise<Coordinate> {
  return new Promise((risolvi, rifiuta) => {
    if (!('geolocation' in navigator)) {
      rifiuta(new Error('Questo dispositivo non fornisce la posizione'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        risolvi({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          precisioneM: p.coords.accuracy,
          quotaM: p.coords.altitude ?? undefined,
        }),
      (e) => rifiuta(new Error(e.message)),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    )
  })
}
