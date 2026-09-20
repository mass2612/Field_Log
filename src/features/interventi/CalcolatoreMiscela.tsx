import { useState } from 'react'
import { calcolaMiscela, type ModoDose } from '../../core/rules/miscela'
import { fmtNumero, t } from '../../core/i18n'
import type { UnitaMisura } from '../../core/domain/types'

/**
 * Il conto che in campo si fa a mente, e ogni tanto si sbaglia.
 *
 * Sta dentro la schermata di registrazione, non in un menù a parte: serve
 * *mentre* si prepara la botte, non dopo.
 */
export default function CalcolatoreMiscela({
  superficieHa,
  volumeAcquaLHa,
  capacitaBotteL,
}: {
  superficieHa: number
  volumeAcquaLHa: number
  capacitaBotteL: number
}) {
  const [aperto, setAperto] = useState(false)
  const [dose, setDose] = useState('')
  const [modo, setModo] = useState<ModoDose>('per_hl')
  const [unita, setUnita] = useState<UnitaMisura>('ml')
  const [botteManuale, setBotteManuale] = useState('')

  if (!aperto) {
    return (
      <button
        type="button"
        className="pulsante-secondario"
        style={{ marginBottom: 18 }}
        onClick={() => setAperto(true)}
      >
        🧮 {t('miscela.titolo')}
      </button>
    )
  }

  const botte = Number(botteManuale.replace(',', '.')) || capacitaBotteL
  const doseNum = Number(dose.replace(',', '.')) || 0

  const esito = calcolaMiscela({
    superficieHa,
    volumeAcquaLHa,
    capacitaBotteL: botte,
    dose: doseNum,
    modoDose: modo,
    unitaProdotto: unita,
  })

  const pronto = superficieHa > 0 && volumeAcquaLHa > 0 && botte > 0 && doseNum > 0

  return (
    <div className="scheda">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>🧮 {t('miscela.titolo')}</strong>
        <button type="button" className="link-testo" onClick={() => setAperto(false)}>
          {t('comune.chiudi')}
        </button>
      </div>

      <div className="riga-campi" style={{ marginTop: 12 }}>
        <div className="gruppo-campo">
          <label htmlFor="dose">{t('miscela.dose')}</label>
          <input
            id="dose"
            inputMode="decimal"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="150"
            autoFocus
          />
        </div>
        <div className="gruppo-campo">
          <label htmlFor="unita-dose">Unità</label>
          <select
            id="unita-dose"
            value={unita}
            onChange={(e) => setUnita(e.target.value as UnitaMisura)}
          >
            {(['ml', 'l', 'g', 'kg'] as UnitaMisura[]).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Per ettaro o per ettolitro non è un dettaglio: è l'errore più comune. */}
      <div className="gruppo-campo">
        <label>L’etichetta dice la dose…</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className={modo === 'per_hl' ? 'pulsante-principale' : 'pulsante-secondario'}
            onClick={() => setModo('per_hl')}
          >
            {unita}/hl
          </button>
          <button
            type="button"
            className={modo === 'per_ha' ? 'pulsante-principale' : 'pulsante-secondario'}
            onClick={() => setModo('per_ha')}
          >
            {unita}/ha
          </button>
        </div>
      </div>

      {capacitaBotteL === 0 && (
        <div className="gruppo-campo">
          <label htmlFor="botte">{t('miscela.capacitaBotte')}</label>
          <input
            id="botte"
            inputMode="decimal"
            value={botteManuale}
            onChange={(e) => setBotteManuale(e.target.value)}
            placeholder="1000"
          />
          <p className="aiuto">
            Indica la capacità sull’attrezzo e non te la chiederà più.
          </p>
        </div>
      )}

      {!pronto ? (
        <p className="aiuto">
          Servono superficie, acqua per ettaro, capacità della botte e dose.
        </p>
      ) : (
        <>
          <div
            className="fascia-carenza carenza-libera"
            style={{ marginTop: 14, marginBottom: 10 }}
          >
            <div style={{ fontSize: 15, fontWeight: 400 }}>{t('miscela.perBotte')}</div>
            <div style={{ fontSize: 26 }}>
              {fmtNumero(esito.prodottoPerBottePiena)} {unita}
            </div>
            <div style={{ fontSize: 15, fontWeight: 400 }}>
              in {fmtNumero(botte)} litri d’acqua — copre {fmtNumero(esito.haPerBotte)} ha
            </div>
          </div>

          <div className="riga-dato">
            <span className="etichetta">{t('miscela.totale')}</span>
            <span className="valore">
              {fmtNumero(esito.prodottoTotale)} {unita}
            </span>
          </div>
          <div className="riga-dato">
            <span className="etichetta">Acqua totale</span>
            <span className="valore">{fmtNumero(esito.acquaTotaleL)} l</span>
          </div>
          <div className="riga-dato">
            <span className="etichetta">Botti</span>
            <span className="valore">
              {esito.bottiPiene} piene
              {esito.ultimaBotteL > 0 ? ` + ${fmtNumero(esito.ultimaBotteL)} l` : ''}
            </span>
          </div>
          {esito.ultimaBotteL > 0 && (
            <div className="riga-dato">
              <span className="etichetta">Prodotto nell’ultima botte</span>
              <span className="valore">
                {fmtNumero(esito.prodottoUltimaBotte)} {unita}
              </span>
            </div>
          )}

          {esito.avvertimenti.map((a, i) => (
            <p key={i} className="aiuto">
              ⚠️ {a}
            </p>
          ))}
        </>
      )}
    </div>
  )
}
