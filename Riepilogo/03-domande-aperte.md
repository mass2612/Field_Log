# Domande aperte

Decisioni ancora da prendere e cose da verificare. Quando una si chiude, va
spostata nel `01-diario.md` con la data e il motivo.

---

## F1 — Fatturiere a voce: DDT, fattura XML, invio a fine mese (05/11/2026)

Deciso di farlo. Primo cliente reale: Moncucco S.S.A. (riso e capi macellati).
Gestionale attuale: **Zucchetti** (da tenere presente: da lì si riprendono
clienti e articoli, ed è il termine di paragone).

**Il flusso giusto (corretto da Max il 05/11):** si parte dall'**ordine**, non
dalla pesa.
1. Arriva l'ordine per telefono o WhatsApp. Patrizio apre l'app e lo detta
   (cliente, 15 polli, 18 piccioni, 3 faraone…). L'ordine resta in carico, con
   la sua data; si può stampare subito il biglietto e sapere cosa produrre
   (somma degli ordini del giorno).
2. Al momento della consegna si apre la bolla **dall'ordine**: le righe ci sono
   già, si compilano solo peso e lotto. Il riferimento all'ordine resta
   nell'app, non va stampato sul DDT.
3. Caso normale: DDT, e a fine mese fattura differita.
   Caso con fattura accompagnatoria: si fanno insieme DDT e fattura immediata.

(La prima ipotesi — DDT che nasce alla pesa — era sbagliata.)

Decisi da Max il 05/11:
- l'ordine è a pezzi, la bolla segue quello che è uscito davvero; se si consegna
  meno del richiesto **l'ordine si chiude lo stesso** (niente residui);
- **ordine da WhatsApp**: si inoltra il messaggio del cliente all'app (condividi
  → Lucky Farm) e diventa un ordine da controllare. Max: "mi interessa eccome";
- prezzi diversi per rivenditore e cliente finale — ma l'08/11 precisato:
  **ogni cliente ha i suoi articoli e i suoi prezzi** (vedi sotto).

