import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { saveEmployer, postJob } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function Employer({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, user, role } = await currentUser();
  if (!user) redirect('/login?as=employer');
  if (role !== 'employer') redirect('/');
  const { data: e } = await sb.from('employers').select('*').eq('owner_id', user.id).maybeSingle();
  const { data: jobs } = e ? await sb.from('jobs').select('id,title,status,closes,applications(count)').eq('employer_id', e.id).order('created_at', { ascending: false }) : { data: [] as any[] };
  return (
    <>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {searchParams.posted && <p className="notice">Your job is live.</p>}
      {e && !e.verified && <p className="notice">Your company is awaiting verification by Tigermax. Jobs go live once you are verified and have a paid listing.</p>}
      {e && <p className="muted">Listings available: <b>{e.listing_credits}</b> · Plan: {e.plan}{e.managed_service ? ' · Tigermax manages your shortlisting and interviews' : ''} · <Link href="/employer/billing">Buy listings or services</Link></p>}

      {e && <>
        <h2>Your jobs</h2>
        <div className="card"><table><thead><tr><th>Job</th><th>Status</th><th>Closes</th><th>Applicants</th></tr></thead><tbody>
          {(jobs || []).map((j: any) => <tr key={j.id}><td><Link href={`/employer/jobs/${j.id}`}>{j.title}</Link></td><td>{j.status}</td><td>{j.closes || '-'}</td><td>{j.applications?.[0]?.count ?? 0}</td></tr>)}
          {!jobs?.length && <tr><td colSpan={4} className="muted">No jobs yet.</td></tr>}
        </tbody></table></div>

        <h2>Post a job</h2>
        <form action={postJob} className="card stack">
          <div className="grid2">
            <label>Job title<input name="title" required /></label>
            <label>Location<input name="location" placeholder="Harare" /></label>
            <label>Work type<select name="work_mode"><option value="onsite">In Zimbabwe</option><option value="remote">Remote</option><option value="offshore">Abroad</option></select></label>
            <label>Field / category<input name="category" /></label>
            <label>Pay (optional)<input name="pay" /></label>
            <label>Closing date<input name="closes" type="date" /></label>
          </div>
          <label>Summary of the role<textarea name="summary" required /></label>
          <label>Requirements (one per line)<textarea name="requirements" /></label>
          <label>Documents applicants must submit (one per line)<textarea name="documents" defaultValue={'CV\nApplication letter'} /></label>
          <button className="gold">Publish job</button>
        </form>
      </>}

      <h2>Company profile</h2>
      <form action={saveEmployer} className="card stack">
        <div className="grid2">
          <label>Company name<input name="name" defaultValue={e?.name ?? ''} required /></label>
          <label>Registration number<input name="reg_number" defaultValue={e?.reg_number ?? ''} /></label>
          <label>Contact person<input name="contact_name" defaultValue={e?.contact_name ?? ''} /></label>
          <label>Contact email<input name="contact_email" type="email" defaultValue={e?.contact_email ?? user.email ?? ''} /></label>
          <label>Contact phone<input name="contact_phone" defaultValue={e?.contact_phone ?? ''} /></label>
          <label>Physical address<input name="address" defaultValue={e?.address ?? ''} /></label>
        </div>
        <button>Save company profile</button>
      </form>
    </>
  );
}
