-- Correr en el SQL Editor DESPUÉS de crear los 3 usuarios en Authentication → Users.
-- Reemplazar los emails por los reales (los de login y los de Google Calendar).

insert into public.members (id, name, color, role, google_email) values
  ((select id from auth.users where email = '<EMAIL_LOGIN_JOSE>'), 'Jose', '#4f9cf9', 'person', '<GMAIL_JOSE>'),
  ((select id from auth.users where email = '<EMAIL_LOGIN_ANGI>'), 'Angi', '#f472b6', 'person', '<GMAIL_ANGI>'),
  ((select id from auth.users where email = 'kiosk@casa.local'),   'Pantalla', '#a3a3a3', 'kiosk', null);

-- Verificación: tienen que salir 3 filas, sin ids vacíos.
select m.name, m.role, u.email from public.members m join auth.users u on u.id = m.id;
