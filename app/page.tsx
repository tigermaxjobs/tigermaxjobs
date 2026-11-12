import Link from 'next/link';
import { userClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const MODES: Record<string, string> = { onsite: 'Zimbabwe', remote: 'Online / remote', offshore: 'Abroad' };

export default async function Home({ searchParams }: { searchParams: { mode?: string; q?: string } }) {
  const sb = userClient();
  let q = sb.from('jobs').select('id,title,employer_name,location,work_mode,country,category,closes,featured,pay')
    .eq('status', 'live').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(100);
  if (searchParams.mode && MODES[searchParams.mode]) q = q.eq('work_mode', searchParams.mode);
  if (searchParams.q) q = q.or(`title.ilike.%${searchParams.q.replace(/[%,()]/g, '')}%,category.ilike.%${searchParams.q.replace(/[%,()]/g, '')}%`);
  const { data: jobs } = await q;
  return (
    <>
      <section className="card" style={{ background: 'var(--navy)', color: '#fff' }}>
        <h1 style={{ marginTop: 0 }}>Jobs in Zimbabwe, online and abroad</h1>
        <p>Upload your CV once. Tigermax Jobs matches you to new openings every day and prepares your applications, free for job seekers.</p>
        <div className="row">
          <Link className="btn gold" href="/login?as=candidate">Upload my CV</Link>
          <Link className="btn" style={{ border: '1px solid #fff' }} href="/login?as=employer">Post a job</Link>
        </div>
      </section>
      <form className="row" style={{ marginBottom: 14 }}>
        <input name="q" placeholder="Search title or field" defaultValue={searchParams.q} style={{ maxWidth: 280 }} />
        <select name="mode" defaultValue={searchParams.mode || ''} style={{ maxWidth: 200 }}>
          <option value="">All jobs</option>
          {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button>Search</button>
      </form>
      {(jobs || []).map(j => (
        <Link key={j.id} href={`/jobs/${j.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card">
            {j.featured && <span className="tag gold">Featured</span>}
            <span className="tag">{MODES[j.work_mode]}</span>
            <h3 style={{ margin: '8px 0 4px' }}>{j.title}</h3>
            <div className="muted">{j.employer_name} · {j.location || j.country}{j.closes ? ` · closes ${j.closes}` : ''}{j.pay ? ` · ${j.pay}` : ''}</div>
          </div>
        </Link>
      ))}
      {!jobs?.length && <p className="muted">No jobs match yet. Check back tomorrow; the list refreshes daily.</p>}
      <p className="muted" style={{ marginTop: 30 }}>Tigermax Jobs is a recruitment agency licensed by the Ministry of Labour. We never charge job seekers. · <Link href="/privacy">Privacy</Link></p>
    </>
  );
}
