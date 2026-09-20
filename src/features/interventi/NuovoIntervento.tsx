import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Allegato,
  Azienda,
  Campo,
  Coordinate,
  ID,
  Intervento,
  MovimentoMagazzino,
  RigaProdotto,
  TipoIntervento,
  Tracciato,
} from '../../core/domain/types'
import { db, oggi, traccia } from '../../core/db/db'
import {
  annataCorrente,
  giacenzePerLotto,
  giacenzePerProdotto,
  interventiAnnata,
  mappaProdotti,
} from '../../core/db/query'
import { calcolaRaccoltaConsentitaDal, calcolaRientroConsentitoDal } from '../../core/rules/carenza'
import { controllaIntervento, type Rilievo } from '../../core/rules/controlli'
import { leggiPosizione, suggerisciCampi } from '../../core/rules/posizione'
import BottoneVocale, { type NotaVocaleRegistrata } from '../../ui/BottoneVocale'
import CalcolatoreMiscela from './CalcolatoreMiscela'
import RigheProdotto from './RigheProdotto'
import SettaggiMacchina from './Settaggi'
import DatiDellaRaccolta from './DatiRaccolta'
import { fmtNumero, t } from '../../core/i18n'
import type { DatiRaccolta, Settaggi } from '../../core/domain/types'

const TIPI: { valore: TipoIntervento; etichetta: string; conProdotti: boolean }[] = [
  { valore: 'trattamento', etichetta: 'Trattamento', conProdotti: true },
  { valore: 'fertilizzazione', etichetta: 'Concimazione', conProdotti: true },
  { valore: 'irrigazione', etichetta: 'Irrigazione', conProdotti: false },
  { valore: 'semina', etichetta: 'Semina', conProdotti: true },
  { valore: 'lavorazione', etichetta: 'Lavorazione', conProdotti: false },
  { valore: 'raccolta', etichetta: 'Raccolta', conProdotti: false },
  { valore: 'osservazione', etichetta: 'Nota', conProdotti: false },
]

