import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './stili.css'
import { getLingua } from './core/i18n'
import { Capacitor } from '@capacitor/core'

document.documentElement.lang = getLingua()

/*
 * La copia per lavorare senza rete (service worker) serve solo al sito.
 * Nell'app installata i file sono già nel telefono, e una copia vecchia
 * rimasta lì può continuare a servire una versione rotta: l'11/11/2026 un
 * APK sbagliato ne ha lasciata una, e la pagina restava bianca anche dopo
 * aver installato quello giusto. Nell'app quindi si toglie, sempre.
 */
if (Capacitor.isNativePlatform()) {
  void navigator.serviceWorker
    ?.getRegistrations()
    .then((registrazioni) => registrazioni.forEach((r) => void r.unregister()))
} else {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

/*
 * HashRouter e non BrowserRouter: l'app deve poter girare anche aperta da file
 * locale o dentro un involucro nativo, senza un server che riscriva le rotte.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
