// Career intelligence: occupation profiles, Career Fulfilment Index, readiness tiers, strengths and development plan.
// Results are shown as bands with confidence levels, never as unsupported percentages, and are never the sole basis
// for any employment decision.
import { TEST, TESTS, VALIDATION_LABEL } from './catalog';
import type { Scores, Band, Confidence } from './scoring';

type Pole = -1 | 0 | 1;
export type Occupation = {
  key: string; title: string; riasec: string; jobsQuery: string;
  traits: Partial<Record<'O' | 'C' | 'E' | 'A' | 'ES', Band>>;
  values: string[];
  competencies: { test: string; min: Band }[];
  env: Partial<Record<'structure' | 'social' | 'pace' | 'setting' | 'focus', Pole>>;
  quals: string[]; related: string[]; noQualNeeded?: boolean;
  entry: string; training: string; international: string;
};

// env poles: −1 = first option in Workplace Preferences (routines, team, steady, office, people); +1 = second.
export const OCCUPATIONS: Occupation[] = [
  { key: 'accounts', title: 'Accounts Clerk / Bookkeeper', riasec: 'CEI', jobsQuery: 'accounts', traits: { C: 'high' }, values: ['security', 'achievement'],
    competencies: [{ test: 'numerical', min: 'mid' }, { test: 'digital', min: 'mid' }], env: { structure: -1, setting: -1, focus: 1 },
    quals: ['accounting', 'accountancy', 'acca', 'cima', 'cis', 'iac', 'bookkeeping', 'pastel', 'quickbooks', 'bcom'], related: ['finance', 'commerce', 'business studies', 'economics'],
    entry: 'Diploma or certificate in accounting (e.g. IAC, ACCA foundation), or a commerce degree', training: 'IAC or ACCA foundation-level papers; Pastel/Sage or QuickBooks course; advanced Excel',
    international: 'Remote bookkeeping roles usually ask for QuickBooks or Xero certification and strong English.' },
  { key: 'customer', title: 'Customer Service / Call Centre Agent', riasec: 'SEC', jobsQuery: 'customer', traits: { A: 'high', ES: 'mid', E: 'mid' }, values: ['security', 'service'],
    competencies: [{ test: 'customer', min: 'mid' }, { test: 'verbal', min: 'mid' }, { test: 'digital', min: 'mid' }], env: { social: -1, setting: -1, focus: -1 },
    quals: ['customer service', 'call centre', 'contact centre', 'receptionist'], related: ['sales', 'hospitality', 'front office'], noQualNeeded: true,
    entry: 'Five O-levels including English; customer service experience helps', training: 'Customer service certificate; typing speed and CRM basics',
    international: 'Remote support roles test written English, typing speed and a stable internet connection.' },
  { key: 'sales', title: 'Sales Representative', riasec: 'ESC', jobsQuery: 'sales', traits: { E: 'high', ES: 'mid' }, values: ['rewards', 'achievement', 'autonomy'],
    competencies: [{ test: 'customer', min: 'mid' }, { test: 'numerical', min: 'low' }], env: { pace: 1, setting: 1, focus: -1 },
    quals: ['sales', 'marketing', 'business development'], related: ['retail', 'customer service', 'commerce'], noQualNeeded: true,
    entry: 'O-levels; a sales or marketing certificate is an advantage; a driver\'s licence for field sales', training: 'Sales and negotiation course; product knowledge; driver\'s licence (Class 4)',
    international: 'Remote sales and lead-generation roles look for proven targets met and confident spoken English.' },
  { key: 'admin', title: 'Administrative / Virtual Assistant', riasec: 'CSE', jobsQuery: 'admin', traits: { C: 'high', A: 'mid' }, values: ['security', 'autonomy'],
    competencies: [{ test: 'digital', min: 'mid' }, { test: 'verbal', min: 'mid' }], env: { structure: -1, setting: -1 },
    quals: ['secretarial', 'administration', 'office management', 'executive assistant', 'virtual assistant'], related: ['business studies', 'human resources', 'records'],
    entry: 'Certificate or diploma in office administration or secretarial studies', training: 'Google Workspace / Microsoft 365 skills; Tigermax Online Work course; minute-taking',
    international: 'Virtual assistant roles need reliable power and internet backup and a way to receive foreign pay.' },
  { key: 'data', title: 'Data Capture / Data Analyst', riasec: 'CIR', jobsQuery: 'data', traits: { C: 'high', O: 'mid' }, values: ['achievement', 'growth'],
    competencies: [{ test: 'numerical', min: 'high' }, { test: 'abstract', min: 'mid' }, { test: 'digital', min: 'high' }], env: { structure: -1, social: 1, focus: 1 },
    quals: ['data analysis', 'statistics', 'data science', 'power bi', 'sql', 'analytics'], related: ['mathematics', 'economics', 'information technology', 'excel', 'data entry'],
    entry: 'Data capture: O-levels and computer skills. Analyst: degree in statistics, economics or IT', training: 'Advanced Excel, SQL and Power BI or Google Data Analytics certificate',
    international: 'Remote data roles often set a practical test; a portfolio of dashboards helps.' },
  { key: 'it', title: 'IT Support Technician / Developer', riasec: 'IRC', jobsQuery: 'IT', traits: { O: 'high', C: 'mid' }, values: ['growth', 'achievement'],
    competencies: [{ test: 'abstract', min: 'high' }, { test: 'digital', min: 'high' }, { test: 'numerical', min: 'mid' }], env: { social: 1, focus: 1 },
    quals: ['computer science', 'information technology', 'software', 'comptia', 'ccna', 'developer', 'programming', 'network'], related: ['ict', 'computer', 'electronics'],
    entry: 'Diploma or degree in IT/computer science, or recognised certifications', training: 'CompTIA A+/Network+, CCNA, or a coding bootcamp with a project portfolio',
    international: 'International IT employers value certifications and a public portfolio (e.g. GitHub).' },
  { key: 'nurse', title: 'Nurse / Healthcare Assistant / Caregiver', riasec: 'SIR', jobsQuery: 'nurse', traits: { A: 'high', C: 'high', ES: 'high' }, values: ['service', 'security'],
    competencies: [{ test: 'sjt', min: 'mid' }, { test: 'eq', min: 'mid' }], env: { structure: -1, focus: -1, pace: 1 },
    quals: ['nursing', 'registered nurse', 'rgn', 'midwife', 'caregiver', 'care giver', 'healthcare assistant', 'nurse aide'], related: ['health', 'first aid', 'home based care', 'red cross'],
    entry: 'Nurse: nursing diploma/degree and registration. Caregiver: caregiving certificate', training: 'Caregiving certificate (short course); for nurses abroad, the destination regulator\'s registration and English test',
    international: 'Nursing abroad usually requires registration with the destination regulator (e.g. NMC in the UK) and an English test such as IELTS or OET.' },
  { key: 'teacher', title: 'Teacher / Trainer', riasec: 'SAE', jobsQuery: 'teacher', traits: { E: 'mid', A: 'high', C: 'mid' }, values: ['service', 'growth'],
    competencies: [{ test: 'verbal', min: 'mid' }, { test: 'eq', min: 'mid' }], env: { social: -1, focus: -1 },
    quals: ['teaching', 'education', 'pgde', 'b.ed', 'bed', 'teacher', 'lecturer', 'tutor'], related: ['training', 'facilitation', 'coaching'],
    entry: 'Teaching diploma or degree (e.g. PGDE, B.Ed) for schools; subject expertise for corporate training', training: 'PGDE or a train-the-trainer certificate; online teaching tools',
    international: 'Teaching abroad often needs qualification recognition and, for English teaching, a TEFL/TESOL certificate.' },
  { key: 'electrician', title: 'Electrician / Electrical Technician', riasec: 'RIC', jobsQuery: 'electric', traits: { C: 'high' }, values: ['security', 'achievement'],
    competencies: [{ test: 'numerical', min: 'mid' }, { test: 'abstract', min: 'mid' }], env: { setting: 1, focus: 1 },
    quals: ['electrical', 'electrician', 'class 1', 'journeyman', 'trade test', 'electrical engineering'], related: ['nc', 'nfc', 'technical', 'polytechnic', 'artisan'],
    entry: 'National Certificate / trade test or apprenticeship in electrical work', training: 'Apprenticeship or polytechnic NC/ND; trade tests to Class 1',
    international: 'Trades abroad often require a skills assessment and local licensing before you can work unsupervised.' },
  { key: 'site', title: 'Construction Site Supervisor / Foreman', riasec: 'REC', jobsQuery: 'construction', traits: { C: 'high', E: 'mid' }, values: ['achievement', 'rewards'],
    competencies: [{ test: 'leadership', min: 'mid' }, { test: 'numerical', min: 'mid' }, { test: 'sjt', min: 'mid' }], env: { setting: 1, pace: 1 },
    quals: ['construction', 'building', 'civil engineering', 'site supervisor', 'foreman', 'clerk of works'], related: ['quantity surveying', 'carpentry', 'bricklaying', 'artisan'],
    entry: 'Diploma in building or civil engineering, or a trade qualification with site experience', training: 'Construction management short course; health and safety (SHEQ) certificate',
    international: 'Gulf and regional construction employers ask for verifiable site experience and safety certificates.' },
  { key: 'qs', title: 'Quantity Surveyor / Estimator', riasec: 'CIE', jobsQuery: 'quantity surveyor', traits: { C: 'high', O: 'mid' }, values: ['achievement', 'rewards'],
    competencies: [{ test: 'numerical', min: 'high' }, { test: 'verbal', min: 'mid' }, { test: 'digital', min: 'mid' }], env: { focus: 1 },
    quals: ['quantity surveying', 'quantity surveyor', 'estimator', 'rics', 'sacqsp'], related: ['civil engineering', 'construction', 'building'],
    entry: 'Degree in quantity surveying', training: 'Professional registration (e.g. RICS, SACQSP); estimating software',
    international: 'Professional membership such as MRICS strengthens international applications.' },
  { key: 'driver', title: 'Driver (light, heavy or PSV)', riasec: 'RCE', jobsQuery: 'driver', traits: { C: 'high', ES: 'high' }, values: ['security'],
    competencies: [{ test: 'sjt', min: 'mid' }], env: { setting: 1, social: 1, focus: 1 },
    quals: ['class 1', 'class 2', 'class 4', 'driver', 'defensive driving', 'psv', 'driving licence', "driver's licence"], related: ['retest', 'medical certificate'],
    entry: 'Valid licence for the vehicle class; defensive driving certificate; clean record', training: 'Defensive driving; retest; higher licence class',
    international: 'Driving abroad requires converting your licence and, for trucks, local professional permits.' },
  { key: 'agri', title: 'Farm / Agricultural Supervisor', riasec: 'REI', jobsQuery: 'farm', traits: { C: 'high', ES: 'mid' }, values: ['autonomy', 'achievement'],
    competencies: [{ test: 'leadership', min: 'mid' }, { test: 'numerical', min: 'low' }], env: { setting: 1, pace: -1 },
    quals: ['agriculture', 'agronomy', 'animal science', 'horticulture', 'farm management'], related: ['farming', 'irrigation'],
    entry: 'Certificate or diploma in agriculture; farm experience', training: 'Agricultural college certificate; farm management and irrigation short courses',
    international: 'Seasonal agricultural programmes abroad usually require a recruitment agency and work permit.' },
  { key: 'design', title: 'Graphic Designer / Content Creator', riasec: 'AEI', jobsQuery: 'design', traits: { O: 'high' }, values: ['autonomy', 'growth'],
    competencies: [{ test: 'digital', min: 'mid' }], env: { structure: 1, focus: 1 },
    quals: ['graphic design', 'multimedia', 'photoshop', 'illustrator', 'video editing', 'film'], related: ['art', 'design', 'photography', 'canva'],
    entry: 'A strong portfolio; a design diploma helps', training: 'Adobe or Canva skills; build a portfolio of 10+ real pieces',
    international: 'Remote design work is won on portfolio; platforms test with a small paid task.' },
  { key: 'marketing', title: 'Digital Marketing / Social Media Officer', riasec: 'AEC', jobsQuery: 'marketing', traits: { O: 'high', E: 'mid' }, values: ['growth', 'achievement'],
    competencies: [{ test: 'digital', min: 'high' }, { test: 'verbal', min: 'mid' }], env: { structure: 1, pace: 1 },
    quals: ['marketing', 'digital marketing', 'social media', 'communications', 'public relations'], related: ['journalism', 'media', 'content'],
    entry: 'Diploma or degree in marketing or communications', training: 'Google Digital Marketing or Meta certificates; analytics basics',
    international: 'Remote marketing roles look for measurable campaign results and analytics skills.' },
  { key: 'security', title: 'Security Officer', riasec: 'RCS', jobsQuery: 'security', traits: { C: 'high', ES: 'high' }, values: ['security'],
    competencies: [{ test: 'sjt', min: 'mid' }], env: { structure: -1, setting: 1 },
    quals: ['security', 'grade a', 'grade b', 'grade c', 'guard'], related: ['police', 'army', 'military', 'first aid'],
    entry: 'Security training certificate (grade); clean record', training: 'Security grade courses; first aid; fire safety',
    international: 'Security roles in the Gulf usually need local licensing and a medical.' },
  { key: 'hr', title: 'Human Resources Officer', riasec: 'SEC', jobsQuery: 'human resources', traits: { A: 'mid', C: 'high', E: 'mid' }, values: ['service', 'achievement'],
    competencies: [{ test: 'eq', min: 'mid' }, { test: 'verbal', min: 'mid' }, { test: 'sjt', min: 'mid' }], env: { focus: -1, setting: -1 },
    quals: ['human resources', 'hr', 'ipmz', 'personnel', 'industrial relations', 'labour'], related: ['psychology', 'administration', 'payroll'],
    entry: 'Diploma or degree in HR management; IPMZ membership', training: 'IPMZ diploma; Tigermax Labour Law and Compliance courses; HR software',
    international: 'International HR roles value CIPD or SHRM credentials.' },
  { key: 'hospitality', title: 'Hospitality / Front Office', riasec: 'SEC', jobsQuery: 'hotel', traits: { E: 'high', A: 'high' }, values: ['service'],
    competencies: [{ test: 'customer', min: 'high' }], env: { focus: -1, pace: 1, social: -1 },
    quals: ['hospitality', 'hotel', 'tourism', 'front office', 'food and beverage', 'chef', 'culinary'], related: ['customer service', 'receptionist'],
    entry: 'Hospitality certificate or diploma; customer experience', training: 'Hospitality short courses; food safety; a second language',
    international: 'Cruise and Gulf hospitality employers look for hospitality certificates and spoken English.' },
  { key: 'mining', title: 'Mining Plant Operator / Artisan', riasec: 'RCI', jobsQuery: 'mining', traits: { C: 'high', ES: 'high' }, values: ['security', 'rewards'],
    competencies: [{ test: 'abstract', min: 'mid' }, { test: 'sjt', min: 'mid' }], env: { setting: 1, focus: 1, structure: -1 },
    quals: ['mining', 'plant operator', 'fitter', 'boilermaker', 'diesel plant', 'metallurgy', 'blasting'], related: ['nc', 'nfc', 'artisan', 'polytechnic', 'mechanical'],
    entry: 'Trade certificate or apprenticeship; plant operator certificate', training: 'Polytechnic NC; plant operator licence; SHEQ induction',
    international: 'Regional mines require verified trade papers and medical fitness.' },
  { key: 'entrepreneur', title: 'Entrepreneur / Small Business Owner', riasec: 'ECS', jobsQuery: '', traits: { E: 'mid', O: 'high', ES: 'mid' }, values: ['autonomy', 'rewards', 'achievement'],
    competencies: [{ test: 'leadership', min: 'mid' }, { test: 'agility', min: 'mid' }, { test: 'numerical', min: 'mid' }], env: { structure: 1, pace: 1 },
    quals: ['entrepreneur', 'business owner', 'self-employed', 'director'], related: ['business', 'commerce', 'sales'], noQualNeeded: true,
    entry: 'No formal qualification; a tested business idea and basic bookkeeping', training: 'Business plan and bookkeeping short course; company registration and tax compliance',
    international: 'Online businesses can serve international clients; check foreign payment options first.' },
];

