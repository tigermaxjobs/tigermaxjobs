import { adminClient } from '@/lib/supabase';
import { paynowStatus } from '@/lib/paynow';
import { PLANS, PlanKey, CANDIDATE_FEES } from '@/lib/plans';

// Checks a row in `payments` with Paynow and, if it is paid, marks it paid and gives the buyer what they paid for.
// Used by the Paynow result callback and by the /pay/status page (so a payment shows as paid even if the
// callback was missed, e.g. while the free server was asleep). Safe to call more than once.
export async function settlePayment(reference: string): Promise<{ status: string; paid: boolean; pay: any | null }> {
  const db = adminClient();
  const { data: pay } = await db.from('payments').select('*').eq('reference', reference).maybeSingle();
  if (!pay) return { status: 'unknown', paid: false, pay: null };
  if (pay.status === 'paid') return { status: 'paid', paid: true, pay };
  if (!pay.poll_url) return { status: pay.status || 'created', paid: false, pay };

  let st: { paid: boolean; status: string };
  try { st = await paynowStatus(pay.poll_url); } catch { return { status: pay.status || 'created', paid: false, pay }; }
  if (!st.paid) {
    if (st.status !== pay.status) await db.from('payments').update({ status: st.status }).eq('id', pay.id);
    return { status: st.status, paid: false, pay };
  }

  // Only the first caller to flip the row to paid gives credits, so a payment is never fulfilled twice.
  const { data: won } = await db.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', pay.id).neq('status', 'paid').select('id');
  if (!won?.length) return { status: 'paid', paid: true, pay };

  if (pay.plan in CANDIDATE_FEES) {
    if (pay.plan === 'offshore' && pay.candidate_id) {
      await db.from('candidates').update({ offshore_registered_at: new Date().toISOString(), modes: ['onsite', 'remote', 'offshore'] }).eq('id', pay.candidate_id);
    }
    // CV services: the office sees paid orders on the Office page and contacts the person.
    return { status: 'paid', paid: true, pay };
  }

  const plan = PLANS[pay.plan as PlanKey];
  if (plan && pay.employer_id) {
    const { data: e } = await db.from('employers').select('listing_credits').eq('id', pay.employer_id).single();
    await db.from('employers').update({
      listing_credits: (e?.listing_credits ?? 0) + plan.credits, plan: pay.plan,
      ...(plan.managed ? { managed_service: true } : {}),
    }).eq('id', pay.employer_id);
  }
  return { status: 'paid', paid: true, pay };
}
