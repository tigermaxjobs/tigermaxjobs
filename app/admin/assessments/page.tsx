import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser, adminClient } from '@/lib/supabase';
import { TESTS, VALIDATION_LABEL } from '@/lib/assessments/catalog';
import { computeStats, MIN_N, MIN_ALPHA } from '@/lib/assessments/stats';
import { staffMarkOrder, staffValidation, staffExtraTime, staffEvidence, staffGrant } from '@/app/assessments/actions';

export const dynamic = 'force-dynamic';

export default async function OfficeAssessments({ searchParams }: { searchParams: Record<string, string> }) {
  const { role } = await currentUser();
  if (role !== 'staff') redirect('/');
  const db = adminClient();
  const [{ data: orders }, { data: attempts }, { data: val }, { data: ev }, { data: cands }, { data: certs }] = await Promise.all([
    db.from('assessment_orders').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('assessment_attempts').select('user_id,test_code,status,started_at,completed_at,responses,scores').in('status', ['completed', 'expired']).order('started_at', { ascending: false }).limit(5000),
    db.from('assessment_validation').select('*'),
    db.from('competency_evidence').select('*').eq('status', 'submitted').order('created_at').limit(100),
    db.from('candidates').select('user_id,full_name,email,location,assessment_extra_time_pct').not('user_id', 'is', null).limit(5000),
    db.from('assessment_certificates').select('serial,full_name,stars,issued_at,status').order('issued_at', { ascending: false }).limit(30),
  ]);
  const loc: Record<string, string> = {}; const nameOf: Record<string, string> = {};
  for (const c of cands || []) { loc[c.user_id] = c.location || ''; nameOf[c.user_id] = `${c.full_name} (${c.email})`; }
  const stats = computeStats(attempts || [], uid => loc[uid] || '');
  const vmap: Record<string, any> = {}; for (const v of val || []) vmap[v.test_code] = v;
  const due = (orders || []).filter((o: any) => o.status === 'awaiting_payment');
  const paid = (orders || []).filter((o: any) => o.status === 'paid').reduce((n: number, o: any) => n + Number(o.amount), 0);
  const extra = (cands || []).filter((c: any) => c.assessment_extra_time_pct > 0);

  return (
    <>
      {searchParams.saved && <p className="notice">Saved.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <p className="eyebrow"><Link href="/admin" className="link-arrow" style={{ color: 'inherit' }}>Office</Link></p>
      <h1>Career Intelligence</h1>
      <div className="stats" style={{ margin: '12px 0 24px' }}>
        <div><b>{(attempts || []).filter((a: any) => a.status === 'completed').length}</b><span>completed sittings</span></div>
        <div><b>{due.length}</b><span>orders awaiting payment</span></div>
        <div><b>US${paid.toFixed(0)}</b><span>paid (last 100 orders)</span></div>
      </div>

      <h2>Orders awaiting payment</h2>
      <div className="card" style={{ overflowX: 'auto' }}><table><thead><tr><th>Invoice</th><th>Buyer</th><th>Items</th><th>Amount</th><th></th></tr></thead><tbody>
        {due.map((o: any) => <tr key={o.id}>
          <td className="mono">{o.invoice_no}<div className="muted"><a href={`/assessments/order/${o.reference}`}>view</a></div></td>
          <td>{nameOf[o.user_id] || (o.employer_id ? 'Employer' : '-')}</td>
          <td className="muted">{(o.items as any[]).map(i => `${i.qty || 1} × ${i.label}`).join('; ')}</td>
          <td>US${Number(o.amount).toFixed(2)}</td>
          <td><form action={staffMarkOrder} className="row"><input type="hidden" name="id" value={o.id} />
            <select name="via" style={{ width: 'auto', padding: '6px 8px' }}><option value="ecocash">EcoCash</option><option value="bank">Bank</option><option value="cash">Cash</option></select>
            <button className="sm">Mark paid &amp; release</button></form>
            <form action={staffMarkOrder} style={{ marginTop: 6 }}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="action" value="cancel" /><button className="ghost sm">Cancel</button></form></td>
        </tr>)}
        {!due.length && <tr><td colSpan={5} className="muted">Nothing awaiting payment.</td></tr>}
      </tbody></table></div>

      <h2 id="validation">Validation evidence (generated from real sittings)</h2>
      <p className="muted">Thresholds for &ldquo;Reliability established&rdquo;: at least {MIN_N} completed sittings and Cronbach&apos;s alpha of {MIN_ALPHA} or more on every scale (ability tests: item–total correlation of 0.15+ and no items everyone gets right or wrong). &ldquo;Validated for local use&rdquo; additionally needs a criterion study linking results to job outcomes (e.g. supervisor ratings or probation results) reviewed by a qualified psychologist. The public status changes only when you change it here.</p>
      {stats.map(s => {
        const v = vmap[s.code]; const status = v?.status || 'pilot';
        return (
          <div key={s.code} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{s.name}</h3>
              <span className={`tag ${status === 'pilot' ? '' : 'gold'}`}>{VALIDATION_LABEL[status]}</span>
            </div>
            <p className="muted">{s.completed} completed · {s.expired} timed out ({Math.round(s.timeoutRate * 100)}%) · median {s.medianMin} min
              {s.meetsReliability ? <> · <b>meets the reliability threshold</b></> : <> · needs {Math.max(0, MIN_N - s.completed)} more sittings{s.reliability.some(r => r.alpha !== null && r.alpha < MIN_ALPHA) ? ' and some scales are below the alpha threshold' : ''}</>}</p>
            {s.reliability.length > 0 && <div className="mini" style={{ marginTop: 0 }}>{s.reliability.map(r => <div key={r.dim} className="ln"><span>{r.label} ({r.k} items)</span><span>α = {r.alpha ?? 'not enough data'}</span></div>)}</div>}
            {s.items.length > 0 && <details><summary style={{ fontSize: 14 }}>Item analysis ({s.items.length} items)</summary>
              <div className="mini">{s.items.map(i => <div key={i.id} className="ln"><span className="mono">{i.id}</span><span>p = {i.p} · r(it) = {i.rit} · n = {i.n}{i.n >= 20 && (i.rit < 0.15 || i.p <= 0.1 || i.p >= 0.95) ? ' · review' : ''}</span></div>)}</div></details>}
            {s.fairness && <p className="muted" style={{ marginBottom: 8 }}>Group check: {s.fairness.groups}{s.fairness.ratio !== null ? `, top-band ratio ${s.fairness.ratio}` : ''}. {s.fairness.note}.</p>}
            <form action={staffValidation} className="stack">
              <input type="hidden" name="code" value={s.code} />
              <div className="grid2">
                <label>Status<select name="status" defaultValue={status}><option value="pilot">{VALIDATION_LABEL.pilot}</option><option value="reliability">{VALIDATION_LABEL.reliability}</option><option value="validated">{VALIDATION_LABEL.validated}</option></select></label>
                <label>Supporting study (required to leave pilot)<input name="evidence" defaultValue={v?.evidence || ''} placeholder="e.g. N=312, alpha .74–.82, Nov 2027, reviewed by …" /></label>
              </div>
              <button className="ghost sm" style={{ justifySelf: 'start' }}>Save status</button>
            </form>
          </div>
        );
      })}

      <h2 id="evidence">Competency evidence to review ({(ev || []).length})</h2>
      <div className="card" style={{ overflowX: 'auto' }}><table><tbody>
        {(ev || []).map((e: any) => <tr key={e.id}>
          <td><b>{nameOf[e.user_id] || e.user_id}</b><div className="muted">{e.competency} · self-rated {e.self_rating}/4</div></td>
          <td className="muted">{e.evidence}{e.evidence_url && <div><a href={e.evidence_url} target="_blank" rel="noreferrer noopener">{e.evidence_url}</a></div>}</td>
          <td><form action={staffEvidence} className="stack"><input type="hidden" name="id" value={e.id} /><input name="note" placeholder="Note (optional)" />
            <div className="row"><button name="status" value="verified" className="sm">Verified</button><button name="status" value="not_verified" className="ghost sm">Not verified</button></div></form></td>
        </tr>)}
        {!(ev || []).length && <tr><td className="muted">Nothing to review.</td></tr>}
      </tbody></table></div>

      <div className="grid2">
        <form action={staffExtraTime} className="card stack" id="access">
          <h3 style={{ margin: 0 }}>Extra time (accessibility)</h3>
          <p className="muted" style={{ margin: 0 }}>Agreed accommodations for disability or other needs. Applies to the candidate&apos;s next sittings.</p>
          <label>Candidate email<input name="email" type="email" required /></label>
          <label>Extra time %<input name="pct" type="number" min={0} max={100} defaultValue={25} /></label>
          <button className="sm">Save</button>
          {extra.length > 0 && <div className="mini">{extra.map((c: any) => <div key={c.user_id} className="ln"><span>{c.full_name}</span><span>+{c.assessment_extra_time_pct}%</span></div>)}</div>}
        </form>
        <form action={staffGrant} className="card stack" id="grant">
          <h3 style={{ margin: 0 }}>Grant a free sitting or certificate</h3>
          <p className="muted" style={{ margin: 0 }}>For a technical failure, a disputed timeout or a sponsored candidate.</p>
          <label>Candidate email<input name="email" type="email" required /></label>
          <label>Item<select name="item">{TESTS.filter(t => t.price > 0).map(t => <option key={t.code} value={t.code}>{t.name}</option>)}<option value="certificate">5-star certificate</option></select></label>
          <button className="sm">Grant</button>
        </form>
      </div>

      <h2>Recent certificates</h2>
      <div className="card"><table><tbody>{(certs || []).map((c: any) => <tr key={c.serial}><td className="mono"><Link href={`/certificates/${c.serial}`}>{c.serial}</Link></td><td>{c.full_name}</td><td>{'★'.repeat(c.stars)}</td><td className="muted">{new Date(c.issued_at).toLocaleDateString('en-GB')}</td></tr>)}
        {!(certs || []).length && <tr><td className="muted">None yet.</td></tr>}</tbody></table></div>
    </>
  );
}
