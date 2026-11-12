import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { verifyEmployer, setJobStatus, sendApplication, addCredits } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function Office({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, role } = await currentUser();
  if (role !== 'staff') redirect('/');
  const [{ data: employers }, { data: pending }, { data: ready }, { count: candidates }, { count: live }] = await Promise.all([
    sb.from('employers').select('*').order('created_at', { ascending: false }).limit(50),
    sb.from('jobs').select('id,title,employer_name,status,created_at').in('status', ['draft', 'pending_payment']).limit(50),
    sb.from('applications').select('id,score,why,stage,jobs(title,employer_name,apply_email,apply_method,apply_url,closes),candidates(full_name)').eq('stage', 'ready').order('score', { ascending: false }).limit(100),
    sb.from('candidates').select('id', { count: 'exact', head: true }),
    sb.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'live'),
  ]);
  return (
    <>
      {searchParams.sent && <p className="notice">Application sent.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <h1>Office</h1>
      <p className="muted">{candidates ?? 0} candidates · {live ?? 0} live jobs</p>

      <h2>Applications ready to send ({ready?.length ?? 0})</h2>
      <div className="card"><table><thead><tr><th>Candidate</th><th>Job</th><th>Match</th><th></th></tr></thead><tbody>
        {(ready || []).map((a: any) => <tr key={a.id}>
          <td>{a.candidates?.full_name}</td>
          <td>{a.jobs?.title}<div className="muted">{a.jobs?.employer_name}{a.jobs?.closes ? ` · closes ${a.jobs.closes}` : ''}</div></td>
          <td>{a.score}%<div className="muted">{a.why}</div></td>
          <td>{a.jobs?.apply_email
            ? <form action={sendApplication}><input type="hidden" name="id" value={a.id} /><button>Send email</button></form>
            : a.jobs?.apply_url ? <a href={a.jobs.apply_url} target="_blank" rel="noreferrer">Apply online</a> : <span className="muted">{a.jobs?.apply_method}</span>}</td>
        </tr>)}
      </tbody></table></div>

      <h2>Employers</h2>
      <div className="card"><table><tbody>
        {(employers || []).map((e: any) => <tr key={e.id}>
          <td><b>{e.name}</b><div className="muted">{e.reg_number} · {e.contact_name} · {e.contact_phone} · {e.contact_email}</div></td>
          <td>{e.listing_credits} credits
            <form action={addCredits} className="row"><input type="hidden" name="id" value={e.id} />
              <input name="credits" type="number" min="1" defaultValue={1} style={{ width: 70 }} /><button className="ghost">Add (paid offline)</button></form></td>
          <td><form action={verifyEmployer}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="verified" value={String(!e.verified)} />
            <button className={e.verified ? 'ghost' : 'gold'}>{e.verified ? 'Unverify' : 'Verify'}</button></form></td>
        </tr>)}
      </tbody></table></div>

      <h2>Jobs waiting</h2>
      <div className="card"><table><tbody>
        {(pending || []).map((j: any) => <tr key={j.id}>
          <td><Link href={`/jobs/${j.id}`}>{j.title}</Link><div className="muted">{j.employer_name} · {j.status}</div></td>
          <td><form action={setJobStatus}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="live" /><button>Publish</button></form></td>
        </tr>)}
      </tbody></table></div>
    </>
  );
}
