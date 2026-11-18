-- 18 Nov 2026: (1) online, start-any-time workshops with progress tracking;
-- (2) AI Career Intelligence & Psychometric Assessment Engine (timed tests, paid sittings, packs, vouchers, certificates).
-- Run once in Supabase > SQL Editor, after 20261117_workshops.sql.

-- ───────────── 1. Online self-paced workshops ─────────────
alter table public.workshops add column if not exists delivery text not null default 'in_person';
alter table public.workshops drop constraint if exists workshops_delivery_check;
alter table public.workshops add constraint workshops_delivery_check check (delivery in ('in_person','online'));
alter table public.workshops add column if not exists modules jsonb not null default '[]';  -- [{id,title,minutes,body,check?}]

alter table public.workshop_registrations add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.workshop_registrations add column if not exists completed_modules text[] not null default '{}';
alter table public.workshop_registrations add column if not exists started_at timestamptz;
alter table public.workshop_registrations add column if not exists completed_at timestamptz;
create index if not exists workshop_registrations_user_idx on public.workshop_registrations(user_id);

drop policy if exists "attendee reads own registrations" on public.workshop_registrations;
create policy "attendee reads own registrations" on public.workshop_registrations for select using (user_id = auth.uid() or public.is_staff());

-- The four Tigermax-run trainings become online and open all the time. The National Youth Symposium (HICC) and
-- the Ask Maka beta day stay as dated, in-person events. Module text lives in workshops.modules (editable in Office > Workshops).
update public.workshops set delivery = 'online', venue = 'Online · self-paced', ends_on = null, time_label = null,
  starts_on = least(starts_on, current_date)
where slug in ('work-readiness-summit-2026','labour-law-open-cases-2026','compliance-kickoff-2027','online-work-readiness-2027');

update public.workshops set title = 'Work Readiness Course for Zimbabwean Job Seekers',
  price_note = 'US$10 once. Start straight after registration and go at your own pace.',
  modules = '[
 {"id":"m1","title":"Know the job you are targeting","minutes":15,"body":"Before you write anything, decide which jobs you are aiming for. Pick one or two job titles and collect three real adverts for each.\n\nUnderline the duties, qualifications and skills that appear in all three. These words are what employers screen for, and your CV should use them where they are true for you.\n\nTask: write down your two target job titles and the five requirements that keep repeating.","check":"I have chosen my target jobs and listed the repeated requirements."},
 {"id":"m2","title":"A CV that gets shortlisted","minutes":25,"body":"Keep it to two pages. Start with your name, phone, email and town. Add a three-line profile that names the job you want and your strongest evidence.\n\nList experience newest first. Under each role write achievements, not only duties: what improved, how many, how much. Put qualifications with institution and year. Add two or three referees who know your work and have agreed to be contacted.\n\nRemove your ID number, marital status and religion: employers do not need them to shortlist you.\n\nTask: rewrite one duty from your CV as an achievement with a number in it.","check":"My CV is two pages, newest first, with achievements and referees."},
 {"id":"m3","title":"Personal branding and LinkedIn","minutes":15,"body":"Recruiters search online. Use a clear, professional photo and the same job title on your CV, LinkedIn and WhatsApp business profile.\n\nYour LinkedIn headline should say what you do and want, for example ''Accounts Clerk | Pastel | Payroll | Open to roles in Harare''. Ask two former supervisors or lecturers for a short recommendation.\n\nCheck what is public on your social media and remove anything you would not want an employer to see.","check":"My photo, headline and public profiles are consistent and professional."},
 {"id":"m4","title":"Interview preparation","minutes":25,"body":"Prepare five stories using STAR: the Situation, the Task, the Action you took and the Result. Most competency questions (teamwork, pressure, conflict, mistakes) can be answered with one of them.\n\nResearch the employer: what they do, recent news, and the job''s main duties. Prepare two questions to ask them.\n\nOn the day: arrive 15 minutes early, bring copies of your CV and certified certificates, switch off your phone. For video interviews, test the link and your connection beforehand and sit facing a light.","check":"I have five STAR stories and two questions for the employer."},
 {"id":"m5","title":"Documents, conduct and your first 90 days","minutes":15,"body":"Have these ready: certified copies of qualifications, national ID, birth certificate, police clearance where needed, and reference letters.\n\nIn your first 90 days, learn how your performance will be measured, arrive on time, ask questions early, and keep a short weekly note of what you achieved. It helps at probation review.\n\nWhen you finish, take the free Work Preferences check and the Career Intelligence tests on Tigermax Jobs to find roles that fit you.","check":"My documents are ready and I know how my probation will be reviewed."}
 ]'::jsonb
