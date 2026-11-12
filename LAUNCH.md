# Tigermax Jobs: launch guide

This is the live website for tigermaxjobs.com:
- Job seekers sign up free, upload or type their CV, choose job types (Zimbabwe, online, abroad) and can switch on automatic applications.
- Employers create an account, are verified by the office, pay through Paynow (EcoCash, OneMoney, cards) to publish jobs, and manage applicants: shortlist, schedule interviews, make offers. They can also buy the managed recruitment service so Tigermax runs shortlisting and interviews.
- The office (staff) verifies employers, publishes jobs, imports researched vacancies and sends prepared applications.
- Every morning a scheduled job closes expired adverts, scores candidates against live jobs with the Claude API, drafts cover letters, and applies automatically for candidates who opted in when the match is 65% or higher.
- Applications go out from each candidate's own address, for example tendai.moyo.4821@apply.tigermaxjobs.com. Employer replies are forwarded to the candidate's personal email, and only date, sender and subject are logged.

## Free start (no hosting costs)
What is free: GitHub, Render (free web service), Supabase (free project), and the daily trigger (GitHub Actions).
Switched off until you add their keys, and the site still works without them:
- **Paynow**: employers see "contact the office to buy listings"; record their payment and add credits on the Office page.
- **Mailgun**: applications are prepared and listed on the Office page; send them from the office mailbox.
- **Claude API**: the site does not match by itself; the daily Application Desk keeps doing matching and can push jobs in.
Free-plan limits: the Render site sleeps after about 15 minutes without visitors, so the first page after a quiet spell takes up to a minute to load. Supabase pauses a free project after a week with no activity.

## Steps
1. **GitHub**: create a free account, then a new **private** repository called `tigermaxjobs`. Click "uploading an existing file", drag in everything inside this folder (including the hidden `.github` folder; on Windows enable "show hidden items"), and commit.
2. **Supabase**: create a free project (region: Europe or South Africa if offered). SQL Editor > paste `supabase/schema.sql` > Run. Copy the Project URL, anon key and service_role key from Project Settings > API.
3. **Render**: sign up with your GitHub account. New > Blueprint > choose the `tigermaxjobs` repository. Render reads `render.yaml`; fill in the Supabase values and set NEXT_PUBLIC_SITE_URL to the address Render gives you (e.g. https://tigermaxjobs.onrender.com). Leave Paynow, Mailgun and Anthropic blank for now. Deploy.
4. **Supabase login links**: Authentication > URL configuration > Site URL = your Render address.
5. **Daily trigger**: GitHub repository > Settings > Secrets and variables > Actions > add `SITE_URL` (your Render address) and `CRON_SECRET` (copy the value Render generated under Environment).
6. **Make yourself staff**: sign up on the site, then in Supabase SQL Editor run
   `update profiles set role = 'staff' where id = (select id from auth.users where email = 'YOUR EMAIL');`
7. Edit prices in `lib/plans.ts` (edit the file on GitHub; Render redeploys automatically).

## Later, when there is budget
- **Domain** tigermaxjobs.com (about US$10–15/year): add it in Render > Settings > Custom domains and set the DNS records shown. Update NEXT_PUBLIC_SITE_URL and Supabase Site URL.
- **Paynow**: add PAYNOW_INTEGRATION_ID/KEY in Render; set Paynow's result URL to https://tigermaxjobs.com/api/paynow/result.
- **Mailgun** (inbound routing is on a paid plan): add domain apply.tigermaxjobs.com with its DNS records, create route match_recipient(".*@apply.tigermaxjobs.com") forwarding to https://tigermaxjobs.com/api/inbound-email, then add the MAILGUN_* keys in Render.
- **Claude API**: add ANTHROPIC_API_KEY to switch on automatic matching and auto-apply (each match costs a few US cents; the daily run is capped at 120).
- **Render Starter** (US$7/month) stops the site sleeping.

## Feeding researched jobs into the site
POST a JSON array of vacancies (same fields as the Application Desk) to <your site address>/api/import with header `Authorization: Bearer <CRON_SECRET>`. Each advert is keyed on its source URL, so sending it again updates it.

## Before going public
- Have the privacy notice (`app/privacy/page.tsx`) checked against the Cyber and Data Protection Act [Chapter 12:07], and register with POTRAZ as a data controller.
- Re-posting adverts found on other job boards may break those sites' terms. Imported jobs keep a link to the original advert; consider partnerships or summaries rather than copies.
- Public wording must not claim that candidates' documents or backgrounds are verified until the office actually checks them.
