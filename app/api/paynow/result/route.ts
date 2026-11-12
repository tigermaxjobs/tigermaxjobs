import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { paynow } from '@/lib/paynow';
import { PLANS, PlanKey } from '@/lib/plans';

// Paynow calls this when a payment status changes. We re-check the status with Paynow before crediting.
export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const reference = form.get('reference');
  if (!reference) return NextResponse.json({ ok: false }, { status: 400 });
  const db = adminClient();
  const { data: pay } = await db.from('payments').select('*').eq('reference', reference).single();
  if (!pay || pay.status === 'paid') return NextResponse.json({ ok: true });
  const status = await paynow().pollTransaction(pay.poll_url);
  if (!status?.paid?.()) {
    await db.from('payments').update({ status: status?.status ?? 'unknown' }).eq('id', pay.id);
    return NextResponse.json({ ok: true });
  }
  const plan = PLANS[pay.plan as PlanKey];
  const { data: e } = await db.from('employers').select('listing_credits').eq('id', pay.employer_id).single();
  await db.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', pay.id);
  await db.from('employers').update({
    listing_credits: (e?.listing_credits ?? 0) + plan.credits, plan: pay.plan,
    ...(plan.managed ? { managed_service: true } : {}),
  }).eq('id', pay.employer_id);
  return NextResponse.json({ ok: true });
}
