// Sends applications from each candidate's own Tigermax address on apply.tigermaxjobs.com via Mailgun.
// Employer replies arrive at the same address; a Mailgun route posts them to /api/inbound-email,
// which forwards them to the candidate's personal email. Message bodies are not stored.
const base = () => `${process.env.MAILGUN_API_BASE}/v3/${process.env.MAILGUN_DOMAIN}/messages`;
const auth = () => 'Basic ' + Buffer.from('api:' + process.env.MAILGUN_API_KEY).toString('base64');

export async function sendMail(opts: {
  from: string; to: string; subject: string; text: string; replyTo?: string;
  attachment?: { filename: string; data: Blob };
}) {
  const form = new FormData();
  form.append('from', opts.from);
  form.append('to', opts.to);
  form.append('subject', opts.subject);
  form.append('text', opts.text);
  if (opts.replyTo) form.append('h:Reply-To', opts.replyTo);
  if (opts.attachment) form.append('attachment', opts.attachment.data, opts.attachment.filename);
  const res = await fetch(base(), { method: 'POST', headers: { Authorization: auth() }, body: form });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${await res.text()}`);
  return res.json();
}

export function aliasAddress(alias: string) { return `${alias}@${process.env.MAILGUN_DOMAIN}`; }

export function makeAlias(fullName: string) {
  const slug = fullName.toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, '').trim().split(/\s+/).slice(0, 2).join('.');
  return `${slug || 'candidate'}.${Math.floor(1000 + Math.random() * 9000)}`;
}