where slug = 'work-readiness-summit-2026';

update public.workshops set title = 'Labour Law in Zimbabwe: Know Your Rights and Obligations',
  price_note = 'US$10 once. Study online at your own pace, then send your open case for assessment.',
  modules = '[
 {"id":"m1","title":"The framework","minutes":15,"body":"Employment in Zimbabwe is governed mainly by the Labour Act [Chapter 28:01], its regulations, the Constitution''s labour rights, and the collective bargaining agreements of the National Employment Council (NEC) for your industry.\n\nYour contract, the NEC agreement and the Act work together: a contract cannot give you less than the Act or your NEC agreement guarantees.","check":"I know which NEC covers my industry."},
 {"id":"m2","title":"Contracts and conditions of service","minutes":20,"body":"A contract can be permanent, fixed-term or casual/seasonal. Ask for it in writing and keep a copy. It should state your job, pay, hours, leave and notice.\n\nCheck your NEC agreement for minimum wages, allowances and conditions in your grade. Keep payslips: they are your evidence if pay is short.","check":"I have a written contract and my payslips filed."},
 {"id":"m3","title":"Discipline, dismissal and retrenchment","minutes":20,"body":"Dismissal must follow a fair procedure: a registered code of conduct or the national code, notice of the allegations, a hearing where you can respond, and a right to appeal.\n\nRetrenchment has its own procedure and terminal benefits. Do not sign a settlement or resignation you do not understand. Get advice first.","check":"I understand the steps of a fair disciplinary hearing."},
 {"id":"m4","title":"Raising and resolving a dispute","minutes":15,"body":"Most disputes go to a labour officer or the NEC designated agent for conciliation first, then to arbitration, and on appeal to the Labour Court. Time limits apply, so act quickly.\n\nWrite down dates, names and what happened, and keep copies of letters and messages.","check":"I have written a dated summary of my matter."},
 {"id":"m5","title":"Send your open case for assessment","minutes":10,"body":"If you have an open labour matter, WhatsApp a short summary and copies of your documents to the Tigermax office on +263 77 133 1008 with your registration reference. A labour law practitioner will assess it and, where representation is needed, refer you to a lawyer. Legal fees are agreed separately with the lawyer.\n\nThis course is general information, not legal advice for your case.","check":"I have sent my case summary, or I have no open case."}
 ]'::jsonb
where slug = 'labour-law-open-cases-2026';

update public.workshops set title = 'Compliance Essentials: Mandatory Benefits & Minimum Wages Decoded',
  price_note = 'US$20 once. Online and self-paced. Rates change: always confirm current figures with each authority.',
  modules = '[
 {"id":"m1","title":"NSSA: contributions and benefits","minutes":20,"body":"Employers register with the National Social Security Authority and deduct and pay pension contributions (shared between employer and employee) and the Accident Prevention and Workers Compensation contribution (employer only).\n\nNSSA pays retirement, invalidity and survivors'' pensions and covers work injuries. Check the current contribution rates and insurable earnings ceiling on nssa.org.zw before each payroll year.","check":"I know which NSSA schemes my organisation must pay into."},
 {"id":"m2","title":"NEC minimum wages and conditions","minutes":20,"body":"Each industry''s National Employment Council publishes minimum wages by grade, plus allowances and conditions. Employers must pay at least the NEC minimum and remit NEC levies where the agreement requires.\n\nKeep the latest wage schedule for your sector and update payroll from the effective date stated.","check":"I have my sector''s latest NEC wage schedule."},
 {"id":"m3","title":"ZIMRA: PAYE and employer tax obligations","minutes":20,"body":"Employers deduct PAYE from employees'' pay using the current tax tables, file returns and pay by the due date each month, and issue annual tax certificates (P6) to employees.\n\nLate payment attracts penalties and interest. Tax clearance (ITF263) depends on staying up to date.","check":"I know the monthly PAYE deadline and where to get current tables."},
 {"id":"m4","title":"ZIMDEF: the training levy","minutes":10,"body":"The Zimbabwe Manpower Development Fund collects a training levy calculated on the employer''s wage bill. It funds apprenticeships, skills training and tertiary support. Confirm the current rate with ZIMDEF and pay on time.","check":"My organisation is registered with ZIMDEF."},
 {"id":"m5","title":"Your compliance calendar","minutes":15,"body":"Build one calendar with every monthly and annual deadline: PAYE, NSSA, NEC levies, ZIMDEF, tax certificates and returns. Assign an owner for each and keep proof of every payment.\n\nSend questions for the panel to the Tigermax office on WhatsApp +263 77 133 1008. Answers are shared with all registered participants.","check":"I have a compliance calendar with owners and deadlines."}
 ]'::jsonb
