import { adminClient } from '@/lib/supabase';
import { paynow } from '@/lib/paynow';

// Used by /workshops/pay/[ref]: also the shareable "payment link" printed on invoices.
export async function paynowFor(reference: string): Promise<string> {
  const db = adminClient();
  const { data: r } = await db.from('workshop_registrations').select('*, workshops(title)').eq('reference', reference).single();
  if (!r) return '/workshops';
  if (r.status !== 'awaiting_payment') return `/workshops/ticket/${reference}`;
  if (!process.env.PAYNOW_INTEGRATION_ID) {
    await db.from('workshop_registrations').update({ pay_option: 'invoice' }).eq('id', r.id);
    return `/workshops/ticket/${reference}?nopaynow=1`;
  }
  const pn = paynow(`/workshops/ticket/${reference}?paid=1`);
  const payment = pn.createPayment(reference, r.email);
  payment.add(`${(r as any).workshops?.title || 'Workshop'} – registration`, Number(r.amount));
  const resp = await pn.send(payment);
  if (!resp?.success) return `/workshops/ticket/${reference}?error=${encodeURIComponent(resp?.error || 'Paynow could not start the payment.')}`;
  await db.from('workshop_registrations').update({ poll_url: resp.pollUrl }).eq('id', r.id);
  return resp.redirectUrl;
}
