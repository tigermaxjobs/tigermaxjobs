import { notFound } from 'next/navigation';
import Link from 'next/link';
import { adminClient } from '@/lib/supabase';
import { paynowStatus } from '@/lib/paynow';
import { bankLines, PROOF_WHATSAPP, PROOF_WHATSAPP_LINK } from '@/lib/workshops';
import { fulfilOrder } from '@/lib/assessments/server';
import PrintButton from '@/lib/print-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your order — Tigermax Jobs', robots: { index: false } };

// Private page reached through the order's unguessable reference: invoice while unpaid, receipt once paid.
export default async function Order({ params, searchParams }: { params: { ref: string }; searchParams: Record<string, string> }) {
  const db = adminClient();
  let { data: o } = await db.from('assessment_orders').select('*').eq('reference', params.ref).maybeSingle();
  if (!o) notFound();
  if (o.status === 'awaiting_payment' && o.poll_url && process.env.PAYNOW_INTEGRATION_ID) {
    try {
      const st = await paynowStatus(o.poll_url);
      if (st.paid) {
        await db.from('assessment_orders').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: 'paynow' }).eq('id', o.id).eq('status', 'awaiting_payment');
        await fulfilOrder(o.id);
        o = { ...o, status: 'paid', paid_via: 'paynow', paid_at: new Date().toISOString() };
      }
    } catch { /* show current status */ }
  }
  const unpaid = o.status === 'awaiting_payment';
  const isOrg = (o.items as any[]).some(i => i.type === 'org_pack');
  const isCert = (o.items as any[]).every(i => i.type === 'certificate');
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const { data: certs } = !unpaid && isCert ? await db.from('assessment_certificates').select('serial').eq('user_id', o.user_id).order('issued_at', { ascending: false }).limit((o.items as any[])[0]?.qty || 1) : { data: [] as any[] };

  return (
    <>
      {searchParams.new && unpaid && <p className="notice">Order saved. Pay using one of the options below; your sittings are released as soon as payment is confirmed.</p>}
      {searchParams.paid && unpaid && <p className="notice">We have not received confirmation from Paynow yet. If you completed the payment, refresh this page in a minute.</p>}
      {searchParams.nopaynow && <p className="notice">Online payment is being set up. Please pay by EcoCash using the details below and WhatsApp your proof of payment.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}

      <div className="card invoice">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><img src="/logo.png" alt="Tigermax Jobs" height={36} />
            <p className="muted" style={{ margin: '8px 0 0' }}>4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare<br />+263 77 133 1008 · admin@tigermaxjobs.com</p></div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0 }}>{unpaid ? 'Invoice' : 'Receipt'}</h2>
            <div className="mono">{o.invoice_no}</div><div className="muted">Ref {o.reference}</div>
            <div className="muted">{new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <span className={`status ${unpaid ? 'interview' : o.status === 'paid' ? 'shortlisted' : ''}`}>{unpaid ? 'Awaiting payment' : o.status === 'paid' ? 'Paid' : 'Cancelled'}</span>
          </div>
        </div>
        <table style={{ marginTop: 20 }}><thead><tr><th>Item</th><th>Qty</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead><tbody>
          {(o.items as any[]).map((i, n) => <tr key={n}><td>{i.label}{i.cohort ? ` (${i.cohort})` : ''}</td><td>{i.qty || 1}</td><td style={{ textAlign: 'right' }}>US${(i.unit * (i.qty || 1)).toFixed(2)}</td></tr>)}
          <tr><td colSpan={2}><b>{unpaid ? 'Amount due' : 'Total paid'}</b></td><td style={{ textAlign: 'right' }}><b>US${Number(o.amount).toFixed(2)}</b></td></tr>
        </tbody></table>

        {unpaid && (
          <div className="grid2" style={{ marginTop: 20 }}>
            <div className="mini" style={{ marginTop: 0 }}><b>Pay online</b>
              <p className="muted" style={{ margin: '6px 0 12px' }}>EcoCash or Visa/Mastercard through Paynow.</p>
              <a className="btn gold" href={`/assessments/pay/${o.reference}`}>Pay US${Number(o.amount).toFixed(2)} now</a>
              <p className="muted" style={{ margin: '12px 0 0' }}>Payment link to share:<br /><span className="mono" style={{ overflowWrap: 'anywhere' }}>{site}/assessments/pay/{o.reference}</span></p></div>
            <div className="mini" style={{ marginTop: 0 }}><b>Pay by EcoCash</b>
              <div style={{ marginTop: 6 }}>{bankLines().map(l => <div key={l} className="ln"><span>{l}</span></div>)}</div>
              <p className="muted" style={{ margin: '10px 0 0' }}>Send <b>US${Number(o.amount).toFixed(2)}</b>, then WhatsApp proof of payment with <b className="mono">{o.invoice_no}</b> to <a href={`${PROOF_WHATSAPP_LINK}?text=${encodeURIComponent(`Proof of payment for ${o.invoice_no} (Career Intelligence)`)}`}>{PROOF_WHATSAPP}</a>.</p></div>
          </div>
        )}
        {o.status === 'paid' && <div className="noprint" style={{ marginTop: 18 }}>
          {isOrg ? <><p>Payment received. Your seat codes are ready to hand out.</p><Link className="btn gold" href="/employer/assessments">See my seat codes ›</Link></>
            : isCert ? <><p>Payment received. Your certificate{(certs || []).length > 1 ? 's are' : ' is'} ready.</p>
              <div className="row">{(certs || []).map((c: any) => <Link key={c.serial} className="btn gold" href={`/certificates/${c.serial}`}>Open certificate {c.serial} ›</Link>)}</div>
              {!(certs || []).length && <Link className="btn gold" href="/candidate#career">Go to my certificates ›</Link>}</>
            : <><p>Payment received. Your sittings are ready.</p><Link className="btn gold" href="/assessments#tests">Start my tests ›</Link></>}
        </div>}
      </div>
      <div className="row noprint"><PrintButton label={unpaid ? 'Print or save invoice' : 'Print or save receipt'} /><Link className="btn ghost" href="/assessments">Career Intelligence</Link></div>
    </>
  );
}