export type FitBand = 'strong' | 'moderate' | 'emerging' | 'unknown';
export type Fit = { band: FitBand; confidence: Confidence; basis: string };
export type Tier = 'now' | 'training' | 'pathway';
export const TIER_LABEL: Record<Tier, string> = { now: 'Qualified now', training: 'Needs additional training', pathway: 'Longer-term pathway' };
export const FIT_LABEL: Record<FitBand, string> = { strong: 'Strong', moderate: 'Moderate', emerging: 'Emerging', unknown: 'Not yet assessed' };
export const CFI_DIMS = [['personal', 'Personal fit'], ['interest', 'Interest alignment'], ['competency', 'Competency fit'], ['learning', 'Learning potential'], ['workplace', 'Workplace compatibility']] as const;

export type Profile = {
  scores: Record<string, Scores>;              // latest completed scores by test code
  validation: Record<string, string>;          // test code → pilot | reliability | validated
  text: string;                                // CV text, headline, categories, notes (lower case)
  verified: string[];                          // competencies verified by the office
};

const bi: Record<Band, number> = { low: 0, mid: 1, high: 2 };
const confRank: Record<Confidence, number> = { low: 0, moderate: 1, high: 2 };
const minConf = (cs: Confidence[]): Confidence => (cs.length ? (['low', 'moderate', 'high'] as Confidence[])[Math.min(...cs.map(c => confRank[c]))] : 'low');
const toFit = (x: number): FitBand => (x >= 0.72 ? 'strong' : x >= 0.5 ? 'moderate' : 'emerging');

