# Quaderno di Campagna

Registro di campagna **offline-first** per aziende agricole europee.
Nato in Italia, ma costruito per non restarci.

> Serve prima all'agricoltore, poi all'ispettore.
> La conformità è un sottoprodotto di dati registrati bene.

**Se riprendi il progetto dopo una pausa, parti da
[Riepilogo/00-INIZIA-DA-QUI.md](Riepilogo/00-INIZIA-DA-QUI.md).**

| | |
|---|---|
| Contesto, filosofia, diario, glossario | [`Riepilogo/`](Riepilogo/) |
| Specifica funzionale | [docs/01-visione-e-requisiti.md](docs/01-visione-e-requisiti.md) |
| Scelte tecniche | [docs/02-decisioni-tecniche.md](docs/02-decisioni-tecniche.md) |
| **Il quaderno agronomico — il valore vero** | [docs/03-quaderno-agronomico.md](docs/03-quaderno-agronomico.md) |

---

## Avviare

```bash
npm install
npm run dev
```

Poi aprire `http://localhost:5173`. Da **Impostazioni → Carica dati dimostrativi** si
popola il quaderno con due campi, un trattamento che blocca la raccolta, un
patentino in scadenza e un lotto scaduto a magazzino: serve a vedere subito come
si comporta.

```bash
npm test           # collaudo della lettura documenti (26 casi)
npm run build      # produzione, genera anche il service worker
npm run typecheck  # controllo dei tipi
```

---

## L'app è online

**https://mass2612.github.io/Field_Log/**

Si apre da qualunque telefono, senza scaricare niente e senza il PC acceso.
Su Android, dal menù di Chrome, *Aggiungi a schermata Home*: da lì in poi ha la
sua icona e si apre a schermo intero. Su iPhone lo stesso, dal tasto Condividi.

Da sapere prima di girarlo a qualcuno:

- **Ognuno ha il suo quaderno.** I dati restano nel telefono di chi apre il
  link: non c'è nessun server, niente viene condiviso e tu non vedi quello che
  scrivono loro. Per provarla in due sullo stesso quaderno servirebbe la
  sincronizzazione, che non c'è ancora.
- **Il codice sorgente è pubblico**, perché GitHub Pages gratis funziona solo
  così. Chi vuole può leggerlo e copiarlo.

Per ripubblicare dopo una modifica:

```bash
npm run pubblica
```

Il link resta lo stesso, e chi l'ha installato si ritrova la versione nuova.

> La pubblicazione automatica a ogni modifica è già scritta in
> `.github/workflows/pubblica.yml`, ma per caricarla su GitHub serve un
> permesso in più sul token: `gh auth refresh -s workflow`. Fatto quello, si
> toglie `.github/workflows/` dal `.gitignore` e non serve più lanciare niente
> a mano.

---

## Provare dal telefono senza pubblicare

**Non c'è niente da scaricare, e l'app non è su nessuno store.** È una pagina web:
il telefono deve solo riuscire a raggiungere il computer su cui gira.

### Modo 1 — sbirciare, in dieci secondi

Telefono e computer sulla **stessa rete Wi-Fi**. Sul computer:

```bash
npm run build && npx vite preview --host --port 4173
```

Poi sul telefono si apre l'indirizzo che compare come *Network*, del tipo
`http://192.168.x.x:4173`.

> ⚠️ **Da qui metà app non funziona, ed è normale.** Su `http://` il browser del
> telefono blocca **fotocamera, microfono, posizione e installazione**: sono
> concessi solo a `localhost` e a `https://`. Quindi niente foto dei documenti,
> niente note vocali, niente icona sulla schermata Home. Serve a vedere com'è
> fatta, non a provarla.

Se il telefono non apre la pagina, quasi sempre è il firewall di Windows che
blocca le connessioni in entrata. Da PowerShell **come amministratore**:

```powershell
New-NetFirewallRule -DisplayName "Quaderno di campagna" -Direction Inbound -LocalPort 4173 -Protocol TCP -Action Allow
```

### Modo 2 — provarla sul serio, con tutto acceso

Serve un indirizzo `https`. Il modo più rapido è un tunnel temporaneo: il
computer resta il server, ma Cloudflare gli mette davanti un indirizzo pubblico
in https. In un secondo terminale:

```bash
cloudflared tunnel --url http://localhost:4173
```

Stampa un indirizzo tipo `https://qualcosa-a-caso.trycloudflare.com`: quello si
apre dal telefono e **funziona tutto** — fotocamera, microfono, posizione — e
Chrome propone *Aggiungi a schermata Home*, che è l'installazione vera.

Due avvertenze oneste:

- finché il tunnel è aperto, **quell'indirizzo è raggiungibile da chiunque lo
  conosca**. È un indirizzo casuale e dura quanto il comando, ma è internet: non
  lasciarlo acceso e non metterci dentro dati veri.
- il tunnel muore chiudendo il terminale, e alla riapertura l'indirizzo cambia.

### Modo 3 — quando sarà da usare davvero

Pubblicare `dist/` su un hosting statico (Cloudflare Pages, Netlify, GitHub
Pages): indirizzo https fisso, installabile una volta e per sempre, e l'app
continua a funzionare **senza rete** perché i dati stanno nel telefono.
È il passo da fare quando l'app smette di essere una prova.

---

