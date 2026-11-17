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
  const { error } = await db.from('workshop_registrations').insert({
    workshop_id: w.id, reference, invoice_no: newInvoiceNo(), full_name, email, phone,
    organisation: s(f, 'organisation') || null, answers, amount, is_member, pay_option,
    status: amount === 0 ? 'confirmed' : 'awaiting_payment',
  });
  if (error) back(slug, 'We could not save your registration. Please try again or WhatsApp +263 77 133 1008.');

  if (pay_option === 'paynow') redirect(`/workshops/pay/${reference}`);
  redirect(`/workshops/ticket/${reference}?new=1`);
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
  let form_fields: Field[] = [];
  try { form_fields = JSON.parse(s(f, 'form_fields') || '[]'); } catch { redirect('/admin/workshops?error=' + encodeURIComponent('Form questions must be valid JSON.')); }
  const num = (k: string) => (s(f, k) === '' ? null : Number(s(f, k)));
  const row = {
    slug: s(f, 'slug').toLowerCase().replace(/[^a-z0-9-]+/g, '-'), title: s(f, 'title'), tagline: s(f, 'tagline') || null,
    description: s(f, 'description') || null, host: s(f, 'host') || null, starts_on: s(f, 'starts_on'), ends_on: s(f, 'ends_on') || null,
    time_label: s(f, 'time_label') || null, venue: s(f, 'venue'), focus: s(f, 'focus').split('\n').map(x => x.trim()).filter(Boolean),
    audience: s(f, 'audience') || null, price_usd: num('price_usd') ?? 0, member_price_usd: num('member_price_usd'),
    price_note: s(f, 'price_note') || null, capacity: num('capacity'), form_fields, published: !!f.get('published'),
  };
  if (!row.slug || !row.title || !row.starts_on || !row.venue) redirect('/admin/workshops?error=' + encodeURIComponent('Slug, title, date and venue are required.'));
  const { error } = await adminClient().from('workshops').upsert(row, { onConflict: 'slug' });
  redirect('/admin/workshops?' + (error ? 'error=' + encodeURIComponent(error.message) : 'saved=1'));
}
