import type { CapacitorConfig } from '@capacitor/cli'

/*
 * L'app per gli store: lo stesso codice del sito, impacchettato.
 *
 * `appId` è **per sempre**: una volta sul Play Store non si cambia più (sarebbe
 * un'altra app). Scelto il 10/11/2026, dal dominio agrizen.it.
 */
const config: CapacitorConfig = {
  appId: 'it.agrizen.app',
  appName: 'Agrizen',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#1b5e20',
    },
  },
}

export default config
