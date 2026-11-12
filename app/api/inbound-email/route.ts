import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminClient } from '@/lib/supabase';
import { sendMail } from '@/lib/mail';

// Mailgun route: match_recipient(".*@apply.tigermaxjobs.com") -> forward("https://tigermaxjobs.com/api/inbound-email")
// Forwards employer replies to the candidate's own email. Only date, sender and subject are logged.
export async function POST(req: Request) {
  const f = await req.formData();
  const ts = String(f.get('timestamp')), token = String(f.get('token')), sig = String(f.get('signature'));
  const expected = crypto.createHmac('sha256', process.env.MAILGUN_WEBHOOK_SIGNING_KEY!).update(ts + token).digest('hex');
  if (sig !== expected) return NextResponse.json({ error: 'bad signature' }, { status: 401 });

  const recipient = String(f.get('recipient') || '').toLowerCase();
  const alias = recipient.split('@')[0];
  const db = adminClient();
  const { data: c } = await db.from('candidates').select('id, email, full_name').eq('apply_alias', alias).single();
  if (!c) return NextResponse.json({ ok: true }); // unknown address: drop quietly

  const sender = String(f.get('from') || f.get('sender') || '');
  const subject = String(f.get('subject') || '(no subject)');
  const body = String(f.get('body-plain') || '');
  await sendMail({
    from: `Tigermax Jobs <${recipient}>`, to: c.email, replyTo: sender,
    subject: `[Employer reply] ${subject}`,
    text: `An employer replied to your job application.\nFrom: ${sender}\n\nReply to this email to answer them directly.\n\n------\n${body}`,
  });
  await db.from('email_events').insert({ candidate_id: c.id, direction: 'in', counterpart: sender, subject });
  return NextResponse.json({ ok: true });
}
