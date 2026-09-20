import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Azienda, Campo, Coltura, Coordinate, Tracciato } from '../../core/domain/types'
import { db, traccia } from '../../core/db/db'
import { leggiPosizione } from '../../core/rules/posizione'
import { annataCorrente } from '../../core/db/query'
import { t } from '../../core/i18n'

/**
 * Creazione di un campo.
 *
 * Solo due dati sono davvero richiesti: il nome che usa l'agricoltore e la
 * superficie. Il resto (particelle, confini) si aggiunge con calma dall'ufficio:
 * chiederlo qui significa non farsi usare.
 */
export default function NuovoCampo({ azienda }: { azienda: Azienda }) {
  const naviga = useNavigate()

  const [nome, setNome] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [specie, setSpecie] = useState('')
  const [varieta, setVarieta] = useState('')
  const [precessione, setPrecessione] = useState('')
  const [centro, setCentro] = useState<Coordinate | null>(null)
  const [rilevando, setRilevando] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const valido = nome.trim().length > 0 && Number(superficie.replace(',', '.')) > 0

  async function rilevaPosizione() {
    setRilevando(true)
    setErrore(null)
    try {
      setCentro(await leggiPosizione())
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Posizione non disponibile')
    } finally {
      setRilevando(false)
    }
  }

  async function salva() {
    if (!valido) return

    const campo = traccia<Omit<Campo, keyof Tracciato>>({
      aziendaId: azienda.id,
      nome: nome.trim(),
      superficieHa: Number(superficie.replace(',', '.')),
      particelle: [],
      centro: centro ?? undefined,
    }) as Campo

    await db.campi.add(campo)

    if (specie.trim()) {
      const coltura = traccia<Omit<Coltura, keyof Tracciato>>({
        campoId: campo.id,
        annata: annataCorrente(),
        specie: specie.trim(),
        varieta: varieta.trim() || undefined,
        precessione: precessione.trim() || undefined,
      }) as Coltura
      await db.colture.add(coltura)
    }

    naviga(`/campi/${campo.id}`, { replace: true })
  }

  return (
    <>
      <div className="gruppo-campo">
        <label htmlFor="nome">Come lo chiami ({t('comune.obbligatorio')})</label>
        <input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Vigna sotto casa"
          autoFocus
        />
        <p className="aiuto">Il nome che usi tu. Le particelle catastali si aggiungono dopo.</p>
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="superficie">Ettari ({t('comune.obbligatorio')})</label>
          <input
            id="superficie"
            inputMode="decimal"
            value={superficie}
            onChange={(e) => setSuperficie(e.target.value)}
            placeholder="2,3"
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="specie">{t('campi.coltura')}</label>
          <input
            id="specie"
            value={specie}
            onChange={(e) => setSpecie(e.target.value)}
            placeholder="Vite"
          />
        </div>
      </div>

      <div className="riga-campi">
        <div className="gruppo-campo">
          <label htmlFor="varieta">Varietà ({t('comune.facoltativo')})</label>
          <input
            id="varieta"
            value={varieta}
            onChange={(e) => setVarieta(e.target.value)}
            placeholder="Barbera"
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="precessione">Cosa c’era prima</label>
          <input
            id="precessione"
            value={precessione}
            onChange={(e) => setPrecessione(e.target.value)}
            placeholder="Soia"
          />
        </div>
      </div>
      <p className="aiuto" style={{ marginTop: -8, marginBottom: 18 }}>
        La coltura dell’anno prima pesa molto sulla resa, e fra tre anni non te la ricordi.
        Trenta secondi adesso, o quel dato non esiste più.
      </p>

      <div className="gruppo-campo">
        <button
          type="button"
          className="pulsante-secondario"
          onClick={() => void rilevaPosizione()}
          disabled={rilevando}
        >
          📍 {rilevando ? 'Rilevo…' : centro ? 'Posizione rilevata' : 'Segna la posizione'}
        </button>
        <p className="aiuto">
          {centro
            ? `Salvata: ${centro.lat.toFixed(5)}, ${centro.lon.toFixed(5)} (±${Math.round(centro.precisioneM ?? 0)} m). Serve a riconoscere il campo quando ci torni.`
            : 'Se sei sul posto, segnalo: la prossima volta l’app riconosce il campo da sola.'}
        </p>
        {errore && <p className="aiuto" style={{ color: 'var(--rosso)' }}>{errore}</p>}
      </div>

      <button className="pulsante-principale" onClick={() => void salva()} disabled={!valido}>
        {t('comune.salva')}
      </button>
    </>
  )
}
