import { useState } from 'react'
import { leggiDocumento, type EsitoOcr, type GenereDocumento } from '../../core/ocr'
import { oggi } from '../../core/db/db'

/**
 * Banco di prova della lettura automatica.
 *
 * Serve a rispondere all'unica domanda che conta prima di fidarsi: **quanto
 * sbaglia, sulle fatture vere di questa azienda?** Si fotografa, si guarda cosa
 * ne esce, e si decide se il modulo è pronto o no.
 *
 * C'è anche una fattura finta generata al volo, per provare la catena senza
 * avere una foto sotto mano. Va detto chiaro: **una foto finta è molto più
 * facile di una vera** — carta dritta, contrasto perfetto, nessuna piega. Se
 * sbaglia già lì, sulle vere è peggio.
 */
export default function BancoProva() {
  const [genere, setGenere] = useState<GenereDocumento>('fattura')
  const [immagine, setImmagine] = useState<{ blob: Blob; url: string; nome: string } | null>(null)
  const [esito, setEsito] = useState<EsitoOcr | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)

  function prendi(blob: Blob, nome: string) {
    if (immagine) URL.revokeObjectURL(immagine.url)
    setImmagine({ blob, url: URL.createObjectURL(blob), nome })
    setEsito(null)
    setErrore(null)
  }

  async function esegui() {
    if (!immagine) return
    setInCorso(true)
    setErrore(null)
    setProgresso(0)
    try {
      setEsito(
        await leggiDocumento(immagine.blob, genere, { oggi: oggi(), onProgresso: setProgresso }),
      )
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Lettura non riuscita')
    } finally {
      setInCorso(false)
    }
  }

  return (
    <>
      <div className="scheda">
        <strong>🔬 Banco di prova della lettura</strong>
        <p className="aiuto" style={{ marginTop: 6 }}>
          Fotografa una fattura vera e guarda cosa ne ricava. È l’unico modo per sapere se il
          modulo è pronto o no.
        </p>
      </div>

      <div className="gruppo-campo">
        <label htmlFor="bp-genere">Che documento è</label>
        <select
          id="bp-genere"
          value={genere}
          onChange={(e) => setGenere(e.target.value as GenereDocumento)}
        >
          <option value="fattura">Fattura</option>
          <option value="scadenza">Patentino / certificato con scadenza</option>
        </select>
      </div>

      <div className="gruppo-campo">
        <label htmlFor="bp-foto">Foto</label>
        <input
          id="bp-foto"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) prendi(f, f.name)
          }}
        />
      </div>

      <button
        className="pulsante-secondario"
        onClick={async () => prendi(await fatturaFinta(), 'fattura-finta.png')}
      >
        🧾 Genera una fattura finta
      </button>

      {immagine && (
        <>
          <img src={immagine.url} alt={immagine.nome} className="foto-documento" />
          <button
            className="pulsante-principale"
            onClick={() => void esegui()}
            disabled={inCorso}
          >
            {inCorso ? `Leggo… ${Math.round(progresso * 100)}%` : '🔎 Leggi'}
          </button>
          {inCorso && (
            <div className="barra-progresso">
              <div style={{ width: `${Math.round(progresso * 100)}%` }} />
            </div>
          )}
        </>
      )}

      {errore && (
        <div className="rilievo rilievo-blocco" style={{ marginTop: 14 }}>
          <strong>❗ {errore}</strong>
          <small>La prima volta serve la rete per scaricare la lingua italiana.</small>
        </div>
      )}

      {esito && <Risultato esito={esito} />}
    </>
  )
}

