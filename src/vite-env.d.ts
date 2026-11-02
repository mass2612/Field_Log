/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Indirizzo del servizio di lettura dei documenti. Assente: si legge sul telefono. */
  readonly VITE_LETTURA_URL?: string
  /** Gettone di accesso al servizio di lettura. */
  readonly VITE_LETTURA_GETTONE?: string
}
