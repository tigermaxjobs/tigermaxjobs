import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions';
import SubmitButton from '@/lib/submit-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reset your password — Tigermax Jobs', robots: { index: false } };

const safe = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '');

export default function Forgot({ searchParams }: { searchParams: { sent?: string; error?: string; email?: string; next?: string; as?: string } }) {
  const next = safe(searchParams.next);
  const q = new URLSearchParams({ ...(searchParams.as ? { as: searchParams.as } : {}), ...(next ? { next } : {}) }).toString();
  return (
    <div className="auth" style={{ maxWidth: 460 }}>
      <div className="center">
        <p className="eyebrow">Forgot password</p>
        <h1 className="h-lg">Reset your password.</h1>
        <p className="lead">Enter the email you registered with. We will send a reset link to that email.</p>
      </div>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {searchParams.sent ? (
        <div className="card stack">
          <p style={{ margin: 0 }}><b>Check your email.</b> If {searchParams.email ? <b>{searchParams.email}</b> : 'that email'} has a Tigermax account, a reset link is on its way. Check your spam or promotions folder too.</p>
          <p className="muted" style={{ margin: 0 }}>Open the link on this phone or computer, then choose a new password.</p>
          <Link className="btn ghost" href={`/forgot-password${q ? `?${q}` : ''}`}>Send again</Link>
        </div>
      ) : (
        <form action={requestPasswordReset} className="card stack">
          {next && <input type="hidden" name="next" value={next} />}
          <label>Email you registered with<input name="email" type="email" autoComplete="email" defaultValue={searchParams.email || ''} required /></label>
          <SubmitButton className="gold" label="Send reset link" pending="Sending…" />
        </form>
      )}
      <p className="center"><Link href={`/login${q ? `?${q}` : ''}`}>‹ Back to sign in</Link></p>
      <p className="muted center">No email after 10 minutes? WhatsApp the office on <a href="https://wa.me/263771331008">+263 77 133 1008</a>.</p>
    </div>
  );
}
