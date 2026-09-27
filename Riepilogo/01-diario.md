# Diario del progetto

Registro di cosa è stato deciso, quando e **perché**. Il perché è la parte che
serve: il cosa si legge nel codice.

Voce più recente in cima.

---

## 27 settembre 2026 (sera) — La dettatura ricresceva ancora

Dettando *"proviamo di nuovo e vediamo cosa legge"* sul telefono usciva
*"proviamo proviamo proviamo di proviamo di nuovo proviamo di nuovo e…"*.
La correzione del giorno prima non aveva cambiato niente.

**Perché la correzione di prima non funzionava.** Il test imitava il telefono
**come me lo immaginavo**: un solo risultato che si allunga. Chrome su Android
fa un'altra cosa: nell'elenco mette **tanti risultati, ognuno che riparte dalla
prima parola** e arriva un po' più in là, e li dà già per definitivi. Metterli
in fila ripeteva la frase dieci volte. Il test era verde, il telefono no.

**Fatto:** un risultato che *riprende* quello prima (ne contiene almeno l'80%
delle parole, nello stesso ordine) lo sostituisce invece di seguirlo. Il margine
serve perché riprendendo il riconoscimento corregge: da "e vediamo cosa" a
"vediamo cosa legge". Due frasi diverse che si somigliano restano due frasi.
Il test nuovo usa la sequenza ricostruita dallo schermo del telefono.

**Fatto: il registro dell'ultima dettatura** (*Impostazioni → Prova → Cosa ha
mandato il telefono nell'ultima dettatura*). Tiene quello che il browser ha
mandato, così com'è, con un pulsante Copia. **Lezione:** su un difetto che si
vede solo sul telefono, prima si guardano i dati veri del telefono, poi si
scrive il test. Altrimenti il test certifica un'ipotesi.

---

## 27 settembre 2026 (pomeriggio) — I documenti restano correggibili per sempre

Segnalato provando una bolletta dell'acqua. Chiude C1 e C2 delle domande aperte.

**Deciso: i campi letti si archiviano col documento** — valore, sicurezza, riga
di provenienza — insieme al testo grezzo, e restano modificabili dalla scheda.
Prima, dopo il salvataggio, restavano solo numero e scadenza: un dato letto male
restava sbagliato per sempre. Era una falla nel gesto dell'app: *tu correggi*
vale sempre, non solo nei trenta secondi dell'inserimento. Correggendo, il
bollino di sicurezza diventa una spunta e la riga originale resta visibile.
Numero e scadenza del documento seguono la correzione, altrimenti l'avviso
avrebbe continuato a suonare sulla data vecchia.

**Deciso: il genere del documento si riconosce dal testo, non dal menù.** La
bolletta, archiviata come "patentino", finiva al lettore delle scadenze, che
cerca la data futura più lontana e tirava fuori il 20/02/2028 invece del
04/06/2026 scritto in chiaro. Il tipo scelto dall'uomo non deve decidere *come*
si legge. Siccome il testo grezzo resta archiviato, si può **rileggere col
criterio giusto senza rifotografare**.

6 test nuovi sul caso della bolletta, 40 in totale, tutti verdi. Pubblicato.

Resta aperta C3: la precisione della lettura sulle fatture vere.

---

## 26-27 settembre 2026 — Prime prove sul telefono vero

Prima sessione con l'app in mano all'agricoltore, su **Brave per Android**.
Quasi tutto quello che si è rotto era invisibile dal computer.

### Note vocali — quattro difetti in fila

**Registrava e non trascriveva mai.** Avviavo *insieme* il registratore audio e
il riconoscimento vocale: **si contendono il microfono**, il registratore lo
prende per primo e alla trascrizione non arriva niente. Ora sono separati e si
usa **uno alla volta**: prima si prova a trascrivere e nessun altro tocca il
microfono; solo se fallisce si registra l'audio. Verificato con un contatore che
durante la trascrizione `getUserMedia` non venga chiamato nemmeno una volta.

