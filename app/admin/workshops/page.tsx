import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { dateLabel, priceLabel, STATUS_LABEL, type Workshop } from '@/lib/workshops';
import { markRegistration, saveWorkshop } from '@/app/workshops/actions';

export const dynamic = 'force-dynamic';

export default async function OfficeWorkshops({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, role } = await currentUser();
  if (role !== 'staff') redirect('/');
  const { data: ws } = await sb.from('workshops').select('*').order('starts_on');
  const all = (ws || []) as Workshop[];
  const sel = all.find(w => w.slug === searchParams.e) || all.find(w => w.starts_on >= new Date().toISOString().slice(0, 10)) || all[0];
  const { data: regs } = sel ? await sb.from('workshop_registrations').select('*').eq('workshop_id', sel.id).order('created_at', { ascending: false }) : { data: [] as any[] };
  const list = regs || [];
  const live = list.filter((r: any) => r.status !== 'cancelled');
  const paid = live.filter((r: any) => r.status === 'paid').reduce((n: number, r: any) => n + Number(r.amount), 0);
  const due = live.filter((r: any) => r.status === 'awaiting_payment').reduce((n: number, r: any) => n + Number(r.amount), 0);
  const edit = searchParams.edit ? all.find(w => w.slug === searchParams.edit) : null;

  return (
    <>
      {searchParams.saved && <p className="notice">Event saved.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <p className="eyebrow"><Link href="/admin" className="link-arrow" style={{ color: 'inherit' }}>Office</Link></p>
      <h1>Workshops & events</h1>

      <div className="segmented" style={{ margin: '8px 0 20px' }}>
        {all.map(w => <Link key={w.id} href={`/admin/workshops?e=${w.slug}`} className={sel?.id === w.id ? 'on' : ''}>{w.title.length > 34 ? w.title.slice(0, 32) + '…' : w.title}</Link>)}
      </div>

      {sel && <>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><h2 style={{ margin: 0 }}>{sel.title}</h2><p className="muted" style={{ margin: '4px 0 0' }}>{dateLabel(sel)} · {sel.venue} · {Number(sel.price_usd) ? `RSVP ${priceLabel(sel.price_usd)}` : 'FREE'}</p></div>
          <div className="row"><Link className="btn ghost sm" href={`/workshops/${sel.slug}`}>Public page</Link><Link className="btn ghost sm" href={`/admin/workshops?e=${sel.slug}&edit=${sel.slug}#edit`}>Edit event</Link></div>
        </div>
        <div className="stats" style={{ margin: '16px 0' }}>
          <div><b>{live.length}</b><span>registered{sel.capacity ? ` of ${sel.capacity}` : ''}</span></div>
          <div><b>US${paid.toFixed(0)}</b><span>paid</span></div>
          <div><b>US${due.toFixed(0)}</b><span>awaiting payment</span></div>
        </div>
        <div className="card" style={{ overflowX: 'auto' }}><table><thead><tr><th>Name</th><th>Contact</th><th>Answers</th><th>Payment</th><th></th></tr></thead><tbody>
          {list.map((r: any) => <tr key={r.id} style={r.status === 'cancelled' ? { opacity: .5 } : undefined}>
            <td><b>{r.full_name}</b>{r.organisation && <div className="muted">{r.organisation}</div>}<div className="muted mono">{r.invoice_no}</div></td>
            <td>{r.phone}<div className="muted">{r.email}</div></td>
            <td className="muted">{Object.entries(r.answers || {}).map(([k, v]) => <div key={k}><b>{k}:</b> {String(v)}</div>)}</td>
            <td>{Number(r.amount) ? `US$${Number(r.amount).toFixed(2)}` : 'Free'}{r.is_member ? ' (member)' : ''}<div className="muted">{STATUS_LABEL[r.status]}{r.pay_option === 'invoice' ? ' · invoice' : r.pay_option === 'paynow' ? ' · Paynow' : ''}</div>
              <a className="muted" href={`/workshops/ticket/${r.reference}`}>View {r.status === 'awaiting_payment' ? 'invoice' : 'ticket'}</a></td>
            <td className="stack" style={{ display: 'grid', gap: 6 }}>
              {r.status === 'awaiting_payment' && <form action={markRegistration} className="row"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="paid" />
                <select name="via" style={{ width: 'auto', padding: '6px 8px' }}><option value="bank">Bank</option><option value="cash">Cash</option><option value="paynow">Paynow</option></select><button className="sm">Mark paid</button></form>}
              {r.status !== 'cancelled' && !r.attended && <form action={markRegistration}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="attended" /><button className="ghost sm">Checked in</button></form>}
              {r.attended && <span className="tag gold">Attended</span>}
              {r.status !== 'cancelled' && <form action={markRegistration}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="cancel" /><button className="ghost sm">Cancel</button></form>}
            </td>
          </tr>)}
          {!list.length && <tr><td colSpan={5} className="muted">No registrations yet.</td></tr>}
        </tbody></table></div>
      </>}

      <h2 id="edit" style={{ marginTop: 40 }}>{edit ? `Edit: ${edit.title}` : 'Add an event'}</h2>
      <form action={saveWorkshop} className="card stack" key={edit?.slug || 'new'}>
        <div className="grid2">
          <label>Title<input name="title" required defaultValue={edit?.title} /></label>
          <label>Web address (slug)<input name="slug" required defaultValue={edit?.slug} placeholder="e.g. cv-clinic-march-2027" /></label>
        </div>
        <label>One-line tagline<input name="tagline" defaultValue={edit?.tagline || ''} /></label>
        <label>Description<textarea name="description" defaultValue={edit?.description || ''} /></label>
        <label>Facilitated / hosted by<input name="host" defaultValue={edit?.host || ''} /></label>
        <div className="grid3">
          <label>Date<input type="date" name="starts_on" required defaultValue={edit?.starts_on} /></label>
          <label>End date (multi-day)<input type="date" name="ends_on" defaultValue={edit?.ends_on || ''} /></label>
          <label>Time<input name="time_label" defaultValue={edit?.time_label || ''} placeholder="08:30 – 13:00" /></label>
        </div>
        <label>Venue<input name="venue" required defaultValue={edit?.venue} /></label>
        <label>What will be covered (one per line)<textarea name="focus" defaultValue={(edit?.focus || []).join('\n')} /></label>
        <label>Who should attend<input name="audience" defaultValue={edit?.audience || ''} /></label>
        <div className="grid3">
          <label>Price US$ (0 = free)<input type="number" step="0.01" min="0" name="price_usd" defaultValue={edit?.price_usd ?? 0} /></label>
          <label>Price for registered candidates (blank = same)<input type="number" step="0.01" min="0" name="member_price_usd" defaultValue={edit?.member_price_usd ?? ''} /></label>
          <label>Seats (blank = unlimited)<input type="number" min="1" name="capacity" defaultValue={edit?.capacity ?? ''} /></label>
        </div>
        <label>Price note<input name="price_note" defaultValue={edit?.price_note || ''} /></label>
        <label>Registration questions for this event (JSON)
          <textarea name="form_fields" className="mono" style={{ minHeight: 160 }} defaultValue={JSON.stringify(edit?.form_fields || [{ name: 'field', label: 'Your field of work', type: 'text', required: true }], null, 2)} />
          <span className="muted">Each question: {'{"name":"key","label":"Question","type":"text|textarea|select","required":true,"options":["A","B"]}'}. Name, email, phone and organisation are always asked.</span></label>
        <label className="row" style={{ display: 'flex' }}><input type="checkbox" name="published" defaultChecked={edit ? edit.published : true} /> Published on the website</label>
        <button className="gold">{edit ? 'Save changes' : 'Add event'}</button>
      </form>
    </>
  );
}
