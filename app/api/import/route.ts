import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';

// Office / daily desk pushes researched vacancies here as a JSON array.
// Header: Authorization: Bearer <CRON_SECRET>
export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const items: any[] = await req.json();
  const rows = items.filter(o => o.sourceUrl && o.title).map(o => ({
    source: 'imported', title: o.title, employer_name: o.employer, location: o.location, work_mode: o.workMode || 'onsite',
    country: o.country || 'Zimbabwe', category: o.category, summary: o.summary, requirements: o.requirements || [],
    documents: o.documents || [], pay: o.pay, closes: o.closes, apply_method: o.applyMethod || 'online',
    apply_email: o.applyEmail, apply_url: o.applyUrl, addressee: o.addressee || [], source_url: o.sourceUrl,
    caution: o.caution, status: o.active === false ? 'closed' : 'live',
  }));
  const { error, count } = await adminClient().from('jobs').upsert(rows, { onConflict: 'source_url', count: 'exact' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: count });
}
