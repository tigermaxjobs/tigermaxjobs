import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser, adminClient } from '@/lib/supabase';
import { ORG_PACKS, TESTS, money } from '@/lib/assessments/catalog';
import { buyOrgPack } from '@/app/assessments/actions';

export const dynamic = 'force-dynamic';

// Employer group packs: buy seats, hand out codes, follow progress of candidates who agreed to share.
// Employers see tests completed/pending and certificates only, never item answers or detailed scores.
export default async function EmployerAssessments({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, user, role } = await currentUser();
  if (!user) redirect('/login?as=employer&next=/employer/assessments');
  if (role !== 'employer') redirect('/');
  const { data: e } = await sb.from('employers').select('id,name').eq('owner_id', user.id).maybeSingle();
  if (!e) redirect('/employer?error=' + encodeURIComponent('Set up your company profile first.'));
  const db = adminClient();
  const [{ data: vouchers }, { data: orders }] = await Promise.all([
    db.from('assessment_vouchers').select('*').eq('employer_id', e.id).order('created_at', { ascending: false }),
    db.from('assessment_orders').select('reference,invoice_no,amount,status,created_at,items').eq('employer_id', e.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const shared = (vouchers || []).filter((v: any) => v.redeemed_by && v.share_progress).map((v: any) => v.redeemed_by);
  const [{ data: done }, { data: certs }, { data: names }] = shared.length ? await Promise.all([
    db.from('assessment_attempts').select('user_id,test_code').in('user_id', shared).eq('status', 'completed'),
    db.from('assessment_certificates').select('user_id,serial,stars,issued_at').in('user_id', shared).eq('status', 'valid').order('issued_at', { ascending: false }),
    db.from('candidates').select('user_id,full_name,email').in('user_id', shared),
  ]) : [{ data: [] }, { data: [] }, { data: [] }] as any[];
  const doneBy: Record<string, Set<string>> = {};
  for (const a of done || []) (doneBy[a.user_id] ||= new Set()).add(a.test_code);
  const cohorts = Array.from(new Set((vouchers || []).map((v: any) => v.cohort || 'No cohort')));

  return (
    <>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <p className="eyebrow"><Link href="/employer" className="link-arrow" style={{ color: 'inherit' }}>Dashboard</Link></p>
      <h1>Career Intelligence for your people</h1>
      <p className="muted">Fund assessments for candidates you are hiring, or staff you are reskilling, upskilling or retaining. Each seat is a Full Career Intelligence pack (all {TESTS.length - 1} paid tests, free report and one 5-star certificate). Results support your decisions; they must never be the only reason to reject someone.</p>

      <div className="prices" style={{ margin: '18px 0' }}>
        {Object.entries(ORG_PACKS).map(([k, p]) => <div key={k} className="card price"><b>{p.name}</b><div className="amt">{money(p.price)}</div><p className="muted" style={{ margin: 0 }}>{money(p.price / p.seats)} per person</p></div>)}
      </div>
      <form action={buyOrgPack} className="card stack">
        <div className="grid2">
          <label>Pack<select name="pack" required defaultValue="team10">{Object.entries(ORG_PACKS).map(([k, p]) => <option key={k} value={k}>{p.name} · {money(p.price)}</option>)}</select></label>
          <label>Cohort name (optional)<input name="cohort" placeholder="e.g. Graduate trainees 2027" /></label>
        </div>
        <fieldset className="payopts"><legend>Payment</legend>
          <label className="opt"><input type="radio" name="pay_option" value="paynow" defaultChecked /><span><b>Pay now</b><small>EcoCash or Visa/Mastercard through Paynow</small></span></label>
          <label className="opt"><input type="radio" name="pay_option" value="invoice" /><span><b>Company invoice</b><small>Codes are released once payment is received</small></span></label>
        </fieldset>
        <button className="gold">Buy seats</button>
      </form>

      <h2>Seat codes ({(vouchers || []).length})</h2>
      <p className="muted">Give one code to each person. They redeem it at <b>tigermaxjobs.com/assessments</b> and choose whether to share their progress with you.</p>
      {cohorts.map(c => {
        const list = (vouchers || []).filter((v: any) => (v.cohort || 'No cohort') === c);
        return (
          <div key={c} className="card" style={{ overflowX: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{c} · {list.filter((v: any) => v.redeemed_by).length} of {list.length} used</h3>
            <table><thead><tr><th>Code</th><th>Person</th><th>Progress</th><th>Certificate</th></tr></thead><tbody>
              {list.map((v: any) => {
                const who = (names || []).find((n: any) => n.user_id === v.redeemed_by);
                const n = doneBy[v.redeemed_by]?.size || 0;
                const cert = (certs || []).find((x: any) => x.user_id === v.redeemed_by);
                return <tr key={v.id}>
                  <td className="mono">{v.code}</td>
                  <td>{!v.redeemed_by ? <span className="muted">Not used yet</span> : v.share_progress ? <>{who?.full_name || 'Candidate'}<div className="muted">{who?.email}</div></> : <span className="muted">Used · not shared</span>}</td>
                  <td>{v.redeemed_by && v.share_progress ? `${n} of ${TESTS.length} tests` : '-'}</td>
                  <td>{cert && v.share_progress ? <Link href={`/certificates/${cert.serial}`}>{'★'.repeat(cert.stars)} {cert.serial}</Link> : '-'}</td>
                </tr>;
              })}
            </tbody></table>
          </div>
        );
      })}
      {!(vouchers || []).length && <div className="empty">No seats yet. Buy a pack above; codes appear here once payment is confirmed.</div>}

      {(orders || []).length > 0 && <>
        <h2>Orders</h2>
        <div className="card"><table><tbody>{(orders || []).map((o: any) => <tr key={o.reference}>
          <td className="mono">{o.invoice_no}</td><td>{(o.items as any[]).map(i => i.label).join(', ')}</td><td>US${Number(o.amount).toFixed(2)}</td>
          <td>{o.status === 'paid' ? 'Paid' : o.status === 'cancelled' ? 'Cancelled' : <Link href={`/assessments/order/${o.reference}`}>Pay invoice</Link>}</td></tr>)}</tbody></table></div>
      </>}
    </>
  );
}
