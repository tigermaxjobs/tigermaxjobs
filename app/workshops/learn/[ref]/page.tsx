import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { adminClient, currentUser } from '@/lib/supabase';
import { canLearn, type Module } from '@/lib/workshops';
import { toggleModule, claimRegistration } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your online workshop — Tigermax Jobs', robots: { index: false } };

// Self-paced online workshop, reached through the registration's private reference.
export default async function Learn({ params, searchParams }: { params: { ref: string }; searchParams: Record<string, string> }) {
  const db = adminClient();
  const { data: r } = await db.from('workshop_registrations').select('*, workshops(*)').eq('reference', params.ref).maybeSingle();
  if (!r) notFound();
  const w = r.workshops as any;
  if (w?.delivery !== 'online') redirect(`/workshops/ticket/${r.reference}`);
  if (!canLearn(r.status)) redirect(`/workshops/ticket/${r.reference}`);
  const { user } = await currentUser();
  const mods: Module[] = w.modules || [];
  const done = new Set<string>(r.completed_modules || []);
  const pct = mods.length ? Math.round((done.size / mods.length) * 100) : 0;
  const nextUp = mods.find(m => !done.has(m.id));

  return (
    <>
      {searchParams.new && <p className="notice">You are registered. Start below. Bookmark this page: it is your private link to the course.</p>}
      {searchParams.claimed && <p className="notice">This course is now saved to your account.</p>}
      <p className="eyebrow"><Link href="/workshops" className="link-arrow" style={{ color: 'inherit' }}>Workshops</Link></p>
      <h1 className="h-lg">{w.title}</h1>
      <p className="lead">Online and self-paced. Work through each module and tick it off; your progress is saved.</p>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>{done.size} of {mods.length} modules complete</b><span className="muted">{pct}%</span>
        </div>
        <div className="bar-track" aria-hidden><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
        {r.completed_at
          ? <p style={{ marginBottom: 0 }}>Well done, you completed this course on {new Date(r.completed_at).toLocaleDateString('en-GB')}. Next step: <Link href="/assessments">take the Career Intelligence tests</Link> to see which roles fit you.</p>
          : nextUp && <p className="muted" style={{ marginBottom: 0 }}>Next: <a href={`#${nextUp.id}`}>{nextUp.title}</a></p>}
        {!user && <p className="muted" style={{ marginBottom: 0 }}><Link href={`/login?as=candidate&next=/workshops/learn/${r.reference}`}>Sign in</Link> to keep this course on your dashboard. Without an account, use this page&apos;s link to come back.</p>}
        {user && !r.user_id && <form action={claimRegistration} style={{ marginTop: 10 }}><input type="hidden" name="ref" value={r.reference} /><button className="ghost sm">Save this course to my account</button></form>}
      </div>

      {mods.map((m, i) => {
        const isDone = done.has(m.id);
        return (
          <section key={m.id} id={m.id} className="card" style={isDone ? { borderColor: 'var(--gold)' } : undefined}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>{i + 1}. {m.title}</h2>
              <span className={isDone ? 'tag gold' : 'tag'}>{isDone ? 'Done' : m.minutes ? `${m.minutes} min` : 'To do'}</span>
            </div>
            {(m.body || '').split(/\n\s*\n/).map((p, j) => <p key={j}>{p}</p>)}
            <form action={toggleModule} className="row">
              <input type="hidden" name="ref" value={r.reference} /><input type="hidden" name="module" value={m.id} />
              <input type="hidden" name="done" value={isDone ? '0' : '1'} />
              {isDone ? <button className="ghost sm">Mark as not done</button>
                : <button className="gold sm">{m.check ? `✓ ${m.check}` : 'Mark as done'}</button>}
            </form>
          </section>
        );
      })}
      <p className="muted">Questions? WhatsApp the Tigermax office on +263 77 133 1008 with your reference {r.reference}.</p>
    </>
  );
}
