import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Client acting as the signed-in user (row level security applies).
export function userClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only in server components */ } },
    },
  });
}

// Service client for trusted server jobs only (cron, webhooks). Never expose to the browser.
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function currentUser() {
  const sb = userClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { sb, user: null, role: null as null | string };
  const { data: p } = await sb.from('profiles').select('role, full_name').eq('id', data.user.id).single();
  return { sb, user: data.user, role: (p?.role ?? 'candidate') as string };
}
