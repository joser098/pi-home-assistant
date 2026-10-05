-- Se corre UNA vez en el SQL Editor de Supabase, después de desplegar las funciones.
-- Reemplazar los dos valores marcados con <...>.

create extension if not exists pg_cron;
create extension if not exists pg_net schema extensions;

-- Secretos guardados en Vault (no quedan en texto plano en los jobs).
select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
select vault.create_secret('<EL_MISMO_CRON_SECRET_QUE_EN_LAS_FUNCIONES>', 'cron_secret');

create or replace function public.call_edge_function(fn text)
returns void
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$;

revoke all on function public.call_edge_function(text) from public, anon, authenticated;

-- Sync de respaldo + renovación del canal de Google.
select cron.schedule('pihome-calendar-sync', '*/2 * * * *', $$select public.call_edge_function('calendar-sync')$$);

-- Avisos de recordatorios.
select cron.schedule('pihome-send-reminders', '* * * * *', $$select public.call_edge_function('send-reminders')$$);

-- Limpieza: recordatorios hechos hace más de 90 días.
select cron.schedule('pihome-cleanup', '30 4 * * *', $$delete from public.reminders where done_at < now() - interval '90 days'$$);
