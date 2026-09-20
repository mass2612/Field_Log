# Interfaccia — semplice per chi ha settant'anni, capace di gestire molto

Il problema dichiarato: **l'app deve essere usabile da un anziano, e insieme deve
gestire una quantità di roba notevole** — trattamenti, magazzino, scadenze,
gasolio agricolo, PAC, agrivoltaico.

Non sono in contraddizione. Lo diventano se si sbaglia il modo di aggiungere roba.

---

## 1. La regola che tiene insieme le due cose

> **La complessità va in profondità, mai sulla superficie.**

Una schermata fa **una** cosa. Se deve farne due, sono due schermate. Un'app con
quaranta funzioni può restare semplice; un'app con quattro funzioni **tutte
visibili insieme** è già confusa.

Conseguenza operativa, da non violare mai:

> **La barra in basso resta di cinque voci per sempre.**
> Oggi: Oggi · Campi · Registra · Magazzino · Altro.
> Il gasolio, la PAC, l'agrivoltaico e qualunque cosa arriverà **non aggiungono
> una sesta voce**. Vivono sotto "Altro", raggruppati per argomento.

---

## 2. L'app mostra solo quello che quell'azienda fa davvero

È questa la risposta vera al "gestisce tanto ma dev'essere semplice".

Alla prima apertura si chiede, in parole normali, **che cosa fa l'azienda**:
usi fitofarmaci? hai dipendenti? chiedi la PAC? hai il gasolio agevolato? hai un
impianto fotovoltaico sui terreni? lavori anche per conto terzi?

Da lì in poi **l'app spegne tutto il resto**. Chi non ha l'agrivoltaico non vede
mai la parola agrivoltaico. Chi non ha dipendenti non vede mai il campo
"operatore". Un'azienda semplice vede un'app semplice — non una versione ridotta,
proprio un'app più piccola.

Si può sempre riaccendere qualcosa, ma **si parte spenti**, non accesi.

**Perché non facciamo una "modalità semplice".** Sembra la soluzione ovvia ed è
una trappola: si finisce per mantenere due prodotti, l'utente non sa mai in quale
si trova, e chi sta in quella semplice sospetta di perdersi qualcosa. Meglio un
solo prodotto che si adatta a quello che l'azienda fa.

---

## 3. Come si parla all'utente

- **Le parole sono quelle del mestiere.** "Botte", "campo", "quanto è sceso".
  Mai "entità", "record", "sincronizzazione", "elemento". Se una parola non la
  direbbe un agricoltore al bar, non va nell'app.
- **Mai un'icona da sola.** Le icone senza scritta sono illeggibili per chi non è
  cresciuto con gli smartphone. Ogni icona ha la sua parola sotto. Sempre.
- **Messaggi che dicono cosa fare**, non cosa è successo.
  No: *"Errore di validazione sul campo quantità"*.
  Sì: *"Manca quanto prodotto hai messo. Puoi anche salvare e metterlo dopo."*
- **Niente fretta.** Nessun messaggio importante sparisce da solo dopo tre
  secondi. Chi legge piano deve poter leggere piano.

---

## 4. Il corpo, non solo l'occhio

- **Bersagli da 56 px minimo.** Si usa con i guanti, e a settant'anni la mano
  trema.
- **Testo da 17 px in su**, mai grigio chiaro su bianco. Si legge in pieno sole,
  con gli occhiali sporchi.
- **Nessun gesto obbligatorio.** Trascinare, scorrere lateralmente, tenere premuto
  a lungo: se esistono, devono avere **sempre** un'alternativa a tocco semplice.
  *Da correggere subito: oggi la nota vocale si registra solo tenendo premuto.
  Serve anche "tocca per iniziare, tocca per finire".*
- **I comandi importanti stanno in basso**, dove arriva il pollice di una mano
  sola — l'altra tiene il volante, l'attrezzo o il cancello.
- **Il pulsante che salva sta sempre nello stesso posto.** Sempre. In tutte le
  schermate.

---

## 5. Meno scelte, più memoria

La cosa che fa risparmiare più tempo a un anziano non è un bottone più grande:
è **non dover decidere**.

- **"Come l'altra volta".** Il gesto più potente dell'app: ripete l'ultimo
  intervento su quel campo, con prodotti, dosi e settaggi già dentro. Si cambia
  solo quello che è cambiato. Da mettere in primo piano.
- **Valori predefiniti giusti nove volte su dieci.** La superficie del campo si
  propone da sola, la botte si ricorda dall'attrezzo, la data è oggi.
- **Niente da ricordare a memoria.** Il tempo di carenza, quante volte hai già
  usato quel prodotto, quanto ne resta in magazzino: lo sa l'app, non l'uomo.
- **Tastiera numerica grande** quando si digitano numeri. Mai la tastiera intera.

---

## 6. Perdonare gli errori

Un'app che punisce chi sbaglia, da un anziano non viene usata. Mai.

- **Tutto è correggibile, in qualsiasi momento**, senza avvisi moralisti e senza
  passare da schermate di conferma. Vedi `00-INIZIA-DA-QUI.md`, sezione 4.
- **Niente vicoli ciechi.** Da ogni schermata si esce, sempre, senza perdere
  quello che si era già scritto.
- **Niente azioni distruttive senza ritorno.** Non si cancella: si annulla, e si
  può ripensare.
- **Si può salvare incompleto.** L'app segna cosa manca e lo ricorda dopo; non
  sbarra la strada.

---

## 7. Le prove da fare, quando ci sarà da progettare la grafica

Non si discute di grafica in astratto. Si mette l'app in mano a qualcuno e si
guarda. Tre prove, concrete:

1. **La prova dei venti secondi.** Un agricoltore registra un trattamento
   appena fatto, in piedi, con i guanti. Se ci mette più di venti secondi,
   la schermata va rifatta.
2. **La prova del sole.** Schermo al massimo, mezzogiorno, fuori. Quello che non
   si legge non esiste.
3. **La prova del nonno.** Una persona di settant'anni che non ha mai visto
   l'app deve arrivare a registrare qualcosa **senza che nessuno le dica niente**.
   Ogni punto in cui si ferma e chiede "e adesso?" è un difetto di progetto, non
   una sua mancanza.

---

## 8. Cosa c'è già e cosa manca

**Già rispettato:** bersagli da 56 px, contrasto alto, comandi in basso, barra a
cinque voci, parole del mestiere, si salva sempre anche incompleto, niente
cancellazioni.

**Da sistemare:**
- nota vocale anche a tocco singolo, non solo tenendo premuto
- "come l'altra volta"
- la scelta iniziale di cosa fa l'azienda, per spegnere il resto
- correzione di un intervento dall'interfaccia
- tastiera numerica dove servono numeri
- prova del nonno: non ancora fatta con nessuno
