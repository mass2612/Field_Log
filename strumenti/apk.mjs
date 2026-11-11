/**
 * Costruisce l'APK di prova di Agrizen.
 *
 *   npm run apk
 *
 * Perché un comando apposta: l'11/11/2026 un APK è uscito con la pagina tutta
 * bianca. Era stato impacchettato subito dopo `npm run pubblica`, che lascia in
 * `dist` la versione per GitHub Pages (file sotto `/Field_Log/`): dentro l'app
 * quei file non esistono. Qui si costruisce sempre da capo con il percorso
 * giusto per l'app (`/`), e prima di impacchettare si controlla.
 */

import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'

// Serve Java 21: quello di Android Studio. Il JAVA_HOME del sistema è più vecchio.
const JBR = 'C:\\Program Files\\Android\\Android Studio\\jbr'
const JAVA_HOME = existsSync(JBR) ? JBR : process.env.JAVA_HOME

function esegui(comando, opzioni = {}) {
  console.log(`\n> ${comando}`)
  execSync(comando, { stdio: 'inherit', ...opzioni })
}

esegui('npm run build', { env: { ...process.env, BASE_PATH: '/' } })

const indice = readFileSync('dist/index.html', 'utf8')
if (/(src|href)="\/[A-Za-z_-]+\/(assets|registerSW)/.test(indice)) {
  console.error("\nLa costruzione punta a una sottocartella: nell'app la pagina sarebbe bianca. Mi fermo.")
  process.exit(1)
}

esegui('npx cap sync android')
esegui(process.platform === 'win32' ? '.\\gradlew.bat assembleDebug -q' : './gradlew assembleDebug -q', {
  cwd: 'android',
  env: { ...process.env, JAVA_HOME },
})

const d = new Date()
const p = (n) => String(n).padStart(2, '0')
const ora = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
mkdirSync('apk', { recursive: true })
const destinazione = `apk/Agrizen-prova-${ora}.apk`
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', destinazione)
console.log(`\nPronto: ${destinazione}`)
