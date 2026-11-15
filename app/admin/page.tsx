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
  const q = (searchParams.q || '').replace(/[%,()]/g, '').trim();
  let cvq = sb.from('candidates').select('id,full_name,email,phone,headline,location,categories,modes,has_passport,source,created_at')
    .order('created_at', { ascending: false }).limit(200);
  if (q) cvq = cvq.or(`full_name.ilike.%${q}%,headline.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: bank } = await cvq;
  const { data: offshore } = await sb.from('candidates').select('id,full_name,email,phone,has_passport,offshore_registered_at')
    .not('offshore_registered_at', 'is', null).order('offshore_registered_at', { ascending: false }).limit(100);
  return (
    <>
      {searchParams.sent && <p className="notice">Application sent.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <h1>Office</h1>
      <p className="muted">{candidates ?? 0} candidates · {live ?? 0} live jobs</p>

      <h2 id="cv-bank">CV bank ({candidates ?? 0})</h2>
      <form className="search" action="/admin#cv-bank" style={{ marginBottom: 14 }}>
        <input name="q" placeholder="Search name, field or email" defaultValue={q} aria-label="Search candidates" />
        <button>Search</button>
      </form>
      <div className="card" style={{ overflowX: 'auto' }}><table><thead><tr><th>Candidate</th><th>Contact</th><th>Fields</th><th>Wants</th></tr></thead><tbody>
        {(bank || []).map((c: any) => <tr key={c.id}>
          <td><b>{c.full_name}</b><div className="muted">{c.headline}{c.location ? ` · ${c.location}` : ''}</div></td>
          <td>{c.phone || <span className="muted">no phone</span>}<div className="muted">{c.email || <span className="tag gold">email missing</span>}</div></td>
          <td className="muted">{(c.categories || []).slice(0, 4).join(', ')}</td>
          <td className="muted">{(c.modes || []).join(', ')}{c.has_passport === 'yes' ? ' · passport' : ''}</td>
        </tr>)}
        {!bank?.length && <tr><td colSpan={4} className="muted">{q ? 'No candidates match.' : 'No candidates yet.'}</td></tr>}
      </tbody></table></div>

      <h2>Offshore registrations paid ({offshore?.length ?? 0})</h2>
      <div className="card"><table><thead><tr><th>Candidate</th><th>Contact</th><th>Passport</th><th>Paid</th></tr></thead><tbody>
        {(offshore || []).map((c: any) => <tr key={c.id}><td>{c.full_name}</td><td>{c.phone}<div className="muted">{c.email}</div></td>
          <td>{c.has_passport}</td><td>{new Date(c.offshore_registered_at).toLocaleDateString('en-GB')}</td></tr>)}
        {!offshore?.length && <tr><td colSpan={4} className="muted">No paid offshore registrations yet.</td></tr>}
      </tbody></table></div>

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
