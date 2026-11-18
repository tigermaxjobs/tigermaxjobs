import Link from 'next/link';
import { currentUser, adminClient } from '@/lib/supabase';
import { TESTS, AREAS, PACKS, ORG_PACKS, CERTIFICATE_FEE, REASSESS_AFTER_DAYS, VALIDATION_LABEL, money, type Area } from '@/lib/assessments/catalog';
import { availableCredits } from '@/lib/assessments/server';
import { totalItems } from '@/lib/assessments/scoring';
import { saveConsent, startTest, buy, redeemVoucher, saveEvidence } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Career Intelligence & psychometric tests — Tigermax Jobs',
  description: 'Timed personality, interest, aptitude, judgement and practical tests with a free career report, Career Fulfilment Index and verifiable 5-star certificates.',
};

const COMPETENCIES = ['Communication', 'Numeracy', 'Digital skills', 'Teamwork', 'Problem solving', 'Customer service', 'Leadership', 'Technical / trade skill'];

export default async function Assessments({ searchParams }: { searchParams: Record<string, string> }) {
  const { user } = await currentUser();
  const db = adminClient();
  const [{ data: val }, consent, credits, attempts, evidence] = await Promise.all([
    db.from('assessment_validation').select('test_code,status'),
    user ? db.from('assessment_consents').select('*').eq('user_id', user.id).maybeSingle().then(r => r.data) : null,
    user ? availableCredits(user.id) : ({} as Record<string, string[]>),
    user ? db.from('assessment_attempts').select('id,test_code,status,expires_at,completed_at').eq('user_id', user.id).order('started_at', { ascending: false }).then(r => r.data || []) : [],
    user ? db.from('competency_evidence').select('*').eq('user_id', user.id).then(r => r.data || []) : [],
  ]);
  const vstat: Record<string, string> = {}; for (const v of val || []) vstat[v.test_code] = v.status;
  const lastOf = (code: string) => (attempts as any[]).find(a => a.test_code === code);
  const doneOf = (code: string) => (attempts as any[]).find(a => a.test_code === code && a.status === 'completed');
  const completed = new Set((attempts as any[]).filter(a => a.status === 'completed').map(a => a.test_code));
  const fullSum = TESTS.reduce((n, t) => n + t.price, 0);

  return (
    <>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {searchParams.consented && <p className="notice">Thank you. You can now start any test.</p>}
      {searchParams.redeemed && <p className="notice">Code accepted. Your sittings are ready below.</p>}
      {searchParams.evidence && <p className="notice">Saved. The Tigermax office will review your evidence.</p>}

      <p className="eyebrow">Career Intelligence</p>
      <h1 className="h-lg">Find work you can do, will enjoy and can qualify for.</h1>
      <p className="lead">Timed psychometric and practical tests that look beyond your CV: personality, interests, values, reasoning, judgement, emotional intelligence, learning agility and leadership. Your career report is free; employers can see a verifiable 5-star certificate of what you have completed.</p>
      <div className="row" style={{ marginBottom: 28 }}>
        {user ? <Link className="btn gold" href="/assessments/report">My career report ›</Link> : <Link className="btn gold" href="/login?as=candidate&next=/assessments">Sign in to start</Link>}
        <a className="btn ghost" href="#tests">See the tests</a>
        <a className="btn ghost" href="#employers">For employers</a>
      </div>

      <div className="grid4">
        {[['1', 'Agree and sign in', 'Read how your results are used. Signing in keeps your history, reports and certificates in one place.'],
          ['2', 'Take timed tests', `Start with the free Workplace Preferences check. Each paid test is one timed sitting; if time runs out before you finish, the sitting is not scored and a new one costs the same fee.`],
          ['3', 'Get your free report', 'Career pathways, a Career Fulfilment Index, strengths, gaps and training needs. Download it free.'],
          ['4', 'Share a certificate', `A 5-star Tigermax certificate shows employers which tests you completed and which are pending. ${money(CERTIFICATE_FEE)} per download, each with its own serial and QR check.`]]
          .map(([n, h, p]) => <div key={n} className="step card" style={{ margin: 0 }}><div className="num">STEP {n}</div><h3 style={{ fontSize: 20 }}>{h}</h3><p>{p}</p></div>)}
      </div>

      {user && !consent && (
        <form action={saveConsent} className="card stack" id="consent" style={{ marginTop: 28, borderColor: 'var(--gold)' }}>
          <h2 style={{ margin: 0 }}>Before you start: your consent</h2>
          <input type="hidden" name="next" value={searchParams.start ? `/assessments#${searchParams.start}` : '/assessments?consented=1#tests'} />
          <ul className="ticks" style={{ fontSize: 15 }}>
            <li>The tests describe tendencies, interests and abilities to help you and Tigermax find suitable work and training. They are not a diagnosis and there are no pass or fail marks.</li>
            <li>Tigermax never uses test results as the only reason to reject anyone. A person reviews every placement decision, together with your CV, experience and interviews.</li>
            <li>Tests are timed and the timer is kept on our server. Find a quiet place and a stable connection before you start. If you need extra time because of a disability or another reason, WhatsApp the office first (+263 77 133 1008).</li>
            <li>Your detailed scores are private to you and Tigermax staff. Employers only see certificates you choose to share (tests completed and pending, not scores), or progress you agree to share when you use an employer&apos;s code.</li>
            <li>You can ask us to explain any result, have it reviewed by a person, or delete your results, under the Cyber and Data Protection Act. See the <Link href="/privacy">privacy notice</Link>.</li>
          </ul>
          <label className="row" style={{ display: 'flex', fontWeight: 400 }}><input type="checkbox" name="agree" required /> I have read this and agree to take part.</label>
          <label className="row" style={{ display: 'flex', fontWeight: 400 }}><input type="checkbox" name="share" /> Tigermax may use my band-level results (not item answers) to suggest me for suitable jobs. (Optional)</label>
          <button className="gold">I agree, continue</button>
        </form>
      )}

      <h2 id="tests" style={{ marginTop: 44 }}>The tests</h2>
      <p className="muted">Each test has a defined construct, scientific basis, scoring method and interpretation rule, and shows its current validation status. Prices are per timed sitting.</p>
      {(Object.keys(AREAS) as Area[]).map(area => (
        <div key={area}>
          <h3 style={{ marginTop: 28 }}>{AREAS[area]}</h3>
          <div className="grid2">
            {TESTS.filter(t => t.area === area).map(t => {
              const last = lastOf(t.code), done = doneOf(t.code);
              const running = last?.status === 'in_progress' && new Date(last.expires_at).getTime() > Date.now();
              const nextOpen = done ? new Date(new Date(done.completed_at).getTime() + REASSESS_AFTER_DAYS * 86400e3) : null;
              const locked = nextOpen && nextOpen.getTime() > Date.now();
              const have = (credits[t.code] || []).length;
              const status = vstat[t.code] || 'pilot';
              return (
                <div key={t.code} id={t.code} className="card test" style={{ margin: 0 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h4 style={{ margin: 0, fontSize: 19 }}>{t.name}</h4>
                    <b>{money(t.price)}</b>
                  </div>
                  <p className="muted" style={{ margin: '4px 0 10px', fontSize: 15 }}>{t.short}</p>
                  <div>
                    <span className="tag">{t.minutes} min</span><span className="tag">{totalItems(t)} questions{t.adaptive ? ' · adaptive' : ''}</span>
                    <span className={`tag ${status === 'pilot' ? '' : 'gold'}`} title="Validation status">{VALIDATION_LABEL[status]}</span>
                    {done && <span className="tag free">Completed {new Date(done.completed_at).toLocaleDateString('en-GB')}</span>}
                    {have > 0 && <span className="tag gold">{have} sitting{have > 1 ? 's' : ''} ready</span>}
                  </div>
                  <details style={{ marginTop: 10 }}><summary style={{ fontSize: 14 }}>What it measures and how it is scored</summary>
                    <div className="mini" style={{ marginTop: 8 }}>
                      <p style={{ margin: '0 0 6px' }}><b>Construct.</b> {t.construct}</p>
                      <p style={{ margin: '0 0 6px' }}><b>Basis.</b> {t.framework}</p>
                      <p style={{ margin: '0 0 6px' }}><b>Format.</b> {t.format}</p>
                      <p style={{ margin: '0 0 6px' }}><b>Scoring.</b> {t.scoring}</p>
                      <p style={{ margin: 0 }}><b>Interpretation.</b> {t.interpretation}</p>
                    </div>
                  </details>
                  <div className="row" style={{ marginTop: 12 }}>
                    {!user ? <Link className="btn sm" href={`/login?as=candidate&next=/assessments%23${t.code}`}>Sign in to take it</Link>
                      : running ? <Link className="btn gold sm" href={`/assessments/take/${last.id}`}>Resume (timer running) ›</Link>
                      : locked ? <><span className="muted">Reassessment opens {nextOpen!.toLocaleDateString('en-GB')}</span><Link className="btn ghost sm" href={`/assessments/result/${done.id}`}>My result</Link></>
                      : (t.price === 0 || have > 0) ? <form action={startTest}><input type="hidden" name="code" value={t.code} /><button className="gold sm">{done ? 'Reassess' : 'Start'} ({t.minutes} min)</button></form>
                      : <a className="btn sm" href={`?buy=${t.code}#buy`}>Buy a sitting · {money(t.price)}</a>}
                    {done && !locked && <Link className="btn ghost sm" href={`/assessments/result/${done.id}`}>My last result</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <h2 id="buy" style={{ marginTop: 48 }}>Buy sittings, packs and certificates</h2>
      <div className="prices" style={{ marginBottom: 16 }}>
        {Object.entries(PACKS).map(([k, p]) => (
          <div key={k} className={`card price ${k === 'full' ? 'pop' : ''}`}>
            <b>{p.name}</b><div className="amt">{money(p.price)}</div>
            <p className="muted" style={{ margin: 0 }}>{p.blurb}</p>
            {k === 'full' && <p className="muted" style={{ margin: 0 }}>Bought one by one: {money(fullSum + CERTIFICATE_FEE)}.</p>}
          </div>
        ))}
      </div>
      {user ? (
        <form action={buy} className="card stack">
          <fieldset className="payopts"><legend>Pack (optional)</legend>
            <label className="opt"><input type="radio" name="pack" value="" defaultChecked /><span><b>No pack</b><small>Choose single tests below</small></span></label>
            {Object.entries(PACKS).map(([k, p]) => <label key={k} className="opt"><input type="radio" name="pack" value={k} /><span><b>{p.name} · {money(p.price)}</b><small>{p.tests.length} tests{p.certificates ? ' + 1 certificate' : ''}</small></span></label>)}
          </fieldset>
          <fieldset className="payopts"><legend>Single sittings</legend>
            <div className="grid2">{TESTS.filter(t => t.price > 0).map(t =>
              <label key={t.code} className="opt"><input type="checkbox" name="test" value={t.code} defaultChecked={searchParams.buy === t.code} />
                <span><b>{t.name} · {money(t.price)}</b><small>{completed.has(t.code) ? 'Completed before: a new sitting for reassessment' : `${t.minutes} min`}</small></span></label>)}</div>
          </fieldset>
          <label style={{ maxWidth: 320 }}>5-star certificate downloads ({money(CERTIFICATE_FEE)} each)<input type="number" name="certificates" min={0} max={10} defaultValue={0} /></label>
          <fieldset className="payopts"><legend>How would you like to pay?</legend>
            <label className="opt"><input type="radio" name="pay_option" value="paynow" defaultChecked /><span><b>Pay now</b><small>EcoCash or Visa/Mastercard through Paynow. Sittings are ready as soon as payment is confirmed.</small></span></label>
            <label className="opt"><input type="radio" name="pay_option" value="invoice" /><span><b>Invoice</b><small>Pay by EcoCash and WhatsApp proof of payment; the office releases your sittings.</small></span></label>
          </fieldset>
          <button className="gold">Continue to payment</button>
        </form>
      ) : <p className="muted"><Link href="/login?as=candidate&next=/assessments%23buy">Sign in</Link> to buy sittings.</p>}

      <div className="grid2" style={{ marginTop: 24 }}>
        <form action={redeemVoucher} className="card stack" id="voucher">
          <h3 style={{ margin: 0 }}>Have a code from an employer or programme?</h3>
          <p className="muted" style={{ margin: 0 }}>Organisations fund group packs for recruitment, reskilling, upskilling and retention. A code gives you the Full Career Intelligence pack.</p>
          <label>Code<input name="code" placeholder="TMX-XXXX-XXXX" required /></label>
          <label className="row" style={{ display: 'flex', fontWeight: 400 }}><input type="checkbox" name="share" defaultChecked /> Share my progress (tests completed and pending) and my certificates with the organisation that gave me this code.</label>
          {user ? <button>Redeem code</button> : <Link className="btn" href="/login?as=candidate&next=/assessments%23voucher">Sign in to redeem</Link>}
        </form>

        <div className="card" id="evidence">
          <h3 style={{ marginTop: 0 }}>Self-assessment with evidence</h3>
          <p className="muted">Rate yourself on a competency and add proof (a certificate, portfolio, reference or work sample link). The office checks it and marks it verified on your report. Free.</p>
          {user ? (
            <form action={saveEvidence} className="stack">
              <div className="grid2">
                <label>Competency<select name="competency" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...COMPETENCIES.map(c => <option key={c}>{c}</option>)]}</select></label>
                <label>My level<select name="rating" required defaultValue=""><option value="" disabled>Choose…</option><option value="1">1 · Learning</option><option value="2">2 · Can do with support</option><option value="3">3 · Can do independently</option><option value="4">4 · Can teach others</option></select></label>
              </div>
              <label>Evidence (what you did, where, when)<textarea name="evidence" style={{ minHeight: 80 }} /></label>
              <label>Link to proof (optional)<input name="evidence_url" placeholder="https://" /></label>
              <button className="ghost">Submit for verification</button>
              {(evidence as any[]).length > 0 && <div className="mini">{(evidence as any[]).map(e => <div key={e.id} className="ln"><span>{e.competency} · level {e.self_rating}</span><span>{e.status === 'verified' ? '✓ Verified' : e.status === 'not_verified' ? 'Not verified' : 'Awaiting review'}</span></div>)}</div>}
            </form>
          ) : <Link className="btn ghost" href="/login?as=candidate&next=/assessments%23evidence">Sign in</Link>}
        </div>
      </div>

      <section className="bleed section alt" id="employers" style={{ marginTop: 48 }}>
        <div className="in">
          <p className="eyebrow">For employers, schools and programmes</p>
          <h2 className="h-lg" style={{ fontSize: 36 }}>Be surer of a candidate, faster.</h2>
          <p className="lead">Fund assessments for a group you are hiring, reskilling or retaining. Each seat is a Full Career Intelligence pack with a certificate. You see who has completed which tests, plus their verifiable certificates, for candidates who agree to share.</p>
          <div className="prices">
            {Object.entries(ORG_PACKS).map(([k, p]) => <div key={k} className="card price"><b>{p.name}</b><div className="amt">{money(p.price)}</div><p className="muted" style={{ margin: 0 }}>{money(p.price / p.seats)} per person</p></div>)}
          </div>
          <p style={{ marginTop: 18 }}><Link className="btn gold" href="/login?as=employer&next=/employer/assessments">Buy a group pack</Link> <span className="muted">Over 100 people, or a custom battery for a role: WhatsApp +263 77 133 1008.</span></p>
        </div>
      </section>

      <h2 style={{ marginTop: 48 }}>Standards, fairness and validation</h2>
      <div className="grid2">
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>Built on recognised standards</h3>
          <p className="muted">Test design and use follow the ITC Guidelines on Test Use and on computer-based testing, the AERA/APA/NCME Standards for Educational and Psychological Testing, SIOP&apos;s Principles for the Validation and Use of Personnel Selection Procedures, and ISO 10667 (assessment service delivery). Constructs come from the Big Five, Holland RIASEC, cognitive ability research, situational judgement testing and occupational competency frameworks.</p>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>How we validate</h3>
          <p className="muted">Every test starts in <b>pilot</b>. Our system calculates reliability (Cronbach&apos;s alpha), item statistics, completion and timeout rates, and group fairness checks from real sittings. A test is marked <b>reliability established</b> only after enough Zimbabwean sittings meet the thresholds, and <b>validated for local use</b> only after a study links results to real job outcomes and a qualified reviewer signs it off. The status shown on each test is its true current status.</p>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>Fair and accessible</h3>
          <p className="muted">Plain English, one question per screen, works on a phone and on low data. Extra time can be agreed with the office for disability or other needs. Questions avoid culture-specific knowledge where possible, and results are shown as bands with confidence levels, not made-up percentages.</p>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>Human oversight</h3>
          <p className="muted">Results support decisions; they never make them. Tigermax recruiters review every match, and no one is rejected on psychometric results alone. You can ask for any result to be explained or reviewed by a person.</p>
        </div>
      </div>
    </>
  );
}
