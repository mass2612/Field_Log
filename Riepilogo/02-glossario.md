# Glossario

Termini del mestiere e della norma. Serve a chi riprende il progetto senza venire
dall'agricoltura, e servirà ai traduttori quando si aggiungeranno le lingue.

> ⚠️ Le voci marcate **[da verificare]** sono ricostruite a memoria e vanno
> confermate su fonte ufficiale prima di scriverci sopra del codice che conta.

---

## Agronomia e lavoro

**Quaderno di campagna** — Il registro delle operazioni fatte sui campi. Oggi è un
obbligo di legge; in origine era lo strumento di lavoro dell'agricoltore.

**Appezzamento / particella** — Il pezzo di terra. La *particella* è l'unità
catastale (comune, foglio, numero); l'*appezzamento* è come lo divide chi lo
lavora. Non coincidono quasi mai. Nell'app il campo ha il **nome che usa
l'agricoltore**, e le particelle sono un attributo.

**Precessione colturale** — Cosa c'era sul campo l'anno prima. Pesa moltissimo su
resa e fertilità. **Variabile chiave per qualunque analisi futura.**

**Annata agraria** — L'anno agricolo, che non coincide con l'anno solare.
*Nell'app oggi è l'anno solare, da rendere configurabile.*

**Investimento / densità di semina** — Quanto seme va giù per ettaro. Si imposta
sulla seminatrice e si verifica con la **prova di semina**.

**Prova di taratura / prova di semina** — Si fa scendere il prodotto su una
distanza nota, si pesa quello raccolto e si calcola la quantità reale per ettaro.
È così che si scopre che la macchina non sta facendo quello che dice la tabella.
**È il dato d'oro del quaderno originale.**

**Resa** — Quanto si è raccolto per ettaro. Chiude il ciclo: senza, il confronto
fra annate non esiste.

**Avversità** — Ciò che si combatte con il trattamento: peronospora, oidio,
afidi, infestanti.

**Miscela / botte** — La soluzione nella cisterna dell'irroratrice. La dose di
etichetta si esprime **per ettaro** (l/ha) oppure **per ettolitro** (ml/hl), e
confonderle è l'errore di dosaggio più comune. Nell'app sono due strade separate
e dichiarate.

**Volume d'acqua** — Litri di miscela distribuiti per ettaro. Serve a convertire
fra i due modi di esprimere la dose.

**Deriva** — La parte di trattamento che il vento porta fuori dal campo. Da qui i
limiti di vento e le fasce di rispetto dai corpi idrici.

---

## Fitosanitari

**Prodotto fitosanitario** — Il termine di legge per quelli che tutti chiamano
fitofarmaci o antiparassitari.

**Sostanza attiva** — Il principio che agisce. Prodotti commerciali diversi
possono avere la stessa sostanza attiva: i limiti di impiego per stagione si
contano spesso **sulla sostanza attiva**, non sul nome commerciale.
**[da verificare]** — è un dettaglio che cambia i conteggi dei controlli.

**Tempo di carenza** — Giorni che devono passare tra il trattamento e la raccolta.
**Sbagliarlo significa buttare il raccolto.** È il vincolo che l'app mette in cima
alla scheda del campo.

**Tempo di rientro** — Ore prima di poter rientrare in campo senza dispositivi di
protezione.

**Revoca** — Quando un prodotto perde l'autorizzazione. Di solito c'è una data per
smettere di venderlo e una successiva per **smaltire le scorte**: dopo quella, il
prodotto che hai in cantina è un illecito, non solo un costo perso.

**Patentino (fitosanitari)** — L'abilitazione ad acquistare e usare i prodotti
professionali. Ha una scadenza e si rinnova con un corso. **[da verificare]** la
durata esatta e le modalità, che variano per regione.

**Controllo funzionale** — La verifica periodica obbligatoria dell'irroratrice.
**[da verificare]** la periodicità: è cambiata nel tempo e varia per regione.

**Banca Dati Fitosanitari** — L'archivio del Ministero della Salute con etichette,
autorizzazioni, colture ammesse, carenze. **È la fonte da cui l'app dovrebbe
prendere i dati normativi dei prodotti.** Equivalente europeo: *EU Pesticides
Database*.

---

## Burocrazia

**SIAN** — Sistema Informativo Agricolo Nazionale.

**AGEA** — L'organismo pagatore nazionale. Alcune regioni ne hanno di propri
(es. ARTEA in Toscana).

**CAA** — Centro di Assistenza Agricola: chi materialmente tiene le pratiche per
l'agricoltore.

**Fascicolo aziendale** — La carta d'identità dell'azienda presso la pubblica
amministrazione: superfici, particelle, titoli. Tutto parte da lì.

**PAC** — Politica Agricola Comune. La **domanda unica** è la richiesta annuale
dei contributi. **[da verificare]** scadenze e requisiti dell'anno in corso.

**Condizionalità (BCAA / GAEC)** — Le regole di buona pratica agronomica e
ambientale da rispettare per avere i contributi. Chi le rispetta deve poterlo
dimostrare: **è qui che il quaderno di campagna diventa una prova, non un modulo.**

**Eco-schemi** — Impegni volontari aggiuntivi, remunerati. Anche questi vanno
documentati.

**UMA — gasolio agricolo** — Il carburante ad accisa ridotta per l'agricoltura.
L'azienda riceve un'assegnazione annuale calcolata su colture, superfici e
lavorazioni, e deve tenere traccia dei rifornimenti e degli impieghi.
**[da verificare]** — è materia regionale e cambia parecchio da regione a regione.
**Grande opportunità per l'app:** conosce già superfici e lavorazioni fatte, cioè
esattamente i numeri che servono a giustificare l'assegnazione.

**Direttiva Nitrati** — Limita l'azoto distribuibile, soprattutto nelle *zone
vulnerabili*, dove serve un piano di utilizzazione agronomica. Da qui l'obbligo di
registrare le concimazioni e gli spandimenti di effluenti.

**Agrivoltaico** — Impianti fotovoltaici su terreno che deve **restare coltivato**.
Gli incentivi richiedono di dimostrare la continuità dell'attività agricola e la
produzione ottenuta. **[da verificare]** requisiti e sistemi di monitoraggio.
**Il quaderno di campagna è esattamente la prova che serve.**

---

## Termini dell'app

**Intervento** — Qualunque operazione su un campo: trattamento, concimazione,
irrigazione, semina, lavorazione, raccolta, osservazione. Un solo oggetto, un solo
flusso di inserimento, un solo storico.

**Rilievo** — Una segnalazione dei controlli automatici. Tre livelli: *blocco*
(ti mette nei guai), *avviso*, *nota*. Nessuno impedisce di salvare.

**Rettifica** — La registrazione di una modifica: cosa è cambiato, da cosa a cosa,
quando. Interna, a beneficio dell'agricoltore.

**Origine campo** — Come è stato attribuito il campo a un intervento: `gps`,
`manuale` o `ripetuto`. Distingue un dato rilevato da uno dichiarato.

**Pacchetto paese** — Il modulo che contiene tutto ciò che è nazionale: stampe,
regole, export. `src/packs/it`, domani `src/packs/fr`.
