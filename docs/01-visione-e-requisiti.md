# Quaderno di Campagna — Visione e Requisiti

> Principio guida: **serve prima all'agricoltore, poi all'ispettore.**
> La conformità è un sottoprodotto di dati registrati bene, non il fine.
> Se l'app fa perdere tempo in campo, ha già fallito.

---

## 1. Il test di realtà

Ogni funzione deve superare questo: *un uomo con i guanti sporchi, sul trattore,
sotto il sole, senza campo, con una mano sola, in 20 secondi.*

Conseguenze non negoziabili:

- **Offline-first assoluto.** In campo non c'è rete. Il dato si scrive in locale
  e si sincronizza quando può. Mai una schermata di caricamento che blocca.
- **Bottoni grandi, contrasto alto**, leggibile in pieno sole.
- **Voce come input primario**, non come accessorio.
- **Zero campi obbligatori al momento dell'inserimento.** Si registra "sporco" in
  campo, si completa la sera. L'app segnala cosa manca, non blocca.

---

## 2. Requisiti espressi dal committente

| # | Richiesta | Note di progetto |
|---|---|---|
| R1 | Note vocali salvate come testo | Audio **conservato sempre** + trascrizione. La trascrizione può sbagliare, l'audio no. |
| R2 | GPS | Rileva il campo per intersezione con le particelle. **Sempre sovrascrivibile a mano** (dipendenti, conto terzi, telefono rimasto in cabina). |
| R3 | Nome ai campi | Nome dato dall'agricoltore ("Vigna sotto casa"), non il codice catastale. Il catastale è un attributo, non l'identità. |
| R4 | Confronto annata su annata | Storico per campo/coltura: dosi, costi, rese. È il motivo per cui l'agricoltore userà l'app. |
| R5 | Attrezzo | **Entità propria, non una nota.** Serve per taratura, litri/ha reali, scadenza controllo funzionale, manutenzioni. |
| R6 | Foto fattura → dati + magazzino | OCR → carico magazzino con lotto e prezzo. Il prezzo alimenta i costi/ha. |
| R7 | Magazzino | Carico da fattura, scarico automatico dal trattamento. Giacenza sempre viva. |
| R8 | Pronto per il controllo | Modalità dedicata: ultimi 3 anni, PDF, **funzionante offline**. |
| R9 | Scadenza patentini con avviso | Avviso a -30 gg, poi ripetuto. Badge persistente sull'icona. |
| R10 | Compatibile SIAN/AGEA e UE | Nucleo dati unico + "pacchetti normativi" per paese. |
| R11 | Esportabile per analisi da ufficio | CSV/XLSX + PDF + export integrale dei dati grezzi. |

---

## 3. Quello che manca — e che vale più di tutto il resto

### 3.1 Tempo di carenza (la funzione decisiva)

Alla registrazione del trattamento l'app conosce il prodotto → conosce il tempo di
carenza → **calcola la data prima della quale non si può raccogliere** e la mostra
in cima alla scheda del campo: *"Raccolta consentita dal 14/08"*.
Idem il **tempo di rientro**: quando si può rientrare in campo senza DPI.

Non è burocrazia: è il dato che, se sbagliato, fa buttare il raccolto.

### 3.2 Vincoli del prodotto, verificati mentre si digita

Dal registro prodotti si ricavano dose massima, **numero massimo di interventi per
stagione**, colture e avversità autorizzate, fasce di rispetto dai corpi idrici.
L'app avvisa *prima*:

> "Terzo intervento con questo prodotto. Il massimo autorizzato su vite è 2/anno."

### 3.3 Calcolatore della miscela

Campo 2,3 ha · dose 150 ml/hl · botte da 1000 l → **quanti ml versare**, quante
botti servono, quanto avanza. E il contrario: "ho usato mezza botte" → litri reali
distribuiti. Riduce gli errori di dosaggio, che è esattamente il problema di R4.

### 3.4 Chiusura del ciclo: la resa

Senza registrare la **raccolta** (quintali, grado, qualità, prezzo di vendita) il
confronto annuale di R4 non esiste. Servono resa/ha, costo trattamenti/ha, margine
per campo. È la differenza tra un registro e uno strumento di lavoro.

