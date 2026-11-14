import Link from 'next/link';

export const MODES: Record<string, string> = { onsite: 'Zimbabwe', remote: 'Online / remote', offshore: 'Abroad' };

export type JobRow = {
  id: string; title: string; employer_name: string; location: string | null; work_mode: string;
  country: string | null; category: string | null; closes: string | null; featured: boolean | null; pay: string | null;
};

export const JOB_FIELDS = 'id,title,employer_name,location,work_mode,country,category,closes,featured,pay';

export function JobCard({ j }: { j: JobRow }) {
  return (
    <Link href={`/jobs/${j.id}`} className="job">
      <div className="logo">{(j.employer_name || '?').trim().charAt(0).toUpperCase()}</div>
      <div>
        <h3>{j.title}</h3>
        <div className="muted">{j.employer_name} · {j.location || j.country}{j.closes ? ` · closes ${j.closes}` : ''}{j.pay ? ` · ${j.pay}` : ''}</div>
        <div style={{ marginTop: 8 }}>
          {j.featured && <span className="tag gold">Featured</span>}
          <span className="tag">{MODES[j.work_mode] || j.work_mode}</span>
          {j.category && <span className="tag">{j.category}</span>}
        </div>
      </div>
      <span className="go">›</span>
    </Link>
  );
}
