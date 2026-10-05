-- Versículo del día (YouVersion). Lo llena la Edge Function verse-of-day, una vez por día.
create table public.daily_verse (
  day date primary key,          -- fecha local de la casa
  passage_id text not null,      -- ej: JHN.3.16
  reference text not null,       -- ej: Juan 3:16
  content text not null,
  version text,                  -- abreviatura de la Biblia (ej: NVI)
  fetched_at timestamptz not null default now()
);

alter table public.daily_verse enable row level security;

create policy "miembros leen el versículo" on public.daily_verse
  for select to authenticated using (public.is_member());
