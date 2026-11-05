import type { CapacitorConfig } from '@capacitor/cli'

/*
 * L'app per gli store: lo stesso codice del sito, impacchettato.
 *
 * `appId` è **per sempre**: una volta sul Play Store non si cambia più (sarebbe
 * un'altra app). Va confermato prima della prima pubblicazione.
 */
const config: CapacitorConfig = {
  appId: 'com.luckyfarm.app',
  appName: 'Lucky Farm',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#1b5e20',
    },
  },
}

export default config
