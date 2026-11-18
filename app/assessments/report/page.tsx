import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { TESTS, TEST, AREAS, type Area } from '@/lib/assessments/catalog';
import { CONF_LABEL } from '@/lib/assessments/scoring';
import { loadProfile, snapshot } from '@/lib/assessments/server';
import { pathways, insights, validationNote, CFI_DIMS, FIT_LABEL, TIER_LABEL, type Pathway, type Tier } from '@/lib/assessments/career';
import PrintButton from '@/lib/print-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My career intelligence report — Tigermax Jobs', robots: { index: false } };

const WORKSHOP_FOR: Record<string, [string, string]> = {
  'Spreadsheets': ['online-work-readiness-2027', 'Online Work: The Right Tools for the Trade'],
  'Email & online communication': ['online-work-readiness-2027', 'Online Work: The Right Tools for the Trade'],
  'Conscientiousness': ['work-readiness-summit-2026', 'Work Readiness Course'],
  'Reliability': ['work-readiness-summit-2026', 'Work Readiness Course'],
};

export default async function Report({ searchParams }: { searchParams: Record<string, string> }) {
  const { user, role } = await currentUser();
  if (!user) redirect('/login?as=candidate&next=/assessments/report');
  // Staff can open a candidate's report for human review: /assessments/report?u=<user id>
  const uid = role === 'staff' && searchParams.u ? searchParams.u : user.id;
  const { profile, latest, candidate, evidence } = await loadProfile(uid);
  const done = Object.keys(profile.scores);
  const snap = snapshot(latest);
  const name = candidate?.full_name || user.email;

  if (!done.length) return (
    <div style={{ maxWidth: 640, margin: '20px auto' }} className="center">
      <p className="eyebrow">Career Intelligence report</p>
      <h1 className="h-lg">Your report starts with one test.</h1>
      <p className="lead">Take the free Workplace Preferences check, then the Career Snapshot (personality, interests and values) for your first career pathways.</p>
      <Link className="btn gold" href="/assessments#tests">Go to the tests</Link>
    </div>
  );

  const paths = pathways(profile);
  const top = paths[0];
  const shown = paths.slice(0, 9);
  const byTier = (t: Tier) => shown.filter(p => p.tier === t);
  const ins = insights(profile.scores);
  const missing = TESTS.filter(t => !profile.scores[t.code]);
  const s = profile.scores;

  return (
    <>
      <div className="row noprint" style={{ justifyContent: 'space-between' }}>
        <p className="eyebrow" style={{ margin: 0 }}><Link href="/assessments" className="link-arrow" style={{ color: 'inherit' }}>Career Intelligence</Link></p>
        <PrintButton label="Download report (free PDF)" />
      </div>
      <h1 className="h-lg">Career intelligence report</h1>
      <p className="muted">{name} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {done.length} of {TESTS.length} tests completed · <span className="stars" aria-label={`${snap.stars} of 5 stars`}>{'★'.repeat(snap.stars)}<span className="off">{'★'.repeat(5 - snap.stars)}</span></span></p>

      <div className="card" style={{ borderColor: 'var(--gold)' }}>
        <span className="muted">Career Fulfilment Index · best-aligned pathway</span>
        <h2 style={{ margin: '4px 0 14px' }}>{top.o.title} <span className="tag gold" style={{ verticalAlign: 'middle' }}>{TIER_LABEL[top.tier]}</span></h2>
        <Cfi p={top} />
        <p className="muted" style={{ marginBottom: 0 }}>The index shows how well a pathway fits you on five dimensions, each with a confidence level. It is not a percentage or a prediction. {validationNote(profile.validation)}</p>
      </div>

      <h2>Your profile at a glance</h2>
      <div className="grid3">
        {s.interests && <Glance title="Interests (Holland code)" big={s.interests.code!} sub={s.interests.code!.split('').map(l => TEST('interests')!.dims[l].label.split(' ')[0]).join(' · ')} />}
        {s.values?.ranking && <Glance title="Top work values" big={TEST('values')!.dims[s.values.ranking[0]].label} sub={s.values.ranking.slice(1, 3).map(v => TEST('values')!.dims[v].label).join(' · ')} />}
        {['numerical', 'verbal', 'abstract', 'sjt', 'digital', 'customer'].filter(c => s[c]?.overall).map(c =>
          <Glance key={c} title={TEST(c)!.name} big={s[c].overall!.label} sub={CONF_LABEL[s[c].overall!.confidence]} />)}
      </div>
      {s.personality && <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Work personality</h3>
        <table><tbody>{Object.entries(s.personality.dims).map(([k, d]) =>
          <tr key={k}><td><b>{TEST('personality')!.dims[k].label}</b></td><td><span className={`band ${d.band}`}>{d.label}</span></td><td className="muted">{d.band === 'high' ? TEST('personality')!.dims[k].high : d.band === 'low' ? TEST('personality')!.dims[k].low : 'Balanced'}</td><td className="muted">{CONF_LABEL[d.confidence]}</td></tr>)}</tbody></table>
      </div>}

      <h2>Occupational alignment and career pathways</h2>
      <p className="muted">Pathways are ranked by fit. Readiness uses your CV and verified evidence: <b>Qualified now</b> means you appear to meet the usual entry requirements; <b>Needs additional training</b> means a short course, certificate or practice would close the gap; <b>Longer-term pathway</b> means a qualification or significant experience is still needed.</p>
      {(['now', 'training', 'pathway'] as Tier[]).map(tier => byTier(tier).length > 0 && (
        <div key={tier}>
          <h3>{TIER_LABEL[tier]}</h3>
          {byTier(tier).map(p => (
            <div key={p.o.key} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: 19 }}>{p.o.title}</h4>
                <span className="muted">Interest code {p.o.riasec}</span>
              </div>
              <Cfi p={p} compact />
              <div className="grid2" style={{ marginTop: 12 }}>
                <div className="muted" style={{ fontSize: 15 }}>
                  <b>Qualification:</b> {p.qual === 'yes' ? 'Found in your CV' : p.o.noQualNeeded ? 'No formal qualification required' : p.qual === 'related' ? 'Related study or experience found' : 'Not found in your CV'}<br />
                  <b>Usual entry:</b> {p.o.entry}<br />
                  <b>Training:</b> {p.o.training}
                </div>
                <div className="muted" style={{ fontSize: 15 }}>
                  {p.gaps.length > 0 && <><b>Gaps to close:</b><ul style={{ margin: '4px 0', paddingLeft: 18 }}>{p.gaps.map(g => <li key={g}>{g}</li>)}</ul></>}
                  {p.missingTests.length > 0 && <><b>Tests that would sharpen this:</b> {p.missingTests.map(c => TEST(c)!.name).join(', ')}<br /></>}
                  <b>Abroad:</b> {p.o.international}
                </div>
              </div>
              {p.o.jobsQuery && <div className="row noprint" style={{ marginTop: 10 }}>
                <Link className="btn sm" href={`/jobs?q=${encodeURIComponent(p.o.jobsQuery)}`}>Matching jobs in Zimbabwe</Link>
                <Link className="btn ghost sm" href={`/jobs?mode=remote&q=${encodeURIComponent(p.o.jobsQuery)}`}>Online</Link>
                <Link className="btn ghost sm" href={`/jobs?mode=offshore&q=${encodeURIComponent(p.o.jobsQuery)}`}>Abroad</Link>
              </div>}
            </div>
          ))}
        </div>
      ))}

      <div className="grid2">
        <div className="card"><h3 style={{ marginTop: 0 }}>Environments where you are likely to thrive</h3>
          {ins.environments.length ? <ul className="ticks">{ins.environments.map(e => <li key={e}>{e}</li>)}</ul> : <p className="muted">Take Workplace Preferences and Work Personality to see this.</p>}</div>
        <div className="card"><h3 style={{ marginTop: 0 }}>Strengths</h3>
          {ins.strengths.length ? <ul className="ticks">{ins.strengths.map(e => <li key={e}>{e}</li>)}</ul> : <p className="muted">Strengths appear as you complete more tests.</p>}</div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Challenges and development recommendations</h3>
        {ins.challenges.length === 0 && <p className="muted">No clear development areas in the tests you have taken so far.</p>}
        {ins.development.map(d => (
          <div key={d.area} className="ln-row"><b>{d.area}.</b> {d.action}
            {WORKSHOP_FOR[d.area] && <> <Link href={`/workshops/${WORKSHOP_FOR[d.area][0]}`}>Online workshop: {WORKSHOP_FOR[d.area][1]} ›</Link></>}</div>))}
        {ins.challenges.filter(c => !ins.development.some(d => c.startsWith(d.area))).map(c => <div key={c} className="ln-row muted">{c}</div>)}
        {top.gaps.length > 0 && <p style={{ marginBottom: 0 }}><b>Qualification gaps for {top.o.title}:</b> {top.gaps.join('; ')}.</p>}
      </div>

      {evidence.length > 0 && <div className="card"><h3 style={{ marginTop: 0 }}>Self-assessed competencies</h3>
        {(evidence as any[]).map(e => <div key={e.id} className="ln-row">{e.competency}: level {e.self_rating} of 4 · {e.status === 'verified' ? <b>verified by Tigermax</b> : e.status === 'not_verified' ? 'not verified' : 'awaiting review'}</div>)}</div>}

      <div className="card noprint">
        <h3 style={{ marginTop: 0 }}>Raise the confidence of this report</h3>
        {missing.length ? <p className="muted" style={{ marginTop: 0 }}>Still to take: {missing.map(t => t.name).join(', ')}.</p> : <p className="muted">You have completed every test. Reassess after 90 days to track your growth.</p>}
        <div className="row">
          <Link className="btn gold sm" href="/assessments#tests">Take more tests</Link>
          <Link className="btn ghost sm" href="/candidate#career">Get my 5-star certificate</Link>
        </div>
      </div>

      <div className="mini">
        <b>About this report.</b> It combines your test results ({(Object.keys(AREAS) as Area[]).filter(a => snap.areas.includes(a)).map(a => AREAS[a]).join('; ')}) with your CV. It describes tendencies and current skills, which change with experience and training. It is not a diagnosis, and Tigermax never uses it as the only reason to reject anyone. Ask the office on +263 77 133 1008 to explain or review any part of it.
      </div>
    </>
  );
}

function Glance({ title, big, sub }: { title: string; big: string; sub: string }) {
  return <div className="card" style={{ margin: 0 }}><span className="muted">{title}</span><div style={{ fontSize: 26, fontWeight: 800, margin: '4px 0' }}>{big}</div><span className="muted">{sub}</span></div>;
}

function Cfi({ p, compact }: { p: Pathway; compact?: boolean }) {
  return (
    <div className={`cfi ${compact ? 'compact' : ''}`}>
      {CFI_DIMS.map(([k, label]) => { const f = p.cfi[k]; return (
        <div key={k}>
          <span>{label}</span>
          <b className={`fit ${f.band}`}>{FIT_LABEL[f.band]}</b>
          {f.band !== 'unknown' ? <small>{CONF_LABEL[f.confidence]}</small> : <small>{f.basis}</small>}
          {!compact && f.band !== 'unknown' && <small>{f.basis}</small>}
        </div>); })}
    </div>
  );
}