// Confidence of a fit: the weakest contributing result, capped at "moderate" while any test used is still in pilot.
function conf(p: Profile, tests: string[], cs: Confidence[]): Confidence {
  const c = minConf(cs);
  if (tests.some(t => (p.validation[t] || 'pilot') === 'pilot') && c === 'high') return 'moderate';
  if (tests.length < 2 && c === 'high') return 'moderate';
  return c;
}

function interestFit(p: Profile, o: Occupation): Fit {
  const s = p.scores.interests; if (!s) return { band: 'unknown', confidence: 'low', basis: 'Take the Occupational Interests test' };
  const order = Object.entries(s.dims).sort((a, b) => b[1].value - a[1].value).map(([k]) => k);
  let pts = 0, max = 0;
  o.riasec.split('').forEach((l, j) => { const w = 3 - j; max += w; pts += w * (5 - order.indexOf(l)) / 5; });
  return { band: toFit(pts / max), confidence: conf(p, ['interests'], Object.values(s.dims).map(d => d.confidence)), basis: `Your code ${s.code} vs ${o.riasec}` };
}
function personalFit(p: Profile, o: Occupation): Fit {
  const per = p.scores.personality, val = p.scores.values;
  if (!per && !val) return { band: 'unknown', confidence: 'low', basis: 'Take Work Personality and Work Values' };
  const parts: number[] = [], cs: Confidence[] = [], used: string[] = [];
  if (per) { used.push('personality');
    for (const [k, want] of Object.entries(o.traits)) { const d = per.dims[k]; if (!d) continue; const gap = Math.abs(bi[d.band] - bi[want!]); parts.push(gap === 0 ? 1 : gap === 1 ? 0.55 : 0.1); cs.push(d.confidence); } }
  if (val?.ranking) { used.push('values');
    for (const v of o.values) { const r = val.ranking.indexOf(v); parts.push(r < 0 ? 0.5 : r <= 2 ? 1 : r <= 3 ? 0.6 : 0.3); cs.push(val.dims[v]?.confidence || 'low'); } }
  return { band: toFit(parts.reduce((a, b) => a + b, 0) / Math.max(1, parts.length)), confidence: conf(p, used, cs), basis: used.map(u => TEST(u)!.name).join(' + ') };
}
function bandOf(s?: Scores): Band | null { if (!s) return null; if (s.overall) return s.overall.band; const v = Object.values(s.dims); if (!v.length) return null;
  const m = v.reduce((a, d) => a + bi[d.band], 0) / v.length; return m < 0.67 ? 'low' : m < 1.34 ? 'mid' : 'high'; }
