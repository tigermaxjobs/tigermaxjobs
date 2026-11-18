import Link from 'next/link';
import { userClient } from '@/lib/supabase';
import { PLANS } from '@/lib/plans';
import { JOB_FIELDS, JobCard, type JobRow } from '@/lib/ui';

export const dynamic = 'force-dynamic';

const STEPS = [
  { n: '01', t: 'Upload once', d: 'Upload or type your CV, pick the kinds of jobs you want and where: Zimbabwe, online or abroad.' },
  { n: '02', t: 'Matched daily', d: 'Every morning we score you against every live job on your skills, competences and qualifications.' },
  { n: '03', t: 'We apply for you', d: 'Switch on auto-apply and we send a tailored application when you match 65% or more. You only prepare for the interview.' },
  { n: '04', t: 'Track everything', d: 'See every application, shortlist and interview date in one place. Employer replies come straight to your own email.' },
];

const SERVICES = [
  { t: 'Skills role matching', d: 'Full recruitment. We source, match and shortlist people whose skills fit the role, not just the job title.' },
  { t: 'On-demand employee leasing', d: 'Staff when you need them, for a project, a season or a peak, without the hiring overhead.' },
  { t: 'Managed recruitment', d: 'We run the shortlisting and interviews for you and hand over the best candidates.' },
  { t: 'HR support', d: 'Practical HR help for growing businesses, with packages you can customise.' },
];

const FAQ = [
  { q: 'What does it cost job seekers?', a: 'Joining, uploading your CV, being matched and having us apply for jobs in Zimbabwe is free. For verified online and offshore jobs there is a non-refundable US$240 registration fee, and additional agency fees may apply.' },
  { q: 'What does the non-refundable US$240 offshore registration cover?', a: 'It is a non-refundable fee for us to look into jobs outside Zimbabwe, verify that they are legitimate, facilitate the review of your placement by the Office of the President and Cabinet (OPC), Zimbabwe, and handle other logistics. We support you until you travel and start working. Additional agency fees may apply.' },
  { q: 'What is the National Youth Service placement programme?', a: 'Tigermax Jobs is the official recruitment agency facilitating the placement of 18,500 young job seekers going through Zimbabwe\u2019s National Youth Service: a disciplined, patriotic, hard-working and youthful workforce ready for employers.' },
  { q: 'How does auto-apply work?', a: 'Every morning we compare your CV with every live job. If you have switched on automatic applications and you match 65% or more, we prepare a tailored cover letter and apply for you. You can switch it off at any time.' },
  { q: 'Which email do applications come from?', a: 'Each candidate gets a personal Tigermax application address. Employers reply to that address and we forward the reply to your own email. We keep only the date, sender and subject, never the message itself.' },
  { q: 'Can I find jobs outside Zimbabwe?', a: 'Yes. Tell us whether you want jobs in Zimbabwe, online and remote work, or jobs abroad, and we match you to all three.' },
  { q: 'Who can see my CV?', a: 'Your CV is stored privately. We share it only with employers you are applying to. You can ask us to delete your data at any time.' },
  { q: 'How do employers pay?', a: 'Through Paynow: EcoCash or Visa/Mastercard. You can also arrange payment with the office and we add your listings for you.' },
  { q: 'Is Tigermax a registered agency?', a: 'Yes. Tigermax Jobs is a youth-owned HR support and recruitment agency licensed by the Ministry of Public Service, Labour and Social Welfare (MPSLSW), based at 4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare, Zimbabwe.' },
];