**Il messaggio mentiva.** Diceva sempre "manca la rete", qualunque fosse la
causa, e ha fatto perdere tempo a controllare una rete che funzionava. Ora si
legge il codice d'errore vero; se non lo si conosce, l'app dice che non lo sa.
L'app ricorda **anche il perché** su quel telefono, così non racconta un motivo
a caso alla registrazione dopo.

**La frase ricresceva.** Uscivano cose come
*"vediamo Vediamo cosa Vediamo cosa scrive Vediamo cosa scrive 15 kg"*.
Il riconoscimento **rimanda gli stessi risultati più volte** mentre corregge, e
io li sommavo a ogni rinvio. Ora la trascrizione si ricompone da zero a ogni
evento (`componiTrascrizione`): è **idempotente**, quindi ripetere gli eventi non
cambia niente. Otto test lo bloccano, fra cui la sequenza vera vista sul telefono.

**Le pause tagliavano la nota.** Il riconoscimento si chiude da solo dopo un
silenzio; il pezzo detto prima spariva. Ora si mette da parte e si riapre una
sessione, con un tetto ai riavvii e nessun riavvio dopo un errore.

**Il dito si staccava.** Bastava spostarlo di un millimetro e `onPointerLeave`
fermava tutto. Ora il dito è agganciato con `setPointerCapture`. Aggiunti il
**tocco secco** (registra finché non ritocchi) e il cronometro.

### Interfaccia

**"Pasticciato".** Il microfono era un riquadro grande quanto Salva e attaccato
al testo: due comandi principali sulla stessa schermata, e il pollice sbagliava.
Ora è un **bottone tondo dentro l'angolo del riquadro del testo** — è un modo di
scrivere, non un'azione — e il pulsante grande torna a essere **uno solo: Salva**.

### Foto

**"Fotografa" non fotografava, "Scegli file" sì.** L'attributo `capture` è solo
un *suggerimento* e ogni browser lo interpreta a modo suo. Niente indovinelli:
due pulsanti espliciti, **Scatta una foto** e **Scegli un file**
(`src/ui/SceltaFoto.tsx`), usati in Documenti e nel banco di prova.

### Cose imparate, che valgono oltre questi difetti

1. **Il computer non basta per collaudare.** Microfono, fotocamera e dita si
   comportano diversamente sul telefono. Ogni funzione che li tocca va provata lì.
2. **Un messaggio che indovina la causa è peggio di nessun messaggio.**
3. Quando un dato arriva a pezzi e ripetuti, **ricostruire da zero** batte
   sempre l'accumulo: l'operazione diventa ripetibile senza conseguenze.

---

## 20 settembre 2026 (notte) — Pubblicata e provabile dal telefono

Vedi le voci sotto per GitHub Pages e il modulo di lettura documenti.

---

## 20 settembre 2026 (sera) — L'app è online

**https://mass2612.github.io/Field_Log/** — deposito `mass2612/Field_Log`.

**Deciso: GitHub Pages, deposito pubblico.** GitHub Pages gratis funziona solo
da depositi pubblici; un deposito privato è gratis, ma pubblicarci un sito
richiede un piano a pagamento *(circa 4 $/mese, da verificare)*. Alternativa
gratuita col codice privato: Cloudflare Pages o Netlify.

Avvertenza messa agli atti: **cancellare un deposito pubblico non ripubblica
indietro niente.** Chi l'ha clonato se lo tiene, e la cronologia git conserva
tutto anche svuotando i file. Il "poi lo togliamo" non è un annulla.

**Fatto: percorso base configurabile** (`BASE_PATH`). Su GitHub Pages il sito
sta in `/Field_Log/`, su un dominio proprio starebbe alla radice: lo stesso
codice va bene in tutti e due i casi. `start_url` e `scope` del manifesto
seguono la stessa variabile, altrimenti l'icona sulla schermata Home aprirebbe
una pagina bianca.

**Fatto: `npm run pubblica`** — costruisce e manda sul ramo `gh-pages`.
Il workflow che farebbe tutto da solo a ogni modifica è scritto, ma per
caricarlo serve il permesso `workflow` sul token: `gh auth refresh -s workflow`.
Finché manca, `.github/workflows/` resta nel `.gitignore`.

