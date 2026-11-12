import { redirect } from 'next/navigation';
import { currentUser, adminClient } from '@/lib/supabase';
import { updateStage } from '@/app/actions';

export const dynamic = 'force-dynamic';
const STAGES = ['applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];

export default async function JobPipeline({ params }: { params: { id: string } }) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login');
  const { data: job } = await sb.from('jobs').select('*, employers(owner_id, managed_service)').eq('id', params.id).single();
  if (!job || job.employers?.owner_id !== user.id) redirect('/employer');
  const { data: apps } = await sb.from('applications').select('*, candidates(full_name, email, phone, location, headline, cv_path)').eq('job_id', job.id).order('score', { ascending: false, nullsFirst: false });
  // Short-lived links to applicants' CVs (ownership checked above).
  const admin = adminClient();
  const links: Record<string, string> = {};
  for (const a of apps || []) if (a.candidates?.cv_path) {
    const { data } = await admin.storage.from('cvs').createSignedUrl(a.candidates.cv_path, 3600);
    if (data) links[a.id] = data.signedUrl;
  }
  return (
    <>
      <h1>{job.title}</h1>
      <p className="muted">{apps?.length ?? 0} applicants · {job.status}{job.employers?.managed_service ? ' · Tigermax is managing shortlisting and interviews for you' : ''}</p>
      {(apps || []).map((a: any) => (
        <div className="card" key={a.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div><b>{a.candidates?.full_name}</b> <span className="muted">{a.candidates?.headline} · {a.candidates?.location}</span></div>
            <div>{a.score ? <span className="tag gold">{a.score}% match</span> : null}<span className="tag">{a.stage}</span></div>
          </div>
          {a.why && <p className="muted">{a.why}</p>}
          <p className="muted">{a.candidates?.email} · {a.candidates?.phone} {links[a.id] && <> · <a href={links[a.id]} target="_blank" rel="noreferrer">Download CV</a></>}</p>
          <form action={updateStage} className="row">
            <input type="hidden" name="id" value={a.id} /><input type="hidden" name="job_id" value={job.id} />
            <select name="stage" defaultValue={a.stage} style={{ maxWidth: 160 }}>{STAGES.map(s => <option key={s}>{s}</option>)}</select>
            <input type="datetime-local" name="interview_at" title="Interview date and time" style={{ maxWidth: 220 }} />
            <input name="notes" placeholder="Notes" defaultValue={a.employer_notes ?? ''} style={{ maxWidth: 260 }} />
            <button>Update</button>
          </form>
        </div>
      ))}
    </>
  );
}
