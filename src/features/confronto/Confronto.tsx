import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Azienda, ID } from '../../core/domain/types'
import { db } from '../../core/db/db'
import {
  confronta,
  riepilogaAnnate,
  type RiepilogoAnnata,
} from '../../core/rules/confronto'
import { scartoPercentuale } from '../../core/domain/settaggi'
import { fmtNumero } from '../../core/i18n'

/**
 * Il confronto fra annate: la schermata che giustifica l'app.
 *
 * Non risponde al posto dell'agricoltore. Mette le annate una accanto all'altra
 * e fa venire la domanda giusta — *l'anno scorso ho seminato meno, speso meno e
 * raccolto di più: perché?*
 */
export default function Confronto({ azienda }: { azienda: Azienda }) {
  const [campoScelto, setCampoScelto] = useState<ID>('')

  const dati = useLiveQuery(async () => {
    const [campi, colture, interventi, prodotti, lotti, analisi] = await Promise.all([
      db.campi.where('aziendaId').equals(azienda.id).toArray(),
      db.colture.toArray(),
      db.interventi.where('aziendaId').equals(azienda.id).toArray(),
      db.prodotti.where('aziendaId').equals(azienda.id).toArray(),
      db.lotti.where('aziendaId').equals(azienda.id).toArray(),
      db.analisiSuolo.where('aziendaId').equals(azienda.id).toArray(),
    ])

    const idCampi = new Set(campi.map((c) => c.id))
    const costiProdotto = new Map<ID, number>()
    for (const lotto of lotti) {
      if (lotto.prezzoUnitario == null) continue
      const attuale = costiProdotto.get(lotto.prodottoId)
      costiProdotto.set(
        lotto.prodottoId,
        attuale == null ? lotto.prezzoUnitario : (attuale + lotto.prezzoUnitario) / 2,
      )
    }

    const righe = riepilogaAnnate({
      campi: new Map(campi.map((c) => [c.id, c])),
      colture: colture.filter((c) => idCampi.has(c.campoId)),
      interventi,
      prodotti: new Map(prodotti.map((p) => [p.id, p])),
      costiProdotto,
      analisi,
    })

    return { campi: campi.filter((c) => !c.annullatoIl), righe }
  }, [azienda.id])

  if (!dati) return <p>Carico…</p>

  const righeFiltrate = campoScelto
    ? dati.righe.filter((r) => r.campoId === campoScelto)
    : dati.righe

  if (dati.righe.length === 0) {
    return (
      <div className="elenco-vuoto">
        <span className="icona" aria-hidden>
          📈
        </span>
        Non c’è ancora niente da confrontare.
        <p className="aiuto">
          Serve almeno un’annata con una coltura sul campo. Il confronto diventa
          interessante dalla seconda in poi — e utile davvero quando registri anche
          la raccolta.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="gruppo-campo">
        <label htmlFor="campo-confronto">Campo</label>
        <select
          id="campo-confronto"
          value={campoScelto}
          onChange={(e) => setCampoScelto(e.target.value)}
        >
          <option value="">— tutti i campi —</option>
          {dati.campi.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {righeFiltrate.map((riga, i) => {
        // L'annata precedente dello stesso campo, per il confronto diretto.
        const precedente = righeFiltrate
          .slice(i + 1)
          .find((r) => r.campoId === riga.campoId && r.annata < riga.annata)

        return (
          <SchedaAnnata key={`${riga.campoId}-${riga.annata}`} riga={riga} precedente={precedente} />
        )
      })}
    </>
  )
}

function SchedaAnnata({
  riga,
  precedente,
}: {
  riga: RiepilogoAnnata
  precedente?: RiepilogoAnnata
}) {
  const differenze = precedente ? confronta(precedente, riga) : []
  const scarto = scartoPercentuale(riga.seminaImpostataPerHa, riga.seminaRealePerHa)

  return (
    <div className="scheda">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <strong style={{ fontSize: 18 }}>{riga.campoNome}</strong>
        <span style={{ fontWeight: 700 }}>{riga.annata}</span>
      </div>
      <p className="aiuto" style={{ marginTop: 4 }}>
        {riga.specie ?? '—'}
        {riga.varieta ? ` · ${riga.varieta}` : ''}
        {riga.precessione ? ` · dopo ${riga.precessione}` : ''}
        {` · ${fmtNumero(riga.superficieHa)} ha`}
      </p>

      {/* Impostato contro reale: è lì che si nascondono gli errori che nessuno vede. */}
      {scarto != null && Math.abs(scarto) >= 3 && (
        <div
          className={`fascia-carenza ${scarto > 0 ? 'carenza-incompleta' : 'carenza-incompleta'}`}
          style={{ marginTop: 12 }}
        >
          ⚙️ La macchina ha messo il <strong>{scarto > 0 ? '+' : ''}{fmtNumero(scarto, 1)}%</strong>{' '}
          rispetto a quanto avevi impostato
          <div style={{ fontWeight: 400, marginTop: 4 }}>
            impostato {fmtNumero(riga.seminaImpostataPerHa!)} kg/ha · reale{' '}
            {fmtNumero(riga.seminaRealePerHa!)} kg/ha
          </div>
        </div>
      )}

      <Dato etichetta="Semina impostata" valore={riga.seminaImpostataPerHa} unita=" kg/ha" />
      <Dato etichetta="Semina reale" valore={riga.seminaRealePerHa} unita=" kg/ha" />
      <Dato etichetta="Azoto" valore={riga.azotoPerHa} unita=" kg/ha" />
      <Dato etichetta="Trattamenti" valore={riga.numeroTrattamenti} />
      <Dato etichetta="Concimazioni" valore={riga.numeroConcimazioni} />
      <Dato etichetta="Costo prodotti" valore={riga.costoPerHa} unita=" €/ha" />
      <Dato
        etichetta="Resa"
        valore={riga.resaPerHa}
        unita={` ${riga.unitaResa ?? 'q'}/ha`}
        forte
      />
      <Dato etichetta="Proteine" valore={riga.proteinePct} unita=" %" />
      <Dato etichetta="Umidità" valore={riga.umiditaPct} unita=" %" />
      <Dato etichetta="Ricavo meno prodotti" valore={riga.marginePerHa} unita=" €/ha" forte />
      {riga.marginePerHa != null && (
        <p className="aiuto">
          Non è il margine vero: mancano gasolio, manodopera, macchine e affitti.
        </p>
      )}

      {differenze.length > 0 && (
        <>
          <p className="titolo-sezione" style={{ marginTop: 18 }}>
            Rispetto al {precedente!.annata}
          </p>
          {differenze.map((d, i) => (
            <div key={i} className="riga-dato">
              <span className="etichetta">{d.etichetta}</span>
              <span className="valore">
                {d.precedente ?? '—'} → {d.attuale ?? '—'}
                {d.variazionePct != null && (
                  <span
                    style={{
                      marginLeft: 8,
                      color: coloreVariazione(d.variazionePct, d.aumentoPositivo),
                    }}
                  >
                    {d.variazionePct > 0 ? '+' : ''}
                    {fmtNumero(d.variazionePct, 1)}%
                  </span>
                )}
              </span>
            </div>
          ))}
        </>
      )}

      {riga.resaPerHa == null && (
        <p className="aiuto" style={{ marginTop: 12 }}>
          ⚠️ Manca la raccolta di quest’annata: senza, il confronto resta a metà.
        </p>
      )}
    </div>
  )
}

function Dato({
  etichetta,
  valore,
  unita = '',
  forte,
}: {
  etichetta: string
  valore?: number
  unita?: string
  forte?: boolean
}) {
  if (valore == null) return null
  return (
    <div className="riga-dato">
      <span className="etichetta">{etichetta}</span>
      <span className="valore" style={forte ? { fontSize: 18, color: 'var(--verde)' } : undefined}>
        {fmtNumero(valore)}
        {unita}
      </span>
    </div>
  )
}

/** Verde quando è andata meglio, rosso quando peggio; grigio se non si sa. */
function coloreVariazione(variazione: number, aumentoPositivo?: boolean): string {
  if (aumentoPositivo == null) return 'var(--testo-tenue)'
  const bene = aumentoPositivo ? variazione > 0 : variazione < 0
  return bene ? 'var(--verde)' : 'var(--rosso)'
}