function Risultato({ esito }: { esito: EsitoOcr }) {
  const { scheda } = esito

  return (
    <>
      <h2 className="titolo-sezione">Risultato</h2>

      <div
        className={`fascia-carenza ${esito.daControllare ? 'carenza-incompleta' : 'carenza-libera'}`}
      >
        Sicurezza complessiva {Math.round(esito.fiducia * 100)}%
        <div style={{ fontWeight: 400, marginTop: 4 }}>
          lettura {Math.round(esito.lettura.fiducia * 100)}% ·{' '}
          {(esito.lettura.durataMs / 1000).toFixed(1)} secondi · {esito.lettura.motore}
        </div>
      </div>

      <div className="scheda">
        {Object.entries(scheda)
          .filter(([chiave, valore]) => chiave !== 'tipo' && chiave !== 'righe' && valore)
          .map(([chiave, valore]) => {
            const campo = valore as { valore: unknown; fiducia: number; riga: string }
            return (
              <div key={chiave} className="dato-letto">
                <div className="riga-dato" style={{ borderBottom: 'none', paddingBottom: 2 }}>
                  <span className="etichetta">{chiave}</span>
                  <span className="valore">
                    {String(campo.valore)}
                    <span
                      className={`bollino-fiducia ${campo.fiducia < 0.6 ? 'incerto' : ''}`}
                    >
                      {Math.round(campo.fiducia * 100)}%
                    </span>
                  </span>
                </div>
                <p className="riga-origine">letto da: «{campo.riga}»</p>
              </div>
            )
          })}
      </div>

      {scheda.tipo === 'fattura' && scheda.righe.length > 0 && (
        <>
          <h2 className="titolo-sezione">Merce ({scheda.righe.length})</h2>
          <div className="scheda">
            {scheda.righe.map((r, i) => (
              <div key={i} className="dato-letto">
                <div className="riga-dato" style={{ borderBottom: 'none', paddingBottom: 2 }}>
                  <span className="etichetta">{r.descrizione}</span>
                  <span className="valore">
                    {r.quantita} {r.unitaMisura ?? ''}
                    {r.prezzoUnitario != null && ` × ${r.prezzoUnitario}`}
                    {r.importo != null && ` = ${r.importo}`}
                  </span>
                </div>
                <p className="riga-origine">«{r.riga}»</p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="titolo-sezione">Testo grezzo</h2>
      <pre className="testo-grezzo">{esito.lettura.testoGrezzo || '(niente)'}</pre>
    </>
  )
}

/**
 * Una fattura finta, disegnata al volo.
 *
 * Utile per provare la catena senza avere una foto sotto mano — ma è un caso
 * facile: carta dritta, nessuna piega, contrasto perfetto. Non è la prova che
 * conta; quella si fa con una fattura vera, fotografata male.
 */
async function fatturaFinta(): Promise<Blob> {
  const tela = document.createElement('canvas')
  tela.width = 1240
  tela.height = 1754
  const c = tela.getContext('2d')!

  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, tela.width, tela.height)
  c.fillStyle = '#000000'

  const righe: [string, number, string][] = [
    ['AGRIFORNITURE VALLE S.R.L.', 34, 'bold'],
    ['Via Roma 14 - 26900 Lodi (LO)', 22, ''],
    ['P.IVA 01234567890', 22, ''],
    ['', 22, ''],
    ['FATTURA N. 2026/0412 del 03/09/2026', 28, 'bold'],
    ['', 22, ''],
    ['Spett.le AZIENDA AGRICOLA ROSSI MARIO', 22, ''],
    ['Cascina Bellavista - 26841 Casalpusterlengo', 22, ''],
    ['', 22, ''],
    ['Cod.  Descrizione            Q.ta  UM   Prezzo   Importo', 22, 'bold'],
    ['1104  POLTIGLIA BORDOLESE      25  kg     6,40    160,00', 22, ''],
    ['2201  ZOLFO BAGNABILE          50  kg     2,10    105,00', 22, ''],
    ['3310  UREA 46                1000  kg     0,55    550,00', 22, ''],
    ['', 22, ''],
    ['Imponibile                                        815,00', 22, ''],
    ['IVA 4%                                             32,60', 22, ''],
    ['TOTALE DOCUMENTO                                  847,60', 26, 'bold'],
    ['', 22, ''],
    ['Pagamento: bonifico 60 gg - scadenza 02/11/2026', 20, ''],
  ]

  let y = 120
  for (const [testo, dimensione, peso] of righe) {
    c.font = `${peso} ${dimensione}px "Courier New", monospace`
    c.fillText(testo, 90, y)
    y += dimensione + 18
  }

  return new Promise<Blob>((risolvi) => tela.toBlob((b) => risolvi(b!), 'image/png'))
}
