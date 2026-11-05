import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { db, oggi } from '../db/db'
import { pianoPromemoria, type Promemoria } from '../rules/promemoria'

/**
 * Le notifiche ad app chiusa: esistono solo nell'app installata (Android, poi
 * iPhone). Nel sito non fanno niente, e il resto dell'app non se ne accorge.
 *
 * A ogni cambiamento delle note o dei documenti si rifà il piano da capo:
 * si tolgono le notifiche programmate e si rimettono quelle giuste. Così una
 * raccomandazione segnata come fatta, o spostata a marzo, non suona più a
 * febbraio.
 */
export function useNotifiche(aziendaId: string | undefined): void {
  const naviga = useNavigate()

  const piano = useLiveQuery(async () => {
    if (!aziendaId || !Capacitor.isNativePlatform()) return undefined
    const [note, documenti] = await Promise.all([
      db.note.where('aziendaId').equals(aziendaId).toArray(),
      db.documenti.where('aziendaId').equals(aziendaId).toArray(),
    ])
    return pianoPromemoria(note, documenti, oggi())
  }, [aziendaId])

  useEffect(() => {
    if (piano) void programma(piano).catch(() => undefined)
  }, [piano])

  // Toccando la notifica si apre la nota o il documento.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const ascolto = LocalNotifications.addListener('localNotificationActionPerformed', (azione) => {
      const percorso = azione.notification.extra?.percorso as string | undefined
      if (percorso) naviga(percorso)
    })
    return () => {
      void ascolto.then((a) => a.remove())
    }
  }, [naviga])
}

let ultimoPiano = ''

async function programma(piano: Promemoria[]): Promise<void> {
  const firma = JSON.stringify(piano)
  if (firma === ultimoPiano) return

  let permesso = await LocalNotifications.checkPermissions()
  if (permesso.display === 'prompt' || permesso.display === 'prompt-with-rationale') {
    // Si chiede solo quando c'è davvero qualcosa da ricordare.
    if (piano.length === 0) return
    permesso = await LocalNotifications.requestPermissions()
  }
  if (permesso.display !== 'granted') return

  const attese = await LocalNotifications.getPending()
  if (attese.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: attese.notifications.map((n) => ({ id: n.id })) })
  }
  if (piano.length > 0) {
    await LocalNotifications.schedule({
      notifications: piano.map((p) => ({
        id: p.id,
        title: p.titolo,
        body: p.testo,
        schedule: { at: alleOtto(p.quando), allowWhileIdle: true },
        extra: { percorso: p.percorso },
      })),
    })
  }
  ultimoPiano = firma
}

function alleOtto(giorno: string): Date {
  const [a, m, g] = giorno.split('-').map(Number)
  return new Date(a, m - 1, g, 8, 0, 0)
}
