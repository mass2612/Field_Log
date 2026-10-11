import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ID } from '../core/domain/types'
import { db } from '../core/db/db'

/**
 * Rimpicciolisce una foto prima di archiviarla.
 *
 * Una foto del telefono pesa 3-5 MB; per vedere un argine o una foglia malata
 * ne bastano poche centinaia di KB. Tutto sta nel telefono, e il telefono si
 * riempie: dieci foto al giorno per una stagione sono altrimenti qualche GB.
 *
 * Solo per le foto delle note. Le foto dei documenti restano intere: lì un
 * numero piccolo deve restare leggibile.
 */
export async function riduciFoto(file: File, latoMassimo = 1600, qualita = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scala = Math.min(1, latoMassimo / Math.max(bitmap.width, bitmap.height))
    if (scala === 1 && file.size < 600_000) return file

    const tela = document.createElement('canvas')
    tela.width = Math.round(bitmap.width * scala)
    tela.height = Math.round(bitmap.height * scala)
    tela.getContext('2d')?.drawImage(bitmap, 0, 0, tela.width, tela.height)
    bitmap.close()

    const ridotta = await new Promise<Blob | null>((risolvi) =>
      tela.toBlob(risolvi, 'image/jpeg', qualita),
    )
    return ridotta && ridotta.size < file.size ? ridotta : file
  } catch {
    // Se il telefono non sa rimpicciolirla, si tiene com'è: meglio pesante che persa.
    return file
  }
}

/** Una miniatura da un blob, con l'indirizzo temporaneo liberato quando sparisce. */
export function Miniatura({
  blob,
  alt,
  onTocca,
}: {
  blob: Blob
  alt: string
  onTocca?: () => void
}) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const indirizzo = URL.createObjectURL(blob)
    setUrl(indirizzo)
    return () => URL.revokeObjectURL(indirizzo)
  }, [blob])

  if (!url) return null
  return (
    <button type="button" className="miniatura" onClick={onTocca} aria-label={alt}>
      <img src={url} alt={alt} />
    </button>
  )
}

/** Le foto già archiviate di una nota, in fila; un tocco le apre grandi. */
export function FotoArchiviate({ ids }: { ids: ID[] }) {
  const [aperta, setAperta] = useState<Blob | null>(null)
  const allegati = useLiveQuery(async () => (await db.allegati.bulkGet(ids)).filter(Boolean), [
    ids.join(','),
  ])
  if (!allegati || allegati.length === 0) return null

  return (
    <>
      <div className="fila-miniature">
        {allegati.map((a, i) =>
          a?.blob ? (
            <Miniatura key={a.id} blob={a.blob} alt={`Foto ${i + 1}`} onTocca={() => setAperta(a.blob!)} />
          ) : null,
        )}
      </div>
      {aperta && <FotoGrande blob={aperta} onChiudi={() => setAperta(null)} />}
    </>
  )
}

export function FotoGrande({ blob, onChiudi }: { blob: Blob; onChiudi: () => void }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const indirizzo = URL.createObjectURL(blob)
    setUrl(indirizzo)
    return () => URL.revokeObjectURL(indirizzo)
  }, [blob])
  return (
    <div className="foto-grande" role="dialog" aria-label="Foto" onClick={onChiudi}>
      {url && <img src={url} alt="Foto ingrandita" />}
      <span className="foto-grande-chiudi">Tocca per chiudere</span>
    </div>
  )
}
