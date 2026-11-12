import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/supabase';
import { applyToJob } from '@/app/actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Job({ params }: { params: { id: string } }) {
  const { sb, role } = await currentUser();
  const { data: j } = await sb.from('jobs').select('*').eq('id', params.id).single();
  if (!j) notFound();
  return (
    <div className="card">
      <span className="tag">{j.work_mode}</span>{j.category && <span className="tag">{j.category}</span>}
      <h1>{j.title}</h1>
      <p className="muted">{j.employer_name} · {j.location || j.country}{j.closes ? ` · closes ${j.closes}` : ''}</p>
      {j.pay && <p><b>Pay:</b> {j.pay}</p>}
      {j.caution && <p className="notice">{j.caution}</p>}
      <p>{j.summary}</p>
      {!!j.requirements?.length && <><h3>Requirements</h3><ul>{j.requirements.map((r: string) => <li key={r}>{r}</li>)}</ul></>}
      {!!j.documents?.length && <><h3>Documents</h3><ul>{j.documents.map((r: string) => <li key={r}>{r}</li>)}</ul></>}
      {role === 'candidate' ? (
        <form action={applyToJob}><input type="hidden" name="job_id" value={j.id} /><button className="gold">Apply with my Tigermax CV</button></form>
      ) : !role ? <Link className="btn gold" href="/login?as=candidate">Sign in to apply</Link> : null}
      {j.source_url && <p className="muted">Original advert: <a href={j.source_url} target="_blank" rel="noreferrer">{new URL(j.source_url).hostname}</a></p>}
    </div>
  );
}
