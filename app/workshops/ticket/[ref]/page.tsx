import { notFound } from 'next/navigation';
import Link from 'next/link';
import { adminClient } from '@/lib/supabase';
import { paynow } from '@/lib/paynow';
import { bankLines, dateLabel, priceLabel, STATUS_LABEL, PROOF_WHATSAPP, PROOF_WHATSAPP_LINK } from '@/lib/workshops';
import PrintButton from './print';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your registration — Tigermax Jobs', robots: { index: false } };

// Private page reached through the registration's unguessable reference: ticket when confirmed, invoice while unpaid.
export default async function Ticket({ params, searchParams }: { params: { ref: string }; searchParams: Record<string, string> }) {
  const db = adminClient();
  let { data: r } = await db.from('workshop_registrations').select('*, workshops(*)').eq('reference', params.ref).maybeSingle();
  if (!r) notFound();
  // Back from Paynow, or reopening the link: re-check the payment before showing the status.
  if (r.status === 'awaiting_payment' && r.poll_url && process.env.PAYNOW_INTEGRATION_ID) {
    try {
      const st = await paynow().pollTransaction(r.poll_url);
      if (st?.paid?.()) {
        await db.from('workshop_registrations').update({ status: 'paid', paid_at: new Date().toISOString(), paid_via: 'paynow' }).eq('id', r.id);
        r = { ...r, status: 'paid', paid_via: 'paynow', paid_at: new Date().toISOString() };
      }
    } catch { /* show current status */ }
  }
  const w = r.workshops as any;
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const payLink = `${site}/workshops/pay/${r.reference}`;
  const unpaid = r.status === 'awaiting_payment';
  const bank = bankLines();
  const answers = Object.entries((r.answers || {}) as Record<string, string>);

  return (
    <>
      {searchParams.new && !unpaid && <p className="notice">You are registered. Save this page: it is your ticket.</p>}
      {searchParams.new && unpaid && <p className="notice">Registration saved. Your invoice is below. Your seat is confirmed once payment is received.</p>}
      {searchParams.again && <p className="notice">You had already registered for this event with this email. Here is your registration.</p>}
      {searchParams.paid && unpaid && <p className="notice">We have not received confirmation from Paynow yet. If you completed the payment, refresh this page in a minute.</p>}
      {searchParams.nopaynow && <p className="notice">Online payment is being set up. Please pay by EcoCash using the details below and WhatsApp your proof of payment to +263 77 133 1008.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}

      <div className="card invoice">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <img src="/logo.png" alt="Tigermax Jobs" height={36} />
            <p className="muted" style={{ margin: '8px 0 0' }}>4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare<br />+263 77 133 1008 · admin@tigermaxjobs.com</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0 }}>{unpaid ? 'Invoice' : 'Registration'}</h2>
            <div className="mono">{r.invoice_no}</div>
            <div className="muted">Ref {r.reference}</div>
            <div className="muted">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <span className={`status ${unpaid ? 'interview' : r.status === 'cancelled' ? '' : 'shortlisted'}`}>{STATUS_LABEL[r.status] || r.status}</span>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 22 }}>
          <div><span className="muted">Billed to</span><div><b>{r.full_name}</b>{r.organisation ? <><br />{r.organisation}</> : null}<br />{r.email}<br />{r.phone}</div></div>
          <div><span className="muted">{w?.delivery === 'online' ? 'Online course' : 'Event'}</span><div><b>{w?.title}</b><br />{w?.delivery === 'online' ? 'Online, self-paced: start any time' : <>{w && dateLabel(w)}{w?.time_label ? `, ${w.time_label}` : ''}<br />{w?.venue}</>}</div></div>
        </div>

        <table style={{ marginTop: 20 }}><thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead><tbody>
          <tr><td>{w?.title} – registration for 1 person{r.is_member ? ' (registered candidate rate)' : ''}</td><td style={{ textAlign: 'right' }}>{Number(r.amount) ? `US$${Number(r.amount).toFixed(2)}` : 'FREE'}</td></tr>
          <tr><td><b>{unpaid ? 'Amount due' : 'Total'}</b></td><td style={{ textAlign: 'right' }}><b>{Number(r.amount) ? `US$${Number(r.amount).toFixed(2)}` : 'US$0.00'}</b></td></tr>
        </tbody></table>

        {unpaid && (
          <div className="grid2" style={{ marginTop: 20 }}>
            <div className="mini" style={{ marginTop: 0 }}>
              <b>Pay online</b>
              <p style={{ margin: '6px 0 12px' }} className="muted">EcoCash, OneMoney or Visa/Mastercard through Paynow.</p>
              <a className="btn gold" href={`/workshops/pay/${r.reference}`}>Pay {priceLabel(r.amount)} now</a>
              <p className="muted" style={{ margin: '12px 0 0' }}>Payment link (share with whoever is paying):<br /><span className="mono" style={{ overflowWrap: 'anywhere' }}>{payLink}</span></p>
            </div>
            <div className="mini" style={{ marginTop: 0 }}>
              <b>Pay by EcoCash</b>
              <div style={{ marginTop: 6 }}>{bank.map(l => <div key={l} className="ln"><span>{l}</span></div>)}</div>
              <p className="muted" style={{ margin: '10px 0 0' }}>Send <b>US${Number(r.amount).toFixed(2)}</b>, then WhatsApp your proof of payment with invoice number <b className="mono">{r.invoice_no}</b> to the Tigermax Jobs office on <a href={`${PROOF_WHATSAPP_LINK}?text=${encodeURIComponent(`Proof of payment for ${r.invoice_no} (${r.full_name}, ${w?.title || 'workshop'})`)}`}>{PROOF_WHATSAPP}</a>. {w?.delivery === 'online' ? 'Your course opens as soon as we verify it.' : 'Your seat is confirmed once we verify it.'}</p>
            </div>
          </div>
        )}

        {!unpaid && r.status !== 'cancelled' && w?.delivery === 'online' && (
          <div className="noprint" style={{ marginTop: 18 }}>
            <p>You are enrolled. Start now and go at your own pace: {(r.completed_modules || []).length} of {(w.modules || []).length} modules done.</p>
            <Link className="btn gold" href={`/workshops/learn/${r.reference}`}>{(r.completed_modules || []).length ? 'Continue the course' : 'Start the course'} ›</Link>
          </div>
        )}
        {!unpaid && r.status !== 'cancelled' && w?.delivery !== 'online' && (
          <p style={{ marginTop: 18 }}>Your seat is confirmed. Bring this page (printed or on your phone) to the venue.{r.paid_at ? ` Paid ${new Date(r.paid_at).toLocaleDateString('en-GB')}${r.paid_via ? ` via ${r.paid_via}` : ''}.` : ''}</p>
        )}

        {answers.length > 0 && <details style={{ marginTop: 10 }}><summary style={{ fontSize: 15 }}>Your answers</summary>
          <div className="mini">{answers.map(([k, v]) => <div key={k} className="ln"><span>{k}</span><span>{v}</span></div>)}</div></details>}
      </div>

      <div className="row noprint">
        <PrintButton label={unpaid ? 'Print or save invoice' : 'Print or save ticket'} />
        <Link className="btn ghost" href="/workshops">All events</Link>
      </div>
    </>
  );
}