### 3.5 Meteo agganciato al trattamento

Vento, temperatura, umidità e pioggia nelle ore successive, registrati in automatico.
Servono a giustificare un ritrattamento per dilavamento, a documentare le condizioni
di deriva, e a capire perché un trattamento non ha reso.

### 3.6 Scadenze — ben oltre i patentini

Un unico motore di scadenze, alimentabile dalla foto del documento:

- Patentino fitosanitari (abilitazione all'acquisto e all'utilizzo)
- Controllo funzionale dell'irroratrice *(intervallo da verificare per paese/regione)*
- Revisione macchine, assicurazioni
- Formazione dipendenti, visite mediche
- **Scadenza dei prodotti a magazzino** e dei singoli lotti
- **Revoche e ritiri di prodotti**: un fitofarmaco revocato che hai in magazzino ha
  una data oltre la quale non si può più usare. Avviso automatico.

### 3.7 Fertilizzanti, irrigazione, semine

Il quaderno non è solo fitofarmaci. Servono almeno:

- **Fertilizzazioni** (Dir. Nitrati 91/676/CEE: bilancio dell'azoto, PUA in zone
  vulnerabili, spandimento effluenti con data, dose e appezzamento)
- **Irrigazione**: volumi, sempre più richiesti per concessioni e sostenibilità
- **Semine e trapianti**: varietà, lotto sementi, densità → tracciabilità a monte

### 3.8 Dipendenti e operatori

Chi ha eseguito il trattamento è un dato obbligatorio. Quindi anagrafica operatori,
patentino di ciascuno, e **avviso se l'operatore registrato non ha patentino valido
alla data del trattamento**. Il GPS del titolare non dice dove ha lavorato il dipendente.

### 3.9 Conto terzi

Se lavori per altri (o ti fai lavorare da un contoterzista), il trattamento va nel
quaderno **dell'azienda proprietaria del campo**, eseguito da un soggetto esterno.
Da modellare dal primo giorno, non dopo.

### 3.10 Modalità Ispezione

Una schermata sola, a due tocchi, **funzionante senza rete**: registro degli ultimi
tre anni, patentini, taratura attrezzi, fatture di acquisto, giacenze. Con
"Genera PDF" e "Invia via mail".

### 3.11 Registro immutabile

Log append-only: ogni riga registra *quando è stata scritta*, oltre a *quando è
avvenuto il fatto*. Le correzioni sono rettifiche visibili, non sovrascritture.
Serve a te: in un contenzioso, un registro che si può riscrivere a posteriori non
vale nulla.

### 3.12 Uscita dai dati

Export integrale e leggibile, non un dump proprietario. I dati sono dell'agricoltore.
È anche l'argomento di vendita più forte contro i gestionali che tengono in ostaggio
i clienti.

---

## 4. Trappole da non sottovalutare

1. **Geolocalizzazione dei dipendenti.** In Italia il controllo a distanza dei
   lavoratori è regolato dall'art. 4 dello Statuto dei Lavoratori: serve accordo
   sindacale o autorizzazione dell'Ispettorato. Per i dipendenti il GPS va trattato
   come *suggerimento del campo*, con tracciamento continuo **disattivato di default**.
   Da verificare con un consulente del lavoro prima del rilascio.
2. **GDPR**: dati dei dipendenti + posizione = dati personali. Informativa,
   minimizzazione, cancellazione. Rilevante ancor di più per vendere in UE.
3. **Il registro prodotti è il cuore e il costo ricorrente.** In Italia la Banca
   Dati Fitosanitari del Ministero della Salute; a livello UE la EU Pesticides
   Database. Vanno aggiornati in continuo (revoche, nuove etichette). **Va deciso
   presto come ci si procura e si aggiorna questo dato**: senza, niente tempi di
   carenza né vincoli, e l'app resta un blocco note.
4. **SIAN/AGEA**: l'integrazione richiede credenziali, deleghe e specifiche non
   interamente pubbliche. Da progettare come *esportatore a innesto*, non come
   dipendenza. L'app deve funzionare al 100% anche senza.
5. **Trascrizione vocale**: online è più precisa, ma in campo non c'è rete. Serve
   trascrizione **differita**: registro ora, trascrivo quando torna la linea. Il
   gergo agricolo e i nomi commerciali vanno aiutati con un dizionario personalizzato.

