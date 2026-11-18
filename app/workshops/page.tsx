import Link from 'next/link';
import { userClient } from '@/lib/supabase';
import { dateLabel, priceLabel, isPast, isOnline, totalMinutes, type Workshop } from '@/lib/workshops';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workshops & events — Tigermax Jobs', description: 'Events and programmes Tigermax Jobs facilitates for job seekers, employers, HR practitioners and partners in Zimbabwe.' };

export default async function Workshops() {
  const { data } = await userClient().from('workshops').select('*').eq('published', true).order('starts_on');
  const all = (data || []) as Workshop[];
  const online = all.filter(isOnline);
  const upcoming = all.filter(w => !isOnline(w) && !isPast(w)), past = all.filter(w => isPast(w)).reverse();
  return (
    <>
      <p className="eyebrow">Workshops & events</p>
      <h1 className="h-lg">Learn, connect and get ready for work.</h1>
      <p className="lead">Online workshops are open all the time: register and start straight away, at your own pace. We also facilitate in-person events for job seekers, employers, HR practitioners and partners.</p>
      <p className="notice">Tip: <Link href="/login?as=candidate&next=/workshops">sign in</Link> before you register so your progress is saved to your account and shows on your dashboard. You can also study without an account using the private link we give you.</p>

      {online.length > 0 && <>
        <h2 style={{ marginTop: 32 }}>Online workshops · start any time</h2>
        {online.map(w => <EventCard key={w.id} w={w} />)}
      </>}

      <h2 style={{ marginTop: 32 }}>Upcoming events</h2>
      {upcoming.map(w => <EventCard key={w.id} w={w} />)}
      {!upcoming.length && <div className="empty">No upcoming in-person events right now. Check back soon or WhatsApp +263 77 133 1008.</div>}

      {past.length > 0 && <>
        <h2 style={{ marginTop: 48 }}>Past events</h2>
        {past.map(w => <EventCard key={w.id} w={w} past />)}
      </>}
    </>
  );
}

function EventCard({ w, past }: { w: Workshop; past?: boolean }) {
  const d = new Date(w.starts_on + 'T12:00:00');
  const on = isOnline(w), mins = totalMinutes(w);
  return (
    <Link href={`/workshops/${w.slug}`} className="event" style={past ? { opacity: .6 } : undefined}>
      <div className="when" aria-hidden>
        {on ? <><b style={{ fontSize: 15 }}>Online</b><span>any</span><small>time</small></>
          : <><b>{d.getDate()}</b><span>{d.toLocaleDateString('en-GB', { month: 'short' })}</span><small>{d.getFullYear()}</small></>}
      </div>
      <div>
        <h3>{w.title}</h3>
        {w.tagline && <p className="muted" style={{ margin: '4px 0 8px', fontSize: 15 }}>{w.tagline}</p>}
        {on ? <div className="muted">Self-paced · {(w.modules || []).length} modules{mins ? ` · about ${Math.round(mins / 6) / 10} hours` : ''} · start straight after registering</div>
          : <><div className="muted">{dateLabel(w)}{w.time_label ? ` · ${w.time_label}` : ''}</div><div className="muted">{w.venue}</div></>}
        <div style={{ marginTop: 10 }}>
          <span className={`tag ${!Number(w.price_usd) ? 'free' : 'gold'}`}>{Number(w.price_usd) ? `RSVP ${priceLabel(w.price_usd)}` : 'FREE'}</span>
          {w.member_price_usd !== null && Number(w.member_price_usd) === 0 && <span className="tag">Free for registered candidates</span>}
          {w.host && <span className="tag">{w.host.replace(/^(Facilitated|Hosted) by (the )?/i, '').slice(0, 60)}</span>}
        </div>
      </div>
      <span className="go">{past ? '' : on ? 'Start ›' : 'Register ›'}</span>
    </Link>
  );
}
