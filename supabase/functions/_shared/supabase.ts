import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

/** Cliente con service role: ignora RLS. Solo para uso dentro de las funciones. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export interface MemberRow {
  id: string;
  name: string;
  role: 'person' | 'kiosk';
  google_email: string | null;
}

/** Devuelve el miembro dueño del JWT del request, o null. */
export async function memberFromRequest(admin: SupabaseClient, req: Request): Promise<MemberRow | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: member } = await admin.from('members').select('*').eq('id', data.user.id).maybeSingle<MemberRow>();
  return member;
}

/** Comparación en tiempo constante para secretos. */
export function safeEqual(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function cronSecret(): string {
  const s = Deno.env.get('CRON_SECRET');
  if (!s) throw new Error('Falta el secret CRON_SECRET');
  return s;
}
