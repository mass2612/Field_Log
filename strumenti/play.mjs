/**
 * Costruisce il pacchetto di Agrizen da caricare su Google Play (.aab firmato).
 *
 *   npm run play
 *
 * Come `npm run apk` (stesso controllo sul percorso, stesso Java), più:
 * - firma con la chiave di caricamento, che sta fuori dal repo
 *   (`android/keystore.properties` dice dove): senza, si ferma;
 * - alza di uno il `versionCode`, perché Google rifiuta due caricamenti con
 *   lo stesso numero.
 */

import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const JBR = 'C:\\Program Files\\Android\\Android Studio\\jbr'
const JAVA_HOME = existsSync(JBR) ? JBR : process.env.JAVA_HOME

function esegui(comando, opzioni = {}) {
  console.log(`\n> ${comando}`)
  execSync(comando, { stdio: 'inherit', ...opzioni })
}

if (!existsSync('android/keystore.properties')) {
  console.error('\nManca android/keystore.properties: senza la chiave di caricamento non si firma. Mi fermo.')
  process.exit(1)
}

const GRADLE = 'android/app/build.gradle'
let gradle = readFileSync(GRADLE, 'utf8')
const codice = Number(/versionCode (\d+)/.exec(gradle)[1]) + 1
gradle = gradle.replace(/versionCode \d+/, `versionCode ${codice}`)
writeFileSync(GRADLE, gradle)
const versione = /versionName "([^"]+)"/.exec(gradle)[1]

esegui('npm run build', { env: { ...process.env, BASE_PATH: '/' } })

const indice = readFileSync('dist/index.html', 'utf8')
if (/(src|href)="\/[A-Za-z_-]+\/(assets|registerSW)/.test(indice)) {
  console.error("\nLa costruzione punta a una sottocartella: nell'app la pagina sarebbe bianca. Mi fermo.")
  process.exit(1)
}

esegui('npx cap sync android')
esegui(process.platform === 'win32' ? '.\\gradlew.bat bundleRelease -q' : './gradlew bundleRelease -q', {
  cwd: 'android',
  env: { ...process.env, JAVA_HOME },
})

mkdirSync('apk', { recursive: true })
const destinazione = `apk/Agrizen-${versione}-${codice}.aab`
copyFileSync('android/app/build/outputs/bundle/release/app-release.aab', destinazione)
console.log(`\nPronto per Google Play: ${destinazione} (versione ${versione}, codice ${codice})`)