**Da ricordare quando si gira il link a qualcuno:** ognuno si ritrova il
**proprio** quaderno vuoto, perché i dati stanno nel suo telefono. Non c'è
nessun server e niente è condiviso. Per provare in due sullo stesso quaderno
servirebbe la sincronizzazione, che non c'è.

**Domini:** valutato l'acquisto di `quadernodicampagna.de` su Hetzner (€ 5,98).
Non serve per provare l'app. Se si compra, il `.de` è il dominio nazionale
tedesco: per un prodotto europeo `.eu`, `.com` o `.it` raccontano meglio la
cosa. Nella maschera di Hetzner, la casella *"custom DNS servers"* **non va
spuntata**: serve solo a chi ha già server DNS propri.

---

## 20 settembre 2026 — Il modulo che legge i documenti

**Fatto: la lettura automatica funziona, e gira sul telefono.**
Motore: Tesseract compilato per il browser. Niente server, niente costo per
foto, nessun documento che esce dall'azienda. In cambio legge peggio di un
servizio a pagamento — ed è esattamente per questo che la scheda correggibile
non è un accessorio.

**Deciso: due pezzi separati.**
1. il **motore** che dalla foto ricava il testo (Tesseract oggi, altro domani);
2. l'**estrazione** che dal testo ricava i campi.
Il secondo è quello che vale: è **collaudabile senza fotografare niente** e resta
buono cambiando motore. Da qui i test automatici (`npm test`), 26 e tutti verdi.

**Deciso: ogni campo dice da quale riga è stato preso.**
Non è un vezzo: è ciò che permette di controllare un numero in due secondi
invece di rileggere tutta la fattura. **Un dato senza provenienza è un dato che
nessuno verifica**, e un numero sbagliato che sembra giusto è peggio di nessun
numero.

**Deciso: ogni campo dichiara quanto ci si può fidare**, e la scheda intera pure.
Sotto il 65% l'app dice "ho capito poco, controlla tutto". Meglio un campo vuoto
che un campo inventato.

**Difetti trovati provandolo sul serio, e corretti.** Vale la pena tenerli a
mente, perché sono il genere di cose che si scoprono solo facendo girare il
codice:

1. **La correzione dell'OCR rovinava i dati giusti.** Raddrizzando le lettere
   scambiate per cifre, il numero di patentino `LO-2021-004512` diventava
   `L0-2021-004512`. Regola nuova: si correggono solo le lettere **dopo la prima
   cifra**; un prefisso di lettere è quasi sempre un codice vero.
2. **L'indirizzo del fornitore finiva fra la merce** ("Via Roma 14 = 26900").
   Adesso si legge solo dentro la tabella, fra l'intestazione delle colonne e la
   riga dell'imponibile.
3. **I numeri si leggevano da sinistra.** Su `UREA 46 1000 kg 0,55 550,00` dava
   quantità 46 — che è il titolo del concime, non i chili. Adesso si legge **da
   destra**: in fondo ci sono sempre importo e prezzo.
4. **L'OCR spezza i numeri** ("0, 55"): si ricuciono prima di leggerli.
5. **L'intestatario del patentino era "REGIONE LOMBARDIA"** — l'ente che
   rilascia, non la persona. Aggiunta una lista di enti da escludere.

**Fatto: banco di prova** (*Impostazioni → Banco di prova della lettura*).
Si fotografa una fattura vera e si vede cosa ne esce, campo per campo, col testo
grezzo. È l'unico modo per rispondere alla domanda che conta: *quanto sbaglia
sulle fatture di questa azienda?*

**Da sapere:** la prima volta la lingua italiana (una decina di MB) si scarica e
**serve la rete**; poi resta in cache e funziona offline. Sulla fattura di prova:
4 secondi, tutti i campi di testa giusti, le tre righe di merce giuste.
**Una fattura finta è però un caso facile** — carta dritta, contrasto perfetto.
La prova vera si fa con una fattura stropicciata fotografata storta.

