// Server-only helpers: profile loading, credits, order fulfilment, certificates. Uses the service client;
// every caller checks the signed-in user first.
import { createHmac, randomBytes } from 'crypto';
import { adminClient } from '@/lib/supabase';
import { TESTS, TEST, PACKS, ORG_PACKS, AREAS, type Area, type PackKey, type OrgPackKey } from './catalog';
import type { Scores } from './scoring';
import type { Profile } from './career';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const code = (n: number) => Array.from(randomBytes(n), b => ABC[b % ABC.length]).join('');
export const newOrderRef = () => 'TMJ-AS-' + code(10);
export const newInvoice = () => { const d = new Date(); return `INV-AS-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${code(5)}`; };

export type Attempt = {
  id: string; user_id: string; test_code: string; test_version: string; status: 'in_progress' | 'completed' | 'expired';
  started_at: string; expires_at: string; time_limit_s: number; extra_time_pct: number; item_order: string[];
  responses: Record<string, { v: number; ms?: number }>; scores: Scores | null; completed_at: string | null;
};

export async function loadProfile(userId: string) {
  const db = adminClient();
  const [{ data: attempts }, { data: val }, { data: cand }, { data: ev }] = await Promise.all([
    db.from('assessment_attempts').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(200),
    db.from('assessment_validation').select('test_code,status,evidence'),
    db.from('candidates').select('full_name,headline,categories,cv_text,candidate_notes,profile,gap_answers').eq('user_id', userId).maybeSingle(),
    db.from('competency_evidence').select('*').eq('user_id', userId),
  ]);
  const list = (attempts || []) as Attempt[];
  const scores: Record<string, Scores> = {};
  const latest: Record<string, Attempt> = {};
  for (const a of list) if (a.status === 'completed' && a.scores && !scores[a.test_code]) { scores[a.test_code] = a.scores; latest[a.test_code] = a; }
  const validation: Record<string, string> = {};
  for (const v of val || []) validation[v.test_code] = v.status;
  const text = [cand?.headline, ...(cand?.categories || []), cand?.cv_text, cand?.candidate_notes, JSON.stringify(cand?.profile || {}), JSON.stringify(cand?.gap_answers || {}),
    ...(ev || []).filter((e: any) => e.status === 'verified').map((e: any) => `${e.competency} ${e.evidence || ''}`)].join(' ').toLowerCase();
  const profile: Profile = { scores, validation, text, verified: (ev || []).filter((e: any) => e.status === 'verified').map((e: any) => e.competency) };
  return { profile, attempts: list, latest, evidence: ev || [], candidate: cand, validationRows: val || [] };
}

export async function availableCredits(userId: string) {
  const { data } = await adminClient().from('assessment_credits').select('id,item').eq('user_id', userId).is('used_at', null);
  const n: Record<string, string[]> = {};
  for (const c of data || []) (n[c.item] ||= []).push(c.id);
  return n;
}

// Stars on the certificate: one per assessment area with at least one completed test (5 areas → 5 stars).
export function snapshot(latest: Record<string, Attempt>) {
  const done = TESTS.filter(t => latest[t.code]).map(t => ({ code: t.code, name: t.name, area: t.area, date: latest[t.code].completed_at!.slice(0, 10) }));
  const pending = TESTS.filter(t => !latest[t.code]).map(t => ({ code: t.code, name: t.name, area: t.area }));
  const areas = (Object.keys(AREAS) as Area[]).filter(a => done.some(d => d.area === a));
  return { done, pending, stars: areas.length, areas };
}

const secret = () => process.env.CERTIFICATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'tigermax-dev-secret';
export function signCertificate(c: { serial: string; full_name: string; issued_at: string; stars: number; snapshot: any }) {
  const body = [c.serial, c.full_name.trim().toUpperCase(), c.issued_at.slice(0, 19), c.stars, JSON.stringify(c.snapshot)].join('|');
  return createHmac('sha256', secret()).update(body).digest('hex');
}
export const securityCode = (sig: string) => sig.slice(0, 16).toUpperCase().match(/.{4}/g)!.join('-');

