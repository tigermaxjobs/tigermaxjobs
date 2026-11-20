import Link from 'next/link';
import { updatePassword } from '@/app/actions';
import SubmitButton from '@/lib/submit-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose a new password — Tigermax Jobs', robots: { index: false } };

// The reset email links here. Nothing happens just by opening the page (email scanners open links and would
// use up the one-time link); the password changes only when the person submits the form.
export default function Reset({ searchParams }: { searchParams: { token_hash?: string; code?: string; error?: string; error_description?: string } }) {
  const hasLink = !!(searchParams.token_hash || searchParams.code);
  const linkError = searchParams.error_description;
  return (
    <div className="auth" style={{ maxWidth: 460 }}>
      <div className="center">
        <p className="eyebrow">Reset password</p>
        <h1 className="h-lg">Choose a new password.</h1>
      </div>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {hasLink ? (
        <form action={updatePassword} className="card stack">
          {searchParams.token_hash && <input type="hidden" name="token_hash" value={searchParams.token_hash} />}
          {searchParams.code && <input type="hidden" name="code" value={searchParams.code} />}
          <label>New password (at least 8 characters)<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <label>Type it again<input name="password2" type="password" minLength={8} autoComplete="new-password" required /></label>
          <SubmitButton className="gold" label="Save new password" pending="Saving…" />
        </form>
      ) : (
        <div className="card stack">
          <p style={{ margin: 0 }}>{linkError ? 'That reset link has expired or was already used.' : 'This page needs the link from your reset email.'}</p>
          <Link className="btn gold" href="/forgot-password">Send me a new reset link</Link>
        </div>
      )}
      <p className="center"><Link href="/login">‹ Back to sign in</Link></p>
    </div>
  );
}
