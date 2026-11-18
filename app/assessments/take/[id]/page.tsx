import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { adminClient, currentUser } from '@/lib/supabase';
import { TEST, money } from '@/lib/assessments/catalog';
import { nextItem, totalItems, scaleFor } from '@/lib/assessments/scoring';
import { availableCredits, type Attempt } from '@/lib/assessments/server';
import { answer, startTest, buy } from '../../actions';
import Timer from './timer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assessment in progress — Tigermax Jobs', robots: { index: false } };

export default async function Take({ params }: { params: { id: string } }) {
  const { user } = await currentUser();
  if (!user) redirect(`/login?as=candidate&next=/assessments/take/${params.id}`);
  const db = adminClient();
  const { data } = await db.from('assessment_attempts').select('*').eq('id', params.id).eq('user_id', user.id).maybeSingle();
  let a = data as Attempt | null;
  if (!a) notFound();
  const t = TEST(a.test_code)!;
  if (a.status === 'completed') redirect(`/assessments/result/${a.id}`);
  if (a.status === 'in_progress' && Date.now() > new Date(a.expires_at).getTime() + 5000) {
    await db.from('assessment_attempts').update({ status: 'expired' }).eq('id', a.id).eq('status', 'in_progress');
    a = { ...a, status: 'expired' };
  }
  const answered = Object.keys(a.responses).length, total = totalItems(t);

  if (a.status === 'expired') {
    const credits = await availableCredits(user.id);
    const have = (credits[t.code] || []).length > 0;
    return (
      <div style={{ maxWidth: 640, margin: '20px auto' }}>
        <p className="eyebrow">{t.name}</p>
        <h1 className="h-lg">Time is up.</h1>
        <p className="lead">You answered {answered} of {total} questions before the {Math.round(a.time_limit_s / 60)}-minute limit. Unfinished sittings are not scored, so no result was recorded.</p>
        <div className="card stack">
          {t.price === 0 || have ? (
            <form action={startTest}><input type="hidden" name="code" value={t.code} /><button className="gold">Start a new sitting now</button></form>
          ) : (
            <form action={buy} className="stack">
              <input type="hidden" name="test" value={t.code} /><input type="hidden" name="pay_option" value="paynow" />
              <p style={{ margin: 0 }}>A new sitting costs <b>{money(t.price)}</b>. Before you start again, set aside {t.minutes} uninterrupted minutes.</p>
              <button className="gold">Pay {money(t.price)} for another sitting</button>
            </form>
          )}
          <p className="muted" style={{ margin: 0 }}>Need more time because of a disability or another reason? WhatsApp the office on +263 77 133 1008 before your next sitting; extra time can be added to your account.</p>
          <Link href="/assessments" className="link-arrow">Back to all tests</Link>
        </div>
      </div>
    );
  }

  const id = nextItem(t, a.item_order, a.responses);
  if (!id) redirect(`/assessments/result/${a.id}`);
  const item = t.items.find(i => i.id === id)!;
  const pct = Math.round((answered / total) * 100);

  return (
    <div className="taking">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><p className="eyebrow" style={{ margin: 0 }}>{t.name}</p><span className="muted">Question {answered + 1} of {total}</span></div>
        <Timer expiresAt={a.expires_at} />
      </div>
      <div className="bar-track" aria-hidden><div className="bar-fill" style={{ width: `${pct}%` }} /></div>

      <form action={answer} className="card stack q" key={id}>
        <input type="hidden" name="attempt" value={a.id} /><input type="hidden" name="item" value={id} />
        {item.type === 'likert' && <>
          <h2 className="qtext">{item.text}</h2>
          <div className="likert">{scaleFor(t).map((l, i) => (
            <label key={i} className="pick"><input type="radio" name="v" value={i + 1} required /><span>{l}</span></label>))}</div>
        </>}
        {item.type === 'forced' && <>
          <h2 className="qtext">{item.text}</h2>
          <div className="choices">
            <label className="pick"><input type="radio" name="v" value={-1} required /><span>{item.a}</span></label>
            <label className="pick"><input type="radio" name="v" value={1} /><span>{item.b}</span></label>
            <label className="pick muted"><input type="radio" name="v" value={0} /><span>No strong preference</span></label>
          </div>
        </>}
        {(item.type === 'choice' || item.type === 'sjt') && <>
          {item.type === 'sjt' && <p className="muted" style={{ margin: 0 }}>Choose the most effective response.</p>}
          <h2 className="qtext">{item.text}</h2>
          <div className="choices">{(item.type === 'choice' ? item.options : item.options.map(o => o.t)).map((o, i) => (
            <label key={i} className="pick"><input type="radio" name="v" value={i} required /><span>{o}</span></label>))}</div>
        </>}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Answers cannot be changed after you continue.</span>
          <button className="gold">{answered + 1 === total ? 'Finish' : 'Next ›'}</button>
        </div>
      </form>
      <p className="muted">The timer keeps running if you leave this page. If time runs out before you finish, this sitting is not scored{t.price ? ` and a new one costs ${money(t.price)}` : ''}.</p>
    </div>
  );
}
