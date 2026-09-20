# Domande aperte

Decisioni ancora da prendere e cose da verificare. Quando una si chiude, va
spostata nel `01-diario.md` con la data e il motivo.

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
