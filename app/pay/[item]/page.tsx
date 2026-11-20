import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase';
import { startCandidatePayment } from '@/app/actions';
import { CANDIDATE_FEES, type CandidateFeeKey } from '@/lib/plans';
import SubmitButton from '@/lib/submit-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Make a payment — Tigermax Jobs', robots: { index: false } };

const safe = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '');

// One page per paid service (e.g. /pay/cv_starter). Paynow then sends the person to /pay/status/<reference>,
// which links back to where they started (?back=).
export default async function Pay({ params, searchParams }: { params: { item: string }; searchParams: { back?: string; error?: string } }) {
  const item = params.item as CandidateFeeKey;
  const fee = CANDIDATE_FEES[item];
  if (!fee) notFound();
  const back = safe(searchParams.back) || '/candidate';
  const here = `/pay/${item}${searchParams.back ? `?back=${encodeURIComponent(back)}` : ''}`;
  const { sb, user } = await currentUser();
  if (!user) redirect(`/login?as=candidate&next=${encodeURIComponent(here)}`);
  if (item === 'offshore') {
    const { data: c } = await sb.from('candidates').select('offshore_registered_at').eq('user_id', user.id).maybeSingle();
    if (c?.offshore_registered_at) redirect('/candidate?error=' + encodeURIComponent('You are already registered for offshore and online placement.'));
  }
  return (
    <div className="auth" style={{ maxWidth: 560 }}>
      <p><Link href={back}>‹ Back</Link></p>
      <p className="eyebrow">Secure payment</p>
      <h1 className="h-lg" style={{ fontSize: 'clamp(30px,5vw,44px)' }}>{fee.short}</h1>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <form action={startCandidatePayment} className="card stack">
        <input type="hidden" name="item" value={item} />
        <input type="hidden" name="back" value={back} />
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 220 }}><b>{fee.name}</b>
            <p className="muted" style={{ margin: '6px 0 0' }}>{fee.blurb}</p></div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>US${fee.amount}</div>
        </div>
        <label className="row" style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <input type="checkbox" name="agree" required style={{ width: 'auto', marginTop: 4 }} />
          <span>{fee.agree}</span>
        </label>
        <SubmitButton className="gold" label={`Pay US$${fee.amount} with Paynow`} pending="Opening Paynow…" />
        <p className="muted" style={{ margin: 0 }}>You will go to Paynow to pay with EcoCash or Visa/Mastercard, then come straight back here. Payments are processed by Paynow through our payments partner, Caselink Zimbabwe.</p>
      </form>
      <p className="center"><Link href={back}>Cancel and go back</Link></p>
    </div>
  );
}
