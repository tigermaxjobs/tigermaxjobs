import { notFound } from 'next/navigation';
import Link from 'next/link';
import { userClient } from '@/lib/supabase';
import { dateLabel, priceLabel, isPast, isOnline, totalMinutes, type Workshop, type Field } from '@/lib/workshops';
import { currentUser } from '@/lib/supabase';
import { registerWorkshop } from '../actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data } = await userClient().from('workshops').select('title,tagline').eq('slug', params.slug).maybeSingle();
  return { title: data ? `${data.title} — Tigermax Jobs` : 'Event — Tigermax Jobs', description: data?.tagline || undefined };
}

export default async function EventPage({ params, searchParams }: { params: { slug: string }; searchParams: Record<string, string> }) {
  const sb = userClient();
  const { data } = await sb.from('workshops').select('*').eq('slug', params.slug).eq('published', true).maybeSingle();
  if (!data) notFound();
  const w = data as Workshop;
  const { data: taken } = await sb.rpc('workshop_seats_taken', { w: w.id });
  const left = w.capacity ? Math.max(0, w.capacity - (taken ?? 0)) : null;
  const price = Number(w.price_usd) || 0;
  const hasMember = w.member_price_usd !== null && w.member_price_usd !== undefined;
  const closed = isPast(w) || left === 0;
  const on = isOnline(w), mins = totalMinutes(w);
  const { user } = await currentUser();

  return (
    <>
      <p className="eyebrow"><Link href="/workshops" className="link-arrow" style={{ color: 'inherit' }}>Workshops & events</Link></p>
      <h1 className="h-lg">{w.title}</h1>
      {w.tagline && <p className="lead">{w.tagline}</p>}

      <div className="facts">
        {on ? <>
          <div><span>When</span><b>Start any time, straight after registering</b></div>
          <div><span>Format</span><b>Online · self-paced · {(w.modules || []).length} modules{mins ? ` (about ${Math.round(mins / 6) / 10} h)` : ''}</b></div>
        </> : <>
          <div><span>Date</span><b>{dateLabel(w)}{w.time_label ? `, ${w.time_label}` : ''}</b></div>
          <div><span>Venue</span><b>{w.venue}</b></div>
        </>}
        <div><span>Entry</span><b>{price ? `RSVP ${priceLabel(price)}` : 'FREE'}{hasMember ? ` · ${priceLabel(w.member_price_usd)} for registered candidates` : ''}</b></div>
        {left !== null && <div><span>Seats left</span><b>{left}</b></div>}
      </div>

      <div className="grid2" style={{ alignItems: 'start', marginTop: 28 }}>
        <div>
          {w.host && <p className="muted" style={{ marginTop: 0 }}>{w.host}</p>}
          {w.description && <p style={{ marginTop: 0 }}>{w.description}</p>}
          {!!w.focus?.length && <>
            <h3>What we will cover</h3>
            <ul className="ticks">{w.focus.map(x => <li key={x}>{x}</li>)}</ul>
          </>}
          {on && !!w.modules?.length && <>
            <h3>Modules</h3>
            <ol className="muted" style={{ fontSize: 16, paddingLeft: 20 }}>{w.modules.map(m => <li key={m.id}>{m.title}{m.minutes ? ` · ${m.minutes} min` : ''}</li>)}</ol>
          </>}
          {w.audience && <><h3>Who should attend</h3><p className="muted" style={{ fontSize: 16 }}>{w.audience}</p></>}
          {w.price_note && <p className="notice">{w.price_note}</p>}
        </div>

        <div className="card" id="register">
          <h2 style={{ marginTop: 0 }}>Register</h2>
          {searchParams.error && <p className="notice">{searchParams.error}</p>}
          {on && !user && <p className="notice"><b>Recommended:</b> <Link href={`/login?as=candidate&next=/workshops/${w.slug}`}>sign in or create a free account</Link> first, so your progress is saved to your dashboard. Without an account you study through the private link we give you after registering.</p>}
          {on && user && <p className="muted">Signed in as {user.email}. Your progress will be saved to your account.</p>}
          {closed ? <p className="muted">{isPast(w) ? 'This event has taken place.' : 'This event is fully booked.'}</p> : (
            <form action={registerWorkshop} className="stack">
              <input type="hidden" name="slug" value={w.slug} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} />
              <label>Full name<input name="full_name" required autoComplete="name" /></label>
              <label>Email<input name="email" type="email" required autoComplete="email" defaultValue={user?.email || ''} />
                {hasMember && <span className="muted">Registered Tigermax candidates: use the email on your profile to get the {priceLabel(w.member_price_usd)} price.</span>}</label>
              <label>Phone / WhatsApp<input name="phone" type="tel" required autoComplete="tel" placeholder="+263 7…" /></label>
              <label>Organisation or school (optional)<input name="organisation" autoComplete="organization" /></label>
              {(w.form_fields || []).map((q: Field) => <Question key={q.name} q={q} />)}

              {(price > 0 || hasMember) && (
                <fieldset className="payopts">
                  <legend>How would you like to pay?</legend>
                  <label className="opt"><input type="radio" name="pay_option" value="paynow" defaultChecked />
                    <span><b>Pay now to secure my seat</b><small>EcoCash, OneMoney or Visa/Mastercard through Paynow.</small></span></label>
                  <label className="opt"><input type="radio" name="pay_option" value="invoice" />
                    <span><b>Send me an invoice</b><small>Pay later by EcoCash (M. Msipa, 0782 652 675) and WhatsApp proof of payment to +263 77 133 1008, or use the payment link on the invoice. Your seat is confirmed once paid.</small></span></label>
                  {hasMember && <p className="muted" style={{ margin: 0 }}>If your email matches a registered candidate, there is nothing to pay.</p>}
                </fieldset>
              )}
              <button className="gold">{price > 0 ? `Register · ${priceLabel(price)}` : on ? 'Register and start, free' : 'Register, free'}</button>
              <span className="muted">{on ? 'You start the course as soon as you are registered (paid courses: once payment is confirmed).' : 'No account needed.'} We use your details only for this {on ? 'course' : 'event'}. See our <Link href="/privacy">privacy notice</Link>.</span>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Question({ q }: { q: Field }) {
  const name = 'q_' + q.name;
  const label = q.label + (q.required ? '' : ' (optional)');
  if (q.type === 'select') return (
    <label>{label}
      <select name={name} required={q.required} defaultValue="">
        <option value="" disabled>Choose…</option>
        {(q.options || []).map(o => <option key={o}>{o}</option>)}
      </select>{q.help && <span className="muted">{q.help}</span>}</label>
  );
  if (q.type === 'textarea') return <label>{label}<textarea name={name} required={q.required} style={{ minHeight: 90 }} />{q.help && <span className="muted">{q.help}</span>}</label>;
  return <label>{label}<input name={name} required={q.required} />{q.help && <span className="muted">{q.help}</span>}</label>;
}
