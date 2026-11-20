'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { userClient, currentUser, adminClient } from '@/lib/supabase';
import { makeAlias } from '@/lib/mail';
import { PLANS, PlanKey, CANDIDATE_FEES, type CandidateFeeKey } from '@/lib/plans';
import { paynow, payerEmail, siteUrl } from '@/lib/paynow';
import { sendPrepared } from '@/lib/apply';
import { extractCvText } from '@/lib/cvtext';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const list = (v: string) => v.split(/\n|;/).map(x => x.trim()).filter(Boolean);

// ---------- Auth ----------
// Sign in, sign up, forgot password and reset password each have their own page (/login, /signup,
// /forgot-password, /reset-password). After success people go back to the page that sent them (?next=).
const safeNext = (v: string) => (v.startsWith('/') && !v.startsWith('//') ? v : '');
const withNext = (path: string, next: string, extra = '') => {
  const q = new URLSearchParams();
  if (extra) new URLSearchParams(extra).forEach((v, k) => q.set(k, v));
  if (next) q.set('next', next);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
};

const landing = async (next: string, welcome = false) => {
  if (safeNext(next)) redirect(next);
  const { role } = await currentUser();
  redirect(role === 'employer' ? '/employer' : role === 'staff' ? '/admin' : welcome ? '/candidate?welcome=1' : '/candidate');
};

// Creates the account straight away (no email confirmation). One email = one account.
export async function signUp(f: FormData) {
  const role = s(f, 'role') === 'employer' ? 'employer' : 'candidate';
  const next = safeNext(s(f, 'next'));
  const email = s(f, 'email').toLowerCase();
  const full_name = s(f, 'full_name');
  const password = String(f.get('password') ?? '');
  const back = (msg: string) => redirect(withNext('/signup', next, `as=${role}&error=${encodeURIComponent(msg)}`));
  if (!f.get('details_correct')) back('Please tick the box to confirm your details are correct.');
  if (!full_name) back('Please enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) back('Please enter a valid email address.');
  if (password.length < 8) back('Your password must be at least 8 characters.');
  if (password !== String(f.get('password2') ?? '')) back('The two passwords do not match.');

  const { error } = await adminClient().auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { role, full_name, details_confirmed_at: new Date().toISOString() },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message) || (error as any).code === 'email_exists')
      redirect(withNext('/login', next, `as=${role}&exists=1&email=${encodeURIComponent(email)}`));
    back(error.message);
  }
  const { error: e2 } = await userClient().auth.signInWithPassword({ email, password });
  if (e2) redirect(withNext('/login', next, `as=${role}&email=${encodeURIComponent(email)}`));
  await landing(next, true);
}

export async function signIn(f: FormData) {
  const next = safeNext(s(f, 'next'));
  const email = s(f, 'email').toLowerCase();
  const { error } = await userClient().auth.signInWithPassword({ email, password: String(f.get('password') ?? '') });
  if (error) {
    const msg = /invalid login credentials/i.test(error.message) ? 'Wrong email or password. Check them, or reset your password below.'
      : /not confirmed/i.test(error.message) ? 'Your account needs activating. WhatsApp the office on +263 77 133 1008 and we will activate it straight away.'
      : error.message;
    redirect(withNext('/login', next, `error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}`));
  }
  await landing(next);
}

