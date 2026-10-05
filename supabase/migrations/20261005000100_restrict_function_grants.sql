-- is_member() solo hace falta para usuarios logueados (RLS).
revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- complete_reminder() solo para usuarios logueados (RLS valida que sean de la casa).
revoke execute on function public.complete_reminder(uuid) from public, anon;
grant execute on function public.complete_reminder(uuid) to authenticated;