Precisazioni dell'08/11:
- deve essere **comodo da PC oltre che da tablet/telefono** e facilmente
  personalizzabile (logo e altre caratteristiche dell'utente, poi);
- **niente listino da chiedere**: ogni cliente ha i suoi articoli e i suoi
  prezzi. L'app li impara dall'uso (l'ultimo prezzo fatto a quel cliente per
  quell'articolo) e, all'avvio, dalle fatture XML già emesse (scaricabili in
  blocco da *Fatture e Corrispettivi*): clienti, articoli e prezzi senza
  ricopiare nulla;
- formato nostro: chiaro e a norma, non la copia di un gestionale.

Esempi visti (in `Downloads` di Max, **non nel repo, che è pubblico**):
- *Moncucco → Cum Quibus, fatt. 159/2018*, curata da Max: la migliore. Righe
  raggruppate sotto "BOLLA – D.D.T. N. … del …", origine e lotto sotto ogni
  articolo, bollo CE del macello in testa (IT 0 1023 S CE), omaggi senza prezzo,
  spese di spedizione al 22%, riepilogo IVA per aliquota, scadenza calcolata.
- *Cerealfarine → Moncucco, fatt. 2275/2023*: impaginazione pulita (riquadro con
  codice cliente, P.IVA, data, tipo, numero; pagamento, banca, IBAN, scadenze),
  "Copia di cortesia, priva di valenza fiscale (art. 21 DPR 633/72)",
  dicitura art. 62 DL 1/2012.
- *Zucchetti oggi (DDT 1044 MOGO, fatt. 484 Lariohotels)*: righe spazzatura
  "0,00 0,00 0,00" sotto il rif. DDT e sotto il lotto; lotto ripetuto dentro la
  descrizione (L45/2) e sotto; manca il bollo CE; peso lordo/netto e vettore
  vuoti; "N. colli 1,00". Da non imitare.
- Dati Moncucco: P.IVA/CF 02481480024, codice SDI SUBM70N, aliquote 10% carne,
  22% spedizione, 4% cereali; lotti tipo "45/2" con scadenza; pagamento tipico
  Ri.Ba. 30 gg fine mese.

A fine mese: fattura differita per cliente
in XML FatturaPA, PDF, invio della copia al cliente per email/PEC (con suo
consenso); l'XML allo SdI prima caricato a mano su *Fatture e Corrispettivi*,
poi tramite intermediario.

Da sapere da Max:
- bilancia: marca, modello, se ha un'uscita (USB, seriale, Bluetooth, rete);
- stampante usata alla pesa e per i DDT;
- gestionale attuale (per riprendere clienti, articoli, listini) e un DDT e una
  fattura veri come modello;
- clienti: aziende, privati o entrambi.

Da chiedere al commercialista:
- regime IVA (speciale agricolo art. 34 o ordinario) e aliquote per carne e riso;
- numerazione di DDT e fatture, e se va tenuta con quella del gestionale attuale;
- vendite ai privati: servono corrispettivi/scontrino?
- obblighi in etichetta e sul DDT per la carne (origine, lotto, bollo del macello);
- conservazione a norma per 10 anni: chi la fa.

Note tecniche: la numerazione progressiva deve nascere sul server (più telefoni
insieme non devono dare due volte lo stesso numero). La PEC si manda con le
credenziali della casella dell'azienda, inserite dall'azienda stessa; per la
copia di cortesia basta anche l'email normale.

---

## In lavorazione adesso (27/09/2026)

C1 (schede non più correggibili dopo il salvataggio) e C2 (il tipo scelto nel
menù decideva il lettore) sono chiuse: vedi il diario del 27/09 pomeriggio.

### C3 — Precisione della lettura sulle fatture vere

*"Non l'azzecca moltissimo."* Da affrontare in quest'ordine:

1. **la foto** — inquadratura piena, dritta, luce buona: pesa più di qualunque
   ritocco al codice;
2. **preparare meglio l'immagine** — raddrizzare la prospettiva, tagliare il
   bordo, contrasto adattivo invece che fisso;
3. **il server**, se i primi due non bastano: e lì si fa un conto solo, quanto
   costa a foto contro quanto tempo fa risparmiare.

**17/10/2026: preso il punto 3** (vedi diario). Resta aperto il conto: quanto
costa davvero a foto, misurato sulle fatture vere dell'azienda col banco di
prova di from_pic_to_data, e chi lo paga nel prodotto venduto.

---

## Bloccanti

### B1 — Da dove prendiamo il registro dei prodotti fitosanitari

Senza questo dato l'app non può dire con certezza un tempo di carenza, un limite
di interventi, una revoca. Resta un blocco note vocale con le scadenze.

Da chiarire: **come si accede** alla Banca Dati Fitosanitari del Ministero della
Salute (Italia) e alla EU Pesticides Database (Europa); se esiste un
scaricamento massivo o solo una consultazione; **licenza d'uso**, formato,
frequenza di aggiornamento, costo.

Nel frattempo l'app funziona con prodotti inseriti a mano, marcati `fonte:
'manuale'` e segnalati come non verificati.

### B0 — Dal 1° gennaio 2027 il quaderno digitale è obbligatorio (SIAN)

> **Aggiornamento 25/10/2026, dopo l'incontro con Confagricoltura.** La strada
> cambia: Confagricoltura non usa i servizi AGEA, inserisce tutto su **QdC**
> (Image Line), e al SIAN ci pensa Image Line. Il nostro punto di consegna è
> **un file che QdC sappia importare**, mandato dall'agricoltore alla sua
> associazione. L'accordo con un CAA per i servizi AGEA non serve più per
> partire. Restano aperte tre cose: **il tracciato di import di QdC** (prova
> gratuita da fare, tecnico Image Line da sentire); **se un'app non certificata
> valga come fonte del registro** (domanda per il direttore); **come QdC
> identifica l'appezzamento** (catasto o domanda PAC: decide cosa chiedere
> nell'aggancio del campo). Il testo sotto resta valido come contesto.

Emerso il 04/10/2026. Il Reg. UE 2023/564 impone il registro dei trattamenti
in formato elettronico; l'Italia lo realizza col **Quaderno di Campagna
Digitale Aziendale (QDCA)** dentro il SIAN, legato al fascicolo aziendale, e
comprende trattamenti **e fertilizzazioni**. Rinviato due volte: volontario
fino al 31/12/2026, **obbligatorio dal 1/1/2027** (Reg. UE 2025/2203).
Restano: registrazione entro 30 giorni, conservazione di registro e documenti
d'acquisto per almeno 3 anni. *[da verificare sui testi ufficiali]*

**Perché è la domanda più importante che abbiamo:** se l'agricoltore deve
comunque ribattere tutto sul SIAN, la nostra app gli raddoppia il lavoro
invece di toglierglielo. Da chiarire subito: il SIAN accetta dati da software
di terzi (servizi, file in un formato stabilito)? Con quale accreditamento?
La risposta decide se l'app è "il quaderno" o "il blocco note prima del
quaderno".

**Cosa dice il documento ufficiale** (AGEA, Istruzioni operative n. 58 del
21/05/2024, letto per intero il 04/10/2026):

- Due strade per alimentare il QDCA: la **maschera del portale SIAN**, oppure i
  **servizi di interoperabilità**. Il documento li descrive **per i CAA** (e
  per i sistemi regionali già esistenti, es. ARTEA in Toscana). Di un accesso
  diretto per un'azienda di software **non parla**.
- I servizi sono tre: *Ottieni Piano Colturale Grafico*, *Invio Massivo
  Registro dei Trattamenti*, *Ottieni Stato di Caricamento*. Le specifiche
  tecniche non sono pubbliche.
- **Ogni trattamento va riferito a un appezzamento del Piano Colturale
  Grafico** del fascicolo. I nostri "campi che nascono dalle note" dovranno
  potersi agganciare a quelle particelle.
- Per i trattamenti su colture chiede **data e ora di inizio**, quantità per
  ettaro, avversità. Per i macchinari la data del controllo funzionale; per gli
  operatori il numero del patentino. Poi concimazioni, irrigazioni, magazzino.
- Fatture d'acquisto dei fitosanitari (e moduli d'acquisto dei prodotti
  tossici e nocivi): da conservare **3 anni**.

**Strada più probabile:** un accordo con un CAA (Coldiretti, Confagricoltura,
CIA…): noi raccogliamo i dati senza fatica, il CAA li trasmette coi servizi a
cui è abilitato. In alternativa chiedere ad AGEA se e come un'azienda di
software può essere abilitata. **Da fare: contattare un CAA.**

**Il rovescio buono:** il servizio *Ottieni Piano Colturale Grafico* darebbe
all'app tutti i campi dell'azienda già pronti, senza scriverli a mano.

### B3 — Il meteo è gratis solo per uso non commerciale

La previsione in home viene da Open-Meteo: niente chiavi, niente
registrazione, ma **gratis solo per uso non commerciale**. Il giorno che l'app
si vende serve il loro abbonamento oppure un'altra fonte. Da decidere prima del
lancio, insieme a cosa del meteo va nella versione a pagamento.

### B2 — Uso personale o prodotto da vendere

Già risposto: **prodotto da vendere**. Ne discendono però decisioni non ancora
prese: account e autenticazione, dove stanno i dati, assistenza, prezzo,
responsabilità di fronte a un dato normativo sbagliato.

Quest'ultimo punto va affrontato presto e con un legale: se l'app sbaglia un tempo
di carenza e l'agricoltore ci perde il raccolto, **di chi è la responsabilità**?
Incide su cosa l'app può affermare e con che tono.

---

## Nuove aree da coprire (decise il 13/09/2026)

### A1 — Gasolio agricolo (UMA)

Il carburante ad accisa ridotta. L'azienda riceve un'assegnazione annuale
calcolata su colture, superfici e lavorazioni, e deve tenere traccia di
rifornimenti e impieghi. **[tutto da verificare: è materia regionale]**

**Perché ci interessa:** l'app conosce già superfici, colture e lavorazioni fatte
— cioè esattamente i numeri con cui si giustifica l'assegnazione. Il registro dei
rifornimenti diventa quasi un sottoprodotto di quello che già registriamo.

Da verificare: chi gestisce (regione? provincia?), quali registri sono obbligatori
e in che forma, le scadenze delle domande, se esiste un formato elettronico
accettato.

### A2 — Documentazione PAC

Fascicolo aziendale, domanda unica, condizionalità, eco-schemi.

**Perché ci interessa:** chi chiede i contributi deve dimostrare di aver
rispettato le regole di condizionalità. Il quaderno di campagna è la prova
naturale. Qui l'app smette di essere un adempimento e diventa quello che salva
il contributo.

Da verificare: cosa esattamente va dimostrato, se e come si può esportare verso
SIAN/AGEA o verso i CAA, scadenze annuali.

Prudenza: **non trasformiamo l'app in un software da CAA.** Il confine
ragionevole è *produrre le prove e i riepiloghi*, non compilare le domande.

### A3 — Agrivoltaico

Impianti fotovoltaici su terreno che deve restare coltivato. Gli incentivi
richiedono di dimostrare la continuità dell'attività agricola e la produzione
ottenuta sotto i pannelli. **[da verificare: requisiti e sistemi di monitoraggio]**

**Perché ci interessa, e parecchio:** chi ha un impianto agrivoltaico ha un
obbligo di dimostrazione continuo e costoso, e il quaderno di campagna è
esattamente la prova che serve — con in più il confronto di resa fra la parte
sotto i pannelli e quella libera, che il nostro modello dati sa già fare se il
campo è diviso correttamente.

Da verificare: se esiste un formato o un ente destinatario, se la resa va misurata
in un modo prescritto, chi sono oggi gli operatori del settore.

---

## Tecniche

### T1 — Sincronizzazione e conflitti

Quando arriverà il server: due dispositivi offline che modificano lo stesso
intervento devono produrre una rettifica visibile, non una sovrascrittura
silenziosa. Strategia da definire.

### T2 — Allegati

Audio e foto crescono in fretta. Serve una politica di conservazione, di
caricamento e di pulizia. Oggi restano tutti sul dispositivo.

### T3 — Trascrizione vocale davvero offline

Decisa la strada doppia (subito sul telefono, poi raffinata dal server), ma il
riconoscimento del browser **non è locale**: senza rete non funziona. Serve un
modello incorporato nell'app. Da valutare quando e quanto pesa.

### T4 — Limiti sulla sostanza attiva, non sul nome commerciale

I limiti di impiego per stagione si contano probabilmente sulla **sostanza
attiva**: due prodotti commerciali diversi con la stessa sostanza andrebbero
sommati. Oggi l'app conta per prodotto. **[da verificare]** — se è così, va
cambiato il conteggio dei controlli.

### T6 — Notifiche ad app chiusa (02/11/2026) — DECISO

Richieste da Max: la raccomandazione "a febbraio" deve arrivare come notifica
a febbraio; lo stesso per le scadenze. Un'app web non sa programmarsi una
notifica da sola. **Deciso (02/11 sera):** l'app va sugli store, quindi le
notifiche programmate le fa l'app nativa (involucro Capacitor sullo stesso
codice, notifiche locali), senza server. Il dato `ricordaDal` è già nelle note.

### B4 — Account, copia dei dati e pubblicità (02/11/2026)

Deciso da Max: account con accesso anche via Google; freemium con pubblicità
mirata nella versione gratuita. Da sciogliere:
- **dove stanno i dati**: oggi solo sul telefono. Con l'account serve un
  server che ne tenga una copia (proposta: Supabase o Firebase, accesso Google
  già pronto, server in UE);
- **pubblicità mirata e GDPR**: mirare la pubblicità sui dati del quaderno
  (colture, prodotti usati) è profilazione: serve consenso esplicito e
  separato, revocabile. E con Confagricoltura che distribuisce l'app ai suoi
  soci, "i tuoi trattamenti usati per venderti pubblicità" è il rischio di
  fiducia più grosso. Proposta: pubblicità per zona e coltura dichiarata,
  mai dai contenuti delle note senza consenso; niente pubblicità a chi arriva
  tramite associazione.

### T5 — Annata agraria configurabile

Oggi l'annata è l'anno solare. Per molte colture non è vero.

---

## Legali

### L1 — Geolocalizzazione dei dipendenti

Art. 4 dello Statuto dei Lavoratori: il controllo a distanza richiede accordo
sindacale o autorizzazione dell'Ispettorato. Oggi l'app usa il GPS solo come
suggerimento, senza tracciamento continuo. **Da far confermare a un consulente del
lavoro prima di vendere.**

### L2 — GDPR

Dati dei dipendenti più posizione uguale dati personali. Informativa,
minimizzazione, cancellazione, esportabilità. Necessario per vendere in UE.

### L3 — Responsabilità sul dato normativo

Vedi B2. Da affrontare con un legale.
