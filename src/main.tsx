import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './stili.css'
import { getLingua } from './core/i18n'

document.documentElement.lang = getLingua()

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
