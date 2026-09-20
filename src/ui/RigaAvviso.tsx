import { Link } from 'react-router-dom'
import type { Avviso } from '../core/rules/scadenze'

const ICONE: Record<Avviso['gravita'], string> = {
  scaduto: '❗',
  in_scadenza: '⚠️',
  ok: '✅',
}

export default function RigaAvviso({ avviso }: { avviso: Avviso }) {
  const corpo = (
    <>
      <span className="icona" aria-hidden>
        {ICONE[avviso.gravita]}
      </span>
      <span>
        <strong>{avviso.titolo}</strong>
        <small>{avviso.dettaglio}</small>
      </span>
    </>
  )

  const classe = `avviso avviso-${avviso.gravita}`

  return avviso.percorso ? (
    <Link to={avviso.percorso} className={classe}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  )
}
