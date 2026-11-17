-- Workshops & events: public listing, one registration form per event (no sign-up), Paynow or invoice payment.

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  tagline text,
  description text,
  host text,                         -- e.g. "Facilitated by the Ministry of Youth Empowerment, Development and Vocational Training"
  starts_on date not null,
  ends_on date,
  time_label text,                   -- e.g. "08:00 – 13:00"
  venue text not null,
  focus text[] default '{}',         -- bullet points shown on the page
  audience text,
  price_usd numeric(10,2) not null default 0,
  member_price_usd numeric(10,2),    -- price for candidates on the paid placement tier (offshore_registered_at set)
  price_note text,
  capacity int,
  form_fields jsonb not null default '[]',  -- this event's own questions: [{name,label,type,required,options?,help?}]
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  reference text unique not null,            -- also the private link to the ticket / invoice
  invoice_no text unique not null,
  full_name text not null,
  email text not null,
  phone text not null,
  organisation text,
  answers jsonb default '{}',
  amount numeric(10,2) not null default 0,
  is_member boolean default false,
  pay_option text not null check (pay_option in ('free','paynow','invoice')),
  status text not null default 'awaiting_payment' check (status in ('confirmed','awaiting_payment','paid','cancelled')),
  poll_url text,
  paid_at timestamptz,
  paid_via text,                             -- 'paynow' | 'bank' | 'cash'
  attended boolean default false,
  created_at timestamptz default now()
);
create index if not exists workshop_registrations_workshop_idx on public.workshop_registrations(workshop_id);

alter table public.workshops enable row level security;
alter table public.workshop_registrations enable row level security;
drop policy if exists "published workshops are public" on public.workshops;
create policy "published workshops are public" on public.workshops for select using (published or public.is_staff());
drop policy if exists "staff manage workshops" on public.workshops;
create policy "staff manage workshops" on public.workshops for all using (public.is_staff()) with check (public.is_staff());
-- Registrations are written by the server (service key) and read by staff only. Attendees reach their own
-- registration through its unguessable reference link, served by the server.
drop policy if exists "staff read registrations" on public.workshop_registrations;
create policy "staff read registrations" on public.workshop_registrations for select using (public.is_staff());
drop policy if exists "staff update registrations" on public.workshop_registrations;
create policy "staff update registrations" on public.workshop_registrations for update using (public.is_staff()) with check (public.is_staff());

