'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminClient, currentUser } from '@/lib/supabase';
import { TEST, PACKS, ORG_PACKS, CERTIFICATE_FEE, CONSENT_VERSION, REASSESS_AFTER_DAYS, type PackKey, type OrgPackKey } from '@/lib/assessments/catalog';
import { firstItems, nextItem, scoreAttempt } from '@/lib/assessments/scoring';
import { newOrderRef, newInvoice, issueCertificate, markOrderPaid, availableCredits, type Attempt } from '@/lib/assessments/server';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const go = (path: string, msg?: string): never => redirect(msg ? `${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}` : path);

async function needUser(back = '/assessments') {
  const u = await currentUser();
  if (!u.user) redirect(`/login?as=candidate&next=${encodeURIComponent(back)}`);
  return u as typeof u & { user: NonNullable<typeof u.user> };
}

// ── Consent (ITC / ISO 10667: informed consent before any assessment) ──
export async function saveConsent(f: FormData) {
  const { user } = await needUser();
  if (s(f, 'agree') !== 'on') go('/assessments#consent', 'Please tick the consent box to continue.');
  await adminClient().from('assessment_consents').upsert({ user_id: user.id, version: CONSENT_VERSION, share_with_employers: s(f, 'share') === 'on', consented_at: new Date().toISOString() });
  redirect(s(f, 'next') || '/assessments?consented=1');
}

// ── Buying sittings, packs and certificates ──
export async function buy(f: FormData) {
  const { user } = await needUser();
  const items: any[] = [];
  for (const c of f.getAll('test').map(String)) { const t = TEST(c); if (t && t.price > 0) items.push({ type: 'test', code: c, qty: 1, unit: t.price, label: `${t.name}: one timed sitting` }); }
  const pk = s(f, 'pack') as PackKey; if (PACKS[pk]) items.push({ type: 'pack', code: pk, qty: 1, unit: PACKS[pk].price, label: `${PACKS[pk].name} pack` });
  const certs = Math.min(10, Number(s(f, 'certificates') || 0)); if (certs > 0) items.push({ type: 'certificate', code: 'certificate', qty: certs, unit: CERTIFICATE_FEE, label: '5-star certificate download' });
  if (!items.length) go('/assessments#buy', 'Choose at least one test, pack or certificate.');
  return createOrder({ user_id: user.id, email: user.email!, items, pay_option: s(f, 'pay_option') === 'invoice' ? 'invoice' : 'paynow', back: '/assessments' });
}

export async function buyOrgPack(f: FormData) {
  const { sb, user, role } = await needUser('/employer/assessments');
  if (role !== 'employer') redirect('/');
  const { data: e } = await sb.from('employers').select('id,contact_email').eq('owner_id', user.id).maybeSingle();
  if (!e) go('/employer', 'Set up your company profile first.');
  const k = s(f, 'pack') as OrgPackKey; const p = ORG_PACKS[k];
  if (!p) go('/employer/assessments', 'Choose a pack.');
  return createOrder({ user_id: user.id, employer_id: e!.id, email: e!.contact_email || user.email!, pay_option: s(f, 'pay_option') === 'invoice' ? 'invoice' : 'paynow', back: '/employer/assessments',
    items: [{ type: 'org_pack', code: k, qty: 1, unit: p!.price, label: `Career Intelligence group pack: ${p!.name}`, cohort: s(f, 'cohort') || null }] });
}

async function createOrder(o: { user_id: string; employer_id?: string; email: string; items: any[]; pay_option: 'paynow' | 'invoice'; back: string }) {
  const db = adminClient();
  const amount = o.items.reduce((n, i) => n + i.unit * (i.qty || 1), 0);
  const reference = newOrderRef();
  const { data: order, error } = await db.from('assessment_orders').insert({ reference, invoice_no: newInvoice(), user_id: o.user_id, employer_id: o.employer_id || null,
    items: o.items.map(i => ({ ...i, label: i.label })), amount, pay_option: o.pay_option }).select('id').single();
  if (error || !order) go(o.back, 'We could not create your order. Please try again.');
  if (o.pay_option === 'paynow') redirect(`/assessments/pay/${reference}`);
  redirect(`/assessments/order/${reference}?new=1`);
}

