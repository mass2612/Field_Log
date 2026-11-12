# Le API di QdC (Image Line)

Aperte da Image Line il 11/11/2026 per Max: licenza demo configurata, API
attive, credenziali in arrivo. Contatto: Samuele Gianessi, Product Coordinator
QdC (Business Unit Agrotech). Le credenziali sono di Max e **non vanno mai nel
repo**: si entra con le stesse di QdC.

- Swagger: https://qdc-api.imagelinenetwork.com/docs
- Documentazione: https://qdc-api.imagelinenetwork.com/redoc
- Versione letta il 12/11/2026: 1.3.11

## Il ciclo, come lo vuole Max

Agrizen esporta → **Confagricoltura verifica** che sia tutto a posto → con un
clic carica verso il SIAN. L'agricoltore non entra in QdC; il controllo umano
resta all'associazione.

## Come si incastra con le API

L'API ha esattamente il pezzo che serve: **`POST /qdc/interventi/notifiche/crea_notifica`**.
Non scrive un intervento: crea una **notifica**, cioè una proposta di
operazione *"che verrà trasformata in intervento vero e proprio dall'utente
all'interno di QdC"*. È il passo di verifica di Confagricoltura, già previsto
da loro.

Campi della notifica: obbligatori solo **data** e **sede** (l'azienda in QdC).
Poi: tipo di operazione (dal dizionario), clima, acqua (hl e volume),
attrezzature, operatori, contoterzisti, costo, minuti, superficie trattata (ha
o %), descrizione, nota, **prodotti** (`PROD`) e **unità produttive** (`UP`,
gli appezzamenti). Attrezzature e simili si possono dare per ID Image Line o
per nome.

Altre cose utili:
- **Lettura**: aziende, unità produttive (anche da fascicolo), interventi,
  macchine, operatori, giacenze di magazzino.
- **Dizionari**: colture, operazioni, condizioni climatiche, mezzi tecnici con
  unità di misura.
- **Ricerca** nei loro archivi: fertilizzanti, sementi, piantine, ausiliari,
  corroboranti, trappole, sostanze di base. (Fitofarmaci: da verificare.)
- **Magazzino**: `POST /qdc/magazzini/carico_prodotto` crea un movimento.
- Accesso: OAuth2 (utente e password di QdC → token), con permessi per area.

## L'accesso (letto il 12/11/2026)

Arrivate le credenziali della licenza demo (QdC PLUS, utente di Max). **La
password non va mai nel repo né nell'app**: l'accesso si fa sulla pagina di
Image Line (`GET /oauth2/auth?redirect_uri=…`, modulo loro), che rimanda
indietro con un codice; il codice si scambia col token (`POST /oauth2/token`,
`authorization_code` con `code_verifier`, cioè PKCE). `client_id` facoltativo.
Agrizen non vede mai la password di QdC.

Ostacolo: il server di Image Line **non accetta chiamate dal browser** da
altri siti (CORS: la prova da `mass2612.github.io` risponde 400). Nell'app
Android si aggira con le chiamate native; per il sito serve che Image Line
aggiunga i nostri indirizzi, oppure un passaggio dal nostro server. Da chiedere
a Samuele: origini ammesse, indirizzi di ritorno ammessi (il sito e
`it.agrizen.app://qdc`), eventuale `client_id` per Agrizen.

## Cosa resta da capire (con la demo)

1. Il **legame dei nomi**: "il Pero" nelle note di Agrizen ↔ l'unità produttiva
   in QdC; "rame" ↔ il prodotto nel loro archivio. Proposta: la prima volta
   l'app chiede l'abbinamento e se lo ricorda (è anche la richiesta di Max del
   25/10: il nome del campo collegato alla particella).
2. **Chi entra**: l'account dell'associazione (che vede tutte le aziende) o
   quello della singola azienda. Con Confagricoltura, probabilmente il loro.
3. I fitofarmaci: se la ricerca li copre, risolve anche il blocco B1 (registro
   dei prodotti).
