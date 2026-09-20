# Il quaderno agronomico — il valore vero

> Ci segnavamo quanto seme scendeva dalla seminatrice — con i settaggi fatti lì,
> in campo — e quale varietà. Oppure il trattamento: quali prodotti, quali
> regolazioni della macchina. Si stimava quanto andava giù per ettaro e lo si
> confrontava con quello che usciva al raccolto.
>
> *Queste cose sono oro per un agricoltore.*

Questo documento descrive come quel quaderno diventa software senza perdersi per
strada. È la parte che distingue il prodotto da un modulo da compilare.

---

## 1. L'anello che si chiude

Tutto il valore sta in un ciclo di un anno:

```
   IMPOSTO             VERIFICO            OTTENGO            CORREGGO
   in campo            sul posto           al raccolto        l'anno dopo

   tacca 14        →   prova di semina  →  resa 62 q/ha   →   "l'anno scorso
   180 kg/ha           195 kg/ha reali     proteine 13,1      a 195 reali ho
   varietà Bologna     (+8%)                                  fatto meglio che
   15 ottobre                                                 a 210: scendo"
```

Tre numeri, non uno:

| | Che cos'è | Da dove viene |
|---|---|---|
| **Impostato** | Quello che hai detto alla macchina | Settaggi, inseriti in campo |
| **Reale** | Quello che la macchina fa davvero | Prova di taratura, o sacchi usati ÷ ettari |
| **Ottenuto** | Quello che è uscito | Raccolta |

**La distanza fra impostato e reale è la prima cosa che l'app deve mostrare.**
È lì che si nascondono gli errori che nessuno vede: una seminatrice che a tacca 14
fa il 12% in più, un atomizzatore che a 8 km/h bagna meno di quanto crede.

---

## 2. Cosa si registra, operazione per operazione

Il criterio: **tutto ciò che l'anno prossimo vorrai sapere e non ricorderai.**

### Semina
- varietà e **lotto sementi**
- **precessione colturale** — cosa c'era prima. Pesa moltissimo, e non si ricorda.
- dose impostata (kg/ha o semi/m²)
- **settaggi macchina**: posizione del cambio o tacca, velocità, profondità,
  interfila, distanza sulla fila
- **prova di semina**, se fatta
- dose reale = sacchi effettivamente usati ÷ ettari
- data, condizione del terreno

### Trattamento
- prodotti, dosi, avversità
- **settaggi**: ugelli (tipo e quanti aperti), pressione, velocità, volume l/ha,
  giri della ventola, altezza della barra
- stadio fenologico della coltura
- condizioni: vento, temperatura, bagnatura

### Concimazione
- prodotto e unità fertilizzanti (soprattutto **azoto per ettaro**)
- **settaggi**: apertura della paratia, larghezza di lavoro, velocità, giri
- prova di distribuzione, se fatta

### Raccolta
- resa totale e per ettaro
- **qualità**: umidità, proteine, peso specifico, grado zuccherino — secondo la
  coltura
- settaggi della mietitrebbia, quando contano
- prezzo e acquirente

---

## 3. I settaggi macchina

Sono il dato che oggi sta su un foglietto in cabina e sparisce con la pioggia.

**Come li modelliamo.** Non una tabella fissa per ogni macchina — sarebbe rigida e
ingestibile — ma uno **schema per famiglia di attrezzo** che descrive quali
regolazioni esistono, e un dato salvato come coppie chiave-valore.

Aggiungere una macchina nuova significa aggiungere uno schema, non toccare il
modello dati.

| Famiglia | Regolazioni |
|---|---|
| Seminatrice | tacca/cambio · dose impostata · velocità · profondità · interfila · distanza sulla fila |
| Irroratrice / atomizzatore | ugelli · numero aperti · pressione · velocità · volume l/ha · giri ventola · altezza barra |
| Spandiconcime | apertura paratia · larghezza · velocità · giri · tipo di disco |
| Lavorazione | profondità · velocità · larghezza |
| Mietitrebbia | giri battitore · controbattitore · ventola · setacci |

**Il gesto che conta: "come l'altra volta".** I settaggi si ripropongono
dall'ultimo intervento dello stesso tipo con la stessa macchina. In campo si
cambia solo quello che è cambiato — spesso niente.

---

## 4. La prova di taratura

La misura che trasforma un'impressione in un dato.

Si fa scendere il prodotto su una distanza nota, si pesa quello raccolto,
l'app calcola la quantità reale per ettaro:

