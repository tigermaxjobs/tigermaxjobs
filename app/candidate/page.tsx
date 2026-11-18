import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { saveCandidate, startCandidatePayment, setHireStatus, saveNotes } from '@/app/actions';
import { CANDIDATE_FEES } from '@/lib/plans';
import CareerSection from './career';

export const dynamic = 'force-dynamic';

const HIRE_OPTIONS: [string, string][] = [
  ['open', 'Open for hire'],
  ['employed_open', 'Employed, but open for hire'],
  ['employed_not_open', 'Employed, not open for hire'],
];
const STATUS_CHECK_DAYS = 45;

// Candidate-facing stages. Database stages are folded into five steps.
const STEPS = ['Received', 'Applied', 'Interview', 'Offer'];
function stepOf(stage: string): { label: string; index: number } {
  switch (stage) {
    case 'matched': case 'ready': return { label: 'Received', index: 0 };
    case 'sent': case 'applied': case 'shortlisted': return { label: 'Applied', index: 1 };
    case 'interview': return { label: 'Interview', index: 2 };
    case 'offered': case 'hired': return { label: 'Offer', index: 3 };
    default: return { label: 'Unsuccessful', index: -1 }; // rejected, withdrawn
  }
}
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Africa/Harare' });

export default async function Candidate({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, user, role } = await currentUser();
  if (!user) redirect('/login?as=candidate');
  if (role !== 'candidate') redirect('/');
  const { data: c } = await sb.from('candidates').select('*').eq('user_id', user.id).maybeSingle();
  const { data: apps } = c ? await sb.from('applications').select('id, stage, score, sent_at, interview_at, jobs(id,title,employer_name,closes)')
    .eq('candidate_id', c.id).order('created_at', { ascending: false }) : { data: [] as any[] };
  // New candidates start with no job types ticked; they must choose.
  const modes: string[] = c?.modes ?? [];
  const confirmedAt: string | null = c?.hire_status_updated_at ?? null;
  const statusDue = !!c && (!confirmedAt || Date.now() - new Date(confirmedAt).getTime() > STATUS_CHECK_DAYS * 86400000);
  const questions: { issue: string; question: string }[] = Array.isArray(c?.issues) ? c.issues : [];
  const answers: Record<string, string> = c?.gap_answers ?? {};
  return (
    <>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {searchParams.saved && <p className="notice">Saved. We will match you to new jobs every day.</p>}
      {searchParams.applied && <p className="notice">Application recorded. You can follow it below.</p>}
      {searchParams.status && <p className="notice">Thank you. Your status is confirmed.</p>}
      {searchParams.notes && <p className="notice">Thank you. Your answers and notes are saved and will be used in your next applications.</p>}
      {statusDue && !searchParams.status && (
        <p className="notice"><b>Please confirm your status.</b> It has been more than {STATUS_CHECK_DAYS} days since you last confirmed whether you are open for hire. Choose an option in &ldquo;My status&rdquo; below so we only send you jobs you want.</p>
      )}
      {c?.apply_alias && <p className="muted">Your application address: <b>{c.apply_alias}@{process.env.MAILGUN_DOMAIN}</b>. Employer replies to it are forwarded to {c.email}.</p>}

      {c && <>
        <h2 id="status">My status</h2>
        <form action={setHireStatus} className="card stack">
          {HIRE_OPTIONS.map(([v, l]) =>
            <label key={v} className="row" style={{ display: 'flex' }}><input type="radio" name="hire_status" value={v} defaultChecked={c.hire_status === v} required style={{ width: 'auto' }} />{l}</label>)}
          <p className="muted" style={{ margin: 0 }}>
            {confirmedAt ? <>Last confirmed: {fmtDate(confirmedAt)}. </> : null}
            We will ask you to confirm every {STATUS_CHECK_DAYS} days. If you choose &ldquo;Employed, not open for hire&rdquo; we stop matching you and stop automatic applications.
          </p>
          <button className="gold">Confirm my status</button>
        </form>
      </>}

      <h2>My applications</h2>
      <div className="card">
        <table><thead><tr><th>Job</th><th>Match</th><th>Progress</th><th>Interview</th></tr></thead><tbody>
          {(apps || []).map((a: any) => {
            const st = stepOf(a.stage);
            return <tr key={a.id}>
              <td><Link href={`/jobs/${a.jobs?.id}`}>{a.jobs?.title}</Link><div className="muted">{a.jobs?.employer_name}</div></td>
              <td>{a.score ? a.score + '%' : '-'}</td>
              <td>
                {st.index < 0 ? <span className="tag">Unsuccessful</span> :
                  <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                    {STEPS.map((label, i) => <span key={label} className={i <= st.index ? 'tag gold' : 'tag'} style={i <= st.index ? undefined : { opacity: 0.45 }}>{label}</span>)}
                  </div>}
                {a.sent_at && <div className="muted">Applied {fmtDate(a.sent_at)}</div>}
              </td>
              <td>{a.interview_at ? new Date(a.interview_at).toLocaleString('en-GB', { timeZone: 'Africa/Harare' }) : '-'}</td></tr>;
          })}
          {!apps?.length && <tr><td colSpan={4} className="muted">No applications yet.</td></tr>}
        </tbody></table>
        <p className="muted" style={{ marginBottom: 0 }}>Received: we have matched you and prepared the application. Applied: it has been sent to the employer. Interview and Offer: the employer has moved you forward. Unsuccessful: the employer did not take it further.</p>
      </div>

      {c && <>
        <h2 id="add-to-cv">Add to my CV / answer questions</h2>
        <form action={saveNotes} className="card stack">
          {questions.length > 0
            ? <p className="muted" style={{ margin: 0 }}>Our team reviewed your CV and has these questions. Your answers make your applications and cover letters stronger. Answer as many as you can.</p>
            : <p className="muted" style={{ margin: 0 }}>We have no questions about your CV at the moment. You can still add anything that strengthens it below.</p>}
          {questions.map((q, i) => (
            <label key={i}>
              <b>{q.question}</b>
              {q.issue && <span className="muted" style={{ display: 'block' }}>{q.issue}</span>}
              <textarea name={`answer_${i}`} defaultValue={answers[q.question] ?? ''} rows={2} />
            </label>
          ))}
          <label>Anything else that strengthens your CV (new skills, courses, licences, achievements, referees)
            <textarea name="notes" defaultValue={c.candidate_notes ?? ''} />
          </label>
          <p className="muted" style={{ margin: 0 }}>You can also reply to any Tigermax email with extra information at any time.</p>
          <button className="gold">Save my answers</button>
        </form>
      </>}

      <CareerSection userId={user.id} email={user.email || ''} />

      <h2 id="offshore">Offshore &amp; online placement</h2>
      {searchParams.paid && <p className="notice">Thank you. Your registration is confirmed as soon as Paynow confirms the payment. Our team will contact you.</p>}
      {c?.offshore_registered_at ? (
        <div className="card"><span className="tag gold">Registered</span>
          <p style={{ marginBottom: 0 }}>You are registered for offshore and online placement since {new Date(c.offshore_registered_at).toLocaleDateString('en-GB')}. Our team will contact you about verified jobs outside Zimbabwe.</p></div>
      ) : (
        <form action={startCandidatePayment} className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div><b>{CANDIDATE_FEES.offshore.name}</b>
              <p className="muted" style={{ margin: '4px 0 0' }}>We look into jobs outside Zimbabwe, verify they are legitimate, facilitate review by the Office of the President and Cabinet (OPC), and handle other logistics until you travel and start work. Additional agency fees may apply.</p></div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>US${CANDIDATE_FEES.offshore.amount}</div>
          </div>
          <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="agree" required style={{ width: 'auto' }} />
            I understand the US${CANDIDATE_FEES.offshore.amount} registration fee is non-refundable and that additional agency fees may apply.</label>
          <div className="row"><button className="gold">Pay with Paynow</button><span className="muted">EcoCash, Visa/Mastercard</span></div>
          <p className="muted" style={{ margin: 0 }}>Payments are processed by Paynow through our payments partner, Caselink Zimbabwe.</p>
        </form>
      )}

      <h2>My CV profile</h2>
      <form action={saveCandidate} className="card stack">
        <div className="grid2">
          <label>Full name<input name="full_name" defaultValue={c?.full_name ?? ''} required /></label>
          <label>Phone (WhatsApp)<input name="phone" defaultValue={c?.phone ?? ''} /></label>
          <label>Town / city<input name="location" defaultValue={c?.location ?? ''} /></label>
          <label>Headline (e.g. Accounts Clerk, Customer Service)<input name="headline" defaultValue={c?.headline ?? ''} /></label>
        </div>
        <label>Job fields you want, separated by commas<input name="categories" defaultValue={(c?.categories ?? []).join(', ')} /></label>
        {!c && (
          <label>Are you open for hire? (required)
            <select name="hire_status" defaultValue="" required>
              <option value="" disabled>Choose one</option>
              {HIRE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
        <div className="stack" style={{ gap: 4 }}>
          <span>Job types you want (tick at least one). We only send you jobs of the types you tick:</span>
          <div className="row">
            {[['onsite', 'Zimbabwe'], ['remote', 'Online'], ['offshore', 'Abroad']].map(([v, l]) =>
              <label key={v} className="row" style={{ display: 'flex' }}><input type="checkbox" name="modes" value={v} defaultChecked={modes.includes(v)} style={{ width: 'auto' }} />{l}</label>)}
          </div>
        </div>
        <label>Do you have a valid passport? (needed for jobs abroad)
          <select name="has_passport" defaultValue={c?.has_passport ?? ''} required>
            <option value="" disabled>Choose one</option><option value="yes">Yes</option><option value="no">No</option><option value="unknown">Not sure</option>
          </select>
        </label>
        <label>Upload CV (PDF or Word, max 5 MB){c?.cv_path && <span className="muted"> - a CV is already on file; upload only to replace it</span>}
          <input type="file" name="cv" accept=".pdf,.doc,.docx" />
        </label>
        <label>Or type / paste your CV (experience, education, skills, referees)<textarea name="cv_text" defaultValue={c?.cv_text ?? ''} /></label>
        {!c && <label>Anything else that strengthens your CV (optional)<textarea name="candidate_notes" placeholder="e.g. a course you are finishing, a driver's licence, volunteer work, availability date" /></label>}
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="auto_apply" defaultChecked={c?.auto_apply ?? false} style={{ width: 'auto' }} />
          Apply for me automatically when a job matches me well (only while I am open for hire, and only for the job types I ticked). Each job gets its own email from my Tigermax address with my CV.</label>
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="truthful" required style={{ width: 'auto' }} />
          I confirm this CV truly reflects my identity, qualifications and experience.</label>
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="consent" required style={{ width: 'auto' }} />
          I agree that Tigermax Jobs may store my CV and share it with employers when applying for jobs for me, as described in the <Link href="/privacy">privacy notice</Link>.</label>
        <button className="gold">Save my CV</button>
      </form>
    </>
  );
}