// ── Taking a test ──
export async function startTest(f: FormData) {
  const code = s(f, 'code'); const t = TEST(code);
  const { user } = await needUser(`/assessments#${code}`);
  if (!t) go('/assessments');
  const db = adminClient();
  const { data: consent } = await db.from('assessment_consents').select('version').eq('user_id', user.id).maybeSingle();
  if (!consent) go(`/assessments?start=${code}#consent`, 'Please read and accept the consent statement first.');

  const { data: prev } = await db.from('assessment_attempts').select('id,status,expires_at,completed_at').eq('user_id', user.id).eq('test_code', code).order('started_at', { ascending: false }).limit(1);
  const last = prev?.[0];
  if (last?.status === 'in_progress' && new Date(last.expires_at).getTime() > Date.now()) redirect(`/assessments/take/${last.id}`);
  if (last?.status === 'in_progress') await db.from('assessment_attempts').update({ status: 'expired' }).eq('id', last.id);
  const { data: done } = await db.from('assessment_attempts').select('completed_at').eq('user_id', user.id).eq('test_code', code).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1);
  if (done?.[0] && Date.now() - new Date(done[0].completed_at).getTime() < REASSESS_AFTER_DAYS * 86400e3)
    go('/assessments', `You completed ${t!.name} recently. Reassessment opens ${REASSESS_AFTER_DAYS} days after your last sitting, so practice effects do not distort your result.`);

  let credit_id: string | null = null;
  if (t!.price > 0) {
    const credits = await availableCredits(user.id);
    const id = credits[code]?.[0];
    if (!id) go(`/assessments?buy=${code}#buy`, `${t!.name} needs a paid sitting. Buy one below, then start the test.`);
    const { data: claimed } = await db.from('assessment_credits').update({ used_at: new Date().toISOString() }).eq('id', id!).is('used_at', null).select('id');
    if (!claimed?.length) go('/assessments', 'That sitting was already used. Please try again.');
    credit_id = id!;
  }
  const { data: cand } = await db.from('candidates').select('assessment_extra_time_pct').eq('user_id', user.id).maybeSingle();
  const extra = Math.max(0, Math.min(100, cand?.assessment_extra_time_pct || 0));
  const limit = Math.round(t!.minutes * 60 * (1 + extra / 100));
  const started = new Date();
  const { data: a, error } = await db.from('assessment_attempts').insert({
    user_id: user.id, test_code: code, test_version: t!.version, credit_id, status: 'in_progress', started_at: started.toISOString(),
    expires_at: new Date(started.getTime() + limit * 1000).toISOString(), time_limit_s: limit, extra_time_pct: extra, item_order: firstItems(t!), responses: {},
  }).select('id').single();
  if (error || !a) { if (credit_id) await db.from('assessment_credits').update({ used_at: null }).eq('id', credit_id); go('/assessments', 'Could not start the test. Please try again.'); }
  if (credit_id) await db.from('assessment_credits').update({ used_for: a!.id }).eq('id', credit_id);
  redirect(`/assessments/take/${a!.id}`);
}

const GRACE_MS = 5000; // network allowance; the timer itself is enforced here, not in the browser

export async function answer(f: FormData) {
  const { user } = await needUser();
  const db = adminClient();
  const id = s(f, 'attempt');
  const { data } = await db.from('assessment_attempts').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  const a = data as Attempt | null;
  if (!a) redirect('/assessments');
  if (a.status !== 'in_progress') redirect(`/assessments/take/${a.id}`);
  if (Date.now() > new Date(a.expires_at).getTime() + GRACE_MS) {
    await db.from('assessment_attempts').update({ status: 'expired' }).eq('id', a.id).eq('status', 'in_progress');
    redirect(`/assessments/take/${a.id}`);
  }
  const t = TEST(a.test_code)!;
  const expected = nextItem(t, a.item_order, a.responses);
  const item = s(f, 'item'), raw = s(f, 'v');
  if (!expected || item !== expected || raw === '') redirect(`/assessments/take/${a.id}`); // stale tab or double submit
  const v = Number(raw);
  const def = t.items.find(i => i.id === item)!;
  const ok = def.type === 'forced' ? [-1, 0, 1].includes(v) : def.type === 'likert' ? v >= 1 && v <= 5 && Number.isInteger(v) : Number.isInteger(v) && v >= 0 && v < (def as any).options.length;
  if (!ok) redirect(`/assessments/take/${a.id}`);
  const prevAt = Math.max(new Date(a.started_at).getTime(), ...Object.values(a.responses).map((x: any) => x.at || 0));
  const now = Date.now();
  const responses = { ...a.responses, [item]: { v, ms: now - prevAt, at: now } };
  const order = [...a.item_order];
  const nxt = nextItem(t, order, responses);
  if (nxt && !order.includes(nxt)) order.push(nxt);
  if (!nxt) {
    const scores = scoreAttempt(t, order, responses);
    await db.from('assessment_attempts').update({ responses, item_order: order, status: 'completed', completed_at: new Date().toISOString(), scores }).eq('id', a.id).eq('status', 'in_progress');
    redirect(`/assessments/result/${a.id}?done=1`);
  }
  await db.from('assessment_attempts').update({ responses, item_order: order }).eq('id', a.id).eq('status', 'in_progress');
  redirect(`/assessments/take/${a.id}`);
}