where slug = 'compliance-kickoff-2027';

update public.workshops set title = 'Online Work: The Right Tools for the Trade',
  tagline = 'Get set up, skilled and ready for remote work from Zimbabwe, at your own pace.',
  price_note = 'Free for candidates on the Tigermax US$240 placement tier (register with the email on your Tigermax profile). US$50 for everyone else. Start any time.',
  modules = '[
 {"id":"m1","title":"Where genuine remote jobs are","minutes":20,"body":"Use established boards and company career pages. Real employers interview you, give a written contract or offer, and never ask you to pay to get the job.\n\nPick one role type (virtual assistant, customer support, sales, bookkeeping, data, IT) and build your profile around it.","check":"I have chosen one remote role type."},
 {"id":"m2","title":"Tools employers expect","minutes":25,"body":"Learn the basics of Google Workspace or Microsoft 365, a chat tool such as Slack or Teams, a video tool (Zoom, Meet), a task board (Trello, Asana) and time tracking. Most offer free plans: practise with them.\n\nTake the Tigermax Digital Workplace Skills simulation to check your level.","check":"I have practised with each type of tool."},
 {"id":"m3","title":"Workspace, internet and power","minutes":15,"body":"You need a reliable laptop, a quiet space, a headset, and a backup for power cuts (UPS, inverter or solar) and internet (a second network or mobile data bundle). Test your speed at the times you will work.","check":"I have a backup plan for power and internet."},
 {"id":"m4","title":"Getting paid from abroad","minutes":20,"body":"Common routes are a local bank account that receives foreign transfers, or services such as Payoneer or Wise where they support you. Check fees and withdrawal options before you accept a job, and keep records of income for tax.","check":"I know how I will receive foreign pay."},
 {"id":"m5","title":"Time zones and avoiding scams","minutes":15,"body":"Agree your working hours in the employer''s time zone and in yours. Warning signs of a scam: payment to get the job, cheques to deposit, requests for your bank PIN, jobs offered without an interview, or chats only on Telegram.\n\nIf in doubt, WhatsApp the Tigermax office on +263 77 133 1008 before you reply.","check":"I can spot the main scam warning signs."}
 ]'::jsonb
where slug = 'online-work-readiness-2027';

-- ───────────── 2. Career Intelligence & Psychometric Assessment Engine ─────────────
-- Test definitions, items, prices and scoring live in the code (lib/assessments). The database stores consent,
-- orders, credits (one credit = one timed sitting), attempts, certificates, vouchers, evidence and validation status.

alter table public.candidates add column if not exists assessment_extra_time_pct int not null default 0; -- accessibility: extra time agreed by the office

create table if not exists public.assessment_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version text not null,
  share_with_employers boolean not null default false,
  consented_at timestamptz not null default now()
);

create table if not exists public.assessment_orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,            -- TMJ-AS-XXXX, also the private link to the invoice
  invoice_no text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  employer_id uuid references public.employers(id) on delete set null,
  items jsonb not null,                       -- [{type:'test'|'pack'|'certificate'|'org_pack', code, qty, unit, label}]
  amount numeric(10,2) not null,
  pay_option text not null check (pay_option in ('paynow','invoice','free')),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','paid','cancelled')),
  poll_url text,
  paid_at timestamptz,
  paid_via text,
  fulfilled_at timestamptz,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.assessment_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                  -- e.g. TMX-7KQ4-PZ2M
  employer_id uuid references public.employers(id) on delete cascade,
  order_id uuid references public.assessment_orders(id) on delete set null,
  pack text not null,
  cohort text,                                -- e.g. "Graduate trainees 2027"
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  share_progress boolean not null default false,  -- candidate agreed to show tests done/pending + certificates to this employer
  created_at timestamptz default now()
);