---

## 13 settembre 2026 (sera) — Rifatta l'app attorno alle note

**La svolta del progetto.** L'interfaccia precedente non andava, e non per
questioni estetiche: era sbagliata l'impostazione. Chiedeva all'agricoltore di
**pensare nello schema del software** — prima il campo, poi l'intervento, poi le
righe di prodotto — cioè di compilare un database. Buttata.

**Deciso: il primitivo dell'app è la nota.**
Si scrive o si detta quello che è successo, come viene. Tutto il quaderno è un
elenco di note in ordine di tempo.

**Deciso: un solo gesto per tutta l'app.**

> Tu butti dentro roba come ti viene. La macchina la struttura. Tu correggi se
> ha capito male.

Vale per la nota vocale che diventa testo, per la foto della fattura che diventa
scheda, e per la nota scritta da cui si ricavano data, campo, argomenti e
prodotti. **Un solo concetto da spiegare a un uomo di settant'anni.**

**Deciso: il registro dei trattamenti non si compila — si forma da solo.**
"Trattamenti" è un raggruppamento come gli altri dentro il Quaderno, non un
bottone a parte. Sotto però è diverso: da quelle note esce il registro, e in quel
gruppo — e solo lì — compaiono l'esportazione e l'avviso su cosa manca. Tutta la
burocrazia dell'app sta in una schermata sola, che si apre due volte l'anno.
Il nome ("registro dei trattamenti") arriva dal pacchetto paese: cambia altrove.

**Deciso: i campi nascono dalle note.** Niente anagrafica da compilare prima.
Scrivi "vigna sotto casa" e da quel momento quel campo esiste. Registrarlo per
bene serve solo per il confronto fra annate, ed è un passo in più, non un dazio
d'ingresso.

**Deciso: l'audio del vocale si tiene solo fino alla rilettura**, poi si cancella
da solo. Compromesso fra il "non salvare niente, sono byte" (giusto: una foto di
fattura pesa quaranta volte un vocale) e il rischio vero, che è perdere la nota
quando la trascrizione non è possibile perché manca la rete.

**Deciso: niente "Modifica" nell'elenco.** È una modalità, e una modalità è un
concetto in più. Si tocca la nota, si apre, e il Modifica è lì dentro. Delle
correzioni si mostra solo "modificato il…".

**Deciso: il GPS scende a una cosa sola** — segnare dov'è l'azienda, una volta.
Il GPS di un telefono non individua il mappale e non ha senso fingere che lo
faccia. Serve a sapere **che tempo fa lì**.

**Deciso: il meteo si registra tutti i giorni, da solo.** Non agganciato alla
nota: la domanda dell'anno dopo è "quanta acqua è venuta giù ad aprile", non "che
tempo faceva il giorno che ho trattato". È quello che fa dire al confronto fra
annate non solo cosa hai fatto, ma **che stagione era**. Fonte: Open-Meteo,
niente chiavi né registrazioni.

**Deciso: niente problema di privacy con i dipendenti.** L'app è del titolare;
il trattorista riferisce e il titolare scrive la sera. Tolto il tracciamento,
**sparisce del tutto la questione dell'art. 4 dello Statuto dei Lavoratori.**
Resta solo il nome di chi ha trattato nel registro, che è normale tenuta di
documenti di lavoro.

**Interfaccia:** quattro piastrelle grosse in colonna — Quaderno di campagna,
Documenti, Magazzino, Campi — ognuna con scritto cosa sta succedendo lì dentro,
e che **si colora da sola** quando c'è un problema. Così il punto esclamativo non
dice solo *che* c'è qualcosa: si vede *dove*. Barra sopra per quello che si
legge (azienda, meteo, avvisi), barra sotto per quello che si tocca.

**Nota tecnica sulle traduzioni:** un'app fatta di moduli ha centinaia di
etichette; una fatta di note ne ha una dozzina. Il tedesco resta il collaudo da
fare — niente larghezze fisse sui bottoni.

