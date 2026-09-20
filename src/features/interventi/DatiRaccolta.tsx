import type { DatiRaccolta, UnitaMisura } from '../../core/domain/types'
import { fmtNumero } from '../../core/i18n'

/**
 * La raccolta.
 *
 * È la metà che manca a quasi tutti i quaderni, e senza la quale il confronto
 * fra annate non esiste: quanto hai messo lo sai, quanto hai raccolto no.
 *
 * La qualità va in campi separati e non in una nota libera, perché due numeri in
 * testo libero non si possono mettere in colonna l'anno dopo.
 */

const MISURE_QUALITA: {
  chiave: keyof DatiRaccolta
  etichetta: string
  unita: string
  colture: RegExp
}[] = [
  { chiave: 'umiditaPct', etichetta: 'Umidità', unita: '%', colture: /.*/ },
  {
    chiave: 'proteinePct',
    etichetta: 'Proteine',
    unita: '%',
    colture: /frumento|grano|orzo|soia|mais/i,
  },
  {
    chiave: 'pesoSpecifico',
    etichetta: 'Peso specifico',
    unita: 'kg/hl',
    colture: /frumento|grano|orzo|avena/i,
  },
  {
    chiave: 'gradoZuccherino',
    etichetta: 'Grado zuccherino',
    unita: '°Bx',
    colture: /vite|uva|mela|pera|pesca|barbabietola/i,
  },
]

export default function DatiDellaRaccolta({
  valore,
  onCambia,
  superficieHa,
  specie,
}: {
  valore: DatiRaccolta
  onCambia: (dati: DatiRaccolta) => void
  superficieHa?: number
  specie?: string
}) {
  function imposta<K extends keyof DatiRaccolta>(chiave: K, grezzo: string) {
    const aggiornati = { ...valore }
    if (grezzo.trim() === '') {
      delete aggiornati[chiave]
    } else {
      const n = Number(grezzo.replace(',', '.'))
      aggiornati[chiave] = (Number.isFinite(n) ? n : grezzo) as DatiRaccolta[K]
    }

    // La resa per ettaro si ricalcola da sola: è il numero che serve davvero,
    // e nessuno ha voglia di farlo a mente in mezzo all'aia.
    if (
      (chiave === 'quantita' || chiave === 'resaPerHa') &&
      superficieHa &&
      superficieHa > 0 &&
      aggiornati.quantita != null
    ) {
      aggiornati.resaPerHa = Math.round((aggiornati.quantita / superficieHa) * 100) / 100
    }

    onCambia(aggiornati)
  }

  const misureUtili = MISURE_QUALITA.filter((m) => !specie || m.colture.test(specie))

  return (
    <>
      <h2 className="titolo-sezione">Quanto hai raccolto</h2>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="resa-q">Quantità totale</label>
          <input
            id="resa-q"
            inputMode="decimal"
            value={valore.quantita ?? ''}
            onChange={(e) => imposta('quantita', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="resa-u">Unità</label>
          <select
            id="resa-u"
            value={valore.unitaMisura ?? 'q'}
            onChange={(e) => onCambia({ ...valore, unitaMisura: e.target.value as UnitaMisura })}
          >
            {(['q', 't', 'kg'] as UnitaMisura[]).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {valore.resaPerHa != null && (
        <div className="fascia-carenza carenza-libera" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 400 }}>Resa</div>
          <div style={{ fontSize: 26 }}>
            {fmtNumero(valore.resaPerHa)} {valore.unitaMisura ?? 'q'}/ha
          </div>
        </div>
      )}

      {misureUtili.map((m) => (
        <div className="gruppo-campo" key={String(m.chiave)}>
          <label htmlFor={`q-${String(m.chiave)}`}>
            {m.etichetta} ({m.unita})
          </label>
          <input
            id={`q-${String(m.chiave)}`}
            inputMode="decimal"
            value={(valore[m.chiave] as number | undefined) ?? ''}
            onChange={(e) => imposta(m.chiave, e.target.value)}
          />
        </div>
      ))}

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="resa-p">Prezzo unitario (€)</label>
          <input
            id="resa-p"
            inputMode="decimal"
            value={valore.prezzoUnitario ?? ''}
            onChange={(e) => imposta('prezzoUnitario', e.target.value)}
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="resa-a">Acquirente</label>
          <input
            id="resa-a"
            value={valore.acquirente ?? ''}
            onChange={(e) => onCambia({ ...valore, acquirente: e.target.value || undefined })}
          />
        </div>
      </div>

      <p className="aiuto">
        Il prezzo serve al margine per ettaro. È il numero che a dicembre dice se
        quello che hai cambiato è servito.
      </p>
    </>
  )
}
