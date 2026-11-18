import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { adminClient, currentUser } from '@/lib/supabase';
import { TEST, VALIDATION_LABEL, REASSESS_AFTER_DAYS } from '@/lib/assessments/catalog';
import type { Attempt } from '@/lib/assessments/server';
import { CONF_LABEL } from '@/lib/assessments/scoring';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your result — Tigermax Jobs', robots: { index: false } };

export default async function Result({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string> }) {
  const { user, role } = await currentUser();
  if (!user) redirect(`/login?as=candidate&next=/assessments/result/${params.id}`);
  const db = adminClient();
  let q = db.from('assessment_attempts').select('*').eq('id', params.id);
  if (role !== 'staff') q = q.eq('user_id', user.id);
  const { data } = await q.maybeSingle();
  const a = data as Attempt | null;
  if (!a) notFound();
  if (a.status !== 'completed' || !a.scores) redirect(`/assessments/take/${a.id}`);
  const t = TEST(a.test_code)!;
  const { data: v } = await db.from('assessment_validation').select('status').eq('test_code', t.code).maybeSingle();
  const sc = a.scores;
  const mins = Math.round((new Date(a.completed_at!).getTime() - new Date(a.started_at).getTime()) / 60000);
  const entries = Object.entries(sc.dims).sort((x, y) => (t.code === 'interests' || t.code === 'values' ? y[1].value - x[1].value : 0));

  return (
    <>
      {searchParams.done && <p className="notice">Finished. Your result is saved to your assessment history.</p>}
      <p className="eyebrow"><Link href="/assessments" className="link-arrow" style={{ color: 'inherit' }}>Career Intelligence</Link></p>
      <h1 className="h-lg">{t.name}</h1>
      <p className="muted">Completed {new Date(a.completed_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} in {mins} min · version {a.test_version} · {VALIDATION_LABEL[v?.status || 'pilot']}</p>

      {sc.code && <div className="card"><span className="muted">Your Holland code</span><div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '.08em' }}>{sc.code}</div>
        <p className="muted" style={{ margin: 0 }}>{sc.code.split('').map(l => t.dims[l].label).join(' · ')}</p></div>}
      {sc.overall && <div className="card"><span className="muted">Overall</span><div style={{ fontSize: 34, fontWeight: 800 }}>{sc.overall.label}</div>
        <p className="muted" style={{ margin: 0 }}>{sc.overall.note ? `${sc.overall.note} · ` : ''}{CONF_LABEL[sc.overall.confidence]}</p></div>}

      <div className="card">
        <table><thead><tr><th>Dimension</th><th>Result</th><th>Confidence</th><th>What it means</th></tr></thead><tbody>
          {entries.map(([k, d]) => { const def = t.dims[k]; return (
            <tr key={k}>
              <td><b>{def?.label || k}</b>{d.note && <div className="muted">{d.note}</div>}</td>
              <td><span className={`band ${d.band}`}>{d.label}</span></td>
              <td className="muted">{CONF_LABEL[d.confidence]}</td>
              <td className="muted">{t.code === 'preferences' ? (d.value === 0 ? 'Comfortable either way' : d.label) : d.band === 'high' ? def?.high : d.band === 'low' ? def?.low : `Between "${def?.low}" and "${def?.high}"`}</td>
            </tr>); })}
        </tbody></table>
        {sc.flags.map(f => <p key={f} className="notice" style={{ marginBottom: 0 }}>{f}</p>)}
      </div>

      <div className="mini">
        <p style={{ margin: '0 0 6px' }}><b>How this was scored.</b> {t.scoring}</p>
        <p style={{ margin: '0 0 6px' }}><b>How to read it.</b> {t.interpretation}</p>
        <p style={{ margin: 0 }}>This result is one source of information alongside your CV, experience and interviews. It is never used on its own to reject you. You can retake this test {REASSESS_AFTER_DAYS} days after this sitting, or ask the office (+263 77 133 1008) to explain or review it.</p>
      </div>
      <div className="row" style={{ marginTop: 20 }}>
        <Link className="btn gold" href="/assessments/report">See my full career report ›</Link>
        <Link className="btn ghost" href="/assessments#tests">Take another test</Link>
      </div>
    </>
  );
}