// ── Vouchers from employers / programmes ──
export async function redeemVoucher(f: FormData) {
  const { user } = await needUser('/assessments#voucher');
  const db = adminClient();
  const codeIn = s(f, 'code').toUpperCase().replace(/\s+/g, '');
  const { data: claimed } = await db.from('assessment_vouchers').update({ redeemed_by: user.id, redeemed_at: new Date().toISOString(), share_progress: s(f, 'share') === 'on' })
    .eq('code', codeIn).is('redeemed_by', null).select('id,pack');
  const v = claimed?.[0];
  if (!v) go('/assessments#voucher', 'That code is not valid or has already been used.');
  const p = PACKS[(v!.pack as PackKey) || 'full'];
  const rows = [...p.tests.map(t => ({ user_id: user.id, item: t, source: 'voucher', voucher_id: v!.id })),
    ...Array.from({ length: p.certificates }, () => ({ user_id: user.id, item: 'certificate', source: 'voucher', voucher_id: v!.id }))];
  await db.from('assessment_credits').insert(rows);
  redirect('/assessments?redeemed=1');
}

// ── Certificates ──
export async function generateCertificate() {
  const { user } = await needUser('/candidate#career');
  const credits = await availableCredits(user.id);
  const id = credits.certificate?.[0];
  if (!id) {
    // No credit: start a US$1 order for one certificate.
    return createOrder({ user_id: user.id, email: user.email!, items: [{ type: 'certificate', code: 'certificate', qty: 1, unit: CERTIFICATE_FEE, label: '5-star certificate download' }], pay_option: 'paynow', back: '/candidate#career' });
  }
  const r = await issueCertificate(user.id, id);
  if ('error' in r && r.error) go('/candidate#career', r.error);
  redirect(`/certificates/${(r as any).serial}?new=1`);
}

// ── Self-assessment with evidence (verified by the office) ──
export async function saveEvidence(f: FormData) {
  const { user } = await needUser('/assessments#evidence');
  const competency = s(f, 'competency'), rating = Number(s(f, 'rating'));
  if (!competency || !(rating >= 1 && rating <= 4)) go('/assessments#evidence', 'Choose a competency and a self-rating.');
  const url = s(f, 'evidence_url');
  if (url && !/^https?:\/\//i.test(url)) go('/assessments#evidence', 'Evidence links must start with http:// or https://');
  await adminClient().from('competency_evidence').upsert({ user_id: user.id, competency, self_rating: rating, evidence: s(f, 'evidence').slice(0, 2000) || null,
    evidence_url: url || null, status: 'submitted', reviewer_note: null, reviewed_at: null }, { onConflict: 'user_id,competency' });
  redirect('/assessments?evidence=1#evidence');
}

// ── Office (staff) ──
async function staff() { const { role } = await currentUser(); if (role !== 'staff') redirect('/'); }

export async function staffMarkOrder(f: FormData) {
  await staff();
  const id = s(f, 'id');
  if (s(f, 'action') === 'cancel') await adminClient().from('assessment_orders').update({ status: 'cancelled' }).eq('id', id).eq('status', 'awaiting_payment');
  else await markOrderPaid(id, s(f, 'via') || 'ecocash');
  revalidatePath('/admin/assessments');
}
export async function staffValidation(f: FormData) {
  await staff();
  const status = s(f, 'status'), evidence = s(f, 'evidence');
  if (status !== 'pilot' && evidence.length < 20) redirect('/admin/assessments?error=' + encodeURIComponent('Moving a test out of pilot needs the study that supports it (sample, statistics, reviewer).'));
  await adminClient().from('assessment_validation').upsert({ test_code: s(f, 'code'), status, evidence: evidence || null, updated_at: new Date().toISOString() });
  revalidatePath('/admin/assessments');
}
export async function staffExtraTime(f: FormData) {
  await staff();
  const pct = Math.max(0, Math.min(100, Number(s(f, 'pct')) || 0));
  const { error } = await adminClient().from('candidates').update({ assessment_extra_time_pct: pct }).ilike('email', s(f, 'email'));
  redirect('/admin/assessments?' + (error ? 'error=' + encodeURIComponent(error.message) : 'saved=1') + '#access');
}
export async function staffEvidence(f: FormData) {
  await staff();
  await adminClient().from('competency_evidence').update({ status: s(f, 'status') === 'verified' ? 'verified' : 'not_verified', reviewer_note: s(f, 'note') || null, reviewed_at: new Date().toISOString() }).eq('id', s(f, 'id'));
  revalidatePath('/admin/assessments');
}
export async function staffGrant(f: FormData) {
  await staff();
  const db = adminClient();
  const { data: u } = await db.from('candidates').select('user_id').ilike('email', s(f, 'email')).not('user_id', 'is', null).limit(1);
  if (!u?.[0]) redirect('/admin/assessments?error=' + encodeURIComponent('No signed-up candidate with that email.') + '#grant');
  const item = s(f, 'item');
  if (item !== 'certificate' && !TEST(item)) redirect('/admin/assessments?error=unknown+item#grant');
  await db.from('assessment_credits').insert({ user_id: u![0].user_id, item, source: 'staff' });
  redirect('/admin/assessments?saved=1#grant');
}