// Sends a reset link to the email the account was registered with. The page always shows the same
// message, so it does not reveal which emails have accounts.
export async function requestPasswordReset(f: FormData) {
  const email = s(f, 'email').toLowerCase();
  const next = safeNext(s(f, 'next'));
  if (email) {
    const { error } = await userClient().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/reset-password` });
    if (error && /rate limit|security purposes/i.test(error.message))
      redirect(withNext('/forgot-password', next, `error=${encodeURIComponent('Please wait a minute before asking for another link.')}`));
  }
  redirect(withNext('/forgot-password', next, `sent=1&email=${encodeURIComponent(email)}`));
}

// Sets the new password from the reset link (token_hash from our email template, or code from the default one).
export async function updatePassword(f: FormData) {
  const sb = userClient();
  const token_hash = s(f, 'token_hash'), code = s(f, 'code');
  const password = String(f.get('password') ?? '');
  const keep = new URLSearchParams();
  if (token_hash) keep.set('token_hash', token_hash);
  if (code) keep.set('code', code);
  const back = (msg: string) => redirect(`/reset-password?${keep.toString()}&error=${encodeURIComponent(msg)}`);
  if (password.length < 8) back('Your new password must be at least 8 characters.');
  if (password !== String(f.get('password2') ?? '')) back('The two passwords do not match.');
  if (token_hash) {
    const { error } = await sb.auth.verifyOtp({ token_hash, type: 'recovery' });
    if (error) redirect('/forgot-password?error=' + encodeURIComponent('That reset link has expired or was already used. Request a new one below.'));
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) redirect('/forgot-password?error=' + encodeURIComponent('That reset link has expired or was opened on a different device. Request a new one below and open it on this device.'));
  } else {
    const { data } = await sb.auth.getUser();
    if (!data.user) redirect('/forgot-password?error=' + encodeURIComponent('Request a reset link first.'));
  }
  const { error } = await sb.auth.updateUser({ password });
  if (error) back(error.message);
  const { role } = await currentUser();
  redirect(role === 'employer' ? '/employer?pw=1' : role === 'staff' ? '/admin' : '/candidate?pw=1');
}

// Old confirmation emails still link to /auth/confirm; this keeps those links working.
export async function confirmEmail(f: FormData) {
  const type = (['signup', 'email', 'invite', 'magiclink', 'recovery', 'email_change'].includes(s(f, 'type')) ? s(f, 'type') : 'signup') as any;
  const { error } = await userClient().auth.verifyOtp({ token_hash: s(f, 'token_hash'), type });
  if (error) redirect('/login?error=' + encodeURIComponent('Your account is already active. Sign in with your email and password.'));
  await landing(s(f, 'next'));
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
  let extracted = '';
  const file = f.get('cv') as File | null;
  if (file && file.size > 0) {
    extracted = await extractCvText(file);
    if (file.size > 5 * 1024 * 1024) redirect('/candidate?error=' + encodeURIComponent('CV must be under 5 MB.'));
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    cv_path = `${user.id}/cv-${Date.now()}.${ext}`;
    const up = await sb.storage.from('cvs').upload(cv_path, file, { upsert: true, contentType: file.type });
    if (up.error) redirect('/candidate?error=' + encodeURIComponent(up.error.message));
  }
  const full_name = s(f, 'full_name');
  const modes = f.getAll('modes').map(String).filter(m => ['onsite', 'remote', 'offshore'].includes(m));
  if (!modes.length) redirect('/candidate?error=' + encodeURIComponent('Please tick at least one job type: Zimbabwe, Online or Abroad.'));
  const has_passport = s(f, 'has_passport');
  if (!['yes', 'no', 'unknown'].includes(has_passport)) redirect('/candidate?error=' + encodeURIComponent('Please answer the passport question.'));
  // Hire status and the extra-notes box are asked on first sign-up; afterwards the "My status" card and
  // "Add to my CV" section on the candidate page update them.
  const extra: Record<string, any> = {};
  if (f.has('hire_status')) {
    const hs = s(f, 'hire_status');
    if (!HIRE_STATUSES.includes(hs)) redirect('/candidate?error=' + encodeURIComponent('Please choose your hire status.'));
    extra.hire_status = hs; extra.hire_status_updated_at = new Date().toISOString();
  }
  if (f.has('candidate_notes')) extra.candidate_notes = s(f, 'candidate_notes') || null;
  const row = {
    user_id: user.id, full_name, email: user.email!, phone: s(f, 'phone'), location: s(f, 'location'),
    headline: s(f, 'headline'), categories: list(s(f, 'categories').replace(/,/g, ';')),
    modes, has_passport,
    cv_text: extracted || s(f, 'cv_text') || (existing ? undefined : null), cv_path, auto_apply: !!f.get('auto_apply'),
    consent_at: new Date().toISOString(), truthful_at: new Date().toISOString(),
    apply_alias: existing?.apply_alias ?? makeAlias(full_name),
    ...extra,
  };
  const res = existing ? await sb.from('candidates').update(row).eq('id', existing.id) : await sb.from('candidates').insert(row);
  if (res.error) redirect('/candidate?error=' + encodeURIComponent(res.error.message));
  revalidatePath('/candidate');
  redirect('/candidate?saved=1');
}

const HIRE_STATUSES = ['open', 'employed_open', 'employed_not_open'];

// "My status" card: candidate confirms or changes hire status (resets the 45-day reminder).
export async function setHireStatus(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  const status = s(f, 'hire_status');
  if (!HIRE_STATUSES.includes(status)) redirect('/candidate?error=' + encodeURIComponent('Please choose one of the three options.'));
  const { data: c } = await sb.from('candidates').select('id').eq('user_id', user.id).maybeSingle();
  if (!c) redirect('/candidate?error=' + encodeURIComponent('Save your CV profile first.'));
  const { error } = await sb.rpc('set_hire_status', { cand: c.id, new_status: status });
  if (error) redirect('/candidate?error=' + encodeURIComponent(error.message));
  revalidatePath('/candidate');
  redirect('/candidate?status=1');
}

// "Add to my CV / answer questions": answers to the CV questions plus free notes.
export async function saveNotes(f: FormData) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  const { data: c } = await sb.from('candidates').select('id, issues').eq('user_id', user.id).maybeSingle();
  if (!c) redirect('/candidate?error=' + encodeURIComponent('Save your CV profile first.'));
  const answers: Record<string, string> = {};
  ((c.issues as any[]) || []).forEach((q, i) => {
    const a = s(f, `answer_${i}`);
    if (a && q?.question) answers[q.question] = a;
  });
  const { error } = await sb.rpc('save_candidate_notes', { cand: c.id, notes: s(f, 'notes'), answers });
  if (error) redirect('/candidate?error=' + encodeURIComponent(error.message));
  revalidatePath('/candidate');
  redirect('/candidate?notes=1#add-to-cv');
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
  const pn = paynow(`/pay/status/${reference}?back=${encodeURIComponent('/employer/billing')}`);
  const payment = pn.createPayment(reference, payerEmail(e.contact_email || user.email));
  payment.add(p.name, p.amount);
  const resp = await pn.send(payment);
  if (!resp?.success) redirect('/employer/billing?error=' + encodeURIComponent(resp?.error || 'Paynow error'));
  await adminClient().from('payments').insert({ employer_id: e.id, user_id: user.id, plan, amount: p.amount, reference, poll_url: resp.pollUrl, payer_email: e.contact_email || user.email });
  redirect(resp.redirectUrl);
}

// Job seeker pays for a service (offshore registration, CV writing) from its own page, /pay/<item>.
// Paynow sends them back to /pay/status/<reference>, which links back to where they started.
export async function startCandidatePayment(f: FormData) {
  const item = s(f, 'item') as CandidateFeeKey;
  const fee = CANDIDATE_FEES[item];
  if (!fee) redirect('/candidate');
  const page = `/pay/${item}`;
  const ret = safeNext(s(f, 'back')) || '/candidate';
  const back = (msg: string) => redirect(`${page}?back=${encodeURIComponent(ret)}&error=${encodeURIComponent(msg)}`);
  const { sb, user, role } = await currentUser();
  if (!user) redirect(`/login?as=candidate&next=${encodeURIComponent(page)}`);
  if (role !== 'candidate' && role !== 'staff') back('This service is for job seekers. Sign in with your job seeker account.');
  if (s(f, 'agree') !== 'on') back('Please tick the box to confirm before paying.');
  if (!process.env.PAYNOW_INTEGRATION_ID) back('Online payment is being set up. Please WhatsApp the Tigermax office on +263 77 133 1008 to pay.');
  const { data: c } = await sb.from('candidates').select('id, email, full_name').eq('user_id', user.id).maybeSingle();
  if (item === 'offshore' && !c) back('Save your CV profile first, then register.');
  const { data: prof } = await sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const reference = `TMJ-${item === 'offshore' ? 'OFF' : 'CV'}-${Date.now().toString(36).toUpperCase()}`;
  const pn = paynow(`/pay/status/${reference}?back=${encodeURIComponent(ret)}`);
  const payment = pn.createPayment(reference, payerEmail(c?.email || user.email));
  payment.add(fee.name, fee.amount);
  const resp = await pn.send(payment);
  if (!resp?.success) back(resp?.error || 'Paynow could not start the payment. Please try again.');
  await adminClient().from('payments').insert({
    candidate_id: c?.id ?? null, user_id: user.id, plan: item, amount: fee.amount, reference, poll_url: resp.pollUrl,
    payer_name: c?.full_name || prof?.full_name || null, payer_email: user.email,
  });
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