function competencyFit(p: Profile, o: Occupation): Fit & { missing: string[] } {
  const parts: number[] = [], cs: Confidence[] = [], used: string[] = [], missing: string[] = [];
  for (const c of o.competencies) {
    const b = bandOf(p.scores[c.test]);
    if (!b) { missing.push(c.test); continue; }
    used.push(c.test); const gap = bi[c.min] - bi[b];
    parts.push(gap <= 0 ? 1 : gap === 1 ? 0.5 : 0.15);
    const sc = p.scores[c.test]; cs.push(sc.overall?.confidence || minConf(Object.values(sc.dims).map(d => d.confidence)));
  }
  if (!parts.length) return { band: 'unknown', confidence: 'low', basis: 'Take ' + o.competencies.map(c => TEST(c.test)!.name).join(', '), missing };
  const f = parts.reduce((a, b) => a + b, 0) / parts.length;
  return { band: toFit(f), confidence: conf(p, used, missing.length ? [...cs, 'low'] : cs), basis: `${used.length} of ${o.competencies.length} required checks taken`, missing };
}
export function learningPotential(p: Profile): Fit {
  const parts: number[] = [], cs: Confidence[] = [], used: string[] = [];
  const ag = p.scores.agility;
  if (ag) { used.push('agility'); const v = Object.values(ag.dims); parts.push((v.reduce((a, d) => a + d.value, 0) / v.length - 1) / 4); cs.push(...v.map(d => d.confidence)); }
  for (const t of ['abstract', 'numerical', 'verbal']) { const s = p.scores[t]; if (s?.overall) { used.push(t); parts.push((s.overall.value - 1) / 2); cs.push(s.overall.confidence); } }
  if (!parts.length) return { band: 'unknown', confidence: 'low', basis: 'Take Learning Agility or a reasoning test' };
  return { band: toFit(parts.reduce((a, b) => a + b, 0) / parts.length + 0.1), confidence: conf(p, used, cs), basis: used.map(u => TEST(u)!.name).join(' + ') };
}
function workplaceFit(p: Profile, o: Occupation): Fit {
  const pr = p.scores.preferences; if (!pr) return { band: 'unknown', confidence: 'low', basis: 'Take the free Workplace Preferences check' };
  const parts: number[] = [], cs: Confidence[] = [];
  for (const [k, pole] of Object.entries(o.env)) { if (!pole) continue; const d = pr.dims[k]; if (!d) continue;
    const v = d.value; parts.push(v === 0 ? 0.65 : Math.sign(v) === pole ? (Math.abs(v) === 2 ? 1 : 0.85) : (Math.abs(v) === 2 ? 0.05 : 0.3)); cs.push(d.confidence); }
  const eq = p.scores.eq; const used = ['preferences'];
  if (o.env.focus === -1 && eq) { used.push('eq'); const b = eq.dims.empathy?.band; parts.push(b === 'high' ? 1 : b === 'mid' ? 0.7 : 0.35); cs.push(eq.dims.empathy?.confidence || 'low'); }
  return { band: toFit(parts.reduce((a, b) => a + b, 0) / Math.max(1, parts.length)), confidence: conf(p, used, cs), basis: used.map(u => TEST(u)!.name).join(' + ') };
}

