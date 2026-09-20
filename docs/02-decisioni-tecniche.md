# Decisioni tecniche

Ogni voce dice **cosa** si è deciso, **perché**, e **cosa costa** cambiarlo.

---

## D1 — PWA adesso, app nativa quando serve, un solo codice

**Decisione.** L'applicazione è scritta come app web (React + TypeScript) e
distribuita **oggi come PWA**. Quando servirà lo store, lo stesso identico codice
viene impacchettato in un guscio nativo (Capacitor) senza riscrivere le schermate.

**Perché.** La domanda era: PWA perché più semplice, o app nativa? Sono la stessa
scelta rimandata, se il codice è scritto bene. La PWA si sviluppa e si prova in
fretta, si installa dal browser senza passare da nessuno store, e si aggiorna
senza chiedere il permesso ad Apple. Basta per cominciare.

**Ma la PWA da sola non basterà**, e va saputo prima:

| Cosa serve | PWA | Guscio nativo |
|---|---|---|
| Promemoria di scadenza programmati | inaffidabili su iPhone | affidabili |
| Dati che non si cancellano da soli | **iOS può svuotare i dati di un sito inattivo** | garantiti |
| GPS con schermo spento | no | sì |
| Presenza sugli store | no | sì |

La seconda riga è quella decisiva: un registro obbligatorio per legge non può
stare in un posto che il sistema operativo si sente libero di svuotare. Per l'uso
vero, quindi, l'app nativa non è un vezzo.

**Costo del cambiamento.** Basso, se si rispetta una regola: nessuna schermata
chiama direttamente le API del browser. Posizione, microfono, notifiche e
archiviazione passano da `src/core`, e lì si sostituisce l'implementazione.

---

## D2 — IndexedDB (Dexie) come fonte di verità

**Decisione.** I dati vivono nel database locale del dispositivo. Non esiste
nessuna chiamata di rete necessaria a far funzionare l'app.

**Perché.** In campo non c'è rete, e non è un caso limite: è la condizione normale.
Un'app che ha bisogno del server per registrare un trattamento non viene usata.

**Costo del cambiamento.** Nel guscio nativo si può passare a SQLite per dataset
grandi e query più complesse. Le interfacce di `src/core/db` restano; cambia
l'implementazione sotto.

---

## D3 — Nucleo e pacchetti paese separati fin dall'inizio

**Decisione.** `src/core` non contiene nulla di nazionale. Tutto ciò che è
italiano sta in `src/packs/it`: nome del registro, colonne obbligatorie, anni di
conservazione, riferimenti normativi, export.

**Perché.** "Europea, non solo italiana" o si decide adesso o non si decide più.
Le norme nazionali entrano ovunque — quali campi sono obbligatori, come si stampa
il registro, quanti anni si conserva — e una volta sparse nel codice non si
tolgono più.

**Costo del cambiamento.** Se si violasse, altissimo: significherebbe riscrivere.
Per questo è una regola, non una preferenza.

---

## D4 — Le regole sono funzioni pure

**Decisione.** Carenza, scadenze, controlli e miscela sono funzioni senza stato in
`src/core/rules`, che non toccano né database né interfaccia.

**Perché.** Sono la parte che, se sbaglia, fa buttare un raccolto o fa prendere
una sanzione. Devono poter essere verificate una per una, e riusate identiche sul
server e in un futuro gestionale da ufficio.

---

## D5 — Il registro non si riscrive

**Decisione.** Niente cancellazioni: annullamento motivato (`annullatoIl`) e
registro append-only delle rettifiche. Ogni record distingue *quando è avvenuto il
fatto* da *quando è stato scritto*.

**Perché.** Un quaderno modificabile a posteriori non ha valore probatorio. La
colonna "registrato il" nell'export non è un vezzo tecnico: è ciò che distingue un
registro tenuto da uno compilato la sera prima del controllo.

---

## D6 — Audio sempre, trascrizione se possibile

**Decisione.** La nota vocale salva **sempre** l'audio. La trascrizione è un
comodo di lettura, in tre livelli: immediata sul dispositivo, differita sul
server, correzione a mano che vince su entrambe.

**Perché.** Se la trascrizione storpia il nome di un prodotto, il registro diventa
falso. Con l'audio si rimedia sempre.

**Da sapere.** Il riconoscimento vocale del browser (Web Speech API) **non è
locale**: Chrome manda l'audio ai propri server e senza rete non funziona. Per una
trascrizione davvero offline servirà un modello incorporato nell'app. Finché non
c'è, senza rete si registra l'audio e la trascrizione resta in coda — ed è
esattamente quello che l'app dice all'utente, invece di fingere.

---

## D7 — Il GPS suggerisce, l'uomo conferma

**Decisione.** La posizione propone il campo con una percentuale di confidenza;
l'attribuzione definitiva è sempre confermata, e l'intervento registra *come* è
stato attribuito (`origineCampo`: gps / manuale / ripetuto).

**Perché.** Due ragioni, una pratica e una legale.
Pratica: il telefono resta in cabina, il titolare registra il lavoro di un
dipendente che era dall'altra parte dell'azienda, il GPS sbaglia di cento metri.
Legale: in Italia il controllo a distanza dei lavoratori è regolato dall'art. 4
dello Statuto dei Lavoratori — serve accordo sindacale o autorizzazione
dell'Ispettorato. **Nessun tracciamento continuo, mai attivo in automatico.**
Da far verificare a un consulente del lavoro prima di vendere il prodotto.

---

## D8 — Nessun rilievo impedisce di salvare

**Decisione.** I controlli producono segnalazioni di tre livelli (blocco, avviso,
nota). Nemmeno il "blocco" impedisce il salvataggio.

**Perché.** Quando si registra, il fatto è già avvenuto. Un'app che rifiuta di
registrare un trattamento irregolare non lo rende regolare: lo rende invisibile,
e produce un quaderno falso. "Blocco" significa *questo ti mette nei guai*, non
*non puoi scrivere*.

---

## Questioni ancora aperte

1. **Registro prodotti** — da dove si prende, quanto costa, come si aggiorna
   (Banca Dati Fitosanitari in Italia, EU Pesticides Database a livello europeo).
   È la dipendenza che decide quanto vale l'app: senza, niente tempi di carenza
   né vincoli.
2. **SIAN/AGEA** — credenziali, deleghe e specifiche. Da trattare come un
   esportatore innestabile, mai come una dipendenza.
3. **Sincronizzazione** — quando arriverà il server, serve una strategia di
   riconciliazione: due dispositivi offline che modificano lo stesso intervento
   devono produrre una rettifica visibile, non una sovrascrittura silenziosa.
4. **Allegati** — audio e foto crescono in fretta. Serve una politica di
   conservazione e di caricamento, e vanno esclusi dall'export JSON (già fatto).
