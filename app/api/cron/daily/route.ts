import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { scoreAndDraft, roughFit } from '@/lib/ai';
import { sendPrepared } from '@/lib/apply';

export const maxDuration = 300;
const MAX_AI_CALLS = 120; // cost cap per run

// Runs daily (vercel.json). Closes expired jobs, matches candidates to live jobs, and auto-applies where allowed.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const db = adminClient();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Harare' });
  await db.from('jobs').update({ status: 'closed' }).eq('status', 'live').lt('closes', today);

  // Without a Claude API key the site still closes expired jobs; matching then stays with the office desk.
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ today, matching: 'skipped: no ANTHROPIC_API_KEY' });

  const { data: jobs } = await db.from('jobs').select('*').eq('status', 'live');
  const { data: cands } = await db.from('candidates').select('*').eq('status', 'active').not('consent_at', 'is', null);
  const { data: existing } = await db.from('applications').select('job_id, candidate_id');
  const done = new Set((existing || []).map(a => a.job_id + ':' + a.candidate_id));
  const minAuto = Number(process.env.AUTO_APPLY_MIN_SCORE || 65);

  let calls = 0, matches = 0, sent = 0;
  for (const job of jobs || []) for (const c of cands || []) {
    if (calls >= MAX_AI_CALLS) break;
    if (done.has(job.id + ':' + c.id) || !roughFit(c, job)) continue;
    calls++;
    const m = await scoreAndDraft(c, job);
    if (!m || m.score < 60) continue;
    const platform = job.apply_method === 'platform';
    const auto = c.auto_apply && m.score >= minAuto;
    const { data: a } = await db.from('applications').insert({
      job_id: job.id, candidate_id: c.id, score: m.score, why: m.why, gaps: m.gaps, letter: m.letter,
      stage: auto && platform ? 'applied' : 'ready', sent_via: auto && platform ? 'platform' : null,
      sent_at: auto && platform ? new Date().toISOString() : null,
    }).select('id').single();
    matches++;
    if (a && auto && !platform && job.apply_email && process.env.MAILGUN_API_KEY) { const r = await sendPrepared(a.id); if (r.ok) sent++; }
  }
  return NextResponse.json({ today, aiCalls: calls, newMatches: matches, autoSent: sent });
}
