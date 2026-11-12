-- Tigermax Jobs database. Run once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- Every signed-in user has a profile with a role.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'candidate' check (role in ('candidate','employer','staff')),
  full_name text,
  phone text,
  created_at timestamptz default now()
);

-- Candidates (CV bank)
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  location text,
  headline text,
  categories text[] default '{}',
  modes text[] default '{onsite,remote,offshore}',
  has_passport text default 'unknown',
  cv_path text,                 -- file in storage bucket "cvs"
  cv_text text,                 -- typed or extracted CV text
  profile jsonb default '{}',   -- structured profile (experience, education, skills)
  apply_alias text unique,      -- e.g. tendai.moyo.4821 -> tendai.moyo.4821@apply.tigermaxjobs.com
  auto_apply boolean default false,
  consent_at timestamptz,       -- data-processing consent (required)
  truthful_at timestamptz,      -- "my CV truly reflects me" declaration
  status text default 'active' check (status in ('active','paused','hired','removed')),
  created_at timestamptz default now()
);

-- Employers
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  reg_number text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  verified boolean default false,      -- set by Tigermax staff after checks
  plan text default 'none',            -- current paid plan (see lib/plans.ts)
  listing_credits int default 0,
  managed_service boolean default false, -- Tigermax handles shortlisting/interviews
  created_at timestamptz default now()
);

-- Jobs: employer-posted, or imported by Tigermax staff/daily desk
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.employers(id) on delete set null,
  source text default 'employer' check (source in ('employer','imported')),
  title text not null,
  employer_name text not null,
  location text,
  work_mode text default 'onsite' check (work_mode in ('onsite','remote','offshore')),
  country text default 'Zimbabwe',
  category text,
  summary text,
  requirements text[] default '{}',
  documents text[] default '{}',
  pay text,
  closes date,
  apply_method text default 'platform' check (apply_method in ('platform','email','online','in_person','mixed')),
  apply_email text,
  apply_url text,
  addressee text[] default '{}',
  source_url text unique,
  caution text,
  featured boolean default false,
  status text default 'draft' check (status in ('draft','pending_payment','live','closed')),
  created_at timestamptz default now()
);

-- Applications and the hiring pipeline (shortlist, interview, offer)
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  score int,
  why text,
  gaps jsonb default '[]',
  letter jsonb,
  stage text default 'matched' check (stage in ('matched','ready','sent','applied','shortlisted','interview','offered','hired','rejected','withdrawn')),
  sent_via text,               -- 'email' | 'platform' | 'manual'
  sent_at timestamptz,
  interview_at timestamptz,
  interview_notes text,
  employer_notes text,
  created_at timestamptz default now(),
  unique (job_id, candidate_id)
);

-- Paynow payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.employers(id) on delete cascade,
  plan text not null,
  amount numeric(10,2) not null,
  reference text unique not null,
  poll_url text,
  status text default 'created',
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Replies from employers to candidates' apply addresses (metadata only; message bodies are not stored)
create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  direction text check (direction in ('out','in')),
  counterpart text,
  subject text,
  created_at timestamptz default now()
);

-- New sign-ups get a profile automatically
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  -- Only candidate or employer can be chosen at sign-up; staff is granted manually in the SQL editor.
  values (new.id,
          case when new.raw_user_meta_data->>'role' = 'employer' then 'employer' else 'candidate' end,
          new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'staff')
$$;

-- Row level security
alter table public.profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.employers enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.payments enable row level security;
alter table public.email_events enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "update own profile name" on public.profiles for update using (id = auth.uid()) with check (role = (select role from profiles where id = auth.uid()));

create policy "candidate owns row" on public.candidates for all using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

create policy "employer owns row" on public.employers for all using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());

create policy "live jobs are public" on public.jobs for select using (status = 'live' or public.is_staff()
  or employer_id in (select id from employers where owner_id = auth.uid()));
create policy "employer manages own jobs" on public.jobs for all
  using (public.is_staff() or employer_id in (select id from employers where owner_id = auth.uid()))
  with check (public.is_staff() or employer_id in (select id from employers where owner_id = auth.uid()));

create policy "applications visible to candidate, job owner, staff" on public.applications for select using (
  public.is_staff()
  or candidate_id in (select id from candidates where user_id = auth.uid())
  or job_id in (select j.id from jobs j join employers e on e.id = j.employer_id where e.owner_id = auth.uid())
);
create policy "candidate applies" on public.applications for insert with check (
  candidate_id in (select id from candidates where user_id = auth.uid()) or public.is_staff()
);
create policy "job owner or staff updates pipeline" on public.applications for update using (
  public.is_staff()
  or job_id in (select j.id from jobs j join employers e on e.id = j.employer_id where e.owner_id = auth.uid())
);

create policy "employer sees own payments" on public.payments for select using (
  public.is_staff() or employer_id in (select id from employers where owner_id = auth.uid())
);
create policy "staff sees email events" on public.email_events for select using (public.is_staff());

-- Private CV storage: candidates read/write their own folder; staff read all.
insert into storage.buckets (id, name, public) values ('cvs','cvs', false) on conflict do nothing;
create policy "candidate uploads own cv" on storage.objects for insert with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "candidate reads own cv" on storage.objects for select using (bucket_id = 'cvs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy "candidate replaces own cv" on storage.objects for update using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
