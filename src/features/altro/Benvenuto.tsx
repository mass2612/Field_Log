import { useEffect, useState } from 'react'
import { supabase } from '../../core/sync/client'
import Account from './Account'

const CHIAVE = 'benvenuto-visto'

function giaVisto(): boolean {
  try {
    return localStorage.getItem(CHIAVE) === '1'
  } catch {
    return true
  }
}

function segnaVisto(): void {
  try {
    localStorage.setItem(CHIAVE, '1')
  } catch {
    /* senza memoria si riproporrà: pazienza */
  }
}

/**
 * La prima apertura: si propone subito l'account.
 *
 * Max (13/11/2026): l'ha cercato a intuito in Impostazioni, ma altri non lo
 * troverebbero e non si registrerebbero — e senza account il quaderno sta
 * solo nel telefono. Una volta sola: "Più tardi" non lo ripropone, e chi è
 * già entrato non lo vede.
 */
export default function Benvenuto() {
  const [visibile, setVisibile] = useState(() => !giaVisto())
  const [controllato, setControllato] = useState(false)

  useEffect(() => {
    if (!visibile) return
    void supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) chiudi()
        setControllato(true)
      })
    const { data } = supabase().auth.onAuthStateChange((_evento, s) => {
      if (s) chiudi()
    })
    return () => data.subscription.unsubscribe()
  }, [visibile])

  function chiudi() {
    segnaVisto()
    setVisibile(false)
  }

  if (!visibile || !controllato) return null

  return (
    <div className="benvenuto" role="dialog" aria-label="Benvenuto">
      <div className="benvenuto-corpo">
        <h1>Benvenuto in Agrizen</h1>
        <p>
          Entra con Google o con la tua email: il quaderno viene copiato al sicuro, con foto e
          vocali, e lo ritrovi se cambi o perdi il telefono.
        </p>
        <Account />
        <button className="pulsante-secondario" onClick={chiudi}>
          Più tardi
        </button>
        <p className="aiuto">Puoi farlo quando vuoi da ⚙ Impostazioni.</p>
      </div>
    </div>
  )
}
