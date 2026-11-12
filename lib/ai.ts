// Uses the Claude API to score a candidate against a job and draft a cover letter.
type Match = {
  score: number; why: string;
  gaps: { requirement: string; status: 'missing' | 'partly'; gap: string; ask: string }[];
  letter: { subject: string; salutation: string; paragraphs: string[] };
};

const SYSTEM = `You are the matching engine of Tigermax Jobs, a licensed recruitment agency in Harare, Zimbabwe.
Compare one candidate with one job and reply with JSON only:
{"score": 0-100 integer, "why": "1-2 sentences",
 "gaps": [{"requirement","status":"missing"|"partly","gap","ask"}],
 "letter": {"subject": "RE: APPLICATION FOR THE POSITION OF <TITLE> – <EMPLOYER>, <LOCATION>" in uppercase,
            "salutation": "Dear Sir/Madam,", "paragraphs": [4-5 short British-English paragraphs]}}
Rules: list only requirements the candidate does not fully meet. Include logistics gaps: relocation/shifts/licences for on-site;
laptop, internet, power backup, time zone and receiving foreign pay for remote; passport, visa/work permit, police clearance and travel costs for offshore.
The letter uses only facts from the candidate profile, never invents experience and never mentions a recruitment agency.`;

export async function scoreAndDraft(candidate: any, job: any): Promise<Match | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB:\n${JSON.stringify(job)}\n\nCANDIDATE:\n${JSON.stringify({
        name: candidate.full_name, location: candidate.location, headline: candidate.headline,
        categories: candidate.categories, modes: candidate.modes, passport: candidate.has_passport,
        profile: candidate.profile, cv_text: (candidate.cv_text || '').slice(0, 12000),
      })}` }],
    }),
  });
  if (!res.ok) { console.error('Claude API', res.status, await res.text()); return null; }
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  try { return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { return null; }
}

// Cheap pre-filter so the API is only called for plausible pairs.
export function roughFit(candidate: any, job: any) {
  if (!(candidate.modes || []).includes(job.work_mode)) return false;
  const hay = [job.title, job.category, job.summary, ...(job.requirements || [])].join(' ').toLowerCase();
  const words = [...(candidate.categories || []), candidate.headline || ''].join(' ').toLowerCase().split(/[^a-z]+/).filter((w: string) => w.length > 3);
  return words.some((w: string) => hay.includes(w));
}

export function letterText(letter: Match['letter'], name: string) {
  return [letter.salutation, '', ...letter.paragraphs.flatMap(p => [p, '']), 'Yours faithfully,', '', name].join('\n');
}
