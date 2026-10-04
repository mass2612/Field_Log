import { Link } from 'react-router-dom'
import type { Azienda } from '../../core/domain/types'
import {
  oraLeggibile,
  oreDaAdesso,
  primaPioggia,
  type MeteoGiorno,
} from '../../core/meteo/meteo'

/** Ogni quante ore si mostra una colonna: sei colonne stanno in un telefono. */
const PASSO_ORE = 2

/**
 * Com'è la giornata e come saranno le prossime ore.
 *
 * Serve la mattina, prima di uscire: "tratto o piove?", "c'è vento?". Per
 * questo la prima riga, quando serve, è una frase e non un numero: *pioggia
 * dalle 16*. I numeri vengono dopo, per chi vuole guardarli.
 */
export default function TempoOggi({
  azienda,
  meteo,
}: {
  azienda: Azienda
  meteo?: MeteoGiorno
}) {
  if (!azienda.posizione) {
    return (
      <Link to="/impostazioni" className="scheda scheda-cliccabile tempo-oggi">
        <strong>🌤️ Il tempo di oggi</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          Segna una volta dov’è l’azienda e qui vedi la previsione delle prossime ore.
        </p>
      </Link>
    )
  }

  if (!meteo) {
    return (
      <div className="scheda tempo-oggi">
        <p className="aiuto">
          {navigator.onLine ? 'Scarico la previsione…' : 'Senza rete: la previsione arriva quando torna la linea.'}
        </p>
      </div>
    )
  }

  const ore = oreDaAdesso(meteo)
  const colonne = ore.filter((_, i) => i % PASSO_ORE === 0)
  const pioggia = primaPioggia(ore)
  const ventoMassimo = Math.max(0, ...ore.map((o) => o.raffiche ?? o.ventoKmh ?? 0))
  const vecchia = meteo.scaricatoIl ? Date.now() - meteo.scaricatoIl > 3 * 60 * 60 * 1000 : true

  return (
    <div className="scheda tempo-oggi">
      <div className="tempo-adesso">
        <span className="tempo-icona" aria-hidden>
          {meteo.icona}
        </span>
        <span className="tempo-gradi">{Math.round(meteo.temperaturaC)}°</span>
        <span className="tempo-estremi">
          {meteo.temperaturaMinC != null && meteo.temperaturaMaxC != null && (
            <>
              min {Math.round(meteo.temperaturaMinC)}° · max {Math.round(meteo.temperaturaMaxC)}°
            </>
          )}
          {meteo.pioggiaMm > 0 && <> · {formattaMm(meteo.pioggiaMm)} oggi</>}
        </span>
      </div>

      {ore.length > 0 && (
        <p className="tempo-frase">
          {pioggia
            ? `🌧️ Pioggia probabile dalle ${oraLeggibile(pioggia.ora)}`
            : '✓ Niente pioggia nelle prossime ore'}
          {ventoMassimo >= 20 && ` · 💨 raffiche fino a ${Math.round(ventoMassimo)} km/h`}
        </p>
      )}

      {colonne.length > 0 && (
        <div className="tempo-ore">
          {colonne.map((o) => (
            <div key={o.ora} className="tempo-ora">
              <span className="tempo-ora-ora">{oraLeggibile(o.ora)}</span>
              <span aria-hidden style={{ fontSize: 22 }}>
                {o.icona}
              </span>
              <span className="tempo-ora-gradi">{Math.round(o.temperaturaC)}°</span>
              <span className="tempo-ora-dettaglio">
                {(o.probabilitaPioggia ?? 0) >= 20 ? `💧${o.probabilitaPioggia}%` : ' '}
              </span>
              <span className="tempo-ora-dettaglio">
                {o.ventoKmh != null ? `${Math.round(o.ventoKmh)} km/h` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {vecchia && meteo.scaricatoIl && (
        <p className="aiuto" style={{ marginTop: 8 }}>
          Previsione delle {new Date(meteo.scaricatoIl).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          : senza rete non si aggiorna.
        </p>
      )}
    </div>
  )
}

function formattaMm(mm: number): string {
  return `${mm.toLocaleString('it-IT', { maximumFractionDigits: 1 })} mm`
}
