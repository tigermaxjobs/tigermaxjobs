// Item serving (fixed or adaptive) and scoring. Pure functions: the server calls them with stored responses.
import { SCALES, type Test, type Item, type Choice } from './catalog';

export type Band = 'low' | 'mid' | 'high';
export type Confidence = 'low' | 'moderate' | 'high';
export type DimScore = { value: number; band: Band; label: string; confidence: Confidence; note?: string };
export type Scores = {
  dims: Record<string, DimScore>;
  overall?: DimScore;
  code?: string;            // Holland code (interests)
  ranking?: string[];       // values ranked
  flags: string[];          // response-quality notes
};
export type Responses = Record<string, { v: number; ms?: number }>;

// ── Serving ───────────────────────────────────────────
export function firstItems(t: Test): string[] {
  if (!t.adaptive) return t.items.map(i => i.id);
  return [pickAt(t, 2, new Set())!];
}
function pickAt(t: Test, level: number, used: Set<string>): string | null {
  // nearest unused level: exact, then one step away, then two
  for (const d of [0, -1, 1, -2, 2]) {
    const hit = (t.items as Choice[]).find(i => i.level === level + d && !used.has(i.id));
    if (hit) return hit.id;
  }
  return null;
}
// Staircase: correct → harder, wrong → easier. Returns the next item id, or null when the test is complete.
export function nextItem(t: Test, served: string[], r: Responses): string | null {
  if (!t.adaptive) return served.find(id => !(id in r)) ?? null;
  if (served.some(id => !(id in r))) return served.find(id => !(id in r))!;
  if (served.length >= (t.serve || 12)) return null;
  const last = t.items.find(i => i.id === served[served.length - 1]) as Choice;
  const right = r[last.id]?.v === last.answer;
  const level = Math.max(1, Math.min(3, last.level + (right ? 1 : -1)));
  return pickAt(t, level, new Set(served));
}
export const totalItems = (t: Test) => (t.adaptive ? t.serve || 12 : t.items.length);

// ── Scoring ───────────────────────────────────────────
const LABELS: Record<string, [string, string, string]> = {
  personality: ['Lower', 'Moderate', 'Higher'],
  interests: ['Low interest', 'Some interest', 'Strong interest'],
  values: ['Less important', 'Important', 'Very important'],
  aptitude: ['Developing', 'Proficient', 'Advanced'],
  sjt: ['Developing', 'Sound', 'Strong'],
  growth: ['Developing', 'Moderate', 'Strong'],
};
const labelsFor = (t: Test) =>
  t.code === 'personality' ? LABELS.personality : t.code === 'interests' ? LABELS.interests : t.code === 'values' ? LABELS.values
    : t.area === 'aptitude' ? LABELS.aptitude : t.area === 'judgement' ? LABELS.sjt : LABELS.growth;
