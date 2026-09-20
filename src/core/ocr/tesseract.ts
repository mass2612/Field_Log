import type { LettoreDocumenti, RisultatoLettura } from './tipi'

/**
 * Lettore locale, basato su Tesseract.
 *
 * Gira **dentro il telefono**: niente server, niente costo per foto, niente
 * dati che escono dall'azienda. In cambio legge peggio di un servizio a
 * pagamento — su una fattura fotografata storta e stropicciata sbaglia
 * parecchio. Va bene così: la scheda è correggibile, ed è per questo che la
 * correzione non è un accessorio.
 *
 * I file della lingua italiana (una decina di MB) si scaricano la prima volta e
 * poi restano nella cache del browser: dalla seconda volta funziona anche senza
 * rete. **La prima volta la rete serve**, e l'interfaccia lo deve dire.
 */

let modulo: typeof import('tesseract.js') | null = null

async function caricaModulo() {
  // Caricato solo quando serve: sono megabyte che non devono pesare
  // sull'apertura dell'app.
  if (!modulo) modulo = await import('tesseract.js')
  return modulo
}

export function creaLettoreLocale(lingua = 'ita'): LettoreDocumenti {
  let lavoratore: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null

  return {
    nome: 'Tesseract (sul dispositivo)',
    offline: true,

    async leggi(immagine, onProgresso): Promise<RisultatoLettura> {
      const inizio = performance.now()
      const { createWorker } = await caricaModulo()

      if (!lavoratore) {
        lavoratore = await createWorker(lingua, 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') onProgresso?.(m.progress)
            else if (m.status.includes('loading') || m.status.includes('initializ')) {
              onProgresso?.(m.progress * 0.3)
            }
          },
        })
      }

      const esito = await lavoratore.recognize(immagine)

      return {
        testoGrezzo: esito.data.text,
        // Tesseract dà la fiducia in centesimi.
        fiducia: (esito.data.confidence ?? 0) / 100,
        durataMs: Math.round(performance.now() - inizio),
        motore: 'tesseract-' + lingua,
      }
    },

    async chiudi() {
      await lavoratore?.terminate()
      lavoratore = null
    },
  }
}

/**
 * Raddrizza e alleggerisce la foto prima di darla in pasto al lettore.
 *
 * Fa più differenza del motore stesso: una foto da 12 megapixel è lenta da
 * leggere e non più precisa. Si ridimensiona al lato lungo utile e si alza il
 * contrasto in scala di grigi, che è come Tesseract lavora meglio.
 */
export async function preparaImmagine(file: Blob, latoMassimo = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  const scala = Math.min(1, latoMassimo / Math.max(bitmap.width, bitmap.height))
  const larghezza = Math.round(bitmap.width * scala)
  const altezza = Math.round(bitmap.height * scala)

  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = altezza

  const contesto = tela.getContext('2d')
  if (!contesto) return file

  contesto.drawImage(bitmap, 0, 0, larghezza, altezza)
  bitmap.close?.()

  const dati = contesto.getImageData(0, 0, larghezza, altezza)
  const pixel = dati.data

  // Grigio pesato sulla percezione, poi contrasto: la carta diventa bianca e
  // l'inchiostro nero, che è la condizione in cui l'OCR sbaglia di meno.
  for (let i = 0; i < pixel.length; i += 4) {
    const grigio = pixel[i] * 0.299 + pixel[i + 1] * 0.587 + pixel[i + 2] * 0.114
    const contrastato = Math.max(0, Math.min(255, (grigio - 128) * 1.45 + 128))
    pixel[i] = pixel[i + 1] = pixel[i + 2] = contrastato
  }
  contesto.putImageData(dati, 0, 0)

  return new Promise<Blob>((risolvi) => {
    tela.toBlob((b) => risolvi(b ?? file), 'image/png')
  })
}
