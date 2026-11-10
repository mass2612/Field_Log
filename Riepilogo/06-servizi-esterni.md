# Servizi esterni

Gli account e i servizi fuori da questo computer: dove stanno, a cosa
servono, e **dove NON stanno le chiavi segrete**.

> Il deposito `Field_Log` su GitHub è **pubblico**. Qui si scrive solo quello
> che può essere letto da chiunque. Password e chiavi segrete stanno solo nel
> gestore di password di Max, mai qui e mai nel codice.

## Supabase — account e copia dei dati (creato il 04/11/2026)

| Cosa | Valore |
|---|---|
| Organizzazione | Moncucco S.S.A. (piano Free) |
| Progetto | `lucky-farm` |
| Regione | Europa |
| Indirizzo (Project URL) | `https://qdfgbqonlaghuxwiuaev.supabase.co` |
| Chiave pubblica (publishable) | `sb_publishable_tx9TQFwCMItL46If6UdgRA_fMK-PchI` |
| Accesso al pannello | supabase.com, con l'account GitHub `mass2612` |

La chiave **publishable** è fatta per stare dentro l'app: chiunque la può
leggere, e non basta per vedere i dati di nessuno. A proteggere i dati è la
**RLS** (Row Level Security, attivata alla creazione): ogni agricoltore vede
solo le righe sue.

**Non scrivere mai qui:** la password del database, la chiave *secret* /
*service_role*. Stanno nel gestore di password di Max.

Impostazioni scelte alla creazione: Data API accesa; esposizione automatica
delle nuove tabelle **spenta** (si aprono una per una); RLS automatica
**accesa**.

**Da fare nel pannello** (fatto da Max?): in *Authentication → Emails*,
nei modelli *Magic Link* e *Confirm signup*, aggiungere `{{ .Token }}` perché
nell'email arrivi il codice. Per i clienti: SMTP proprio (vedi diario 04/11).

Nel codice l'indirizzo e la chiave stanno in `src/core/sync/config.ts`.

**Accesso con Google (attivo dal 10/11/2026, provato da Max sul sito).**
- Google Cloud: progetto **Lucky Farm** (separato da *my-echo*, che è di Echo),
  account Google di Max. Google Auth Platform → Client: client "Applicazione
  web" con URI di reindirizzamento
  `https://qdfgbqonlaghuxwiuaev.supabase.co/auth/v1/callback`.
- Supabase: Authentication → Sign In / Providers → Google attivo, con ID client
  e secret. **Il secret sta solo lì**, mai nel repo.
- Supabase → URL Configuration: Site URL `https://mass2612.github.io/Field_Log/`;
  Redirect URLs: il sito, `http://localhost:5173/Field_Log/`,
  `com.luckyfarm.app://accesso` (ritorno nell'app Android).
- **Da fare:** il secret è passato in uno screenshot della chat il 10/11: crearne
  uno nuovo su Google, metterlo su Supabase, disattivare il vecchio. Verificare
  che l'app su Google sia "pubblicata" (non solo utenti di prova). Google mostra
  "Continua su qdfgbqonlaghuxwiuaev.supabase.co": si sistema con un dominio
  nostro (dominio personalizzato di Supabase, a pagamento) prima degli store.

## GitHub

- `mass2612/Field_Log` — pubblico. L'app pubblicata: https://mass2612.github.io/Field_Log/
- `mass2612/from_pic_to_data` — da creare **privato** (vedi diario 02/11).