const bandLikert = (m: number): Band => (m < 2.6 ? 'low' : m <= 3.6 ? 'mid' : 'high');
const bandSjt = (m: number): Band => (m < 1.6 ? 'low' : m < 2.4 ? 'mid' : 'high');
const bandG = (m: number): Band => (m < 1.7 ? 'low' : m < 2.4 ? 'mid' : 'high');
const idx: Record<Band, number> = { low: 0, mid: 1, high: 2 };
const r2 = (n: number) => Math.round(n * 100) / 100;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export function scoreAttempt(t: Test, served: string[], r: Responses): Scores {
  const flags: string[] = [];
  const items = served.map(id => t.items.find(i => i.id === id)!).filter(Boolean) as Item[];
  const times = items.map(i => r[i.id]?.ms || 0).filter(Boolean).sort((a, b) => a - b);
  const medianMs = times.length ? times[Math.floor(times.length / 2)] : 0;
  const rushed = medianMs > 0 && medianMs < 1500;
  if (rushed) flags.push('Answers were given very quickly; results may not reflect you well.');
  const L = labelsFor(t);
  const dims: Record<string, DimScore> = {};

  if (t.adaptive) {
    const ch = items as Choice[];
    const correct = ch.filter(i => r[i.id]?.v === i.answer).length;
    const last = ch.slice(-6).map(i => i.level);
    const acc = correct / Math.max(1, ch.length);
    const index = r2(Math.max(1, Math.min(3, mean(last) + (acc - 0.5) * 0.6)));
    const spread = Math.max(...ch.slice(-4).map(i => i.level)) - Math.min(...ch.slice(-4).map(i => i.level));
    const b = bandG(index);
    const d: DimScore = { value: index, band: b, label: L[idx[b]], confidence: rushed ? 'low' : spread <= 1 ? 'high' : 'moderate',
      note: `${correct} of ${ch.length} correct` };
    dims.g = d;
    return { dims, overall: d, flags };
  }

  if (t.items[0].type === 'forced') {
    for (const k of Object.keys(t.dims)) {
      const vs = items.filter(i => i.dim === k).map(i => r[i.id]?.v ?? 0); // -1, 0, +1
      const v = vs.reduce((x, y) => x + y, 0);
      const contradictory = vs.includes(1) && vs.includes(-1);
      const b: Band = v <= -1 ? 'low' : v >= 1 ? 'high' : 'mid';
      dims[k] = { value: v, band: b, label: v === 0 ? 'Flexible' : (v < 0 ? t.dims[k].low : t.dims[k].high), confidence: contradictory ? 'low' : Math.abs(v) === 2 ? 'high' : 'moderate' };
    }
    return { dims, flags };
  }

  if (t.code === 'digital') {
    for (const k of Object.keys(t.dims)) {
      const its = items.filter(i => i.dim === k) as Choice[];
      const ok = its.filter(i => r[i.id]?.v === i.answer).length;
      const p = ok / Math.max(1, its.length);
      const b: Band = p < 0.58 ? 'low' : p < 0.8 ? 'mid' : 'high';
      dims[k] = { value: r2(p), band: b, label: L[idx[b]], confidence: its.length >= 4 ? 'moderate' : 'low', note: `${ok} of ${its.length} correct` };
    }
    const ok = (items as Choice[]).filter(i => r[i.id]?.v === i.answer).length;
    const b: Band = ok <= 6 ? 'low' : ok <= 9 ? 'mid' : 'high';
    return { dims, overall: { value: r2(ok / items.length), band: b, label: L[idx[b]], confidence: rushed ? 'low' : 'moderate', note: `${ok} of ${items.length} tasks correct` }, flags };
  }

  // Likert and SJT (leadership mixes both)
  let straight = false;
  const lik = items.filter(i => i.type === 'likert');
  if (lik.length >= 8 && new Set(lik.map(i => r[i.id]?.v)).size === 1) { straight = true; flags.push('The same answer was given to every statement; results are not reliable.'); }
  for (const k of Object.keys(t.dims)) {
    const its = items.filter(i => i.dim === k);
    if (!its.length) continue;
    if (its[0].type === 'sjt') {
      const vals = its.map(i => (i.type === 'sjt' ? i.options[r[i.id]?.v ?? -1]?.s ?? 0 : 0));
      const m = r2(mean(vals)); const b = bandSjt(m);
      dims[k] = { value: m, band: b, label: LABELS.sjt[idx[b]], confidence: rushed ? 'low' : its.length >= 4 ? 'moderate' : 'low' };
    } else {
      const pos = its.filter(i => i.type === 'likert' && i.key === 1).map(i => r[i.id]?.v ?? 3);
      const neg = its.filter(i => i.type === 'likert' && i.key === -1).map(i => 6 - (r[i.id]?.v ?? 3));
      const m = r2(mean([...pos, ...neg])); const b = bandLikert(m);
      const gap = pos.length && neg.length ? Math.abs(mean(pos) - mean(neg)) : 0;
      const conf: Confidence = straight || rushed || gap > 1.6 ? 'low' : gap > 0.9 || its.length < 4 ? 'moderate' : 'high';
      dims[k] = { value: m, band: b, label: L[idx[b]], confidence: conf, note: gap > 1.6 ? 'Answers to positively and negatively worded statements disagree' : undefined };
    }
  }
  const out: Scores = { dims, flags };
  if (t.code === 'interests') out.code = Object.entries(dims).sort((a, b) => b[1].value - a[1].value).slice(0, 3).map(([k]) => k).join('');
  if (t.code === 'values') out.ranking = Object.entries(dims).sort((a, b) => b[1].value - a[1].value).map(([k]) => k);
  if (t.area === 'judgement') {
    const all = Object.values(dims); const m = r2(mean(all.map(d => d.value))); const b = bandSjt(m);
    out.overall = { value: m, band: b, label: LABELS.sjt[idx[b]], confidence: rushed ? 'low' : 'moderate' };
  }
  return out;
}

export const scaleFor = (t: Test) => SCALES[t.scale || 'agree'];

export const CONF_LABEL = { low: 'Low confidence', moderate: 'Moderate confidence', high: 'High confidence' } as const;
