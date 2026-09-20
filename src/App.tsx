import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAvvisi, useAzienda, useOnline } from './core/db/azienda'
import { useMeteoOggi } from './core/meteo/meteo'
import Home from './features/home/Home'
import Quaderno from './features/quaderno/Quaderno'
import ScriviNota from './features/quaderno/ScriviNota'
import Nota from './features/quaderno/Nota'
import Documenti from './features/documenti/Documenti'
import Campi from './features/campi/Campi'
import DettaglioCampo from './features/campi/DettaglioCampo'
import NuovoCampo from './features/campi/NuovoCampo'
import Magazzino from './features/magazzino/Magazzino'
import Impostazioni from './features/altro/Impostazioni'
import Scadenze from './features/altro/Scadenze'
import Ispezione from './features/altro/Ispezione'
import Anagrafiche from './features/altro/Anagrafiche'
import Confronto from './features/confronto/Confronto'
import BancoProva from './features/ocr/BancoProva'
import NuovoIntervento from './features/interventi/NuovoIntervento'
import CorreggiIntervento from './features/interventi/CorreggiIntervento'
import { t } from './core/i18n'

/**
 * Il guscio.
 *
 * Sopra le cose che si **leggono** — azienda, meteo, il punto esclamativo.
 * Sotto quelle che si **toccano** — perché il pollice di una mano sola arriva
 * in basso e in alto no.
 */
export default function App() {
  const azienda = useAzienda()
  const avvisi = useAvvisi(azienda?.id)
  const online = useOnline()
  const posizione = useLocation()
  const naviga = useNavigate()
  const meteo = useMeteoOggi(azienda)

  const inHome = posizione.pathname === '/'

  if (!azienda) {
    return (
      <div className="guscio">
        <div className="contenuto">
          <p>Apertura del quaderno…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="guscio">
      <header className="barra-alta">
        {inHome ? (
          <span className="barra-titolo">{azienda.nome}</span>
        ) : (
          <button className="barra-indietro" onClick={() => naviga(-1)} aria-label="Indietro">
            ‹ <span>indietro</span>
          </button>
        )}

        <span className="barra-destra">
          {meteo && (
            <Link to="/meteo" className="meteo-oggi" title="Il tempo di oggi">
              <span aria-hidden>{meteo.icona}</span>
              <span>{Math.round(meteo.temperaturaC)}°</span>
              {meteo.pioggiaMm > 0 && <span>{meteo.pioggiaMm} mm</span>}
            </Link>
          )}
          <Link
            to="/avvisi"
            className={`barra-allarme ${avvisi.length > 0 ? 'acceso' : ''}`}
            aria-label="Avvisi"
          >
            {avvisi.length > 0 ? '❗' : '✓'}
            {avvisi.length > 0 && <span className="pallino">{avvisi.length}</span>}
          </Link>
        </span>
      </header>

      {!online && <div className="striscia-offline">{t('comune.offline')}</div>}

      <main className="contenuto">
        <Routes>
          <Route path="/" element={<Home azienda={azienda} avvisi={avvisi} />} />

          <Route path="/quaderno" element={<Quaderno azienda={azienda} />} />
          <Route path="/quaderno/scrivi" element={<ScriviNota azienda={azienda} />} />
          <Route path="/quaderno/:notaId" element={<Nota />} />
          <Route path="/quaderno/:notaId/modifica" element={<ScriviNota azienda={azienda} />} />

          <Route path="/documenti" element={<Documenti azienda={azienda} />} />
          <Route path="/magazzino" element={<Magazzino azienda={azienda} />} />

          <Route path="/campi" element={<Campi azienda={azienda} />} />
          <Route path="/campi/nuovo" element={<NuovoCampo azienda={azienda} />} />
          <Route path="/campi/nome/:nomeCampo" element={<Campi azienda={azienda} />} />
          <Route path="/campi/:campoId" element={<DettaglioCampo azienda={azienda} />} />
          <Route path="/confronto" element={<Confronto azienda={azienda} />} />

          <Route path="/avvisi" element={<Scadenze avvisi={avvisi} />} />
          <Route path="/ispezione" element={<Ispezione azienda={azienda} />} />
          <Route path="/anagrafiche" element={<Anagrafiche azienda={azienda} />} />
          <Route path="/impostazioni" element={<Impostazioni azienda={azienda} />} />
          <Route path="/prova-lettura" element={<BancoProva />} />

          <Route path="/registra" element={<NuovoIntervento azienda={azienda} />} />
          <Route
            path="/interventi/:interventoId/correggi"
            element={<CorreggiIntervento azienda={azienda} />}
          />
        </Routes>
      </main>

      <nav className="barra-bassa">
        <Link to="/" className={inHome ? 'attivo' : ''}>
          <span className="icona" aria-hidden>
            ⌂
          </span>
          <span>Inizio</span>
        </Link>
        <Link to="/quaderno/scrivi" className="azione-principale">
          <span className="icona" aria-hidden>
            ✏️
          </span>
          <span>Scrivi</span>
        </Link>
        <Link to="/impostazioni">
          <span className="icona" aria-hidden>
            ⚙
          </span>
          <span>Impostazioni</span>
        </Link>
      </nav>
    </div>
  )
}