-- Seats taken (confirmed + paid + awaiting payment), public so the page can show seats left without exposing names.
create or replace function public.workshop_seats_taken(w uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from workshop_registrations where workshop_id = w and status <> 'cancelled';
$$;
grant execute on function public.workshop_seats_taken(uuid) to anon, authenticated;

insert into public.workshops (slug, title, tagline, description, host, starts_on, ends_on, time_label, venue, focus, audience, price_usd, member_price_usd, price_note, form_fields) values
('national-youth-symposium-2026',
 'National Youth Symposium 2026',
 'Young Zimbabweans, skills and opportunity under one roof.',
 'A national gathering of young people, employers, training institutions and government to discuss youth employment, skills and enterprise. Tigermax Jobs is supporting the symposium and will be on site with CV help and job-matching sign-ups.',
 'Facilitated by the Ministry of Youth Empowerment, Development and Vocational Training',
 '2026-11-23', null, null, 'Harare International Conference Centre (HICC), Harare',
 array['Youth employment and skills', 'Enterprise and vocational training', 'Meet employers and training institutions', 'Free CV help from Tigermax Jobs'],
 'Young people, students, graduates, youth organisations and employers', 0, null, 'Free entry. Registration secures your place.',
 '[{"name":"age_group","label":"Age group","type":"select","required":true,"options":["Under 18","18–24","25–29","30–35","Over 35"]},
   {"name":"province","label":"Province you live in","type":"select","required":true,"options":["Harare","Bulawayo","Manicaland","Mashonaland Central","Mashonaland East","Mashonaland West","Masvingo","Matabeleland North","Matabeleland South","Midlands"]},
   {"name":"attending_as","label":"I am attending as","type":"select","required":true,"options":["Student","Job seeker","Young entrepreneur","Employed young professional","Youth organisation","Employer / partner","Other"]},
   {"name":"cv_help","label":"Would you like a CV review from Tigermax Jobs on the day?","type":"select","required":false,"options":["Yes","No"]}]'::jsonb),

('ask-maka-ai-beta-testing',
 'Ask Maka AI Beta Testing Day',
 'Be among the first to use a Zimbabwean AI assistant, and help shape it.',
 'The launch of the Ask Maka AI platform and a hands-on functionality test. Try the AI tool built for students, professionals and businesses in Zimbabwe, put it through real tasks, and give feedback that goes straight to the build team.',
 'Hosted by Tigermax Jobs and the Ask Maka AI team',
 '2026-11-26', null, null, 'Eight2Five Innovation Hub, Harare',
 array['Live launch and demo of Ask Maka AI', 'Hands-on testing with real tasks', 'Feedback session with the build team', 'For students, professionals and businesses'],
 'Students, professionals, business owners and developers', 0, null, 'Free. Seats are limited, so register to secure yours.',
 '[{"name":"you_are","label":"You are a","type":"select","required":true,"options":["Student","Professional","Business owner","Developer","Other"]},
   {"name":"field","label":"Field of study, profession or industry","type":"text","required":true},
   {"name":"device","label":"Device you will bring for testing","type":"select","required":true,"options":["Laptop","Smartphone","Tablet","None, I need one"]},
   {"name":"use_case","label":"What would you most like an AI assistant to help you with?","type":"textarea","required":false}]'::jsonb),

('work-readiness-summit-2026',
 'Work Readiness Summit for Zimbabwean Job Seekers',
 'Walk in a job seeker, walk out ready for the interview.',
 'A practical summit for job seekers covering CV writing, personal branding, interview preparation and job readiness, run by the Tigermax Jobs recruitment team.',
 'Facilitated by Tigermax Jobs',
 '2026-11-28', null, null, 'Tigermax Jobs Interview Room, 4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare',
 array['CV writing that gets shortlisted', 'Personal branding and LinkedIn', 'Interview preparation and mock interviews', 'Job readiness: documents, conduct and first 90 days'],
 'Job seekers, graduates and people changing careers', 10, null, 'RSVP US$10. Pay now online or request an invoice.',
 '[{"name":"status","label":"Your current situation","type":"select","required":true,"options":["Unemployed graduate","Unemployed, not a graduate","Employed, looking to move","Student / final year","Other"]},
   {"name":"field","label":"Field of work you are targeting","type":"text","required":true},
   {"name":"focus","label":"What do you most need help with?","type":"select","required":true,"options":["CV writing","Personal branding","Interview preparation","All of these"]},
   {"name":"bring_cv","label":"Will you bring your current CV for review?","type":"select","required":false,"options":["Yes, printed","Yes, on my phone","No"]}]'::jsonb),

('labour-law-open-cases-2026',
 'Labour Law in Zimbabwe: Open Cases, Stay Informed',
 'Know your rights. Know your obligations. Get your case looked at.',
 'An awareness class on the rights and provisions of every employee and every employer under Zimbabwean labour law. Stakeholders get informed, open labour cases are assessed on the day, and lawyers are deployed to take on matters that need representation.',
 'Facilitated by Tigermax Jobs with labour law practitioners',
 '2026-12-12', null, null, 'Tigermax Jobs Interview Room, 4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare',
 array['Rights and duties of employees and employers', 'Contracts, dismissals, retrenchment and terminal benefits', 'Case assessment for open labour matters', 'Referral to lawyers who can take on your case'],
 'Employees, employers, HR practitioners and union representatives', 10, null, 'RSVP US$10. Pay now online or request an invoice.',
 '[{"name":"attending_as","label":"I am attending as","type":"select","required":true,"options":["Employee","Employer / business owner","HR practitioner","Union / workers'' committee representative","Other"]},
   {"name":"open_case","label":"Do you have an open labour case you would like assessed?","type":"select","required":true,"options":["Yes","No"]},
   {"name":"case_type","label":"If yes, what is it about?","type":"select","required":false,"options":["Unfair dismissal","Unpaid wages or benefits","Retrenchment / terminal benefits","Disciplinary hearing","Contract dispute","Harassment or discrimination","Other"]},
   {"name":"case_summary","label":"Short summary of the case (optional, kept confidential)","type":"textarea","required":false}]'::jsonb),

('compliance-kickoff-2027',
 'Compliance Kick-Off 2027: Mandatory Benefits & Minimum Wages Decoded',
 'Start 2027 knowing exactly what NSSA, NEC, ZIMRA and ZIMDEF expect, and what they promise compliant employers.',
 'A public lecture with representatives from NSSA, the National Employment Councils, ZIMRA and ZIMDEF. Hear directly what each mandatory body requires in 2027, the minimum salary structures in force, and the benefits and protections they offer compliant entities. Bring your questions.',
 'Public lecture with representatives from NSSA, NEC, ZIMRA and ZIMDEF',
 '2027-01-14', null, null, 'Tigermax Jobs Interview Room, 4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare',
 array['NSSA contributions and benefits', 'NEC minimum salaries and conditions of service', 'ZIMRA: PAYE and employer tax obligations', 'ZIMDEF levy and what it funds', 'Open Q&A with the representatives'],
 'HR practitioners, payroll and finance professionals, company representatives and tax agents', 20, null, 'RSVP US$20. Pay now online or request an invoice for your company.',
 '[{"name":"role","label":"Your role","type":"select","required":true,"options":["HR practitioner","Payroll / finance","Company director / owner","Tax agent / consultant","Other professional"]},
   {"name":"company_size","label":"Number of employees at your organisation","type":"select","required":false,"options":["1–10","11–50","51–200","Over 200","Not applicable"]},
   {"name":"sector","label":"Industry / NEC sector","type":"text","required":false},
   {"name":"question","label":"A question you would like the panel to answer","type":"textarea","required":false}]'::jsonb),

('online-work-readiness-2027',
 'Online Work: The Right Tools for the Trade',
 'Two days to get set up, skilled and ready for remote work from Zimbabwe.',
 'A two-day work readiness workshop for online and remote work: finding genuine remote jobs, setting up your workspace and power backup, tools employers expect, receiving foreign pay, time zones, and avoiding scams.',
 'Facilitated by Tigermax Jobs',
 '2027-02-05', '2027-02-06', null, 'Tigermax Jobs Interview Room, 4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare',
 array['Where genuine remote jobs are and how to apply', 'Tools of the trade: Google Workspace, Slack, CRMs, time tracking', 'Getting paid from abroad: accounts, Payoneer, Wise', 'Workspace, internet and power backup', 'Spotting and avoiding job scams'],
 'Job seekers who want online / remote work', 50, 0,
 'Free for candidates registered on the Tigermax US$240 placement tier (use the email on your Tigermax profile). US$50 for everyone else.',
 '[{"name":"experience","label":"Your online work experience","type":"select","required":true,"options":["None yet","Some freelancing","Worked remotely before"]},
   {"name":"target","label":"Type of online work you want","type":"select","required":true,"options":["Virtual assistant / admin","Customer support","Sales / lead generation","Digital marketing / social media","Data entry / data analysis","Bookkeeping","IT / development","Other"]},
   {"name":"laptop","label":"Do you have your own laptop?","type":"select","required":true,"options":["Yes","No"]},
   {"name":"internet","label":"Your internet at home","type":"select","required":false,"options":["Fibre / WiFi","Mobile data only","None"]}]'::jsonb)
on conflict (slug) do nothing;

-- Table grants (this project does not grant new tables to the API roles automatically).
grant select on public.workshops to anon, authenticated;
grant insert, update, delete on public.workshops to authenticated;
grant select, update on public.workshop_registrations to authenticated;
grant all on public.workshops, public.workshop_registrations to service_role;
