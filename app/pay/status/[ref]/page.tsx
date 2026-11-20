import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase';
import { settlePayment } from '@/lib/payments';
import { CANDIDATE_FEES, PLANS } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment status — Tigermax Jobs', robots: { index: false } };

const safe = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '');

// Paynow sends people here after paying. We check the payment with Paynow, then link back to where they started.
export default async function PayStatus({ params, searchParams }: { params: { ref: string }; searchParams: { back?: string } }) {
  const { user, role } = await currentUser();
  const here = `/pay/status/${params.ref}${searchParams.back ? `?back=${encodeURIComponent(searchParams.back)}` : ''}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  const { status, paid, pay } = await settlePayment(params.ref);
  if (!pay) notFound();
  if (pay.user_id && pay.user_id !== user.id && role !== 'staff') notFound();
  const fee = (CANDIDATE_FEES as any)[pay.plan];
  const plan = (PLANS as any)[pay.plan];
  const name = fee?.name || plan?.name || pay.plan;
  const back = safe(searchParams.back) || (pay.employer_id ? '/employer/billing' : '/candidate');
  const retry = fee ? `/pay/${pay.plan}?back=${encodeURIComponent(back)}` : '/employer/billing';
  const failed = ['cancelled', 'failed', 'disputed', 'refunded'].includes(status);
  return (
    <div className="auth" style={{ maxWidth: 560 }}>
      <p className="eyebrow">Payment {pay.reference}</p>
      <h1 className="h-lg" style={{ fontSize: 'clamp(30px,5vw,44px)' }}>
        {paid ? 'Payment received.' : failed ? 'Payment not completed.' : 'Waiting for Paynow…'}
      </h1>
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>{name}</b><b>US${Number(pay.amount)}</b></div>
        {paid
          ? <p style={{ margin: 0 }}>{fee?.after || 'Your listing credit has been added to your account.'}</p>
          : failed
            ? <p style={{ margin: 0 }}>The payment was {status}. No money was taken for this attempt. You can try again.</p>
            : <p style={{ margin: 0 }}>Paynow has not confirmed this payment yet. If you approved it on your phone, wait a minute and refresh this page. Status: <b>{status}</b>.</p>}
        <div className="row">
          <Link className="btn gold" href={back}>Back to {back.startsWith('/employer') ? 'my dashboard' : back === '/candidate' ? 'my dashboard' : 'where I was'}</Link>
          {!paid && !failed && <Link className="btn ghost" href={here}>Refresh</Link>}
          {failed && <Link className="btn ghost" href={retry}>Try again</Link>}
        </div>
      </div>
      <p className="muted center">Questions about a payment? WhatsApp +263 77 133 1008 and quote {pay.reference}.</p>
    </div>
  );
}
