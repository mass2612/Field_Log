import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, traccia } from './db'
import type { Azienda, Tracciato } from '../domain/types'
import { avvisiAzienda } from './query'
import type { Avviso } from '../rules/scadenze'

/**
 * Azienda corrente.
 *
 * Oggi ce n'è una sola sul dispositivo. La struttura però è già multi-azienda,
 * perché un contoterzista lavora per conto di altri e un consulente segue più
 * aziende: ogni record porta `aziendaId` fin dal primo giorno, così non si
 * riscrive tutto quando arriverà il momento.
 */
export function useAzienda(): Azienda | undefined {
  // `useLiveQuery` gira dentro una transazione di sola lettura: qui si legge e basta.
  // Si restituisce `null` quando l'azienda non c'è, così si distingue dal caso
  // "sto ancora caricando", che vale `undefined`.
  const azienda = useLiveQuery(async () => (await db.aziende.toCollection().first()) ?? null, [])

  // La creazione al primo avvio è una scrittura, e va fatta fuori dalla query.
  useEffect(() => {
    if (azienda !== null) return

    let annullato = false
    void (async () => {
      const esistente = await db.aziende.toCollection().first()
      if (annullato || esistente) return
      await db.aziende.add(
        traccia<Omit<Azienda, keyof Tracciato>>({
          nome: 'La mia azienda',
          paese: 'IT',
        }) as Azienda,
      )
    })()

    return () => {
      annullato = true
    }
  }, [azienda])

  return azienda ?? undefined
}

export function useAvvisi(aziendaId: string | undefined): Avviso[] {
  return (
    useLiveQuery(async () => (aziendaId ? avvisiAzienda(aziendaId) : []), [aziendaId]) ?? []
  )
}

/** Presenza di rete: in campo cambia di continuo, e va detto all'utente. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const su = () => setOnline(true)
    const giu = () => setOnline(false)
    window.addEventListener('online', su)
    window.addEventListener('offline', giu)
    return () => {
      window.removeEventListener('online', su)
      window.removeEventListener('offline', giu)
    }
  }, [])

  return online
}