const has = (text: string, words: string[]) => words.some(w => new RegExp(`(^|[^a-z])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(text));

export type Pathway = {
  o: Occupation; tier: Tier; qual: 'yes' | 'related' | 'no'; alignment: number;
  cfi: Record<(typeof CFI_DIMS)[number][0], Fit>; missingTests: string[]; gaps: string[];
};

export function pathways(p: Profile): Pathway[] {
  const lp = learningPotential(p);
  const w: Record<FitBand, number> = { strong: 3, moderate: 2, emerging: 1, unknown: 1.5 };
  return OCCUPATIONS.map(o => {
    const interest = interestFit(p, o), personal = personalFit(p, o), comp = competencyFit(p, o), workplace = workplaceFit(p, o);
    const qual: Pathway['qual'] = has(p.text, o.quals) ? 'yes' : has(p.text, o.related) ? 'related' : 'no';
    const compOk = comp.band === 'strong' || comp.band === 'moderate';
    const tier: Tier =
      (qual === 'yes' || o.noQualNeeded) && comp.band !== 'emerging' && (comp.band !== 'unknown' || qual === 'yes') ? 'now'
      : qual === 'yes' || qual === 'related' || (o.noQualNeeded && !compOk) || (compOk && lp.band !== 'emerging') ? 'training'
      : 'pathway';
    const gaps: string[] = [];
    if (qual !== 'yes' && !o.noQualNeeded) gaps.push(`Qualification: ${o.entry}`);
    for (const c of o.competencies) { const b = bandOf(p.scores[c.test]); if (b && bi[b] < bi[c.min]) gaps.push(`${TEST(c.test)!.name}: aim for ${c.min === 'high' ? 'the top band' : 'at least the middle band'}`); }
    const alignment = w[interest.band] * 1.5 + w[personal.band] + w[workplace.band] + (comp.band === 'unknown' ? 1.5 : w[comp.band]) + (qual === 'yes' ? 1 : qual === 'related' ? 0.5 : 0);
    return { o, tier, qual, alignment, cfi: { personal, interest, competency: comp, learning: lp, workplace }, missingTests: comp.missing, gaps };
  }).sort((a, b) => b.alignment - a.alignment);
}

// ── Strengths, challenges, environments, development ─────────────
const DEV: Record<string, string> = {
  'personality.C': 'Use a daily task list and set your own deadlines a day early. The Work Readiness course (module 5) covers habits for your first 90 days.',
  'personality.ES': 'Build routines for pressure: plan the day, take short breaks, and talk problems through early with your supervisor.',
  'personality.E': 'Prepare two points before each meeting and say one of them; it builds visibility without changing who you are.',
  'personality.A': 'Before disagreeing, restate the other person\'s view; it keeps relationships strong while you stay direct.',
  'personality.O': 'Try one new tool or method a month; it shows employers you can adapt.',
  'numerical.g': 'Practise percentages, ratios and rates for 20 minutes a day (free: Khan Academy). Retake Numerical Reasoning after 90 days.',
  'verbal.g': 'Read one business article a day and summarise it in three sentences. Retake Verbal Reasoning after 90 days.',
  'abstract.g': 'Practise number and letter series and logic puzzles; they train the pattern-finding this test measures.',
  'sjt.integrity': 'Read your employer\'s code of conduct and gift policy; know who to report concerns to.',
  'sjt.teamwork': 'In team tasks, agree who does what and check in halfway.',
  'sjt.customer': 'Follow the listen–apologise–act–follow-up routine with every complaint.',
  'sjt.problem': 'When priorities clash, tell the people involved early and ask them to agree the order.',
  'sjt.reliability': 'Report problems and mistakes as soon as you notice them, with a proposed fix.',
  'digital.sheets': 'Learn SUM, AVERAGE, IF, VLOOKUP/XLOOKUP and absolute references. The Online Work course lists free practice tools.',
  'digital.comms': 'Use clear subject lines, Bcc for group emails, and PDF for final documents.',
  'digital.safety': 'Never share PINs or passwords; check links before clicking; share personal data only for its agreed purpose.',
  'customer.service': 'A customer service short course and role-play practice will raise this quickly.',
  'eq.awareness': 'Keep a short end-of-day note of what frustrated or energised you.',
  'eq.regulation': 'Pause and breathe before replying when upset; reply to difficult emails the next morning.',
  'eq.empathy': 'In conversations, ask one more question before giving your view.',
  'eq.social': 'Practise one difficult conversation at a time using facts, impact and a request.',
  'agility.mental': 'Take one short online course in a new area each quarter.',
  'agility.people': 'Ask a supervisor for one thing to improve after each major task.',
  'agility.change': 'Volunteer for one unfamiliar task each month.',
  'agility.results': 'After setbacks, write down what you will do differently next time.',
  'leadership.motivation': 'Individual-contributor and specialist paths are valuable; leadership can grow later if you want it.',
  'leadership.judgement': 'A supervisory skills course covering feedback, conflict and delegation will build this.',
};

export function insights(scores: Record<string, Scores>) {
  const strengths: string[] = [], challenges: string[] = [], development: { area: string; action: string }[] = [], environments: string[] = [];
  for (const code of ['personality', 'sjt', 'eq', 'agility', 'leadership', 'numerical', 'verbal', 'abstract', 'digital', 'customer']) {
    const s = scores[code]; const t = TEST(code); if (!s || !t) continue;
    for (const [k, d] of Object.entries(s.dims)) {
      const def = t.dims[k]; if (!def) continue;
      if (d.band === 'high' && code !== 'personality') strengths.push(`${def.label}: ${def.high}`);
      if (d.band === 'high' && code === 'personality') strengths.push(`${def.label}: ${def.high}`);
      if (d.band === 'low') {
        challenges.push(`${def.label}: ${def.low}`);
        if (DEV[`${code}.${k}`]) development.push({ area: def.label, action: DEV[`${code}.${k}`] });
      }
    }
  }
  const pr = scores.preferences;
  if (pr) for (const [k, d] of Object.entries(pr.dims)) if (d.value !== 0) environments.push(d.label);
  const per = scores.personality;
  if (per) {
    if (per.dims.E?.band === 'high') environments.push('People-facing, team-based settings');
    if (per.dims.E?.band === 'low') environments.push('Focused settings with time for independent work');
    if (per.dims.C?.band === 'high') environments.push('Organisations that value accuracy, quality and deadlines');
    if (per.dims.O?.band === 'high') environments.push('Innovative or changing environments');
    if (per.dims.ES?.band === 'high') environments.push('High-pressure or safety-critical work');
  }
  const val = scores.values;
  if (val?.ranking) environments.push('Jobs that offer ' + val.ranking.slice(0, 3).map(v => TEST('values')!.dims[v].label.toLowerCase()).join(', '));
  return { strengths: Array.from(new Set(strengths)), challenges: Array.from(new Set(challenges)), development, environments: Array.from(new Set(environments)) };
}

export function validationNote(v: Record<string, string>) {
  const pilot = TESTS.filter(t => (v[t.code] || 'pilot') === 'pilot').length;
  return pilot ? `${pilot} of ${TESTS.length} tests are in pilot (${VALIDATION_LABEL.pilot.toLowerCase()}), so confidence is capped at moderate for them.` : '';
}

// Plain summary for the job-matching engine (supporting information only; never a reason to lower a CV-based score).
export function matchSummary(scores: Record<string, Scores>, paths: Pathway[]) {
  const bits: string[] = [];
  if (scores.interests?.code) bits.push(`Holland code ${scores.interests.code}`);
  for (const c of ['numerical', 'verbal', 'abstract', 'sjt', 'digital', 'customer']) { const s = scores[c]; if (s?.overall) bits.push(`${TEST(c)!.name}: ${s.overall.label}`); }
  const top = paths.slice(0, 3).map(p => `${p.o.title} (${TIER_LABEL[p.tier]})`);
  return bits.length ? `${bits.join('; ')}. Best-aligned pathways: ${top.join(', ')}.` : '';
}
