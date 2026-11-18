import { adminClient } from '@/lib/supabase';
import { paynow } from '@/lib/paynow';

// Paynow link for an order (also printed on the invoice).
export async function paynowForOrder(reference: string): Promise<string> {
  const db = adminClient();
  const { data: o } = await db.from('assessment_orders').select('*').eq('reference', reference).maybeSingle();
  if (!o) return '/assessments';
  if (o.status !== 'awaiting_payment') return `/assessments/order/${reference}`;
  if (!process.env.PAYNOW_INTEGRATION_ID) { await db.from('assessment_orders').update({ pay_option: 'invoice' }).eq('id', o.id); return `/assessments/order/${reference}?nopaynow=1`; }
  const pn = paynow(`/assessments/order/${reference}?paid=1`);
  const { data: u } = o.user_id ? await db.auth.admin.getUserById(o.user_id) : { data: null as any };
  const payment = pn.createPayment(reference, u?.user?.email || 'admin@tigermaxjobs.com');
  for (const it of o.items as any[]) payment.add(it.label, Number(it.unit) * (it.qty || 1));
  const resp = await pn.send(payment);
  if (!resp?.success) return `/assessments/order/${reference}?error=${encodeURIComponent(resp?.error || 'Paynow could not start the payment.')}`;
  await db.from('assessment_orders').update({ poll_url: resp.pollUrl }).eq('id', o.id);
  return resp.redirectUrl;
}
