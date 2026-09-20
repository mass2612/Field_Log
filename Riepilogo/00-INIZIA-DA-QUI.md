# INIZIA DA QUI

**Se hai perso il filo — o la memoria — leggi questo file per primo.**
Dovrebbe bastare da solo a farti ripartire senza fare domande a nessuno.

Ultimo aggiornamento: **20 settembre 2026**

---

## 1. Cosa stiamo costruendo

Un **quaderno di campagna** per aziende agricole: un'app che sta nel telefono
dell'agricoltore, in mezzo al campo, senza rete.

Nasce in Italia ma è pensata **europea**: il nucleo è uguale ovunque, le norme
nazionali stanno in pacchetti separati e innestabili.

Cartella del progetto: `C:\Users\massi\Desktop\GREPPI\Field_Log`

---

## 1-bis. Il gesto — se ricordi una cosa sola, ricorda questa

> **Tu butti dentro roba come ti viene. La macchina la struttura. Tu correggi se
> ha capito male.**

Vale per tutta l'app, senza eccezioni: la nota vocale che diventa testo, la foto
della fattura che diventa scheda, la frase scritta da cui escono data, campo,
argomenti e prodotti. **Un solo concetto da spiegare**, invece di dieci moduli.

Da qui discende il resto:

- **Il primitivo è la nota.** Non il campo, non l'intervento: la nota. Il quaderno
  è un elenco di note in ordine di tempo, raggruppabili per argomento.
- **Niente anagrafiche da compilare prima.** I campi nascono dalle note: scrivi
  "vigna sotto casa" e da quel momento quel campo esiste.
- **Il registro dei trattamenti non si compila: si forma dalle note.** È un
  raggruppamento come gli altri nel Quaderno; solo lì dentro compaiono
  l'esportazione e l'avviso su cosa manca.

## 2. La filosofia — leggila prima del codice

Questa è la parte che non si deduce guardando i file. Se la perdi, il progetto
diventa un altro progetto.

### Due quaderni in uno

**Il quaderno che ti impongono.** Registro dei trattamenti, patentini, scadenze,
PAC, gasolio agricolo. Adempimenti calati dall'alto, spesso irragionevoli — il
patentino per il trattore, il patentino per il diserbo. All'agricoltore costano
tempo e non gli restituiscono niente.

> **Il nostro compito qui è farli costare il meno possibile. Non renderli più
> efficienti: farli sparire dalla giornata di chi lavora.**
> Non stiamo costruendo uno strumento che rende l'agricoltore un servo migliore
> della burocrazia. Stiamo togliendogli un peso dalla schiena.

**Il quaderno che ti serve.** Questo è il motivo per cui l'app si apre.
È il quaderno com'era in origine, prima che diventasse un modulo:

> Ci segnavamo quanto seme scendeva dalla seminatrice — con i settaggi fatti lì,
> in campo — e quale varietà. Oppure il trattamento: quali prodotti, quali
> regolazioni della macchina. Si stimava quanto andava giù per ettaro e lo si
> confrontava con quello che usciva al raccolto.
>
> *Queste cose sono oro per un agricoltore.*

**Il valore vero dell'app sta qui**, non nella conformità. La conformità è il
biglietto d'ingresso; il confronto fra quello che hai messo e quello che hai
raccolto è il prodotto.

### Dove entra l'intelligenza artificiale

Molti agricoltori oggi sono laureati in agronomia. Non serve spiegargli il
mestiere. Serve incrociare **i loro dati** con la ricerca — università, prove di
campo, letteratura agronomica — e dirgli cosa conviene cambiare.

Il vincolo è uno solo, ed è tutto di oggi:
**se i dati che registriamo adesso non contengono le variabili giuste, nessuna IA
potrà dire niente di utile fra tre anni.** Per questo il modello dati deve
prevedere fin d'ora precessione colturale, densità di semina reale, settaggi
macchina, analisi del terreno, date, meteo e resa. Anche se l'analisi arriverà
molto dopo.

### Le tre regole che ne discendono

1. **Mai far perdere tempo in campo.** Se registrare costa più di venti secondi,
   non viene registrato, e non abbiamo né conformità né dati.
2. **Mai bloccare l'inserimento.** Il fatto è già avvenuto. Si salva anche
   incompleto.
3. **Tutto è correggibile, sempre.** Vedi il punto 4 qui sotto.

---

## 3. Per chi è, davvero

L'app deve essere usabile **da un uomo di settant'anni, con le mani sporche, in
pieno sole, con una mano sola**, e nello stesso tempo gestire una quantità di
roba notevole.

Le due cose non sono in contraddizione, ma lo diventano se si progetta male.
La regola: **una schermata, un lavoro.** La complessità si nasconde in
profondità, non si spalma sulla superficie.

Vedi `Riepilogo/04-interfaccia.md` per i principi in dettaglio.

