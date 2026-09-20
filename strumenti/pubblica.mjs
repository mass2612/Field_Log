/**
 * Pubblica l'app su GitHub Pages.
 *
 *   npm run pubblica
 *
 * Costruisce l'app con il percorso giusto per la sottocartella del deposito e
 * la manda sul ramo `gh-pages`, che è quello che GitHub mette online.
 *
 * Il codice sorgente resta sul ramo `master`: qui ci va soltanto il risultato
 * della costruzione.
 *
 * Nota: esiste anche `.github/workflows/pubblica.yml`, che farebbe tutto da
 * solo a ogni modifica. Per poterlo caricare serve un permesso in più sul
 * token di GitHub:
 *
 *   gh auth refresh -s workflow
 *
 * Finché non lo si fa, si pubblica con questo comando.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const RAMO = 'gh-pages'
const CARTELLA_LAVORO = '.pubblicazione'

function git(...argomenti) {
  return execFileSync('git', argomenti, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function nomeDeposito() {
  const url = git('remote', 'get-url', 'origin').trim()
  const trovato = url.match(/([^/:]+?)(\.git)?$/)
  if (!trovato) throw new Error('Non riesco a capire il nome del deposito da: ' + url)
  return trovato[1]
}

const deposito = nomeDeposito()
const base = `/${deposito}/`

console.log(`\n📦 Costruisco per ${base}\n`)
execFileSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: base },
  shell: process.platform === 'win32',
})

// GitHub Pages passa i file per Jekyll, che salta le cartelle che cominciano
// con il trattino basso. Questo file glielo impedisce.
writeFileSync(join('dist', '.nojekyll'), '')

console.log(`\n🚀 Mando sul ramo ${RAMO}\n`)

// Si lavora in una cartella separata, così il lavoro in corso su master non
// viene toccato.
rmSync(CARTELLA_LAVORO, { recursive: true, force: true })
try {
  git('worktree', 'remove', '--force', CARTELLA_LAVORO)
} catch {
  /* non esisteva: va bene così */
}

const ramoEsiste = (() => {
  try {
    git('rev-parse', '--verify', RAMO)
    return true
  } catch {
    return false
  }
})()

if (ramoEsiste) {
  git('worktree', 'add', CARTELLA_LAVORO, RAMO)
} else {
  git('worktree', 'add', '--detach', CARTELLA_LAVORO)
  execFileSync('git', ['-C', CARTELLA_LAVORO, 'checkout', '--orphan', RAMO], { stdio: 'inherit' })
  execFileSync('git', ['-C', CARTELLA_LAVORO, 'rm', '-rf', '--quiet', '.'], { stdio: 'ignore' })
}

// Si svuota e si ricopia: i file vecchi non devono restare in giro.
for (const voce of ['assets', 'index.html', 'manifest.webmanifest', 'sw.js', 'registerSW.js']) {
  rmSync(join(CARTELLA_LAVORO, voce), { recursive: true, force: true })
}
mkdirSync(CARTELLA_LAVORO, { recursive: true })
cpSync('dist', CARTELLA_LAVORO, { recursive: true })

execFileSync('git', ['-C', CARTELLA_LAVORO, 'add', '-A'], { stdio: 'inherit' })

const quando = new Date().toISOString().slice(0, 16).replace('T', ' ')

// Se non c'è niente da pubblicare il commit fallisce, ed è normale. Qualunque
// altro errore invece va mostrato: la prima versione di questo script se li
// mangiava tutti, e la pubblicazione falliva senza dire perché.
const daPubblicare = execFileSync('git', ['-C', CARTELLA_LAVORO, 'status', '--porcelain'], {
  encoding: 'utf8',
})

if (daPubblicare.trim() === '') {
  console.log('Niente di nuovo da pubblicare.')
} else {
  execFileSync('git', ['-C', CARTELLA_LAVORO, 'commit', '-q', '-m', `Pubblicazione ${quando}`], {
    stdio: 'inherit',
  })
}

execFileSync('git', ['-C', CARTELLA_LAVORO, 'push', '-u', 'origin', RAMO], { stdio: 'inherit' })

git('worktree', 'remove', '--force', CARTELLA_LAVORO)
if (existsSync(CARTELLA_LAVORO)) rmSync(CARTELLA_LAVORO, { recursive: true, force: true })

const utente = git('remote', 'get-url', 'origin').match(/github\.com[/:]([^/]+)\//)?.[1]
console.log(`\n✅ Fatto.\n\n   https://${utente}.github.io/${deposito}/\n`)
console.log('   Il primo caricamento può richiedere un paio di minuti.\n')
