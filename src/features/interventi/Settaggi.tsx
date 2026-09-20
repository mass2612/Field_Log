import { useState } from 'react'
import type { Settaggi, TipoAttrezzo, TipoIntervento } from '../../core/domain/types'
import { schemaPer } from '../../core/domain/settaggi'

/**
 * Le regolazioni della macchina.
 *
 * Oggi questo dato sta su un foglietto in cabina e sparisce con la pioggia.
 * È metà del valore del quaderno originale: l'anno prossimo vuoi sapere a che
 * tacca eri, non cosa dice la tabella del costruttore.
 *
 * Si aprono già compilate con l'ultima volta, perché quasi sempre non è cambiato
 * niente: in campo si cambia un numero e si va avanti.
 */
export default function SettaggiMacchina({
  tipoIntervento,
  tipoAttrezzo,
  settaggi,
  onCambia,
  ultimiSettaggi,
  onRipetiUltimi,
}: {
  tipoIntervento: TipoIntervento
  tipoAttrezzo?: TipoAttrezzo
  settaggi: Settaggi
  onCambia: (settaggi: Settaggi) => void
  ultimiSettaggi?: Settaggi
  onRipetiUltimi?: () => void
}) {
  const schema = schemaPer(tipoIntervento, tipoAttrezzo)
  const [tuttiVisibili, setTuttiVisibili] = useState(false)

  if (!schema) return null

  const principali = schema.campi.filter((c) => c.principale)
  const secondari = schema.campi.filter((c) => !c.principale)
  const visibili = tuttiVisibili ? schema.campi : principali

  const compilatiSecondari = secondari.filter(
    (c) => settaggi[c.chiave] != null && settaggi[c.chiave] !== '',
  ).length

  function imposta(chiave: string, valore: string) {
    const aggiornati = { ...settaggi }
    if (valore.trim() === '') delete aggiornati[chiave]
    else aggiornati[chiave] = valore
    onCambia(aggiornati)
  }

  return (
    <>
      <h2 className="titolo-sezione">{schema.titolo}</h2>

      {ultimiSettaggi && Object.keys(ultimiSettaggi).length > 0 && onRipetiUltimi && (
        <button
          type="button"
          className="pulsante-secondario"
          style={{ marginBottom: 14 }}
          onClick={onRipetiUltimi}
        >
          ↩️ Come l’altra volta
        </button>
      )}

      {visibili.map((campo) => (
        <div className="gruppo-campo" key={campo.chiave}>
          <label htmlFor={`set-${campo.chiave}`}>
            {campo.etichetta}
            {campo.unita ? ` (${campo.unita})` : ''}
          </label>
          <input
            id={`set-${campo.chiave}`}
            inputMode={campo.tipo === 'numero' ? 'decimal' : 'text'}
            value={String(settaggi[campo.chiave] ?? '')}
            onChange={(e) => imposta(campo.chiave, e.target.value)}
            placeholder={campo.esempio}
          />
          {campo.aiuto && <p className="aiuto">{campo.aiuto}</p>}
        </div>
      ))}

      {secondari.length > 0 && (
        <button
          type="button"
          className="link-testo"
          onClick={() => setTuttiVisibili(!tuttiVisibili)}
        >
          {tuttiVisibili
            ? 'Mostra solo le principali'
            : `Altre regolazioni (${secondari.length}${compilatiSecondari ? `, ${compilatiSecondari} compilate` : ''})`}
        </button>
      )}
    </>
  )
}
