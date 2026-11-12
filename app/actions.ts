'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { userClient, currentUser, adminClient } from '@/lib/supabase';
import { makeAlias } from '@/lib/mail';
import { PLANS, PlanKey } from '@/lib/plans';
import { paynow } from '@/lib/paynow';
import { sendPrepared } from '@/lib/apply';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const list = (v: string) => v.split(/\n|;/).map(x => x.trim()).filter(Boolean);

// ---------- Auth ----------
export async function signUp(f: FormData) {
  const sb = userClient();
  const role = s(f, 'role') === 'employer' ? 'employer' : 'candidate';
  const { error } = await sb.auth.signUp({
    email: s(f, 'email'), password: s(f, 'password'),
    options: { data: { role, full_name: s(f, 'full_name') }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login` },
  });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  redirect('/login?check=1');
}

export async function signIn(f: FormData) {
  const sb = userClient();
  const { error } = await sb.auth.signInWithPassword({ email: s(f, 'email'), password: s(f, 'password') });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  const { role } = await currentUser();
  redirect(role === 'employer' ? '/employer' : role === 'staff' ? '/admin' : '/candidate');
}

export async function signOut() {
  await userClient().auth.signOut();
  redirect('/');
}

// ---------- Candidates ----------
export async function saveCandidate(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  if (!f.get('consent') || !f.get('truthful')) redirect('/candidate?error=' + encodeURIComponent('Please tick both declarations.'));

  const { data: existing } = await sb.from('candidates').select('id, apply_alias, cv_path').eq('user_id', user.id).maybeSingle();
  let cv_path = existing?.cv_path ?? null;
  const file = f.get('cv') as File | null;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) redirect('/candidate?error=' + encodeURIComponent('CV must be under 5 MB.'));
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    cv_path = `${user.id}/cv-${Date.now()}.${ext}`;
    const up = await sb.storage.from('cvs').upload(cv_path, file, { upsert: true, contentType: file.type });
    if (up.error) redirect('/candidate?error=' + encodeURIComponent(up.error.message));
  }
  const full_name = s(f, 'full_name');
  const row = {
    user_id: user.id, full_name, email: user.email!, phone: s(f, 'phone'), location: s(f, 'location'),
    headline: s(f, 'headline'), categories: list(s(f, 'categories').replace(/,/g, ';')),
    modes: f.getAll('modes').map(String), has_passport: s(f, 'has_passport') || 'unknown',
    cv_text: s(f, 'cv_text'), cv_path, auto_apply: !!f.get('auto_apply'),
    consent_at: new Date().toISOString(), truthful_at: new Date().toISOString(),
    apply_alias: existing?.apply_alias ?? makeAlias(full_name),
  };
  const res = existing ? await sb.from('candidates').update(row).eq('id', existing.id) : await sb.from('candidates').insert(row);
  if (res.error) redirect('/candidate?error=' + encodeURIComponent(res.error.message));
  revalidatePath('/candidate');
  redirect('/candidate?saved=1');
}

export async function applyToJob(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  const { data: c } = await sb.from('candidates').select('id').eq('user_id', user.id).maybeSingle();
  if (!c) redirect('/candidate?error=' + encodeURIComponent('Complete your CV profile first.'));
  const job_id = s(f, 'job_id');
  // Platform jobs go straight into the employer's pipeline; external jobs are queued for the office/auto-apply.
  const { data: job } = await sb.from('jobs').select('apply_method').eq('id', job_id).single();
  await sb.from('applications').upsert({
    job_id, candidate_id: c.id,
    stage: job?.apply_method === 'platform' ? 'applied' : 'matched',
    sent_via: job?.apply_method === 'platform' ? 'platform' : null,
    sent_at: job?.apply_method === 'platform' ? new Date().toISOString() : null,
  }, { onConflict: 'job_id,candidate_id', ignoreDuplicates: true });
  redirect('/candidate?applied=1');
}

// ---------- Employers ----------
export async function saveEmployer(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  const row = { owner_id: user.id, name: s(f, 'name'), reg_number: s(f, 'reg_number'), contact_name: s(f, 'contact_name'),
    contact_email: s(f, 'contact_email') || user.email, contact_phone: s(f, 'contact_phone'), address: s(f, 'address') };
  const { data: e } = await sb.from('employers').select('id').eq('owner_id', user.id).maybeSingle();
  const res = e ? await sb.from('employers').update(row).eq('id', e.id) : await sb.from('employers').insert(row);
  if (res.error) redirect('/employer?error=' + encodeURIComponent(res.error.message));
  redirect('/employer?saved=1');
}

export async function postJob(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  const { data: e } = await sb.from('employers').select('*').eq('owner_id', user.id).single();
  if (!e) redirect('/employer?error=' + encodeURIComponent('Set up your company profile first.'));
  // A listing goes live only if the company is verified and has a paid credit.
  const canPublish = e.verified && e.listing_credits > 0;
  const { error } = await sb.from('jobs').insert({
    employer_id: e.id, source: 'employer', title: s(f, 'title'), employer_name: e.name, location: s(f, 'location'),
    work_mode: s(f, 'work_mode') || 'onsite', category: s(f, 'category'), summary: s(f, 'summary'),
    requirements: list(s(f, 'requirements')), documents: list(s(f, 'documents')), pay: s(f, 'pay') || null,
    closes: s(f, 'closes') || null, apply_method: 'platform', status: canPublish ? 'live' : 'pending_payment',
  });
  if (error) redirect('/employer?error=' + encodeURIComponent(error.message));
  if (canPublish) await adminClient().from('employers').update({ listing_credits: e.listing_credits - 1 }).eq('id', e.id);
  redirect(canPublish ? '/employer?posted=1' : '/employer/billing?need=1');
}

export async function updateStage(f: FormData) {
  const sb = userClient();
  const id = s(f, 'id');
  const patch: any = { stage: s(f, 'stage'), employer_notes: s(f, 'notes') || null };
  if (s(f, 'interview_at')) patch.interview_at = new Date(s(f, 'interview_at')).toISOString();
  await sb.from('applications').update(patch).eq('id', id);
  revalidatePath('/employer/jobs/' + s(f, 'job_id'));
}

export async function startPayment(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  if (!process.env.PAYNOW_INTEGRATION_ID) redirect('/employer/billing?error=' + encodeURIComponent('Online payment is being set up. Please contact the Tigermax office to buy listings.'));
  const plan = s(f, 'plan') as PlanKey;
  const p = PLANS[plan];
  if (!p) redirect('/employer/billing');
  const { data: e } = await sb.from('employers').select('id, contact_email').eq('owner_id', user.id).single();
  if (!e) redirect('/employer');
  const reference = `TMJ-${Date.now().toString(36).toUpperCase()}`;
  const pn = paynow();
  const payment = pn.createPayment(reference, e.contact_email || user.email);
  payment.add(p.name, p.amount);
  const resp = await pn.send(payment);
  if (!resp?.success) redirect('/employer/billing?error=' + encodeURIComponent(resp?.error || 'Paynow error'));
  await adminClient().from('payments').insert({ employer_id: e.id, plan, amount: p.amount, reference, poll_url: resp.pollUrl });
  redirect(resp.redirectUrl);
}

// ---------- Office (staff) ----------
async function requireStaff() {
  const { role } = await currentUser();
  if (role !== 'staff') redirect('/');
}

export async function verifyEmployer(f: FormData) {
  await requireStaff();
  await userClient().from('employers').update({ verified: s(f, 'verified') === 'true' }).eq('id', s(f, 'id'));
  revalidatePath('/admin');
}

export async function setJobStatus(f: FormData) {
  await requireStaff();
  await userClient().from('jobs').update({ status: s(f, 'status') }).eq('id', s(f, 'id'));
  revalidatePath('/admin');
}

// Sends one prepared application by email from the candidate's Tigermax address.
export async function sendApplication(f: FormData) {
  await requireStaff();
  const result = await sendPrepared(s(f, 'id'));
  redirect('/admin?' + (result.ok ? 'sent=1' : 'error=' + encodeURIComponent(result.error!)));
}


// Office records a cash/bank payment by hand and adds listing credits.
export async function addCredits(f: FormData) {
  await requireStaff();
  const db = adminClient();
  const id = s(f, 'id');
  const { data: e } = await db.from('employers').select('listing_credits').eq('id', id).single();
  await db.from('employers').update({ listing_credits: (e?.listing_credits ?? 0) + Number(s(f, 'credits') || 0) }).eq('id', id);
  revalidatePath('/admin');
}