---

## 4. Le correzioni sono normali, non sono una colpa

Punto deciso il 13/09/2026, e importante.

Un dato inserito male si corregge. Non è un'ammissione, non è manipolazione: è
come funziona qualunque registro tenuto da esseri umani. Si sbaglia a digitare,
si confonde un prodotto, si ricorda male una quantità la sera.

**Quello che è vero resta vero:** la foto della fattura è la fattura, la data è
la data, l'audio della nota vocale è quello che hai detto.
**Quello che è stimato è stimato** — quanti litri sono andati giù davvero non lo
sa nessuno con precisione, e l'app non deve fingere il contrario.

Conseguenze di progetto:

- Ogni intervento si può **modificare in qualsiasi momento**, senza attriti e
  senza avvisi moralisti.
- L'app tiene lo storico delle modifiche **per l'agricoltore**, non contro di lui:
  serve a ricostruire cosa è successo, non a incastrarlo.
- Lo storico delle modifiche **non finisce nella stampa del registro** se non lo
  chiede l'utente. Il registro da consegnare riporta i fatti come sono, non i
  ripensamenti di chi lo compila.
- Dove il dato è una stima, l'app lo dice: *stimato*, non *misurato*.

---

## 5. Dove sono le cose

| Cosa | Dove |
|---|---|
| **Questa cartella** — contesto, diario, glossario | `Riepilogo/` |
| Specifica funzionale e requisiti | `docs/01-visione-e-requisiti.md` |
| Decisioni tecniche, con motivi e costi | `docs/02-decisioni-tecniche.md` |
| Istruzioni per avviare e struttura | `README.md` |
| Modello dati (il cuore) | `src/core/domain/types.ts` |
| Regole agronomiche e normative | `src/core/rules/` |
| Pacchetto Italia (tutto ciò che è italiano) | `src/packs/it/` |
| Schermate | `src/features/` |

**Regola architetturale da non violare:** in `src/core` non entra niente di
nazionale. Aggiungere la Francia deve voler dire scrivere `src/packs/fr` e basta.

---

## 6. A che punto siamo

**Funziona e si può provare** (`npm install && npm run dev`, poi
*Impostazioni → Carica dati dimostrativi*):

**Impianto a note (13/09 sera)** — quattro piastrelle in home che si colorano da
sole quando c'è un problema · quaderno cronologico con ricerca e raggruppamenti ·
scrittura con campo piccolo facoltativo, testo grande e microfono · lettura
automatica della nota (data dalla frase, campo, argomenti, prodotti e quantità) ·
i campi che nascono dalle note · documenti con scheda correggibile · meteo di
oggi nella barra.

**Motore già costruito prima** — tempo di carenza che blocca la raccolta ·
controlli di dose e limiti · magazzino con giacenze dedotte dai movimenti ·
scadenze con avvisi · settaggi macchina e confronto fra annate · modalità
controllo · export CSV/JSON · italiano e inglese.

**Costruito il 13/09/2026 — il quaderno agronomico:**

- **Settaggi macchina** con schema per famiglia di attrezzo (seminatrice,
  irroratrice, spandiconcime, lavorazione, mietitrebbia) e "come l'altra volta"
- **Confronto fra annate**: semina impostata contro semina reale, azoto, costi,
  resa, proteine, e la variazione rispetto all'annata precedente
- **Scarto macchina**: *"ha messo il +8,3% rispetto a quanto avevi impostato"*
- **Raccolta strutturata**: resa, umidità, proteine, peso specifico, grado
  zuccherino, prezzo
- **Precessione colturale** sul campo
- **Correzione degli interventi**, con storico interno e segno "è una stima"
- Le colonne interne (*registrato il*, *campo attribuito da*) **tolte dalla
  stampa del registro**, salvo richiesta esplicita

**Deciso ma non ancora costruito** (in ordine di importanza):

1. **Prova di taratura** — il modello dati c'è (`Taratura`), manca la schermata.
2. **Analisi del terreno** — idem (`AnalisiSuolo`).
3. Gasolio agricolo, PAC, agrivoltaico (vedi `03-domande-aperte.md`).
4. La scelta iniziale di *cosa fa l'azienda*, per spegnere il superfluo.
5. OCR delle fatture, meteo, registro prodotti ufficiale, sincronizzazione.

**Il blocco principale:** da dove prendiamo il registro ufficiale dei prodotti
fitosanitari. Senza, niente tempi di carenza certi né vincoli, e metà
dell'intelligenza dell'app resta spenta.

---

## 7. Se riprendi in mano il progetto

1. Leggi questo file.
2. Leggi `01-diario.md` per capire cosa è successo e perché.
3. Guarda `03-domande-aperte.md`: lì stanno le decisioni ancora da prendere.
4. Poi vai al codice.