**Da chiarire:** cosa sia lo stile "echo-protocol" a cui pensa il committente.
Per ora l'icona quadrata sta a sinistra e il testo a destra; invertirlo è una riga.

---

## 13 settembre 2026 — La filosofia, e cosa ci sta dentro l'app

**Deciso: l'app ha due anime, e la seconda è quella che conta.**
Il quaderno imposto dalla norma va fatto costare il meno tempo possibile. Il
quaderno utile all'agricoltore — settaggi, stime, confronti fra annate — è il
prodotto vero. Scritto per esteso in `00-INIZIA-DA-QUI.md`, sezione 2.

**Deciso: le correzioni postume sono normali e devono essere facili.**
La versione precedente del progetto trattava il registro come immutabile, con
l'idea di proteggere l'agricoltore in un contenzioso. Corretto il tiro: il
principio resta (si tiene traccia), ma cambia a chi serve la traccia.
- Correggere un intervento è un'operazione ordinaria, senza attriti.
- Lo storico modifiche è **interno**, a beneficio dell'agricoltore.
- **Non** finisce nella stampa del registro se non lo chiede lui. Un registro di
  carta corretto con il bianchetto non mostra nulla; non c'è ragione che il
  nostro esponga di più.
- Dove il dato è una stima, l'app scrive "stimato".

**Deciso: nuove aree da coprire** — gasolio agricolo (UMA), documentazione PAC,
e agrivoltaico. Dettagli e cose da verificare in `03-domande-aperte.md`.

**Deciso: la semplicità d'uso è un requisito, non un auspicio.**
Target dichiarato: un uomo di settant'anni, con i guanti, in pieno sole, con una
mano sola. Principi in `04-interfaccia.md`.

**Da costruire come priorità** — settaggi macchina e prova di taratura, poi il
confronto fra annate. È il valore aggiunto, non un di più.

---

## 12 settembre 2026 — Impostazione del progetto

**Fatto: prima versione funzionante.** Registrazione interventi, tempo di
carenza, controlli in tempo reale, note vocali, GPS, calcolatore miscela,
magazzino, scadenze, modalità controllo, export, italiano/inglese.

**Deciso: PWA adesso, app nativa poi, con un solo codice.**
La PWA si sviluppa in fretta e si installa senza store. Ma non basterà: su iPhone
le notifiche programmate sono inaffidabili, il GPS a schermo spento non c'è, e
**il sistema può svuotare i dati di un sito rimasto inattivo** — inaccettabile per
un registro obbligatorio. Perciò il codice non chiama mai direttamente le API del
browser: posizione, microfono e archiviazione passano da `src/core`, dove
l'implementazione si sostituisce senza toccare le schermate.

**Deciso: il database locale è la fonte di verità.** In campo non c'è rete, e non
è un caso limite: è la condizione normale.

**Deciso: nucleo e pacchetti paese separati dal primo giorno.**
"Europea, non solo italiana" o si decide subito o non si decide più: le norme
nazionali si infilano dappertutto e poi non si tolgono.

**Deciso: nessun avviso impedisce di salvare.** Quando si registra, il fatto è già
successo. Un'app che rifiuta di registrare un trattamento irregolare non lo rende
regolare: lo rende invisibile.

**Deciso: il GPS suggerisce, l'uomo conferma.** Ragione pratica: il telefono resta
in cabina, il titolare registra il lavoro di un dipendente che era altrove.
Ragione legale: in Italia il controllo a distanza dei lavoratori è regolato
dall'art. 4 dello Statuto dei Lavoratori. Nessun tracciamento continuo, mai
attivo in automatico. **Da far verificare a un consulente del lavoro.**

**Deciso: l'audio della nota vocale si conserva sempre.** La trascrizione può
sbagliare un nome commerciale e rendere falso il registro; l'audio permette
sempre di rimediare.
*Nota tecnica:* il riconoscimento vocale del browser non è locale — Chrome manda
l'audio ai propri server e senza rete non funziona. Per la trascrizione davvero
offline servirà un modello incorporato. Finché non c'è, l'app lo dice invece di
fingere.
