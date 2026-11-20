import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { paynowStatus } from '@/lib/paynow';
import { settlePayment } from '@/lib/payments';
import { fulfilOrder } from '@/lib/assessments/server';

// Paynow calls this when a payment status changes. We re-check the status with Paynow before crediting.
export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const reference = form.get('reference');
  if (!reference) return NextResponse.json({ ok: false }, { status: 400 });
  const db = adminClient();
  // Workshop registrations
  if (reference.startsWith('TMJ-WS-')) {
    const { data: r } = await db.from('workshop_registrations').select('id,status,poll_url').eq('reference', reference).single();
    if (!r || r.status === 'paid' || !r.poll_url) return NextResponse.json({ ok: true });
    const st = await paynowStatus(r.poll_url);
    if (st.paid) await db.from('workshop_registrations').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: 'paynow' }).eq('id', r.id);
    return NextResponse.json({ ok: true });
  }
  // Career Intelligence orders (sittings, packs, certificates, employer group packs)
  if (reference.startsWith('TMJ-AS-')) {
    const { data: o } = await db.from('assessment_orders').select('id,status,poll_url').eq('reference', reference).single();
    if (!o || o.status !== 'awaiting_payment' || !o.poll_url) return NextResponse.json({ ok: true });
    const st = await paynowStatus(o.poll_url);
    if (st.paid) {
      await db.from('assessment_orders').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: 'paynow' }).eq('id', o.id).eq('status', 'awaiting_payment');
      await fulfilOrder(o.id);
    }
    return NextResponse.json({ ok: true });
  }
  // Employer listings, offshore registration and CV services (all in the payments table)
  await settlePayment(reference);
  return NextResponse.json({ ok: true });
}