---

## 5. Basi normative di riferimento

| Ambito | Riferimento |
|---|---|
| UE — registrazione obbligatoria dei trattamenti, min. 3 anni | Reg. (CE) 1107/2009, art. 67 |
| UE — uso sostenibile, difesa integrata | Dir. 2009/128/CE |
| UE — nitrati e fertilizzazione | Dir. 91/676/CEE |
| IT — recepimento uso sostenibile | D.Lgs. 150/2012 + PAN |
| IT — registro dei trattamenti | DPR 55/2012 |
| IT — sistema informativo | SIAN / AGEA e sistemi regionali (es. ARTEA) |

*Tutti i riferimenti vanno verificati e aggiornati prima del rilascio: la materia
cambia spesso e varia da regione a regione.*

---

## 6. Modello dati (nucleo)

```
Azienda ──< Campo ──< Coltura(anno) ──< Intervento ──< RigaProdotto
   │           │                            │
   │           ├─ geometria (poligono)      ├─ Operatore
   │           ├─ particelle catastali      ├─ Attrezzo
   │           └─ superficie ha             ├─ posizione GPS + meteo
   │                                        └─ note (testo | vocale + audio)
   │
   ├──< Operatore ──< Documento (patentino, scadenza)
   ├──< Attrezzo  ──< Documento (taratura, revisione)
   ├──< Magazzino ──< Lotto ──< MovimentoCarico  (da Fattura + foto)
   │                        └──< MovimentoScarico (da RigaProdotto)
   └──< Raccolta (resa, qualità, prezzo) ──> chiude il ciclo su Coltura(anno)

Prodotto (da registro esterno): sostanze attive, dose max, n. max interventi,
   colture/avversità ammesse, tempo di carenza, tempo di rientro, revoche
```

`Intervento` è volutamente generico: **trattamento, fertilizzazione, irrigazione,
semina, lavorazione, raccolta** sono tipi dello stesso oggetto. Un solo flusso di
inserimento, un solo storico, un solo export.

---

## 7. Architettura proposta

```
┌─────────────────────────────────────────────┐
│  App mobile (offline-first)                 │
│  DB locale = fonte di verità in campo       │
└──────────────┬──────────────────────────────┘
               │ sincronizzazione a strappi
┌──────────────┴──────────────────────────────┐
│  NUCLEO (identico in tutta la UE)           │
│  campi, interventi, magazzino, scadenze     │
├─────────────────────────────────────────────┤
│  PACCHETTI PAESE (innestabili)              │
│  IT: registro DPR 55/2012, export SIAN      │
│  FR: registre phytosanitaire                │
│  ES: cuaderno de explotación                │
│  ogni pacchetto = regole + stampe + export  │
├─────────────────────────────────────────────┤
│  REGISTRI PRODOTTI per paese                │
└─────────────────────────────────────────────┘
```

La separazione **nucleo / pacchetto paese** è la decisione architetturale che rende
l'app europea, invece che italiana con le traduzioni. Va presa ora: dopo costa dieci
volte tanto.

---

## 8. Ordine di costruzione

**Fase 1 — l'app è già utile da sola**
Campi con nome e superficie · interventi con voce e GPS · attrezzi e operatori ·
magazzino base · export PDF/CSV · scadenze documenti da foto.

**Fase 2 — l'app diventa intelligente**
Registro prodotti · tempi di carenza e rientro · vincoli e avvisi · calcolatore
miscela · OCR fatture · meteo.

**Fase 3 — l'app diventa un investimento**
Rese e costi per campo · confronto pluriennale · cruscotto da ufficio · multi-azienda
e conto terzi.

**Fase 4 — l'app diventa vendibile in UE**
Export SIAN · secondo paese · multilingua completo · sincronizzazione cloud.

---

## 9. Domande ancora aperte

- Da dove si prende il registro prodotti (Italia e UE)? Costo, licenza, aggiornamento.
- Uso personale o prodotto da vendere? Cambia autenticazione, cloud, supporto, costi.
- Piattaforma e stack.
- Trascrizione vocale: sul telefono o su server?
