import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda, Intervento, RigaProdotto, Settaggi } from '../../core/domain/types'
import { annulla, db, modificaTracciata } from '../../core/db/db'
import { mappaProdotti } from '../../core/db/query'
import { schemaPer } from '../../core/domain/settaggi'
import { fmtData, fmtIstante, fmtNumero } from '../../core/i18n'

/**
 * Correggere un intervento già registrato.
 *
 * Si sbaglia a digitare, si confonde un prodotto, la sera non ci si ricorda
 * bene: **correggere è un'operazione normale, non una colpa.** Nessun avviso
 * moralista, nessuna conferma da superare, nessun tono da confessione.
 *
 * L'app tiene traccia delle modifiche, ma per l'agricoltore — per ricostruire
 * cosa è successo — non contro di lui: quello storico non finisce nella stampa
 * del registro se non lo chiede.
 */
export default function CorreggiIntervento({ azienda }: { azienda: Azienda }) {
  const { interventoId } = useParams<{ interventoId: string }>()
  const naviga = useNavigate()

  const dati = useLiveQuery(async () => {
    if (!interventoId) return null
    const intervento = await db.interventi.get(interventoId)
    if (!intervento) return null

    const [prodotti, campo, attrezzi, rettifiche] = await Promise.all([
      mappaProdotti(azienda.id),
      db.campi.get(intervento.campoId),
      db.attrezzi.where('aziendaId').equals(azienda.id).toArray(),
      db.rettifiche.where('recordId').equals(interventoId).toArray(),
    ])

    return {
      intervento,
      prodotti,
      campo,
      attrezzo: attrezzi.find((a) => a.id === intervento.attrezzoId),
      rettifiche: rettifiche.sort((a, b) => b.avvenutaIl.localeCompare(a.avvenutaIl)),
    }
  }, [interventoId, azienda.id])

  const [data, setData] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [righe, setRighe] = useState<RigaProdotto[]>([])
  const [settaggi, setSettaggi] = useState<Settaggi>({})
  const [note, setNote] = useState('')
  const [motivo, setMotivo] = useState('')
  const [caricato, setCaricato] = useState(false)
  const [salvato, setSalvato] = useState(false)

  // Si riempie il modulo una volta sola, altrimenti ogni salvataggio
  // sovrascriverebbe quello che si sta scrivendo.
  useEffect(() => {
    if (!dati?.intervento || caricato) return
    const i = dati.intervento
    setData(i.data)
    setSuperficie(i.superficieTrattataHa != null ? String(i.superficieTrattataHa) : '')
    setRighe(i.righe.map((r) => ({ ...r })))
    setSettaggi({ ...(i.settaggi ?? {}) })
    setNote(i.note ?? '')
    setCaricato(true)
  }, [dati, caricato])

  if (dati === undefined) return <p>Carico…</p>
  if (dati === null) return <p>Intervento non trovato.</p>

  const { intervento, prodotti, campo, attrezzo, rettifiche } = dati
  const schema = schemaPer(intervento.tipo, attrezzo?.tipo)

  async function salva() {
    if (!interventoId) return

    const modifiche: Partial<Intervento> = {
      data,
      superficieTrattataHa: numero(superficie),
      righe,
      settaggi: Object.keys(settaggi).length > 0 ? settaggi : undefined,
      note: note.trim() || undefined,
    }

    await modificaTracciata(db.interventi, 'interventi', interventoId, modifiche, {
      aziendaId: azienda.id,
      motivo: motivo.trim() || undefined,
    })

    setSalvato(true)
    setTimeout(() => naviga(`/campi/${intervento.campoId}`), 600)
  }

  async function annullaIntervento() {
    if (!interventoId) return
    const ragione = motivo.trim() || 'Annullato dall’utente'
    await annulla(db.interventi, 'interventi', interventoId, ragione)
    naviga(`/campi/${intervento.campoId}`)
  }

  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>Correggi</h2>
      <p className="aiuto" style={{ marginTop: 0 }}>
        {campo?.nome} · {fmtData(intervento.data)}
      </p>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="c-data">Data</label>
          <input id="c-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="c-sup">Superficie (ha)</label>
          <input
            id="c-sup"
            inputMode="decimal"
            value={superficie}
            onChange={(e) => setSuperficie(e.target.value)}
          />
        </div>
      </div>

      {righe.length > 0 && <h2 className="titolo-sezione">Prodotti</h2>}
      {righe.map((riga, i) => (
        <div key={i} className="scheda">
          <strong>{prodotti.get(riga.prodottoId)?.nome ?? 'Prodotto'}</strong>

          <div className="riga-campi" style={{ marginTop: 10 }}>
            <div>
              <label htmlFor={`cq${i}`}>Quantità ({riga.unitaMisura})</label>
              <input
                id={`cq${i}`}
                inputMode="decimal"
                value={riga.quantita === 0 ? '' : String(riga.quantita)}
                onChange={(e) =>
                  setRighe(
                    righe.map((r, j) =>
                      j === i
                        ? { ...r, quantita: Number(e.target.value.replace(',', '.')) || 0 }
                        : r,
                    ),
                  )
                }
              />
            </div>
            <div>
              <label htmlFor={`ca${i}`}>Avversità</label>
              <input
                id={`ca${i}`}
                value={riga.avversita ?? ''}
                onChange={(e) =>
                  setRighe(
                    righe.map((r, j) =>
                      j === i ? { ...r, avversita: e.target.value || undefined } : r,
                    ),
                  )
                }
              />
            </div>
          </div>

          {/* Dire che un numero è una stima è più onesto che fingere precisione. */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              fontSize: 16,
              color: 'var(--testo)',
            }}
          >
            <input
              type="checkbox"
              checked={riga.stimata ?? false}
              onChange={(e) =>
                setRighe(
                  righe.map((r, j) => (j === i ? { ...r, stimata: e.target.checked } : r)),
                )
              }
              style={{ width: 26, height: 26, minHeight: 26 }}
            />
            È una stima, non una misura
          </label>
        </div>
      ))}

      {schema && (
        <>
          <h2 className="titolo-sezione">{schema.titolo}</h2>
          {schema.campi
            .filter((c) => c.principale || settaggi[c.chiave] != null)
            .map((c) => (
              <div className="gruppo-campo" key={c.chiave}>
                <label htmlFor={`cs-${c.chiave}`}>
                  {c.etichetta}
                  {c.unita ? ` (${c.unita})` : ''}
                </label>
                <input
                  id={`cs-${c.chiave}`}
                  inputMode={c.tipo === 'numero' ? 'decimal' : 'text'}
                  value={String(settaggi[c.chiave] ?? '')}
                  onChange={(e) => {
                    const aggiornati = { ...settaggi }
                    if (e.target.value.trim() === '') delete aggiornati[c.chiave]
                    else aggiornati[c.chiave] = e.target.value
                    setSettaggi(aggiornati)
                  }}
                  placeholder={c.esempio}
                />
              </div>
            ))}
        </>
      )}

      <div className="gruppo-campo">
        <label htmlFor="c-note">Note</label>
        <textarea id="c-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="gruppo-campo">
        <label htmlFor="c-motivo">Perché lo correggi (facoltativo)</label>
        <input
          id="c-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Avevo sbagliato a scrivere la quantità"
        />
        <p className="aiuto">
          Serve a te, fra un anno, per ricordarti perché quel numero è cambiato. Non finisce nel
          registro che consegni.
        </p>
      </div>

      <div className="pila">
        <button className="pulsante-principale" onClick={() => void salva()} disabled={salvato}>
          {salvato ? '✓ Salvato' : 'Salva la correzione'}
        </button>
        <button className="pulsante-secondario" onClick={() => naviga(-1)}>
          Lascia stare
        </button>
      </div>

      {rettifiche.length > 0 && (
        <>
          <h2 className="titolo-sezione">Correzioni già fatte</h2>
          {rettifiche.map((r) => (
            <div key={r.id} className="riga-dato">
              <span className="etichetta">
                {fmtIstante(r.avvenutaIl, true)} · {nomeCampo(r.campo)}
                {r.motivo ? ` — ${r.motivo}` : ''}
              </span>
              <span className="valore">
                {descrivi(r.campo, r.valorePrecedente)} → {descrivi(r.campo, r.valoreNuovo)}
              </span>
            </div>
          ))}
          <p className="aiuto">
            Questo elenco è tuo. Non viene stampato nel registro dei trattamenti.
          </p>
        </>
      )}

      <h2 className="titolo-sezione">Se l’intervento non è mai avvenuto</h2>
      <button className="pulsante-pericolo" onClick={() => void annullaIntervento()}>
        Annulla questo intervento
      </button>
      <p className="aiuto">
        Resta scritto come annullato invece di sparire, così se te ne accorgi dopo lo ritrovi.
        {intervento.righe.length > 0 && ' Il magazzino non viene ricaricato automaticamente.'}
      </p>

      {intervento.righe.length > 0 && superficieValida(superficie) && (
        <p className="aiuto" style={{ marginTop: 14 }}>
          Dose risultante:{' '}
          {fmtNumero(
            righe.reduce((s, r) => s + r.quantita, 0) / Number(superficie.replace(',', '.')),
          )}{' '}
          per ettaro
        </p>
      )}
    </>
  )
}

