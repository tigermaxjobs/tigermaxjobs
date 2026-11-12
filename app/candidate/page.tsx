import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { saveCandidate } from '@/app/actions';

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
