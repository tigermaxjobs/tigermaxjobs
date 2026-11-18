// Psychometric statistics generated from real sittings, for the Office validation panel.
// Nothing here is published as "validated": staff change a test's status only with the supporting study.
import { TESTS, type Test, type Choice } from './catalog';

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const variance = (a: number[]) => { const m = mean(a); return a.length > 1 ? a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1) : 0; };
const r2 = (n: number) => Math.round(n * 100) / 100;
function corr(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y); let n = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  return dx && dy ? n / Math.sqrt(dx * dy) : 0;
}

export type TestStats = {
  code: string; name: string; completed: number; expired: number; timeoutRate: number; medianMin: number;
  reliability: { dim: string; label: string; k: number; alpha: number | null }[];
  items: { id: string; p: number; rit: number; n: number }[];
  fairness: { groups: string; ratio: number | null; note: string } | null;
  meetsReliability: boolean;
};

export const MIN_N = 200, MIN_ALPHA = 0.7;

export function computeStats(attempts: any[], locationOf: (uid: string) => string): TestStats[] {
  return TESTS.map(t => {
    const mine = attempts.filter(a => a.test_code === t.code);
    const done = mine.filter(a => a.status === 'completed');
    const expired = mine.filter(a => a.status === 'expired').length;
    const mins = done.map(a => (new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 60000).sort((a, b) => a - b);
    const reliability = t.adaptive ? [] : Object.entries(t.dims).map(([k, d]) => {
      const its = t.items.filter(i => i.dim === k && (i.type === 'likert' || i.type === 'sjt' || i.type === 'choice'));
      if (its.length < 3 || done.length < 10) return { dim: k, label: d.label, k: its.length, alpha: null };
      const rows = done.map(a => its.map(i => itemScore(i, a.responses?.[i.id]?.v))).filter(r => r.every(v => v !== null)) as number[][];
      if (rows.length < 10) return { dim: k, label: d.label, k: its.length, alpha: null };
      const itemVars = its.map((_, j) => variance(rows.map(r => r[j])));
      const totVar = variance(rows.map(r => r.reduce((s, v) => s + v, 0)));
      const kk = its.length;
      return { dim: k, label: d.label, k: kk, alpha: totVar ? r2((kk / (kk - 1)) * (1 - itemVars.reduce((s, v) => s + v, 0) / totVar)) : null };
    });
    // Item analysis for knowledge/ability items: difficulty (p) and item–total correlation (rit).
    const items = t.items.filter(i => i.type === 'choice').map(i => {
      const served = done.filter(a => a.responses?.[i.id]);
      const x = served.map(a => (a.responses[i.id].v === (i as Choice).answer ? 1 : 0));
      const y = served.map(a => Number(a.scores?.overall?.value ?? 0));
      return { id: i.id, p: r2(mean(x)), rit: r2(corr(x, y)), n: served.length };
    });
    // Simple group check (4/5ths rule on top-band rates) by location: Harare vs elsewhere.
    let fairness: TestStats['fairness'] = null;
    const top = (a: any) => (a.scores?.overall?.band || '') === 'high';
    if (done.some(a => a.scores?.overall)) {
      const g1 = done.filter(a => /harare/i.test(locationOf(a.user_id))), g2 = done.filter(a => !/harare/i.test(locationOf(a.user_id)));
      if (g1.length >= 30 && g2.length >= 30) {
        const r1 = mean(g1.map(a => (top(a) ? 1 : 0))), rr2 = mean(g2.map(a => (top(a) ? 1 : 0)));
        const ratio = Math.max(r1, rr2) ? r2(Math.min(r1, rr2) / Math.max(r1, rr2)) : null;
        fairness = { groups: `Harare (${g1.length}) vs elsewhere (${g2.length})`, ratio, note: ratio !== null && ratio < 0.8 ? 'Below 0.80: review items for bias' : 'No adverse impact flag' };
      } else fairness = { groups: 'Harare vs elsewhere', ratio: null, note: 'Needs at least 30 sittings in each group' };
    }
    const alphas = reliability.map(r => r.alpha).filter((a): a is number => a !== null);
    const meetsReliability = done.length >= MIN_N && (t.adaptive ? items.every(i => i.n < 20 || (i.rit >= 0.15 && i.p > 0.1 && i.p < 0.95)) : alphas.length === reliability.length && alphas.every(a => a >= MIN_ALPHA));
    return { code: t.code, name: t.name, completed: done.length, expired, timeoutRate: mine.length ? r2(expired / mine.length) : 0,
      medianMin: mins.length ? r2(mins[Math.floor(mins.length / 2)]) : 0, reliability, items, fairness, meetsReliability };
  });
}

function itemScore(i: Test['items'][number], v: number | undefined): number | null {
  if (v === undefined || v === null) return null;
  if (i.type === 'likert') return i.key === 1 ? v : 6 - v;
  if (i.type === 'sjt') return i.options[v]?.s ?? 0;
  if (i.type === 'choice') return v === i.answer ? 1 : 0;
  return null;
}
