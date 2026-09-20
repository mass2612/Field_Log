import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Allegato,
  Attrezzo,
  Azienda,
  Documento,
  ID,
  Operatore,
  SoggettoDocumento,
  TipoAttrezzo,
  TipoDocumento,
  Tracciato,
} from '../../core/domain/types'
import { db, traccia } from '../../core/db/db'
import { fmtData, t } from '../../core/i18n'

const TIPI_DOCUMENTO: { valore: TipoDocumento; etichetta: string; preavviso?: number }[] = [
  { valore: 'patentino_fitosanitari', etichetta: 'Patentino fitosanitari' },
  { valore: 'controllo_funzionale', etichetta: 'Controllo funzionale irroratrice', preavviso: 90 },
  { valore: 'revisione_macchina', etichetta: 'Revisione macchina', preavviso: 60 },
  { valore: 'assicurazione', etichetta: 'Assicurazione' },
  { valore: 'formazione', etichetta: 'Formazione' },
  { valore: 'visita_medica', etichetta: 'Visita medica' },
  { valore: 'certificazione', etichetta: 'Certificazione' },
  { valore: 'altro', etichetta: 'Altro' },
]

export default function Anagrafiche({ azienda }: { azienda: Azienda }) {
  const [sezione, setSezione] = useState<'operatori' | 'attrezzi' | 'documenti'>('operatori')

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['operatori', 'attrezzi', 'documenti'] as const).map((s) => (
          <button
            key={s}
            className={sezione === s ? 'pulsante-principale' : 'pulsante-secondario'}
            onClick={() => setSezione(s)}
            style={{ fontSize: 15, padding: '10px 8px' }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {sezione === 'operatori' && <Operatori azienda={azienda} />}
      {sezione === 'attrezzi' && <Attrezzi azienda={azienda} />}
      {sezione === 'documenti' && <Documenti azienda={azienda} />}
    </>
  )
}

// --------------------------------------------------------------- operatori

function Operatori({ azienda }: { azienda: Azienda }) {
  const operatori =
    useLiveQuery(() => db.operatori.where('aziendaId').equals(azienda.id).toArray(), [
      azienda.id,
    ]) ?? []

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [ruolo, setRuolo] = useState<Operatore['ruolo']>('dipendente')

  async function aggiungi() {
    if (!nome.trim() || !cognome.trim()) return
    await db.operatori.add(
      traccia<Omit<Operatore, keyof Tracciato>>({
        aziendaId: azienda.id,
        nome: nome.trim(),
        cognome: cognome.trim(),
        ruolo,
        attivo: true,
      }) as Operatore,
    )
    setNome('')
    setCognome('')
  }

  return (
    <>
      {operatori.map((o) => (
        <div key={o.id} className="scheda">
          <strong>
            {o.nome} {o.cognome}
          </strong>
          <span className="etichetta-piccola" style={{ marginLeft: 8 }}>
            {o.ruolo}
          </span>
        </div>
      ))}

      <div className="scheda">
        <strong>Nuovo operatore</strong>
        <div className="riga-campi" style={{ marginTop: 12 }}>
          <div className="gruppo-campo">
            <label htmlFor="on">Nome</label>
            <input id="on" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="gruppo-campo">
            <label htmlFor="oc">Cognome</label>
            <input id="oc" value={cognome} onChange={(e) => setCognome(e.target.value)} />
          </div>
        </div>
        <div className="gruppo-campo">
          <label htmlFor="or">Ruolo</label>
          <select
            id="or"
            value={ruolo}
            onChange={(e) => setRuolo(e.target.value as Operatore['ruolo'])}
          >
            <option value="titolare">Titolare</option>
            <option value="dipendente">Dipendente</option>
            <option value="contoterzista">Contoterzista</option>
            <option value="consulente">Consulente</option>
          </select>
        </div>
        <button className="pulsante-principale" onClick={() => void aggiungi()}>
          {t('comune.salva')}
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- attrezzi

function Attrezzi({ azienda }: { azienda: Azienda }) {
  const attrezzi =
    useLiveQuery(() => db.attrezzi.where('aziendaId').equals(azienda.id).toArray(), [
      azienda.id,
    ]) ?? []

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoAttrezzo>('irroratrice')
  const [capacita, setCapacita] = useState('')

  async function aggiungi() {
    if (!nome.trim()) return
    await db.attrezzi.add(
      traccia<Omit<Attrezzo, keyof Tracciato>>({
        aziendaId: azienda.id,
        nome: nome.trim(),
        tipo,
        capacitaLitri: capacita.trim() ? Number(capacita.replace(',', '.')) : undefined,
        attivo: true,
      }) as Attrezzo,
    )
    setNome('')
    setCapacita('')
  }

  return (
    <>
      {attrezzi.map((a) => (
        <div key={a.id} className="scheda">
          <strong>{a.nome}</strong>
          <p className="aiuto">
            {a.tipo}
            {a.capacitaLitri ? ` · botte ${a.capacitaLitri} l` : ''}
          </p>
        </div>
      ))}

      <div className="scheda">
        <strong>Nuovo attrezzo</strong>
        <div className="gruppo-campo" style={{ marginTop: 12 }}>
          <label htmlFor="an">Nome</label>
          <input
            id="an"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Atomizzatore Nobili"
          />
        </div>
        <div className="riga-campi">
          <div className="gruppo-campo">
            <label htmlFor="at">Tipo</label>
            <select
              id="at"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAttrezzo)}
            >
              <option value="irroratrice">Irroratrice</option>
              <option value="atomizzatore">Atomizzatore</option>
              <option value="spandiconcime">Spandiconcime</option>
              <option value="seminatrice">Seminatrice</option>
              <option value="trattore">Trattore</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div className="gruppo-campo">
            <label htmlFor="ac">Botte (litri)</label>
            <input
              id="ac"
              inputMode="decimal"
              value={capacita}
              onChange={(e) => setCapacita(e.target.value)}
              placeholder="1000"
            />
          </div>
        </div>
        <p className="aiuto">
          La capacità della botte serve al calcolo della miscela: indicala una volta e non te la
          chiede più.
        </p>
        <button className="pulsante-principale" onClick={() => void aggiungi()}>
          {t('comune.salva')}
        </button>
      </div>
    </>
  )
}

// --------------------------------------------------------------- documenti

function Documenti({ azienda }: { azienda: Azienda }) {
  const dati = useLiveQuery(async () => {
    const [documenti, operatori, attrezzi] = await Promise.all([
      db.documenti.where('aziendaId').equals(azienda.id).toArray(),
      db.operatori.where('aziendaId').equals(azienda.id).toArray(),
      db.attrezzi.where('aziendaId').equals(azienda.id).toArray(),
    ])
    return { documenti, operatori, attrezzi }
  }, [azienda.id])

  const [tipo, setTipo] = useState<TipoDocumento>('patentino_fitosanitari')
  const [soggetto, setSoggetto] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [numero, setNumero] = useState('')
  const [foto, setFoto] = useState<File | null>(null)

  if (!dati) return <p>Carico…</p>

  const definizione = TIPI_DOCUMENTO.find((x) => x.valore === tipo)!
  const perAttrezzo = tipo === 'controllo_funzionale' || tipo === 'revisione_macchina'
  const candidati = perAttrezzo ? dati.attrezzi : dati.operatori

  async function salva() {
    // `dati` è già stato verificato sopra, ma il restringimento di tipo non
    // attraversa le dichiarazioni di funzione: lo ripetiamo qui.
    const ctx = dati
    if (!ctx || !scadenza) return

    let allegatoId: ID | undefined
    if (foto) {
      const allegato = traccia<Omit<Allegato, keyof Tracciato>>({
        aziendaId: azienda.id,
        nomeFile: foto.name,
        tipoMime: foto.type,
        dimensioneByte: foto.size,
        blob: foto,
      }) as Allegato
      await db.allegati.add(allegato)
      allegatoId = allegato.id
    }

    const rif: SoggettoDocumento = soggetto
      ? { tipo: perAttrezzo ? 'attrezzo' : 'operatore', id: soggetto }
      : { tipo: 'azienda', id: azienda.id }

    await db.documenti.add(
      traccia<Omit<Documento, keyof Tracciato>>({
        aziendaId: azienda.id,
        soggetto: rif,
        tipo,
        descrizione: descrizione(tipo, soggetto, ctx),
        numero: numero.trim() || undefined,
        scadeIl: scadenza,
        preavvisoGiorni: definizione.preavviso,
        allegatoId,
      }) as Documento,
    )

    setScadenza('')
    setNumero('')
    setFoto(null)
  }

  function descrizione(
    tipoDoc: TipoDocumento,
    soggettoId: string,
    ctx: NonNullable<typeof dati>,
  ): string {
    const etichetta = TIPI_DOCUMENTO.find((x) => x.valore === tipoDoc)!.etichetta
    const operatore = ctx.operatori.find((o) => o.id === soggettoId)
    if (operatore) return `${etichetta} — ${operatore.nome} ${operatore.cognome}`
    const attrezzo = ctx.attrezzi.find((a) => a.id === soggettoId)
    if (attrezzo) return `${etichetta} — ${attrezzo.nome}`
    return etichetta
  }

  return (
    <>
      {dati.documenti.map((d) => (
        <div key={d.id} className="scheda">
          <strong>{d.descrizione}</strong>
          <p className="aiuto">
            Scade il {fmtData(d.scadeIl)}
            {d.allegatoId ? ' · 📷 foto archiviata' : ' · nessuna foto'}
          </p>
        </div>
      ))}

      <div className="scheda">
        <strong>Nuovo documento con scadenza</strong>

        <div className="gruppo-campo" style={{ marginTop: 12 }}>
          <label htmlFor="dt">Tipo</label>
          <select
            id="dt"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoDocumento)
              setSoggetto('')
            }}
          >
            {TIPI_DOCUMENTO.map((x) => (
              <option key={x.valore} value={x.valore}>
                {x.etichetta}
              </option>
            ))}
          </select>
        </div>

        <div className="gruppo-campo">
          <label htmlFor="ds">{perAttrezzo ? 'Attrezzo' : 'Intestato a'}</label>
          <select id="ds" value={soggetto} onChange={(e) => setSoggetto(e.target.value)}>
            <option value="">— azienda —</option>
            {candidati.map((c) => (
              <option key={c.id} value={c.id}>
                {'cognome' in c ? `${c.nome} ${c.cognome}` : c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="riga-campi">
          <div className="gruppo-campo">
            <label htmlFor="dd">Scade il</label>
            <input
              id="dd"
              type="date"
              value={scadenza}
              onChange={(e) => setScadenza(e.target.value)}
            />
          </div>
          <div className="gruppo-campo">
            <label htmlFor="dn">Numero</label>
            <input id="dn" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
        </div>

        {/* La foto è il punto: un documento fotografato è un documento che a un
            controllo si trova in due secondi, senza cercare in una cartelletta. */}
        <div className="gruppo-campo">
          <label htmlFor="df">Foto del documento</label>
          <input
            id="df"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          />
          <p className="aiuto">
            {foto
              ? `${foto.name} — pronta`
              : 'Fotografalo una volta: al controllo ce l’hai in due tocchi.'}
          </p>
        </div>

        <p className="aiuto">
          Preavviso: {definizione.preavviso ?? 30} giorni prima, ripetuto fino alla sistemazione.
        </p>

        <button className="pulsante-principale" onClick={() => void salva()} disabled={!scadenza}>
          {t('comune.salva')}
        </button>
      </div>
    </>
  )
}
