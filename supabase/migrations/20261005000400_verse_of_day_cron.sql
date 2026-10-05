-- Busca el versículo del día a las 00:05 hora de Argentina (03:05 UTC), para que el kiosko lo tenga listo.
select cron.schedule('pihome-verse-of-day', '5 3 * * *', $$select public.call_edge_function('verse-of-day')$$);