function numero(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && v.trim() !== '' ? n : undefined
}

function superficieValida(v: string): boolean {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && n > 0
}

const NOMI_CAMPI: Record<string, string> = {
  righe: 'prodotti',
  data: 'data',
  superficieTrattataHa: 'superficie',
  settaggi: 'regolazioni',
  note: 'note',
  annullatoIl: 'annullamento',
}

function nomeCampo(campo: string): string {
  return NOMI_CAMPI[campo] ?? campo
}

/**
 * Una correzione va letta a colpo d'occhio fra un anno. Un blocco di JSON non
 * si legge: per i campi strutturati si mostra il numero che conta.
 */
function descrivi(campo: string, json: string): string {
  let valore: unknown
  try {
    valore = JSON.parse(json)
  } catch {
    return abbrevia(json)
  }

  if (valore == null) return '—'

  if (campo === 'righe' && Array.isArray(valore)) {
    const righe = valore as RigaProdotto[]
    if (righe.length === 0) return 'nessuno'
    const totale = righe.reduce((s, r) => s + (r.quantita ?? 0), 0)
    return `${fmtNumero(totale)} ${righe[0]?.unitaMisura ?? ''}`.trim()
  }

  if (campo === 'settaggi' && typeof valore === 'object') {
    const voci = Object.entries(valore as Record<string, unknown>)
    return voci.length === 0 ? 'nessuna' : `${voci.length} valori`
  }

  if (typeof valore === 'number') return fmtNumero(valore)
  return abbrevia(String(valore))
}

function abbrevia(testo: string): string {
  const pulito = testo.replace(/^"|"$/g, '')
  return pulito.length > 24 ? pulito.slice(0, 24) + '…' : pulito || '—'
}
