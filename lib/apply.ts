import { adminClient } from '@/lib/supabase';
import { sendMail, aliasAddress } from '@/lib/mail';
import { letterText } from '@/lib/ai';

export async function sendPrepared(applicationId: string): Promise<{ ok: boolean; error?: string }> {
  const db = adminClient();
  const { data: a } = await db.from('applications').select('*, jobs(*), candidates(*)').eq('id', applicationId).single();
  if (!a) return { ok: false, error: 'Application not found' };
  const job = a.jobs, c = a.candidates;
  if (!process.env.MAILGUN_API_KEY) return { ok: false, error: 'Email sending is not set up yet (no Mailgun key). Send from the office mailbox for now.' };
  if (!job.apply_email) return { ok: false, error: 'This job has no apply email; apply online or in person.' };
  if (!a.letter) return { ok: false, error: 'No letter drafted yet' };
  let attachment;
  if (c.cv_path) {
    const dl = await db.storage.from('cvs').download(c.cv_path);
    if (dl.data) attachment = { filename: `${c.full_name.replace(/\s+/g, '_')}_CV.${c.cv_path.split('.').pop()}`, data: dl.data };
  }
  try {
    await sendMail({ from: `${c.full_name} <${aliasAddress(c.apply_alias)}>`, to: job.apply_email,
      subject: a.letter.subject, text: letterText(a.letter, c.full_name), attachment });
    await db.from('applications').update({ stage: 'sent', sent_via: 'email', sent_at: new Date().toISOString() }).eq('id', a.id);
    await db.from('email_events').insert({ candidate_id: c.id, direction: 'out', counterpart: job.apply_email, subject: a.letter.subject });
    return { ok: true };
  } catch (err: any) { return { ok: false, error: err.message }; }
}