export default function NuovoIntervento({ azienda }: { azienda: Azienda }) {
  const naviga = useNavigate()
  const [parametri] = useSearchParams()

  const [tipo, setTipo] = useState<TipoIntervento>(
    (parametri.get('tipo') as TipoIntervento | null) ?? 'trattamento',
  )
  const [campoId, setCampoId] = useState<ID>(parametri.get('campo') ?? '')
  const [origineCampo, setOrigineCampo] = useState<Intervento['origineCampo']>(
    parametri.get('campo') ? 'manuale' : 'manuale',
  )
  const [data, setData] = useState(oggi())
  const [operatoreId, setOperatoreId] = useState<ID>('')
  const [attrezzoId, setAttrezzoId] = useState<ID>('')
  const [righe, setRighe] = useState<RigaProdotto[]>([])
  const [superficie, setSuperficie] = useState('')
  const [volumeAcqua, setVolumeAcqua] = useState('')
  const [note, setNote] = useState('')
  const [nota, setNota] = useState<NotaVocaleRegistrata | null>(null)
  const [settaggi, setSettaggi] = useState<Settaggi>({})
  const [raccolta, setRaccolta] = useState<DatiRaccolta>({})
  const [posizione, setPosizione] = useState<Coordinate | null>(null)
  const [suggeriti, setSuggeriti] = useState<{ campo: Campo; confidenza: number }[]>([])
  const [rilevando, setRilevando] = useState(false)
  const [salvataggio, setSalvataggio] = useState(false)

  // Dati di supporto: tutti locali, nessuna chiamata di rete.
  const supporto = useLiveQuery(async () => {
    const [campi, operatori, attrezzi, prodotti, giacenzeProdotto, giacenzeLotto, lotti] =
      await Promise.all([
        db.campi.where('aziendaId').equals(azienda.id).toArray(),
        db.operatori.where('aziendaId').equals(azienda.id).toArray(),
        db.attrezzi.where('aziendaId').equals(azienda.id).toArray(),
        mappaProdotti(azienda.id),
        giacenzePerProdotto(azienda.id),
        giacenzePerLotto(azienda.id),
        db.lotti.where('aziendaId').equals(azienda.id).toArray(),
      ])
    return {
      campi: campi.filter((c) => !c.annullatoIl),
      operatori: operatori.filter((o) => o.attivo),
      attrezzi: attrezzi.filter((a) => a.attivo),
      prodotti,
      giacenzeProdotto,
      giacenzeLotto,
      lotti,
    }
  }, [azienda.id])

  const campo = supporto?.campi.find((c) => c.id === campoId)
  const attrezzo = supporto?.attrezzi.find((a) => a.id === attrezzoId)
  const tipoCorrente = TIPI.find((x) => x.valore === tipo)!

  // Superficie: si propone quella del campo, ma resta modificabile — spesso si
  // tratta solo una parte dell'appezzamento.
  useEffect(() => {
    if (campo && superficie === '') setSuperficie(String(campo.superficieHa))
  }, [campo, superficie])

  const [coltura, setColtura] = useState<string | undefined>()
  useEffect(() => {
    if (!campoId) {
      setColtura(undefined)
      return
    }
    void db.colture
      .where('campoId')
      .equals(campoId)
      .toArray()
      .then((c) => setColtura(c.find((x) => x.annata === annataCorrente())?.specie))
  }, [campoId])

  /**
   * I settaggi dell'ultima volta che si è fatto questo lavoro con questa
   * macchina. Quasi sempre non è cambiato niente: riproporli è il gesto che fa
   * risparmiare più tempo in campo.
   */
  const ultimiSettaggi = useLiveQuery(async () => {
    const precedenti = await db.interventi.where('aziendaId').equals(azienda.id).toArray()
    return precedenti
      .filter(
        (i) =>
          i.tipo === tipo &&
          !i.annullatoIl &&
          i.settaggi &&
          Object.keys(i.settaggi).length > 0 &&
          (!attrezzoId || i.attrezzoId === attrezzoId),
      )
      .sort((a, b) => b.data.localeCompare(a.data) || b.creatoIl.localeCompare(a.creatoIl))[0]
      ?.settaggi
  }, [azienda.id, tipo, attrezzoId])

  // I controlli girano mentre si compila: avvisare dopo non serve a nessuno.
  const [rilievi, setRilievi] = useState<Rilievo[]>([])
  useEffect(() => {
    if (!supporto || righe.length === 0) {
      setRilievi([])
      return
    }
    let annullato = false

    void (async () => {
      const [documenti, altriInterventi] = await Promise.all([
        operatoreId
          ? db.documenti.where('aziendaId').equals(azienda.id).toArray()
          : Promise.resolve([]),
        campoId
          ? interventiAnnata(azienda.id, campoId, Number(data.slice(0, 4)))
          : Promise.resolve([]),
      ])
      if (annullato) return

      setRilievi(
        controllaIntervento({
          intervento: {
            id: 'bozza',
            aziendaId: azienda.id,
            campoId,
            tipo,
            data,
            righe,
            origineCampo,
            superficieTrattataHa: numero(superficie),
            creatoIl: '',
            modificatoIl: '',
            posizione: posizione ?? undefined,
          },
          campo,
          prodotti: supporto.prodotti,
          operatore: supporto.operatori.find((o) => o.id === operatoreId),
          documentiOperatore: documenti.filter(
            (d) => d.soggetto.tipo === 'operatore' && d.soggetto.id === operatoreId,
          ),
          specieColtura: coltura,
          interventiAnnata: altriInterventi,
          giacenze: supporto.giacenzeProdotto,
          oggi: oggi(),
        }),
      )
    })()

    return () => {
      annullato = true
    }
  }, [
    supporto,
    righe,
    campoId,
    data,
    operatoreId,
    tipo,
    superficie,
    coltura,
    origineCampo,
    posizione,
    azienda.id,
    campo,
  ])

  async function rilevaPosizione() {
    if (!supporto) return
    setRilevando(true)
    try {
      const pos = await leggiPosizione()
      setPosizione(pos)
      const proposte = suggerisciCampi(pos, supporto.campi)
      setSuggeriti(proposte)
      // Si propone, non si decide: col dipendente in un altro campo, il GPS del
      // titolare direbbe una bugia che nessuno noterebbe più.
      if (proposte.length === 1 && !campoId) {
        setCampoId(proposte[0].campo.id)
        setOrigineCampo('gps')
      }
    } catch {
      /* senza posizione si prosegue a mano: non è un errore bloccante */
    } finally {
      setRilevando(false)
    }
  }

  const nomiProdotti = useMemo(
    () => (supporto ? [...supporto.prodotti.values()].map((p) => p.nome) : []),
    [supporto],
  )

  const puoSalvare = campoId !== '' && data !== ''

  async function salva(comeBozza: boolean) {
    if (!supporto || !puoSalvare || salvataggio) return
    setSalvataggio(true)

    try {
      const interventoId = await db.transaction(
        'rw',
        [db.interventi, db.allegati, db.movimenti],
        async () => {
          let allegatoId: ID | undefined

          if (nota) {
            const allegato = traccia<Omit<Allegato, keyof Tracciato>>({
              aziendaId: azienda.id,
              nomeFile: `nota-${data}.webm`,
              tipoMime: nota.tipoMime,
              dimensioneByte: nota.blob.size,
              blob: nota.blob,
              posizione: posizione ?? undefined,
            }) as Allegato
            await db.allegati.add(allegato)
            allegatoId = allegato.id
          }

          const carenza = calcolaRaccoltaConsentitaDal(data, righe, supporto.prodotti)
          const rientro = calcolaRientroConsentitoDal(data, undefined, righe, supporto.prodotti)

          const intervento = traccia<Omit<Intervento, keyof Tracciato>>({
            aziendaId: azienda.id,
            campoId,
            tipo,
            data,
            operatoreId: operatoreId || undefined,
            attrezzoId: attrezzoId || undefined,
            righe,
            superficieTrattataHa: numero(superficie),
            volumeAcquaLHa: numero(volumeAcqua),
            posizione: posizione ?? undefined,
            origineCampo,
            note: note.trim() || undefined,
            notaVocale: nota
              ? {
                  allegatoId: allegatoId!,
                  durataSec: nota.durataSec,
                  trascrizioneLocale: nota.trascrizione,
                  statoTrascrizione: nota.inCodaServer ? 'in_coda_server' : 'locale',
                }
              : undefined,
            settaggi: Object.keys(settaggi).length > 0 ? settaggi : undefined,
            dosePerHaImpostata: numero(String(settaggi['dose_impostata'] ?? '')),
            raccolta: tipo === 'raccolta' && Object.keys(raccolta).length > 0 ? raccolta : undefined,
            raccoltaConsentitaDal: carenza.dal,
            rientroConsentitoDal: rientro,
            daCompletare: comeBozza || undefined,
          }) as Intervento

          await db.interventi.add(intervento)

          // Scarico di magazzino: la giacenza non si aggiorna a mano, si deduce
          // dai movimenti. Si scarica dal lotto più vecchio ancora disponibile.
          if (!comeBozza) {
            for (const riga of righe) {
              const lottoId =
                riga.lottoId ?? scegliLotto(riga.prodottoId, supporto.lotti, supporto.giacenzeLotto)
              if (!lottoId) continue

              const movimento = traccia<Omit<MovimentoMagazzino, keyof Tracciato>>({
                aziendaId: azienda.id,
                lottoId,
                data,
                quantita: -Math.abs(riga.quantita),
                unitaMisura: riga.unitaMisura,
                causale: 'utilizzo',
                interventoId: intervento.id,
              }) as MovimentoMagazzino
              await db.movimenti.add(movimento)
            }
          }

          return intervento.id
        },
      )

      naviga(campoId ? `/campi/${campoId}` : '/', { replace: true })
      return interventoId
    } finally {
      setSalvataggio(false)
    }
  }

  if (!supporto) return <p>Carico…</p>

  if (supporto.campi.length === 0) {
    return (
      <div className="elenco-vuoto">
        <span className="icona" aria-hidden>
          🗺️
        </span>
        Prima serve almeno un campo.
        <div style={{ marginTop: 18 }}>
          <button className="pulsante-principale" onClick={() => naviga('/campi/nuovo')}>
            {t('campi.nuovo')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="gruppo-campo">
        <label htmlFor="tipo">{t('intervento.tipo')}</label>
        <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoIntervento)}>
          {TIPI.map((x) => (
            <option key={x.valore} value={x.valore}>
              {x.etichetta}
            </option>
          ))}
        </select>
      </div>

      <div className="gruppo-campo">
        <label htmlFor="campo">{t('intervento.campo')}</label>
        <select
          id="campo"
          value={campoId}
          onChange={(e) => {
            setCampoId(e.target.value)
            setOrigineCampo('manuale')
            setSuperficie('')
          }}
        >
          <option value="">— scegli —</option>
          {supporto.campi.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({fmtNumero(c.superficieHa)} ha)
            </option>
          ))}
        </select>

        <button
          type="button"
          className="pulsante-secondario"
          style={{ marginTop: 10 }}
          onClick={() => void rilevaPosizione()}
          disabled={rilevando}
        >
          📍 {rilevando ? 'Rilevo…' : t('intervento.rilevaPosizione')}
        </button>

        {suggeriti.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p className="aiuto">{t('intervento.campoSuggerito')} — conferma tu:</p>
            {suggeriti.map((s) => (
              <button
                key={s.campo.id}
                type="button"
                className={campoId === s.campo.id ? 'pulsante-principale' : 'pulsante-secondario'}
                style={{ marginBottom: 8 }}
                onClick={() => {
                  setCampoId(s.campo.id)
                  setOrigineCampo('gps')
                  setSuperficie('')
                }}
              >
                {s.campo.nome} · {Math.round(s.confidenza * 100)}%
              </button>
            ))}
          </div>
        )}

        {origineCampo === 'gps' && (
          <p className="aiuto">
            Campo attribuito dal GPS. Se il lavoro l’ha fatto un altro, cambialo a mano.
          </p>
        )}
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="data">{t('intervento.data')}</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="superficie">{t('intervento.superficieTrattata')}</label>
          <input
            id="superficie"
            inputMode="decimal"
            value={superficie}
            onChange={(e) => setSuperficie(e.target.value)}
          />
        </div>
      </div>

      <div className="gruppo-campo">
        <label htmlFor="operatore">{t('intervento.operatore')}</label>
        <select
          id="operatore"
          value={operatoreId}
          onChange={(e) => setOperatoreId(e.target.value)}
        >
          <option value="">— non indicato —</option>
          {supporto.operatori.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome} {o.cognome}
            </option>
          ))}
        </select>
        {supporto.operatori.length === 0 && (
          <p className="aiuto">
            Nessun operatore registrato. Aggiungili da “Altro → Anagrafiche”: il registro lo
            richiede.
          </p>
        )}
      </div>

      <div className="gruppo-campo">
        <label htmlFor="attrezzo">{t('intervento.attrezzo')}</label>
        <select id="attrezzo" value={attrezzoId} onChange={(e) => setAttrezzoId(e.target.value)}>
          <option value="">— non indicato —</option>
          {supporto.attrezzi.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
              {a.capacitaLitri ? ` (${a.capacitaLitri} l)` : ''}
            </option>
          ))}
        </select>
      </div>

      {tipoCorrente.conProdotti && (
        <>
          <RigheProdotto
            aziendaId={azienda.id}
            righe={righe}
            onCambia={setRighe}
            prodotti={supporto.prodotti}
            giacenze={supporto.giacenzeProdotto}
            mostraAvversita={tipo === 'trattamento'}
          />

          <div className="gruppo-campo">
            <label htmlFor="volume">Acqua distribuita (l/ha)</label>
            <input
              id="volume"
              inputMode="decimal"
              value={volumeAcqua}
              onChange={(e) => setVolumeAcqua(e.target.value)}
              placeholder="300"
            />
          </div>

          <CalcolatoreMiscela
            superficieHa={numero(superficie) ?? 0}
            volumeAcquaLHa={numero(volumeAcqua) ?? 0}
            capacitaBotteL={attrezzo?.capacitaLitri ?? 0}
          />
        </>
      )}

      {tipo === 'raccolta' && (
        <DatiDellaRaccolta
          valore={raccolta}
          onCambia={setRaccolta}
          superficieHa={numero(superficie) ?? campo?.superficieHa}
          specie={coltura}
        />
      )}

      {/* I settaggi macchina: il dato che oggi sta su un foglietto in cabina. */}
      <SettaggiMacchina
        tipoIntervento={tipo}
        tipoAttrezzo={attrezzo?.tipo}
        settaggi={settaggi}
        onCambia={setSettaggi}
        ultimiSettaggi={ultimiSettaggi}
        onRipetiUltimi={() => ultimiSettaggi && setSettaggi({ ...ultimiSettaggi })}
      />

      {rilievi.length > 0 && (
        <>
          <h2 className="titolo-sezione">Controlli</h2>
          {rilievi.map((r, i) => (
            <div key={i} className={`rilievo rilievo-${r.esito}`}>
              <strong>
                {r.esito === 'blocco' ? '❗ ' : r.esito === 'avviso' ? '⚠️ ' : 'ℹ️ '}
                {r.messaggio}
              </strong>
              {r.suggerimento && <small>{r.suggerimento}</small>}
            </div>
          ))}
          <p className="aiuto">
            Queste segnalazioni non impediscono di salvare: il registro deve dire com’è andata
            davvero, anche quando qualcosa non torna.
          </p>
        </>
      )}

      <h2 className="titolo-sezione">{t('intervento.note')}</h2>
      <BottoneVocale nomiProdotti={nomiProdotti} onRegistrata={setNota} />

      {nota && (
        <div className="scheda" style={{ marginTop: 12 }}>
          <strong>🎙️ Nota vocale — {nota.durataSec}s</strong>
          <p style={{ margin: '8px 0 0' }}>
            {nota.trascrizione ?? (
              <em>
                Trascrizione non possibile adesso: resta in coda e verrà fatta quando torna la
                rete. L’audio è già salvato.
              </em>
            )}
          </p>
          <button
            type="button"
            className="link-testo"
            onClick={() => setNota(null)}
            style={{ marginTop: 8 }}
          >
            Elimina la nota vocale
          </button>
        </div>
      )}

      <div className="gruppo-campo" style={{ marginTop: 12 }}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note scritte (facoltative)"
        />
      </div>

      <div className="pila" style={{ marginTop: 20 }}>
        <button
          className="pulsante-principale"
          onClick={() => void salva(false)}
          disabled={!puoSalvare || salvataggio}
        >
          {t('intervento.salva')}
        </button>
        <button
          className="pulsante-secondario"
          onClick={() => void salva(true)}
          disabled={!puoSalvare || salvataggio}
        >
          {t('intervento.salvaBozza')}
        </button>
        <p className="aiuto">
          La bozza si salva subito e si completa con calma: in campo conta registrare, non
          compilare.
        </p>
      </div>
    </>
  )
}

function numero(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && v.trim() !== '' ? n : undefined
}

/** Scarico dal lotto più vecchio ancora disponibile: primo entrato, primo uscito. */
function scegliLotto(
  prodottoId: ID,
  lotti: { id: ID; prodottoId: ID; scadenza?: string; creatoIl: string }[],
  giacenzeLotto: Map<ID, number>,
): ID | undefined {
  return lotti
    .filter((l) => l.prodottoId === prodottoId && (giacenzeLotto.get(l.id) ?? 0) > 0)
    .sort((a, b) => (a.scadenza ?? a.creatoIl).localeCompare(b.scadenza ?? b.creatoIl))[0]?.id
}
