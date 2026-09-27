import { useRef } from 'react'

/**
 * Prendere una foto: scattarla o pescarla dal telefono.
 *
 * ## Perché due pulsanti e non uno
 *
 * Prima c'era un campo solo con `capture="environment"`, che vuol dire "apri
 * la fotocamera". Sul telefono non si comportava come promesso: il pulsante
 * che diceva "fotografa" non scattava, mentre passando da "Scegli file" la
 * fotocamera si apriva. Il motivo è che `capture` è un **suggerimento**, e
 * ogni browser lo interpreta a modo suo.
 *
 * Quindi niente indovinelli: due pulsanti, due scritte chiare, l'utente sceglie.
 */
export default function SceltaFoto({
  onFoto,
  disabilitato,
}: {
  onFoto: (file: File) => void
  disabilitato?: boolean
}) {
  const fotocamera = useRef<HTMLInputElement>(null)
  const archivio = useRef<HTMLInputElement>(null)

  function prendi(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFoto(file)
    // Si azzera, altrimenti riscegliere lo stesso file non fa scattare niente.
    e.target.value = ''
  }

  return (
    <>
      <div className="azioni-pagina">
        <button
          type="button"
          className="pulsante-principale"
          onClick={() => fotocamera.current?.click()}
          disabled={disabilitato}
        >
          📷 Scatta una foto
        </button>
        <button
          type="button"
          className="pulsante-secondario"
          onClick={() => archivio.current?.click()}
          disabled={disabilitato}
        >
          🖼️ Scegli un file
        </button>
      </div>

      {/* Nascosti: quelli veri sono i due pulsanti qui sopra. */}
      <input
        ref={fotocamera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={prendi}
        hidden
      />
      <input ref={archivio} type="file" accept="image/*" onChange={prendi} hidden />
    </>
  )
}