create table if not exists public.assessment_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null,                         -- a test code, or 'certificate'
  source text not null check (source in ('order','voucher','staff','free')),
  order_id uuid references public.assessment_orders(id) on delete set null,
  voucher_id uuid references public.assessment_vouchers(id) on delete set null,
  used_at timestamptz,
  used_for uuid,                              -- attempt id or certificate id
  created_at timestamptz default now()
);
create index if not exists assessment_credits_user_idx on public.assessment_credits(user_id, item) where used_at is null;

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_code text not null,
  test_version text not null,
  credit_id uuid references public.assessment_credits(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,            -- enforced on the server: answers after this are refused
  time_limit_s int not null,
  extra_time_pct int not null default 0,
  item_order text[] not null default '{}',    -- items served so far (adaptive tests add one at a time)
  responses jsonb not null default '{}',      -- {itemId: {v, ms}}
  scores jsonb,                               -- written once on completion
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists assessment_attempts_user_idx on public.assessment_attempts(user_id, test_code, started_at desc);

create table if not exists public.assessment_certificates (
  id uuid primary key default gen_random_uuid(),
  serial text unique not null,                -- TMJ-CI-2026-XXXXXXXX
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_id uuid references public.assessment_credits(id) on delete set null,
  full_name text not null,
  stars int not null,
  snapshot jsonb not null,                    -- {done:[{code,name,date}], pending:[{code,name}]}
  signature text not null,                    -- HMAC of serial, name, date and snapshot (server secret)
  status text not null default 'valid' check (status in ('valid','revoked')),
  issued_at timestamptz not null default now()
);

create table if not exists public.competency_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  competency text not null,
  self_rating int not null check (self_rating between 1 and 4),
  evidence text,
  evidence_url text,
  status text not null default 'submitted' check (status in ('submitted','verified','not_verified')),
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, competency)
);

-- Validation status is changed only by staff, with the study that supports it.
create table if not exists public.assessment_validation (
  test_code text primary key,
  status text not null default 'pilot' check (status in ('pilot','reliability','validated')),
  evidence text,
  updated_at timestamptz default now()
);

alter table public.assessment_consents enable row level security;
alter table public.assessment_orders enable row level security;
alter table public.assessment_vouchers enable row level security;
alter table public.assessment_credits enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_certificates enable row level security;
alter table public.competency_evidence enable row level security;
alter table public.assessment_validation enable row level security;

-- Reads only. Every write goes through the server, which checks the signed-in user first.
drop policy if exists "own consent" on public.assessment_consents;
create policy "own consent" on public.assessment_consents for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own orders" on public.assessment_orders;
create policy "own orders" on public.assessment_orders for select using (user_id = auth.uid() or public.is_staff()
  or employer_id in (select id from employers where owner_id = auth.uid()));
drop policy if exists "employer vouchers" on public.assessment_vouchers;
create policy "employer vouchers" on public.assessment_vouchers for select using (public.is_staff() or redeemed_by = auth.uid()
  or employer_id in (select id from employers where owner_id = auth.uid()));
drop policy if exists "own credits" on public.assessment_credits;
create policy "own credits" on public.assessment_credits for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own attempts" on public.assessment_attempts;
create policy "own attempts" on public.assessment_attempts for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own certificates" on public.assessment_certificates;
create policy "own certificates" on public.assessment_certificates for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own evidence" on public.competency_evidence;
create policy "own evidence" on public.competency_evidence for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "validation is public" on public.assessment_validation;
create policy "validation is public" on public.assessment_validation for select using (true);

grant select on public.assessment_consents, public.assessment_orders, public.assessment_vouchers, public.assessment_credits,
  public.assessment_attempts, public.assessment_certificates, public.competency_evidence to authenticated;
grant select on public.assessment_validation to anon, authenticated;
grant all on public.assessment_consents, public.assessment_orders, public.assessment_vouchers, public.assessment_credits,
  public.assessment_attempts, public.assessment_certificates, public.competency_evidence, public.assessment_validation to service_role;
