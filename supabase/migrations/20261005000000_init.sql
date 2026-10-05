-- PI HOME: esquema inicial
-- Miembros de la casa, cache de Google Calendar, recordatorios y suscripciones push.

-- ─── Miembros ────────────────────────────────────────────────────────────────
create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#4f9cf9',
  role text not null default 'person' check (role in ('person', 'kiosk')),
  -- Email de la cuenta Google, para saber quién creó un evento desde el celular.
  google_email text unique,
  created_at timestamptz not null default now()
);

-- ¿El usuario actual es de la casa? (security definer para evitar recursión en RLS)
create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.members where id = auth.uid());
$$;

-- ─── Eventos (copia de solo lectura de Google Calendar) ──────────────────────
create table public.events_cache (
  id text primary key,                 -- id de la instancia en Google
  calendar_id text not null,
  title text not null default '',
  description text,
  location text,
  all_day boolean not null default false,
  start_at timestamptz,                -- eventos con hora
  end_at timestamptz,
  start_date date,                     -- eventos de todo el día (end exclusivo)
  end_date date,
  owner_id uuid references public.members (id) on delete set null,
  creator_email text,
  html_link text,
  google_updated timestamptz,
  synced_at timestamptz not null default now(),
  check ((all_day and start_date is not null and end_date is not null)
      or (not all_day and start_at is not null and end_at is not null))
);

create index events_cache_start_at_idx on public.events_cache (start_at);
create index events_cache_start_date_idx on public.events_cache (start_date);

-- ─── Recordatorios ───────────────────────────────────────────────────────────
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  notes text,
  due_at timestamptz,
  assigned_to uuid references public.members (id) on delete set null, -- null = los dos
  recurrence text check (recurrence in ('daily', 'weekly', 'monthly', 'yearly')),
  done_at timestamptz,
  done_by uuid references public.members (id) on delete set null,
  created_by uuid references public.members (id) on delete set null default auth.uid(),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_pending_due_idx on public.reminders (due_at) where done_at is null;

-- Si cambia la fecha, se vuelve a notificar.
create function public.reset_reminder_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.due_at is distinct from old.due_at then
    new.notified_at := null;
  end if;
  return new;
end;
$$;

create trigger reminders_reset_notification
before update on public.reminders
for each row execute function public.reset_reminder_notification();

-- Marcar hecho; si se repite, crea la próxima ocurrencia.
create function public.complete_reminder(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.reminders;
  next_due timestamptz;
begin
  update public.reminders
     set done_at = now(), done_by = auth.uid()
   where id = p_id and done_at is null
  returning * into r;

  if r.id is null or r.recurrence is null then
    return;
  end if;

  next_due := coalesce(r.due_at, date_trunc('day', now())) + case r.recurrence
    when 'daily' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'monthly' then interval '1 month'
    when 'yearly' then interval '1 year'
  end;
  -- Si estaba muy atrasado, saltar hasta el futuro.
  while next_due < now() - interval '1 day' loop
    next_due := next_due + case r.recurrence
      when 'daily' then interval '1 day'
      when 'weekly' then interval '1 week'
      when 'monthly' then interval '1 month'
      when 'yearly' then interval '1 year'
    end;
  end loop;

  insert into public.reminders (title, notes, due_at, assigned_to, recurrence, created_by)
  values (r.title, r.notes, next_due, r.assigned_to, r.recurrence, r.created_by);

  -- La ocurrencia completada ya no se repite.
  update public.reminders set recurrence = null where id = r.id;
end;
$$;

-- ─── Suscripciones Web Push ──────────────────────────────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ─── Estado del sync con Google ──────────────────────────────────────────────
create table public.sync_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.members enable row level security;
alter table public.events_cache enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.sync_state enable row level security;

create policy "miembros ven a los miembros" on public.members
  for select to authenticated using (public.is_member());

-- events_cache solo lo escriben las Edge Functions (service role).
create policy "miembros leen eventos" on public.events_cache
  for select to authenticated using (public.is_member());

create policy "miembros leen recordatorios" on public.reminders
  for select to authenticated using (public.is_member());
create policy "miembros crean recordatorios" on public.reminders
  for insert to authenticated with check (public.is_member());
create policy "miembros editan recordatorios" on public.reminders
  for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "miembros borran recordatorios" on public.reminders
  for delete to authenticated using (public.is_member());

create policy "cada uno ve sus suscripciones" on public.push_subscriptions
  for select to authenticated using (member_id = auth.uid());
create policy "cada uno crea sus suscripciones" on public.push_subscriptions
  for insert to authenticated with check (member_id = auth.uid() and public.is_member());
create policy "cada uno actualiza sus suscripciones" on public.push_subscriptions
  for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "cada uno borra sus suscripciones" on public.push_subscriptions
  for delete to authenticated using (member_id = auth.uid());

create policy "miembros leen estado del sync" on public.sync_state
  for select to authenticated using (public.is_member());

-- ─── Realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.events_cache, public.reminders, public.members;
