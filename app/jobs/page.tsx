import Link from 'next/link';
import { userClient } from '@/lib/supabase';
import { MODES, JOB_FIELDS, JobCard, type JobRow } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jobs — Tigermax Jobs' };

export default async function Jobs({ searchParams }: { searchParams: { mode?: string; q?: string } }) {
  const sb = userClient();
  const term = (searchParams.q || '').replace(/[%,()]/g, '').trim();
  let q = sb.from('jobs').select(JOB_FIELDS).eq('status', 'live')
    .order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(100);
  if (searchParams.mode && MODES[searchParams.mode]) q = q.eq('work_mode', searchParams.mode);
  if (term) q = q.or(`title.ilike.%${term}%,category.ilike.%${term}%,employer_name.ilike.%${term}%`);
  const { data } = await q;
  const jobs = (data || []) as JobRow[];
  const href = (mode?: string) => {
    const p = new URLSearchParams();
    if (mode) p.set('mode', mode);
    if (term) p.set('q', term);
    const s = p.toString();
    return s ? `/jobs?${s}` : '/jobs';
  };
  return (
    <>
      <p className="eyebrow">Updated every morning</p>
      <h1 className="h-lg">Find your next job.</h1>
      <p className="lead">Jobs in Zimbabwe, online and abroad. Or skip the searching: upload your CV once and we apply for you when you match.</p>

      <form className="search" action="/jobs">
        <span aria-hidden>🔎</span>
        <input name="q" placeholder="Job title, field or employer" defaultValue={term} aria-label="Search jobs" />
        {searchParams.mode && <input type="hidden" name="mode" value={searchParams.mode} />}
        <button>Search</button>
      </form>

      <div className="segmented" style={{ margin: '20px 0 26px' }}>
        <Link href={href()} className={!searchParams.mode ? 'on' : ''}>All</Link>
        {Object.entries(MODES).map(([k, v]) => <Link key={k} href={href(k)} className={searchParams.mode === k ? 'on' : ''}>{v}</Link>)}
      </div>

      {jobs.map(j => <JobCard key={j.id} j={j} />)}
      {!jobs.length && (
        <div className="empty">
          <p style={{ fontSize: 19, color: 'var(--ink)', margin: '0 0 6px' }}>No jobs match yet.</p>
          <p style={{ margin: '0 0 18px' }}>New jobs are added every morning. Upload your CV and we will tell you when one fits.</p>
          <Link className="btn gold" href="/login?as=candidate">Upload my CV, free</Link>
        </div>
      )}
    </>
  );
}
