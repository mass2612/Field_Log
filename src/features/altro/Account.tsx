import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../core/sync/client'
import { sincronizza, ultimaCopia } from '../../core/sync/sincronizza'
import { fmtIstante } from '../../core/i18n'

/**
 * Account e copia dei dati.
 *
 * L'accesso è con un codice mandato per email: niente password da ricordare,
 * che in campo è la prima cosa che si dimentica. Senza account l'app funziona
 * uguale: l'account serve solo a non perdere il quaderno col telefono.
 */
export default function Account() {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [codice, setCodice] = useState('')
  const [codiceMandato, setCodiceMandato] = useState(false)
  const [stato, setStato] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)
  const [ultima, setUltima] = useState(ultimaCopia())

  useEffect(() => {
    void supabase()
      .auth.getSession()
      .then(({ data }) => setSessione(data.session))
    const { data } = supabase().auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  async function prova(azione: () => Promise<void>) {
    setOccupato(true)
    setStato(null)
    try {
      await azione()
    } catch (e) {
      setStato(e instanceof Error ? e.message : String(e))
    } finally {
      setOccupato(false)
    }
  }

  const mandaCodice = () =>
    prova(async () => {
      const { error } = await supabase().auth.signInWithOtp({ email: email.trim() })
      if (error) throw new Error(traduci(error.message))
      setCodiceMandato(true)
      setStato(`Ti ho mandato un codice a ${email.trim()}. Guarda anche nella posta indesiderata.`)
    })

  const entra = () =>
    prova(async () => {
      const { error } = await supabase().auth.verifyOtp({
        email: email.trim(),
        token: codice.trim(),
        type: 'email',
      })
      if (error) throw new Error(traduci(error.message))
      setCodice('')
      setCodiceMandato(false)
      const esito = await sincronizza()
      setUltima(ultimaCopia())
      setStato(`Fatto. Copiate ${esito.inviate} righe, recuperate ${esito.ricevute}.`)
    })

  const copiaAdesso = () =>
    prova(async () => {
      const esito = await sincronizza()
      setUltima(ultimaCopia())
      setStato(
        esito.inviate + esito.ricevute === 0
          ? 'Tutto già al sicuro.'
          : `Copiate ${esito.inviate} righe, recuperate ${esito.ricevute}.`,
      )
    })

  const esci = () =>
    prova(async () => {
      await supabase().auth.signOut()
      setStato('Uscito. I dati restano su questo telefono.')
    })

  return (
    <div className="scheda">
      <strong>☁️ Account e copia dei dati</strong>

      {sessione ? (
        <>
          <p className="aiuto" style={{ marginTop: 6 }}>
            Collegato come <strong>{sessione.user.email}</strong>. Il quaderno si copia da solo
            quando c'è rete; su un telefono nuovo basta entrare con la stessa email.
          </p>
          <p className="aiuto">
            {ultima ? `Ultima copia: ${fmtIstante(ultima)}.` : 'Nessuna copia ancora.'} Foto e
            registrazioni per ora restano sul telefono.
          </p>
          <div className="pila">
            <button className="pulsante-principale" disabled={occupato} onClick={() => void copiaAdesso()}>
              {occupato ? 'Copio…' : 'Copia adesso'}
            </button>
            <button className="pulsante-secondario" disabled={occupato} onClick={() => void esci()}>
              Esci
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="aiuto" style={{ marginTop: 6 }}>
            Entra con la tua email: il quaderno viene copiato al sicuro e lo ritrovi se cambi o
            perdi il telefono. Ti arriva un codice, niente password.
          </p>
          <div className="gruppo-campo">
            <label htmlFor="acc-email">Email</label>
            <input
              id="acc-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {codiceMandato && (
            <div className="gruppo-campo">
              <label htmlFor="acc-codice">Codice arrivato per email</label>
              <input
                id="acc-codice"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
              />
            </div>
          )}
          <div className="pila">
            {codiceMandato ? (
              <>
                <button
                  className="pulsante-principale"
                  disabled={occupato || codice.trim().length < 6}
                  onClick={() => void entra()}
                >
                  Entra
                </button>
                <button className="pulsante-secondario" disabled={occupato} onClick={() => void mandaCodice()}>
                  Rimandami il codice
                </button>
              </>
            ) : (
              <button
                className="pulsante-principale"
                disabled={occupato || !email.includes('@')}
                onClick={() => void mandaCodice()}
              >
                Mandami il codice
              </button>
            )}
          </div>
        </>
      )}

      {stato && <p className="aiuto" style={{ marginTop: 8 }}>{stato}</p>}
    </div>
  )
}

/** I messaggi di Supabase sono in inglese: i più comuni, detti in italiano. */
function traduci(messaggio: string): string {
  if (/rate limit|security purposes/i.test(messaggio)) return 'Troppi codici di fila: riprova fra qualche minuto.'
  if (/expired|invalid/i.test(messaggio)) return 'Codice sbagliato o scaduto. Fattene mandare un altro.'
  if (/email/i.test(messaggio) && /valid/i.test(messaggio)) return 'Email non valida.'
  return messaggio
}
