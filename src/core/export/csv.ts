/**
 * Esportazione per l'ufficio.
 *
 * Formato volutamente banale e leggibile: i dati sono dell'agricoltore e devono
 * potersi aprire con qualsiasi foglio di calcolo, oggi e fra dieci anni, anche
 * se questa app non esistesse più.
 */

export type Riga = Record<string, string | number | undefined | null>

/**
 * Excel in Italia apre i CSV usando il separatore di lista di sistema. Il punto
 * e virgola è la scelta giusta in gran parte d'Europa, dove la virgola è il
 * separatore decimale.
 */
export function toCsv(righe: Riga[], separatore = ';'): string {
  if (righe.length === 0) return ''

  const colonne = [...new Set(righe.flatMap((r) => Object.keys(r)))]
  const esc = (v: unknown): string => {
    if (v == null) return ''
    const s = String(v)
    return /["\n\r;,\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const intestazione = colonne.map(esc).join(separatore)
  const corpo = righe.map((r) => colonne.map((c) => esc(r[c])).join(separatore))
  return [intestazione, ...corpo].join('\r\n')
}

/** Il BOM serve a Excel per riconoscere l'UTF-8 e non storpiare gli accenti. */
export function scaricaCsv(nomeFile: string, contenuto: string): void {
  const blob = new Blob(['﻿' + contenuto], { type: 'text/csv;charset=utf-8' })
  scaricaBlob(nomeFile, blob)
}

export function scaricaJson(nomeFile: string, dati: unknown): void {
  const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' })
  scaricaBlob(nomeFile, blob)
}

function scaricaBlob(nomeFile: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
