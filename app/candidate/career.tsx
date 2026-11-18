import Link from 'next/link';
import { adminClient } from '@/lib/supabase';
import { TESTS, TEST, CERTIFICATE_FEE, REASSESS_AFTER_DAYS, money } from '@/lib/assessments/catalog';
import { loadProfile, availableCredits, snapshot } from '@/lib/assessments/server';
import { pathways, insights, TIER_LABEL } from '@/lib/assessments/career';
import { generateCertificate } from '@/app/assessments/actions';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Africa/Harare' });

// Candidate dashboard: assessment history, free reports, development plan, certificates, reassessment and online workshops.
export default async function CareerSection({ userId, email }: { userId: string; email: string }) {
  const db = adminClient();
  const [{ profile, attempts, latest }, credits, { data: certs }, { data: courses }] = await Promise.all([
    loadProfile(userId), availableCredits(userId),
    db.from('assessment_certificates').select('serial,stars,issued_at,status').eq('user_id', userId).order('issued_at', { ascending: false }),
    db.from('workshop_registrations').select('reference,status,completed_modules,completed_at,workshops(title,delivery,modules,slug)').or(`user_id.eq.${userId},email.eq.${email.toLowerCase()}`).neq('status', 'cancelled'),
  ]);
  const done = Object.keys(profile.scores);
  const snap = snapshot(latest);
  const paths = done.length ? pathways(profile).slice(0, 3) : [];
  const dev = done.length ? insights(profile.scores).development.slice(0, 3) : [];
  const certCredits = (credits.certificate || []).length;
  const online = (courses || []).filter((c: any) => c.workshops?.delivery === 'online');

  return (
    <>
      <h2 id="career">Career Intelligence</h2>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><b>{done.length} of {TESTS.length} tests completed</b> <span className="stars" aria-label={`${snap.stars} of 5 stars`}>{'★'.repeat(snap.stars)}<span className="off">{'★'.repeat(5 - snap.stars)}</span></span>
            <div className="muted">One star for each of the five assessment areas you have covered.</div></div>
          <div className="row">
            <Link className="btn gold sm" href="/assessments#tests">{done.length ? 'Take more tests' : 'Start free'}</Link>
            {done.length > 0 && <Link className="btn ghost sm" href="/assessments/report">Free report (download)</Link>}
          </div>
        </div>
        {paths.length > 0 && <div className="mini">
          <b>Best-aligned pathways</b>
          {paths.map(p => <div key={p.o.key} className="ln"><span>{p.o.title}</span><span className="tag gold">{TIER_LABEL[p.tier]}</span></div>)}
        </div>}
        {dev.length > 0 && <div className="mini"><b>Development recommendations</b>{dev.map(d => <div key={d.area} className="ln"><span><b>{d.area}:</b> {d.action}</span></div>)}</div>}
      </div>

      <h3>Assessment history</h3>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table><thead><tr><th>Test</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>
          {attempts.slice(0, 30).map(a => {
            const t = TEST(a.test_code); if (!t) return null;
            const reopen = a.completed_at ? new Date(new Date(a.completed_at).getTime() + REASSESS_AFTER_DAYS * 86400e3) : null;
            const isLatest = latest[a.test_code]?.id === a.id;
            return <tr key={a.id}>
              <td><b>{t.name}</b>{a.scores?.overall && <div className="muted">{a.scores.overall.label}</div>}{a.scores?.code && <div className="muted">Code {a.scores.code}</div>}</td>
              <td>{fmt(a.started_at)}</td>
              <td>{a.status === 'completed' ? <span className="tag free">Completed</span> : a.status === 'expired' ? <span className="tag">Time ran out</span> : <span className="tag gold">In progress</span>}</td>
              <td>{a.status === 'completed' ? <><Link href={`/assessments/result/${a.id}`}>Result</Link>{isLatest && reopen && <div className="muted">{reopen.getTime() <= Date.now() ? <Link href={`/assessments#${t.code}`}>Reassess now</Link> : `Reassess from ${fmt(reopen.toISOString())}`}</div>}</>
                : a.status === 'in_progress' ? <Link href={`/assessments/take/${a.id}`}>Resume</Link>
                : <Link href={`/assessments#${t.code}`}>New sitting{t.price ? ` · ${money(t.price)}` : ''}</Link>}</td>
            </tr>;
          })}
          {!attempts.length && <tr><td colSpan={4} className="muted">No tests yet. The Workplace Preferences check is free and takes 8 minutes.</td></tr>}
        </tbody></table>
      </div>

      <h3>5-star certificates for employers</h3>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Your certificate shows employers which tests you have completed and which are pending (not your scores), with a serial number, security code, unique guilloche border and a QR code anyone can scan to verify it. Each download costs {money(CERTIFICATE_FEE)} and records your progress on that day.</p>
        <form action={generateCertificate} className="row">
          <button className="gold" disabled={!done.length}>{certCredits ? `Generate certificate (${certCredits} credit${certCredits > 1 ? 's' : ''} left)` : `Get a certificate · ${money(CERTIFICATE_FEE)}`}</button>
          {!done.length && <span className="muted">Complete at least one test first.</span>}
        </form>
        {(certs || []).length > 0 && <table style={{ marginTop: 12 }}><tbody>{(certs || []).map((c: any) => <tr key={c.serial}>
          <td className="mono"><Link href={`/certificates/${c.serial}`}>{c.serial}</Link></td><td className="stars">{'★'.repeat(c.stars)}</td><td className="muted">{fmt(c.issued_at)}</td>
          <td className="muted">{c.status === 'valid' ? 'Valid' : 'Revoked'} · share this link: /certificates/{c.serial}</td></tr>)}</tbody></table>}
      </div>

      {online.length > 0 && <>
        <h3>My online workshops</h3>
        <div className="card">{online.map((r: any) => {
          const n = (r.completed_modules || []).length, total = (r.workshops?.modules || []).length;
          return <div key={r.reference} className="ln-row row" style={{ justifyContent: 'space-between' }}>
            <span><b>{r.workshops?.title}</b><span className="muted"> · {n} of {total} modules{r.completed_at ? ' · completed' : ''}</span></span>
            {['confirmed', 'paid'].includes(r.status) ? <Link className="btn ghost sm" href={`/workshops/learn/${r.reference}`}>{r.completed_at ? 'Review' : n ? 'Continue' : 'Start'}</Link>
              : <Link className="btn ghost sm" href={`/workshops/ticket/${r.reference}`}>Pay to start</Link>}
          </div>;
        })}</div>
      </>}
    </>
  );
}
