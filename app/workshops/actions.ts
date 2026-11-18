'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminClient, currentUser } from '@/lib/supabase';
import { newReference, newInvoiceNo, type Workshop, type Field } from '@/lib/workshops';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const back = (slug: string, msg: string) => redirect(`/workshops/${slug}?error=${encodeURIComponent(msg)}#register`);

// Public registration: no account needed. Each event's own questions come from workshops.form_fields.
export async function registerWorkshop(f: FormData) {
  const db = adminClient();
  const slug = s(f, 'slug');
  const { data: w } = await db.from('workshops').select('*').eq('slug', slug).eq('published', true).single<Workshop>();
  if (!w) redirect('/workshops');
  if (s(f, 'website')) redirect('/workshops'); // honeypot for bots

  const full_name = s(f, 'full_name'), email = s(f, 'email').toLowerCase(), phone = s(f, 'phone');
  if (full_name.length < 3) back(slug, 'Please enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(slug, 'Please enter a valid email address.');
  if (phone.replace(/\D/g, '').length < 9) back(slug, 'Please enter a phone or WhatsApp number we can reach you on.');

  const answers: Record<string, string> = {};
  for (const q of (w.form_fields || []) as Field[]) {
    const v = s(f, 'q_' + q.name).slice(0, 2000);
    if (q.required && !v) back(slug, `Please answer: ${q.label}`);
    if (q.type === 'select' && v && q.options && !q.options.includes(v)) back(slug, `Please choose an option for: ${q.label}`);
    if (v) answers[q.label] = v;
  }

  // Seats and duplicates
  if (w.capacity) {
    const { data: taken } = await db.rpc('workshop_seats_taken', { w: w.id });
    if ((taken ?? 0) >= w.capacity) back(slug, 'Sorry, this event is fully booked.');
  }
  const { data: dup } = await db.from('workshop_registrations').select('reference,status')
    .eq('workshop_id', w.id).eq('email', email).neq('status', 'cancelled').maybeSingle();
  if (dup) redirect(`/workshops/ticket/${dup.reference}?again=1`);

  // Price: member price applies to candidates on the paid placement tier (offshore_registered_at set).
  let amount = Number(w.price_usd) || 0, is_member = false;
  if (w.member_price_usd !== null && w.member_price_usd !== undefined) {
    const { data: c } = await db.from('candidates').select('id').ilike('email', email).not('offshore_registered_at', 'is', null).limit(1);
    if (c && c.length) { is_member = true; amount = Number(w.member_price_usd) || 0; }
  }

  const want = s(f, 'pay_option') === 'invoice' ? 'invoice' : 'paynow';
  const pay_option = amount === 0 ? 'free' : want;
  const reference = newReference();
  const { user } = await currentUser();
  const { error } = await db.from('workshop_registrations').insert({
    user_id: user?.id ?? null,
    workshop_id: w.id, reference, invoice_no: newInvoiceNo(), full_name, email, phone,
    organisation: s(f, 'organisation') || null, answers, amount, is_member, pay_option,
    status: amount === 0 ? 'confirmed' : 'awaiting_payment',
  });
  if (error) back(slug, 'We could not save your registration. Please try again or WhatsApp +263 77 133 1008.');

  if (pay_option === 'paynow') redirect(`/workshops/pay/${reference}`);
  if (w.delivery === 'online' && amount === 0) redirect(`/workshops/learn/${reference}?new=1`);
  redirect(`/workshops/ticket/${reference}?new=1`);
}

// Online workshops: mark a module done (or undone). The reference is the attendee's private key; signed-in
// attendees also get the registration linked to their account so it shows on their dashboard.
export async function toggleModule(f: FormData) {
  const db = adminClient();
  const ref = s(f, 'ref'), mod = s(f, 'module'), done = s(f, 'done') === '1';
  const { data: r } = await db.from('workshop_registrations').select('id,status,user_id,completed_modules,started_at,workshops(modules)').eq('reference', ref).maybeSingle();
  if (!r || !['confirmed', 'paid'].includes(r.status)) redirect(`/workshops/ticket/${ref}`);
  const all: string[] = (((r as any).workshops?.modules) || []).map((m: any) => m.id);
  if (!all.includes(mod)) redirect(`/workshops/learn/${ref}`);
  const set = new Set<string>(r.completed_modules || []);
  done ? set.add(mod) : set.delete(mod);
  const completed = all.filter(id => set.has(id));
  const { user } = await currentUser();
  await db.from('workshop_registrations').update({
    completed_modules: completed,
    started_at: r.started_at || new Date().toISOString(),
    completed_at: completed.length === all.length ? new Date().toISOString() : null,
    ...(user && !r.user_id ? { user_id: user.id } : {}),
  }).eq('id', r.id);
  const next = all[all.indexOf(mod) + 1];
  redirect(`/workshops/learn/${ref}${done && next ? `#${next}` : `#${mod}`}`);
}

// Signed-in attendee claims a registration made without an account (so progress follows the account).
export async function claimRegistration(f: FormData) {
  const { user } = await currentUser();
  const ref = s(f, 'ref');
  if (!user) redirect(`/login?as=candidate`);
  await adminClient().from('workshop_registrations').update({ user_id: user.id }).eq('reference', ref).is('user_id', null);
  redirect(`/workshops/learn/${ref}?claimed=1`);
}

// ---------- Office (staff) ----------
async function requireStaff() {
  const { role } = await currentUser();
  if (role !== 'staff') redirect('/');
}

export async function markRegistration(f: FormData) {
  await requireStaff();
  const id = s(f, 'id'), action = s(f, 'action');
  const patch: Record<string, any> =
    action === 'paid' ? { status: 'paid', paid_at: new Date().toISOString(), paid_via: s(f, 'via') || 'bank' }
    : action === 'cancel' ? { status: 'cancelled' }
    : action === 'attended' ? { attended: true }
    : {};
  if (Object.keys(patch).length) await adminClient().from('workshop_registrations').update(patch).eq('id', id);
  revalidatePath('/admin/workshops');
}

export async function saveWorkshop(f: FormData) {
  await requireStaff();
  let form_fields: Field[] = [], modules: any[] = [];
  try { form_fields = JSON.parse(s(f, 'form_fields') || '[]'); } catch { redirect('/admin/workshops?error=' + encodeURIComponent('Form questions must be valid JSON.')); }
  try { modules = JSON.parse(s(f, 'modules') || '[]'); } catch { redirect('/admin/workshops?error=' + encodeURIComponent('Modules must be valid JSON.')); }
  const delivery = s(f, 'delivery') === 'online' ? 'online' : 'in_person';
  const num = (k: string) => (s(f, k) === '' ? null : Number(s(f, k)));
  const row = {
    slug: s(f, 'slug').toLowerCase().replace(/[^a-z0-9-]+/g, '-'), title: s(f, 'title'), tagline: s(f, 'tagline') || null,
    description: s(f, 'description') || null, host: s(f, 'host') || null, starts_on: s(f, 'starts_on'), ends_on: s(f, 'ends_on') || null,
    time_label: s(f, 'time_label') || null, venue: s(f, 'venue'), focus: s(f, 'focus').split('\n').map(x => x.trim()).filter(Boolean),
    audience: s(f, 'audience') || null, price_usd: num('price_usd') ?? 0, member_price_usd: num('member_price_usd'),
    price_note: s(f, 'price_note') || null, capacity: num('capacity'), form_fields, published: !!f.get('published'),
    delivery, modules,
  };
  if (!row.slug || !row.title || !row.starts_on || !row.venue) redirect('/admin/workshops?error=' + encodeURIComponent('Slug, title, date and venue are required.'));
  const { error } = await adminClient().from('workshops').upsert(row, { onConflict: 'slug' });
  redirect('/admin/workshops?' + (error ? 'error=' + encodeURIComponent(error.message) : 'saved=1'));
}