## Cosa fa già

### Il quaderno che serve all'agricoltore

- **Settaggi macchina** — tacca del cambio, ugelli, pressione, velocità,
  profondità. Il dato che oggi sta su un foglietto in cabina. Si riaprono già
  compilati con l'ultima volta: *"come l'altra volta"*.
- **Impostato contro reale** — *"la macchina ha messo il +8,3% rispetto a quanto
  avevi impostato"*. È lì che si nascondono gli errori che nessuno vede.
- **Confronto fra annate** — semina, azoto, trattamenti, costi, resa, proteine e
  la variazione rispetto all'anno prima, campo per campo.
- **Raccolta** — resa per ettaro, umidità, proteine, peso specifico, grado
  zuccherino, prezzo. Senza, il confronto non esiste.
- **Precessione colturale** — cosa c'era prima. Fra tre anni non te lo ricordi.

- **Lettura dei documenti** — fotografi una fattura o un patentino e l'app ne
  ricava la scheda: fornitore, numero, data, partita IVA, totale, righe di merce;
  oppure intestatario e scadenza. Gira **sul telefono**, senza server. Ogni campo
  dice quanto se ne fida e **da quale riga** l'ha preso, e resta correggibile.
  Banco di prova in *Impostazioni → Banco di prova della lettura*.

### Il quaderno che impone la norma

- **Registrazione degli interventi** — trattamenti, concimazioni, irrigazioni,
  semine, lavorazioni, raccolte e note, con un unico flusso.
- **Tempo di carenza** — calcolato dal prodotto impiegato e mostrato in cima alla
  scheda del campo: *"Raccolta consentita dal 26 set"*. Quando manca il dato,
  lo dice invece di dare per buono zero.
- **Controlli mentre si scrive** — dose massima, numero di interventi per annata,
  coltura autorizzata, prodotto revocato, patentino scaduto alla data del lavoro,
  giacenza insufficiente. Segnalano, non bloccano: il registro deve dire com'è
  andata davvero.
- **Note vocali** — si tiene premuto e si parla. L'audio si salva **sempre**; la
  trascrizione arriva subito se il dispositivo la offre, altrimenti resta in coda.
- **GPS come suggerimento** — propone il campo, non lo decide. Con i dipendenti
  il GPS del titolare direbbe una bugia che nessuno noterebbe più.
- **Calcolatore della miscela** — dose per ettaro o per ettolitro, quanti ml in
  ogni botte, quanti ettari copre. Dentro la schermata di registrazione, perché
  serve mentre si prepara.
- **Magazzino** — giacenze dedotte dai movimenti, mai da un contatore a mano.
  Scarico automatico dal lotto più vecchio quando si registra un trattamento.
- **Scadenze** — patentini, tarature, revisioni, lotti scaduti, prodotti revocati.
  Avviso a 30 giorni (configurabile per documento) e badge persistente.
- **Modalità controllo** — registro degli ultimi 3 anni, pronto, senza rete.
- **Esportazioni** — registro dei trattamenti e analisi gestionale in CSV,
  quaderno integrale in JSON.
- **Multilingua** — italiano e inglese; francese, spagnolo e tedesco pronti da
  tradurre, con ricaduta sull'italiano.

## Cosa non fa ancora

- Lettura delle fatture: le righe di merce **non** entrano ancora nel magazzino
  da sole — la scheda si legge, ma il carico resta a mano.
- Registro prodotti ufficiale — i prodotti si creano a mano e sono marcati come
  *non verificati*. È **la** dipendenza da risolvere.
- Trascrizione sul server e trascrizione davvero locale senza rete.
- Meteo agganciato al trattamento.
- Rese e confronto pluriennale (il modello dati c'è già).
- Sincronizzazione cloud e multi-dispositivo.
- Export SIAN.

---

## Struttura

```
src/
  core/            # NUCLEO — uguale in tutta la UE
    domain/        #   modello dati
    db/            #   database locale (IndexedDB via Dexie)
    rules/         #   carenza, scadenze, controlli, miscela, posizione
    voce/          #   registrazione e trascrizione
    export/        #   CSV / JSON
    i18n/          #   traduzioni
  packs/
    it/            # PACCHETTO ITALIA — registro DPR 55/2012, stampe, export
  features/        # schermate
  ui/              # componenti condivisi
```

La separazione **`core` / `packs`** è la regola da non violare: nel nucleo non
entra nulla di nazionale. Aggiungere la Francia deve voler dire scrivere
`src/packs/fr`, non mettere mano al resto.

---

## Principi

1. **Offline è il caso normale**, non l'eccezione. Il database locale è la fonte
   di verità; il server, quando ci sarà, ne è una copia.
2. **Correggere è normale, non è una colpa.** Ogni intervento si modifica quando
   si vuole, senza attriti. Lo storico delle modifiche resta — ma è **per**
   l'agricoltore, non contro di lui, e non finisce nella stampa del registro se
   non lo chiede. Dove il dato è una stima, l'app scrive *stimato*.
3. **Mai bloccare l'inserimento.** In campo il fatto è già avvenuto. Si salva
   anche incompleto, e l'app ricorda cosa manca.
4. **Dire quando non si sa.** Un tempo di carenza ignoto non è zero giorni.
5. **I dati sono dell'agricoltore.** Export integrale, formati aperti, sempre.