export default async function Home() {
  const sb = userClient();
  const { data } = await sb.from('jobs').select(JOB_FIELDS).eq('status', 'live')
    .order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(6);
  const jobs = (data || []) as JobRow[];
  const plans = Object.entries(PLANS);

  return (
    <>
      {/* ── Hero ───────────────────────────── */}
      <section className="hero bleed">
        <div className="badge"><span className="dot" />Licensed by the MPSLSW · Official National Youth Service placement agency</div>
        <h1 className="h-xl reveal">Upload your CV once.<br /><em>We apply for you.</em></h1>
        <p className="lead reveal" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
          Tigermax Jobs matches you to new jobs in Zimbabwe, online and abroad every morning, and applies on your behalf. You just prepare for the interview.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn gold" href="/login?as=candidate">Upload my CV, free</Link>
          <Link className="btn ghost" href="/#how">See how it works</Link>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>Free to join. Verified offshore placements from US$240.</p>
        <div className="channels">
          <span className="chip">Web</span><span className="chip">WhatsApp</span><span className="chip">Email</span><span className="chip">Walk-in office</span>
        </div>

        <div className="window reveal" aria-label="Example of the candidate dashboard">
          <div className="bar"><i /><i /><i /><span>tigermaxjobs.com / my applications · example</span></div>
          <div className="body">
            <div className="side">
              <div className="on">Top matches</div><div>Applications</div><div>Interviews</div><div>My CV</div><div>Settings</div>
            </div>
            <div className="main">
              <p className="muted" style={{ margin: '0 0 12px' }}>Good morning. 3 new matches today.</p>
              {[
                { p: 92, t: 'Accounts Clerk', s: 'Manufacturing company · Harare', st: 'sent', l: 'Applied' },
                { p: 81, t: 'Remote Customer Support Agent', s: 'Online · full-time', st: 'shortlisted', l: 'Shortlisted' },
                { p: 74, t: 'Site Supervisor', s: 'Construction firm · Abroad', st: 'interview', l: 'Interview Tue' },
              ].map(m => (
                <div className="match" key={m.t}>
                  <div className="ring" style={{ ['--p' as any]: m.p }}><span>{m.p}%</span></div>
                  <div style={{ flex: 1 }}><b>{m.t}</b><small>{m.s}</small></div>
                  <span className={`status ${m.st}`}>{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof ─────────────────────────── */}
      <section className="section bleed" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="in">
          <div className="stats reveal">
            <div><b>18,500</b><span>National Youth Service job seekers we are placing</span></div>
            <div><b>200+</b><span>people recruited for a single call-centre project</span></div>
            <div><b>Daily</b><span>new jobs added and matched every morning</span></div>
            <div><b>65%+</b><span>match needed before we apply for you</span></div>
          </div>
        </div>
      </section>

      {/* ── National Youth Service ─────────── */}
      <section id="nys" className="section dark-band bleed">
        <div className="in nys">
          <div className="reveal">
            <p className="eyebrow">National Youth Service</p>
            <h2 className="h-lg">The official recruitment agency for Zimbabwe&rsquo;s National Youth Service.</h2>
            <p className="lead">We are facilitating the placement of 18,500 young job seekers going through the National Youth Service into jobs at home, online and abroad.</p>
            <div className="pillrow"><span>Disciplined</span><span>Patriotic</span><span>Hard-working</span><span>Youthful</span></div>
            <div className="row" style={{ marginTop: 28 }}>
              <Link className="btn gold" href="/login?as=employer">Hire NYS talent</Link>
              <a className="btn ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} href="https://wa.me/263771331008">Talk to our team</a>
            </div>
          </div>
          <div className="reveal center">
            <div className="big">18,500</div>
            <p className="muted" style={{ fontSize: 17 }}>young people ready to work</p>
          </div>
        </div>
      </section>

      {/* ── Pipeline ──────────────────────── */}
      <section id="how" className="section alt bleed">
        <div className="in">
          <div className="center">
            <p className="eyebrow">How it works</p>
            <h2 className="h-lg">Four steps. One CV. Zero job-hunting stress.</h2>
            <p className="lead">We match your skills, competences and qualifications with real opportunities, then do the applying.</p>
          </div>
          <div className="steps" style={{ marginTop: 40 }}>
            {STEPS.map((s, i) => (
              <div className="feature step reveal" key={s.n}>
                <div className="num">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <div className="mini">
                  {i === 0 && <><div className="ln"><span>CV</span><span className="mono">my-cv.pdf ✓</span></div><div className="ln"><span>Looking for</span><span>Zimbabwe · Online · Abroad</span></div><div className="ln"><span>Auto-apply</span><span style={{ color: '#34c759' }}>● On</span></div></>}
                  {i === 1 && <div className="mono">06:00 scanning live jobs…<br />06:01 Accounts Clerk — 92% ✓<br />06:01 Data Capturer — 58% ✗<br />06:02 Support Agent — 81% ✓</div>}
                  {i === 2 && <><div className="ln"><span>To</span><span className="mono">hr@employer.co.zw</span></div><div className="ln"><span>From</span><span className="mono">tendai.moyo@apply.tigermaxjobs.com</span></div><div className="ln"><span>Attached</span><span>CV + cover letter</span></div></>}
                  {i === 3 && <><div className="ln"><span>Applied</span><b>12</b></div><div className="ln"><span>Shortlisted</span><b>3</b></div><div className="ln"><span>Interviews</span><b>1</b></div></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where ─────────────────────────── */}
      <section className="section bleed">
        <div className="in">
          <div className="center">
            <p className="eyebrow">Wherever the work is</p>
            <h2 className="h-lg">Local. Online. Abroad.</h2>
          </div>
          <div className="grid3" style={{ marginTop: 36 }}>
            <Link className="feature reveal" href="/jobs?mode=onsite"><h3>Zimbabwe</h3><p>Jobs with employers in Harare and across the country.</p><p className="link-arrow" style={{ marginTop: 14 }}>Browse</p></Link>
            <Link className="feature reveal" href="/jobs?mode=remote"><h3>Online &amp; remote</h3><p>Work from home for companies anywhere. Verified placements available.</p><p className="link-arrow" style={{ marginTop: 14 }}>Browse</p></Link>
            <Link className="feature reveal" href="/jobs?mode=offshore"><h3>Abroad</h3><p>Verified offshore jobs, with our support all the way until you travel and start work.</p><p className="link-arrow" style={{ marginTop: 14 }}>Browse</p></Link>
          </div>
        </div>
      </section>

      {/* ── Offshore programme ─────────────── */}
      <section id="offshore" className="section alt bleed">
        <div className="in">
          <div className="center">
            <p className="eyebrow">Verified online &amp; offshore placement</p>
            <h2 className="h-lg">From application to arrival. We walk with you.</h2>
            <p className="lead">We look into jobs outside Zimbabwe, verify that they are legitimate, facilitate review by the Office of the President and Cabinet (OPC), and handle the logistics until you travel and start working.</p>
          </div>
          <div className="grid4" style={{ marginTop: 36 }}>
            {[['', 'Register', 'Pay the non-refundable US$240 registration and complete your profile with our team.'],
              ['', 'We find & verify', 'We look into jobs outside Zimbabwe and verify that each opportunity is legitimate.'],
              ['', 'OPC review', 'We facilitate the review of your placement by the Office of the President and Cabinet (OPC), Zimbabwe.'],
              ['', 'Logistics & travel', 'We handle the other logistics and support you until you travel and start working.']].map(([i, t, d]) => (
              <div className="feature reveal" key={t}><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
          <div className="card center reveal" style={{ marginTop: 28, padding: 32 }}>
            <div className="price" style={{ alignItems: 'center' }}>
              <div className="amt">US$240<small> non-refundable registration</small></div>
              <p className="muted" style={{ margin: 0 }}>Covers sourcing and verifying jobs outside Zimbabwe, facilitating OPC review and other logistics. Additional agency fees may apply.</p>
              <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
                <a className="btn gold" href="https://wa.me/263771331008?text=Hi%20Tigermax%20Jobs%2C%20I%20want%20to%20register%20for%20verified%20offshore%20placement">Register on WhatsApp</a>
                <Link className="btn ghost" href="/candidate#offshore">Register &amp; pay online</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Latest jobs ───────────────────── */}
      <section className="section bleed">
        <div className="in">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div><p className="eyebrow">Latest jobs</p><h2 className="h-lg" style={{ margin: 0 }}>Hiring now.</h2></div>
            <Link className="link-arrow" href="/jobs">See all jobs</Link>
          </div>
          {jobs.map(j => <JobCard key={j.id} j={j} />)}
          {!jobs.length && (
            <div className="empty">
              <p style={{ fontSize: 19, color: 'var(--ink)', margin: '0 0 6px' }}>New jobs land here every morning.</p>
              <p style={{ margin: '0 0 18px' }}>Upload your CV today and you will be first in line when they do.</p>
              <Link className="btn gold" href="/login?as=candidate">Upload my CV, free</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Employers ─────────────────────── */}
      <section id="employers" className="section dark-band bleed">
        <div className="in">
          <p className="eyebrow">For employers</p>
          <h2 className="h-lg">The right people, matched to the role.</h2>
          <p className="lead">Job creation is as sustainable as the job placement. Proper skills role matching means productive hires, growing companies and room for more jobs.</p>
          <div className="grid4" style={{ marginTop: 32 }}>
            {SERVICES.map(s => <div className="feature reveal" key={s.t}><h3>{s.t}</h3><p>{s.d}</p></div>)}
          </div>
          <div className="grid4" style={{ marginTop: 40 }}>
            {['Create your company account', 'Get verified by our office', 'Pay securely with Paynow', 'Shortlist, interview and hire'].map((t, i) => (
              <div key={t}><div className="eyebrow" style={{ margin: 0 }}>Step {i + 1}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{t}</div></div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 36 }}>
            <Link className="btn gold" href="/login?as=employer">Post a job</Link>
            <a className="btn ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} href="https://wa.me/263771331008">Talk to our team</a>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────── */}
      <section id="pricing" className="section bleed">
        <div className="in">
          <div className="center">
            <p className="eyebrow">Pricing</p>
            <h2 className="h-lg">Free to join. Simple for employers.</h2>
            <p className="lead">Local jobs are free for job seekers. Employers pay per listing or per role.</p>
          </div>
          <h3 style={{ marginTop: 36 }}>For job seekers</h3>
          <div className="prices">
            <div className="card price reveal">
              <span className="tag gold" style={{ alignSelf: 'flex-start' }}>Jobs in Zimbabwe</span>
              <div className="amt">Free</div>
              <ul><li>CV bank profile</li><li>Daily job matching</li><li>Automatic applications</li><li>Personal application email</li></ul>
              <Link className="btn gold" href="/login?as=candidate">Upload my CV</Link>
            </div>
            <div className="card price pop reveal">
              <span className="tag gold" style={{ alignSelf: 'flex-start' }}>Online &amp; offshore</span>
              <div className="amt">$240<small> non-refundable</small></div>
              <ul><li>Jobs outside Zimbabwe, checked for legitimacy</li><li>OPC review facilitated for you</li><li>Logistics and support until you start work</li><li>Non-refundable · additional agency fees may apply</li></ul>
              <Link className="btn ghost" href="/#offshore">How it works</Link>
            </div>
          </div>
          <h3 style={{ marginTop: 36 }}>For employers</h3>
          <div className="prices">
            {plans.map(([k, p]) => (
              <div className={`card price reveal${k === 'bundle5' ? ' pop' : ''}`} key={k}>
                {k === 'bundle5' ? <span className="tag gold" style={{ alignSelf: 'flex-start' }}>Best value</span> : <span className="tag" style={{ alignSelf: 'flex-start' }}>Employers</span>}
                <div className="amt">${p.amount}<small> {p.managed ? 'per role' : 'once'}</small></div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <Link className="btn ghost" href="/login?as=employer">Get started</Link>
              </div>
            ))}
          </div>
          <p className="muted center" style={{ marginTop: 18 }}>Pay with EcoCash or Visa/Mastercard through Paynow. Payments are processed by Paynow through our payments partner, Caselink Zimbabwe. Prices in US dollars.</p>
        </div>
      </section>

      {/* ── Privacy promise ───────────────── */}
      <section className="section alt bleed">
        <div className="in grid3">
          <div className="reveal"><h3>Your CV stays private</h3><p className="muted">Stored securely and shared only with employers you apply to.</p></div>
          <div className="reveal"><h3>Replies come to you</h3><p className="muted">Employer replies are forwarded to your own email. We never keep the message.</p></div>
          <div className="reveal"><h3>You stay in control</h3><p className="muted">Switch auto-apply on or off, or ask us to delete your data, any time.</p></div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────── */}
      <section id="faq" className="section bleed">
        <div className="in" style={{ maxWidth: 780 }}>
          <p className="eyebrow">FAQ</p>
          <h2 className="h-lg">What people ask before signing up.</h2>
          {FAQ.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      {/* ── Closing CTA ───────────────────── */}
      <section className="section alt bleed center">
        <div className="in">
          <h2 className="h-lg reveal">Your next job could be one upload away.</h2>
          <p className="lead">Join the Tigermax CV bank today. It takes five minutes and it is free.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn gold" href="/login?as=candidate">Upload my CV, free</Link>
            <Link className="btn ghost" href="/login?as=employer">I am hiring</Link>
          </div>
        </div>
      </section>
    </>
  );
}
