import { useState } from 'react'
import type {
  ID,
  Prodotto,
  RigaProdotto,
  TipoProdotto,
  Tracciato,
  UnitaMisura,
} from '../../core/domain/types'
import { db, traccia } from '../../core/db/db'
import { fmtNumero, t } from '../../core/i18n'

const UNITA: UnitaMisura[] = ['l', 'ml', 'kg', 'g', 'q', 't', 'pz']

/**
 * Righe di prodotto impiegato.
 *
 * Il prodotto si può creare qui al volo: se per registrare un trattamento
 * bisogna prima uscire e compilare un'anagrafica, il trattamento non viene
 * registrato e basta. Quello creato al volo nasce con `fonte: 'manuale'`, e
 * l'app sa che i suoi dati normativi non sono verificati.
 */
export default function RigheProdotto({
  aziendaId,
  righe,
  onCambia,
  prodotti,
  giacenze,
  mostraAvversita,
}: {
  aziendaId: ID
  righe: RigaProdotto[]
  onCambia: (righe: RigaProdotto[]) => void
  prodotti: Map<ID, Prodotto>
  giacenze: Map<ID, number>
  mostraAvversita: boolean
}) {
  const [creazioneAperta, setCreazioneAperta] = useState(false)

  function aggiungi(prodottoId: ID) {
    const prodotto = prodotti.get(prodottoId)
    onCambia([
      ...righe,
      {
        prodottoId,
        quantita: 0,
        unitaMisura: prodotto?.unitaMisura ?? 'l',
      },
    ])
  }

  function modifica(indice: number, modifiche: Partial<RigaProdotto>) {
    onCambia(righe.map((r, i) => (i === indice ? { ...r, ...modifiche } : r)))
  }

  function rimuovi(indice: number) {
    onCambia(righe.filter((_, i) => i !== indice))
  }

  const elenco = [...prodotti.values()]
    .filter((p) => !p.annullatoIl)
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <>
      <h2 className="titolo-sezione">{t('intervento.prodotti')}</h2>

      {righe.map((riga, i) => {
        const prodotto = prodotti.get(riga.prodottoId)
        const giacenza = giacenze.get(riga.prodottoId)

        return (
          <div key={i} className="scheda">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{prodotto?.nome ?? 'Prodotto'}</strong>
              <button type="button" className="link-testo" onClick={() => rimuovi(i)}>
                togli
              </button>
            </div>

            {prodotto?.fonte === 'manuale' && (
              <p className="aiuto">
                ⚠️ Dati inseriti a mano, non verificati su un registro ufficiale.
              </p>
            )}

            <div className="riga-campi" style={{ marginTop: 10 }}>
              <div>
                <label htmlFor={`q${i}`}>Quantità impiegata</label>
                <input
                  id={`q${i}`}
                  inputMode="decimal"
                  value={riga.quantita === 0 ? '' : String(riga.quantita)}
                  onChange={(e) =>
                    modifica(i, { quantita: Number(e.target.value.replace(',', '.')) || 0 })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor={`u${i}`}>Unità</label>
                <select
                  id={`u${i}`}
                  value={riga.unitaMisura}
                  onChange={(e) => modifica(i, { unitaMisura: e.target.value as UnitaMisura })}
                >
                  {UNITA.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mostraAvversita && (
              <div className="gruppo-campo" style={{ marginTop: 12, marginBottom: 0 }}>
                <label htmlFor={`a${i}`}>Avversità</label>
                <input
                  id={`a${i}`}
                  value={riga.avversita ?? ''}
                  onChange={(e) => modifica(i, { avversita: e.target.value || undefined })}
                  placeholder="Peronospora"
                />
              </div>
            )}

            <p className="aiuto">
              {giacenza != null
                ? `A magazzino: ${fmtNumero(giacenza)} ${prodotto?.unitaMisura ?? ''}`
                : 'Nessun carico a magazzino per questo prodotto'}
              {prodotto?.tempoCarenzaGiorni != null
                ? ` · carenza ${prodotto.tempoCarenzaGiorni} gg`
                : ' · tempo di carenza non noto'}
            </p>
          </div>
        )
      })}

      {elenco.length > 0 && (
        <div className="gruppo-campo">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) aggiungi(e.target.value)
            }}
          >
            <option value="">➕ {t('intervento.aggiungiProdotto')}</option>
            {elenco.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
                {giacenze.get(p.id) ? ` — ${fmtNumero(giacenze.get(p.id)!)} ${p.unitaMisura}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {creazioneAperta ? (
        <FormProdotto
          aziendaId={aziendaId}
          onCreato={(id) => {
            setCreazioneAperta(false)
            aggiungi(id)
          }}
          onAnnulla={() => setCreazioneAperta(false)}
        />
      ) : (
        <button
          type="button"
          className="pulsante-secondario"
          onClick={() => setCreazioneAperta(true)}
        >
          Nuovo prodotto
        </button>
      )}
    </>
  )
}

function FormProdotto({
  aziendaId,
  onCreato,
  onAnnulla,
}: {
  aziendaId: ID
  onCreato: (id: ID) => void
  onAnnulla: () => void
}) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoProdotto>('fitosanitario')
  const [unita, setUnita] = useState<UnitaMisura>('l')
  const [carenza, setCarenza] = useState('')
  const [registrazione, setRegistrazione] = useState('')

  async function crea() {
    if (!nome.trim()) return
    const prodotto = traccia<Omit<Prodotto, keyof Tracciato>>({
      aziendaId,
      nome: nome.trim(),
      tipo,
      unitaMisura: unita,
      numeroRegistrazione: registrazione.trim() || undefined,
      tempoCarenzaGiorni: carenza.trim() ? Number(carenza) : undefined,
      fonte: 'manuale',
    }) as Prodotto
    await db.prodotti.add(prodotto)
    onCreato(prodotto.id)
  }

  return (
    <div className="scheda">
      <div className="gruppo-campo">
        <label htmlFor="np">Nome commerciale</label>
        <input id="np" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="nt">Tipo</label>
          <select id="nt" value={tipo} onChange={(e) => setTipo(e.target.value as TipoProdotto)}>
            <option value="fitosanitario">Fitosanitario</option>
            <option value="fertilizzante">Fertilizzante</option>
            <option value="sementi">Sementi</option>
            <option value="altro">Altro</option>
          </select>
        </div>
        <div className="gruppo-campo">
          <label htmlFor="nu">Unità</label>
          <select id="nu" value={unita} onChange={(e) => setUnita(e.target.value as UnitaMisura)}>
            {UNITA.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="nc">Carenza (giorni)</label>
          <input
            id="nc"
            inputMode="numeric"
            value={carenza}
            onChange={(e) => setCarenza(e.target.value)}
            placeholder="dall’etichetta"
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="nr">N. registrazione</label>
          <input
            id="nr"
            value={registrazione}
            onChange={(e) => setRegistrazione(e.target.value)}
          />
        </div>
      </div>

      <p className="aiuto">
        Il tempo di carenza è quello che poi blocca la raccolta: prendilo dall’etichetta, non a
        memoria.
      </p>

      <div className="pila">
        <button className="pulsante-principale" onClick={() => void crea()} disabled={!nome.trim()}>
          {t('comune.salva')}
        </button>
        <button className="pulsante-secondario" onClick={onAnnulla}>
          {t('comune.annulla')}
        </button>
      </div>
    </div>
  )
}
