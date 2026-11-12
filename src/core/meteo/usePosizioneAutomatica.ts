import { useEffect } from 'react'
import { db, modificaTracciata } from '../db/db'
import type { Azienda } from '../domain/types'
import { leggiPosizione } from '../rules/posizione'

const CHIAVE = 'posizione-chiesta'

/**
 * La posizione dell'azienda si prende da sola, alla prima apertura.
 *
 * Max (13/11/2026): il meteo deve comparire subito, senza chiedere dove sei.
 * Si chiede il permesso una volta; se l'utente dice di no non si insiste (la
 * si può sempre segnare da Impostazioni). Quando ci saranno le particelle, il
 * meteo potrà farsi per appezzamento.
 */
export function usePosizioneAutomatica(azienda: Azienda | undefined): void {
  useEffect(() => {
    if (!azienda || azienda.posizione) return
    try {
      if (localStorage.getItem(CHIAVE) === '1') return
      localStorage.setItem(CHIAVE, '1')
    } catch {
      return
    }
    void leggiPosizione(20_000)
      .then((posizione) => modificaTracciata(db.aziende, 'aziende', azienda.id, { posizione }))
      .catch(() => undefined)
  }, [azienda?.id, azienda?.posizione])
}
