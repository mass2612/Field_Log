import { Link } from 'react-router-dom'
import type { Avviso } from '../../core/rules/scadenze'
import RigaAvviso from '../../ui/RigaAvviso'
import { t } from '../../core/i18n'

export default function Scadenze({ avvisi }: { avvisi: Avviso[] }) {
  const scaduti = avvisi.filter((a) => a.gravita === 'scaduto')
  const inScadenza = avvisi.filter((a) => a.gravita === 'in_scadenza')

  return (
    <>
      {avvisi.length === 0 && (
        <div className="elenco-vuoto">
          <span className="icona" aria-hidden>
            ✅
          </span>
          {t('scadenze.nessuna')}
        </div>
      )}

      {scaduti.length > 0 && (
        <>
          <h2 className="titolo-sezione">
            {t('scadenze.scaduto')} ({scaduti.length})
          </h2>
          {scaduti.map((a) => (
            <RigaAvviso key={a.id} avviso={a} />
          ))}
        </>
      )}

      {inScadenza.length > 0 && (
        <>
          <h2 className="titolo-sezione">
            {t('scadenze.inScadenza')} ({inScadenza.length})
          </h2>
          {inScadenza.map((a) => (
            <RigaAvviso key={a.id} avviso={a} />
          ))}
        </>
      )}

      <div className="scheda" style={{ marginTop: 20 }}>
        <strong>Come funzionano gli avvisi</strong>
        <p className="aiuto" style={{ marginTop: 8 }}>
          Il preavviso predefinito è di 30 giorni e si ripete finché la scadenza non è sistemata.
          Ogni documento può avere un preavviso proprio: il controllo funzionale dell’irroratrice
          va prenotato con mesi di anticipo, un patentino no.
        </p>
        <p className="aiuto">
          Vengono tenuti d’occhio: patentini, tarature, revisioni, assicurazioni, formazione,
          lotti scaduti a magazzino e prodotti revocati.
        </p>
        <Link to="/anagrafiche" className="link-testo">
          Aggiungi un documento con scadenza
        </Link>
      </div>
    </>
  )
}
