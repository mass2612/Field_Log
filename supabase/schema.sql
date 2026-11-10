-- La copia dei dati di ogni agricoltore, sul progetto Supabase `lucky-farm`.
--
-- Una tabella sola, generica: ogni record del quaderno (note, campi, prodotti,
-- movimenti…) è una riga con il nome della sua tabella e il contenuto in JSON.
-- Così aggiungere un tipo di dato nell'app non chiede di toccare il server.
--
-- Ognuno vede e scrive solo le righe sue: lo garantisce la RLS qui sotto, non
-- l'app. Da incollare in Supabase → SQL Editor → Run. Si può rieseguire.

create table if not exists public.record (
  utente        uuid        not null default auth.uid() references auth.users on delete cascade,
  tabella       text        not null,
  id            text        not null,
  dati          jsonb       not null,
  -- Quando l'ha cambiato l'app: vince la versione più recente.
  modificato_il timestamptz not null,
  -- Quando è arrivato qui: serve a scaricare solo le novità.
  ricevuto_il   timestamptz not null default now(),
  primary key (utente, tabella, id)
);

create index if not exists record_novita on public.record (utente, ricevuto_il);

create or replace function public.segna_ricevuto() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.ricevuto_il := now();
  return new;
end $$;

drop trigger if exists record_ricevuto on public.record;
create trigger record_ricevuto before insert or update on public.record
  for each row execute function public.segna_ricevuto();

alter table public.record enable row level security;

drop policy if exists "solo i propri dati" on public.record;
create policy "solo i propri dati" on public.record
  for all to authenticated
  using (utente = (select auth.uid()))
  with check (utente = (select auth.uid()));

-- Le tabelle nuove non si aprono da sole (scelto alla creazione): si apre questa.
grant select, insert, update, delete on public.record to authenticated;

-- ---------------------------------------------------------------------------
-- Foto e registrazioni (aggiunto il 10/11/2026).
--
-- I file stanno nell'archivio file di Supabase, bucket privato `allegati`,
-- una cartella per utente: `<id utente>/<id allegato>`. Ognuno legge e scrive
-- solo nella sua cartella. Si può rieseguire.

insert into storage.buckets (id, name, public)
values ('allegati', 'allegati', false)
on conflict (id) do nothing;

drop policy if exists "allegati: solo i propri file" on storage.objects;
create policy "allegati: solo i propri file" on storage.objects
  for all to authenticated
  using (bucket_id = 'allegati' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'allegati' and (storage.foldername(name))[1] = (select auth.uid())::text);
