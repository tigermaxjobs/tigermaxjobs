import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { saveCandidate, startCandidatePayment } from '@/app/actions';
import { CANDIDATE_FEES } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default async function Candidate({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, user, role } = await currentUser();
  if (!user) redirect('/login?as=candidate');
  if (role !== 'candidate') redirect('/');
  const { data: c } = await sb.from('candidates').select('*').eq('user_id', user.id).maybeSingle();
  const { data: apps } = c ? await sb.from('applications').select('id, stage, score, sent_at, interview_at, jobs(id,title,employer_name,closes)')
    .eq('candidate_id', c.id).order('created_at', { ascending: false }) : { data: [] as any[] };
  const modes: string[] = c?.modes ?? ['onsite', 'remote', 'offshore'];
  return (
    <>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {searchParams.saved && <p className="notice">Saved. We will match you to new jobs every day.</p>}
      {searchParams.applied && <p className="notice">Application recorded. You can follow it below.</p>}
      {c?.apply_alias && <p className="muted">Your application address: <b>{c.apply_alias}@{process.env.MAILGUN_DOMAIN}</b>. Employer replies to it are forwarded to {c.email}.</p>}

      <h2>My applications</h2>
      <div className="card">
        <table><thead><tr><th>Job</th><th>Match</th><th>Status</th><th>Interview</th></tr></thead><tbody>
          {(apps || []).map((a: any) => <tr key={a.id}>
            <td><Link href={`/jobs/${a.jobs?.id}`}>{a.jobs?.title}</Link><div className="muted">{a.jobs?.employer_name}</div></td>
            <td>{a.score ? a.score + '%' : '-'}</td><td>{a.stage}</td>
            <td>{a.interview_at ? new Date(a.interview_at).toLocaleString('en-GB', { timeZone: 'Africa/Harare' }) : '-'}</td></tr>)}
          {!apps?.length && <tr><td colSpan={4} className="muted">No applications yet.</td></tr>}
        </tbody></table>
      </div>

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
        <div className="row">Work types:
          {[['onsite', 'In Zimbabwe'], ['remote', 'Online / remote'], ['offshore', 'Abroad']].map(([v, l]) =>
            <label key={v} className="row" style={{ display: 'flex' }}><input type="checkbox" name="modes" value={v} defaultChecked={modes.includes(v)} style={{ width: 'auto' }} />{l}</label>)}
        </div>
        <label>Do you have a valid passport?
          <select name="has_passport" defaultValue={c?.has_passport ?? 'unknown'}><option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option></select>
        </label>
        <label>Upload CV (PDF or Word, max 5 MB){c?.cv_path && <span className="muted"> - a CV is already on file; upload only to replace it</span>}
          <input type="file" name="cv" accept=".pdf,.doc,.docx" />
        </label>
        <label>Or type / paste your CV (experience, education, skills, referees)<textarea name="cv_text" defaultValue={c?.cv_text ?? ''} /></label>
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="auto_apply" defaultChecked={c?.auto_apply ?? false} style={{ width: 'auto' }} />
          Apply for me automatically when a job matches me well. Applications are sent from my Tigermax address with my CV.</label>
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="truthful" required style={{ width: 'auto' }} />
          I confirm this CV truly reflects my identity, qualifications and experience, and I am open to being hired.</label>
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="consent" required style={{ width: 'auto' }} />
          I agree that Tigermax Jobs may store my CV and share it with employers when applying for jobs for me, as described in the <Link href="/privacy">privacy notice</Link>.</label>
        <button className="gold">Save my CV</button>
      </form>
    </>
  );
}