export async function issueCertificate(userId: string, creditId: string) {
  const db = adminClient();
  const { latest, candidate } = await loadProfile(userId);
  const { data: prof } = await db.from('profiles').select('full_name').eq('id', userId).maybeSingle();
  const full_name = (candidate?.full_name || prof?.full_name || '').trim();
  if (!full_name) return { error: 'Add your full name to your CV profile first: it is printed on the certificate.' };
  const snap = snapshot(latest);
  if (!snap.done.length) return { error: 'Complete at least one test before generating a certificate.' };
  const serial = `TMJ-CI-${new Date().getFullYear()}-${code(8)}`;
  const issued_at = new Date().toISOString();
  const snapData = { done: snap.done, pending: snap.pending, areas: snap.areas };
  const signature = signCertificate({ serial, full_name, issued_at, stars: snap.stars, snapshot: snapData });
  // Claim the credit first so it cannot be used twice.
  const { data: claimed } = await db.from('assessment_credits').update({ used_at: issued_at }).eq('id', creditId).eq('user_id', userId).is('used_at', null).select('id');
  if (!claimed?.length) return { error: 'No certificate credit available.' };
  const { data: cert, error } = await db.from('assessment_certificates').insert({ serial, user_id: userId, credit_id: creditId, full_name, stars: snap.stars, snapshot: snapData, signature, issued_at }).select('id,serial').single();
  if (error) { await db.from('assessment_credits').update({ used_at: null }).eq('id', creditId); return { error: error.message }; }
  await db.from('assessment_credits').update({ used_for: cert.id }).eq('id', creditId);
  return { serial: cert.serial };
}

// Paid order → credits (one per sitting), vouchers for employer packs, and certificates issued straight away.
export async function fulfilOrder(orderId: string) {
  const db = adminClient();
  const { data: claimed } = await db.from('assessment_orders').update({ fulfilled_at: new Date().toISOString() })
    .eq('id', orderId).eq('status', 'paid').is('fulfilled_at', null).select('*');
  const o = claimed?.[0]; if (!o) return;
  const credits: any[] = []; const vouchers: any[] = []; const certs: string[] = [];
  for (const it of o.items as any[]) {
    for (let q = 0; q < (it.qty || 1); q++) {
      if (it.type === 'test') credits.push({ user_id: o.user_id, item: it.code, source: 'order', order_id: o.id });
      if (it.type === 'pack') { const p = PACKS[it.code as PackKey]; p.tests.forEach(t => credits.push({ user_id: o.user_id, item: t, source: 'order', order_id: o.id }));
        for (let i = 0; i < p.certificates; i++) credits.push({ user_id: o.user_id, item: 'certificate', source: 'order', order_id: o.id }); }
      if (it.type === 'certificate') certs.push('x');
      if (it.type === 'org_pack') { const p = ORG_PACKS[it.code as OrgPackKey];
        for (let i = 0; i < p.seats; i++) vouchers.push({ code: `TMX-${code(4)}-${code(4)}`, employer_id: o.employer_id, order_id: o.id, pack: 'full', cohort: it.cohort || null }); }
    }
  }
  if (credits.length) await db.from('assessment_credits').insert(credits);
  if (vouchers.length) await db.from('assessment_vouchers').insert(vouchers);
  for (const _ of certs) {
    const { data: c } = await db.from('assessment_credits').insert({ user_id: o.user_id, item: 'certificate', source: 'order', order_id: o.id }).select('id').single();
    if (c) await issueCertificate(o.user_id, c.id);
  }
}

export async function markOrderPaid(orderId: string, via: string) {
  const db = adminClient();
  await db.from('assessment_orders').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: via }).eq('id', orderId).eq('status', 'awaiting_payment');
  await fulfilOrder(orderId);
}

export const testName = (c: string) => (c === 'certificate' ? '5-star certificate' : TEST(c)?.name || c);
