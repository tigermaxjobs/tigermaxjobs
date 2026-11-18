import { confirmEmail } from '@/app/actions';
import SubmitButton from '@/lib/submit-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirm your account — Tigermax Jobs', robots: { index: false } };

// The confirmation email links here. Nothing is confirmed by just opening the page (email scanners open links
// automatically and would use up the one-time token); the person taps the button, which confirms and signs them in.
export default function Confirm({ searchParams }: { searchParams: { token_hash?: string; type?: string; next?: string } }) {
  const ok = !!searchParams.token_hash;
  return (
    <div className="auth" style={{ maxWidth: 520 }}>
      <div className="card stack center">
        <h1 style={{ margin: 0 }}>Confirm your account</h1>
        {ok ? (
          <form action={confirmEmail} className="stack">
            <input type="hidden" name="token_hash" value={searchParams.token_hash} />
            <input type="hidden" name="type" value={searchParams.type || 'signup'} />
            <input type="hidden" name="next" value={searchParams.next || ''} />
            <p className="muted" style={{ margin: 0 }}>Tap the button to confirm your email and sign in.</p>
            <SubmitButton className="gold" label="Confirm my account" pending="Confirming…" />
          </form>
        ) : (
          <p className="muted">This link is incomplete. Open the newest Tigermax email and tap its button, or enter the 6-digit code on the <a href="/login#code">sign-in page</a>.</p>
        )}
      </div>
    </div>
  );
}
