-- Payments made by job seekers for services (CV writing etc.) are tied to the signed-in account.
alter table public.payments add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists payer_name text;
alter table public.payments add column if not exists payer_email text;
create index if not exists payments_user_id_idx on public.payments(user_id);
drop policy if exists "user sees own payments" on public.payments;
create policy "user sees own payments" on public.payments for select using (user_id = auth.uid());
