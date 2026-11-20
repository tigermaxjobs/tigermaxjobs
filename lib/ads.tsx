import Link from 'next/link';
import { CANDIDATE_FEES } from '@/lib/plans';

// Adverts shown inside the job seeker's experience (dashboard and jobs list).
// `back` is where the payment page returns people to after paying or cancelling.
export default function CareerAds({ back = '/candidate', signedIn = true }: { back?: string; signedIn?: boolean }) {
  const b = encodeURIComponent(back);
  const starter = CANDIDATE_FEES.cv_starter, revamp = CANDIDATE_FEES.cv_revamp;
  const pay = (item: string) => signedIn ? `/pay/${item}?back=${b}` : `/signup?as=candidate&next=${encodeURIComponent(`/pay/${item}?back=/candidate`)}`;
  return (
    <div className="grid2 ads" style={{ margin: '8px 0 24px' }}>
      <div className="card ad stack">
        <span className="tag gold" style={{ alignSelf: 'flex-start' }}>Career Intelligence</span>
        <h3 style={{ margin: 0, fontSize: 22 }}>Don&rsquo;t stay stuck in a career you don&rsquo;t enjoy.</h3>
        <p className="muted" style={{ margin: 0, fontSize: 15 }}>Not sure where you function best? Take our psychometric tests and plan your career options around your true self: your personality, interests, values and strengths.</p>
        <div className="row">
          <Link className="btn gold" href="/assessments">Take a test</Link>
          <span className="muted">Workplace Preferences test is free</span>
        </div>
      </div>
      <div className="card ad stack">
        <span className="tag gold" style={{ alignSelf: 'flex-start' }}>CV writing</span>
        <h3 style={{ margin: 0, fontSize: 22 }}>Ever feel you&rsquo;re not enough for that opportunity?</h3>
        <p className="muted" style={{ margin: 0, fontSize: 15 }}>Get help getting to know yourself and revamping your CV for only <b>US${revamp.amount}</b>, or start with a winning CV for only <b>US${starter.amount}</b>.</p>
        <div className="row">
          <Link className="btn gold" href={pay('cv_revamp')}>Tap here to pay US${revamp.amount}</Link>
          <Link className="btn ghost" href={pay('cv_starter')}>Tap here to pay US${starter.amount}</Link>
        </div>
        <span className="muted">EcoCash or Visa/Mastercard via Paynow</span>
      </div>
    </div>
  );
}