```
superficie di prova (m²) = distanza percorsa (m) × larghezza di lavoro (m)

quantità per ettaro (kg/ha) = grammi raccolti × 10 ÷ superficie di prova (m²)
```

La prova resta agganciata all'attrezzo **e ai settaggi con cui è stata fatta**.
Da quel momento, quando riusi quei settaggi, l'app sa quanto scende davvero — e
se l'impostato e il reale divergono, te lo dice mentre registri, non a fine anno.

Vale anche al contrario: *"per mettere 180 kg/ha con questa macchina, a che tacca
devo stare?"* — l'app risponde con le prove che hai già fatto tu, non con la
tabella del costruttore.

---

## 5. Il confronto fra annate

La schermata che giustifica l'app. Per ogni campo, una riga per annata:

| | 2024 | 2025 | 2026 |
|---|---|---|---|
| Coltura | Frumento | Frumento | Frumento |
| Varietà | Bologna | Bologna | Rebelde |
| Precessione | Mais | Soia | Soia |
| Semina — impostata | 200 kg/ha | 180 kg/ha | 180 kg/ha |
| Semina — **reale** | 218 kg/ha | 195 kg/ha | 191 kg/ha |
| Azoto totale | 160 kg/ha | 140 kg/ha | 145 kg/ha |
| Trattamenti | 3 | 2 | 2 |
| Costo prodotti | 310 €/ha | 255 €/ha | 268 €/ha |
| **Resa** | 58 q/ha | **62 q/ha** | 59 q/ha |
| Proteine | 12,4 | 13,1 | 12,8 |
| Margine | 890 €/ha | 1.020 €/ha | 940 €/ha |

Da qui nasce la domanda giusta: *nel 2025 ho seminato meno, speso meno e raccolto
di più. Perché? È la varietà, la precessione, l'annata, o ho smesso di sprecare
seme?*

**L'app non deve rispondere da sola.** Deve mettere le colonne una accanto
all'altra e far venire la domanda. È già molto più di quello che ha oggi il 90%
delle aziende.

---

## 6. Dove entra l'intelligenza artificiale — e il vincolo di oggi

L'obiettivo dichiarato: incrociare i dati dell'azienda con la ricerca agronomica
e dire cosa conviene cambiare.

Realisticamente arriverà dopo, e servirà una fonte scientifica seria. **Ma la
possibilità di farlo si decide adesso**, e per una ragione sola:

> Se i dati che registriamo oggi non contengono le variabili che la ricerca usa,
> fra tre anni nessuna intelligenza artificiale potrà dire niente di utile.
> Non è un problema di modelli: è un problema di cosa c'era scritto sul quaderno.

Le variabili che la letteratura agronomica usa per spiegare una resa — e che
quindi **dobbiamo registrare da subito**, anche se oggi non le guarda nessuno:

- **precessione colturale** e rotazione
- **varietà** e lotto sementi
- **densità di semina reale** (non quella impostata) e data di semina
- **azoto totale per ettaro** e come è stato frazionato
- lavorazioni del terreno e profondità
- **analisi del terreno**: pH, sostanza organica, tessitura, dotazione
- irrigazione: quanto e quando
- difesa: numero di interventi, sostanze attive, tempistica
- **resa e qualità** misurate
- andamento meteo della stagione

Molte sono già nel modello dati. Quelle che mancano — precessione, analisi del
terreno, densità reale, qualità strutturata — si aggiungono ora, perché aggiungere
un campo è gratis oggi e impossibile a ritroso: **i dati del 2026 o li raccogli
nel 2026 o non esistono.**

**Quello che l'app può già fare senza scomodare la ricerca**, e che vale molto:

1. dire dove l'impostato e il reale divergono, sulle macchine dell'azienda;
2. mettere le annate a confronto e far vedere cosa è cambiato;
3. confrontare campi simili nello stesso anno — stessa coltura, gestione diversa;
4. accorgersi di quello che si ripete: *"la varietà Bologna su precessione soia ti
   ha reso meglio in due anni su due"*.

Il quarto punto è già un'analisi. Non serve un modello linguistico per farla,
serve che i dati esistano.

---

## 7. Cosa costruiamo, in ordine

1. **Settaggi macchina** con schema per famiglia di attrezzo, e "come l'altra
   volta". *Senza questo, il resto non ha dati.*
2. **Prova di taratura** agganciata all'attrezzo e ai settaggi.
3. **Raccolta strutturata**: resa, qualità, prezzo.
4. **Precessione colturale** e analisi del terreno sul campo.
5. **Confronto fra annate**.
6. Poi, e solo poi, l'incrocio con la ricerca.
