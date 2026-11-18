import { signIn, signUp, resendConfirmation } from '@/app/actions';
import SubmitButton from '@/lib/submit-button';

export default function Login({ searchParams }: { searchParams: { as?: string; error?: string; check?: string; next?: string; resent?: string } }) {
  const role = searchParams.as === 'employer' ? 'employer' : 'candidate';
  const next = searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '';
  return (
    <div className="auth">
      <div className="center">
        <p className="eyebrow">{role === 'employer' ? 'For employers' : 'Free to join'}</p>
        <h1 className="h-lg">{role === 'employer' ? 'Hire with Tigermax.' : 'Welcome to Tigermax Jobs.'}</h1>
        <p className="lead">{role === 'employer'
          ? 'Create your company account, get verified, and start receiving matched candidates.'
          : 'Create your account, add your CV, and we start matching you tomorrow morning.'}</p>
      </div>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <div className="grid2">
        <form action={signUp} className="card stack" id="create">
          <h2 style={{ margin: 0 }}>Create an account</h2>
          {next && <input type="hidden" name="next" value={next} />}
          <label>I am
            <select name="role" defaultValue={role}>
              <option value="candidate">A job seeker (free)</option>
              <option value="employer">An employer</option>
            </select>
          </label>
          <label>Full name<input name="full_name" autoComplete="name" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <SubmitButton className="gold" label="Create account" pending="Creating your account…" />
          {searchParams.check && <p className="notice" role="status" style={{ margin: 0 }}>Check your email to confirm your account, then sign in.</p>}
          <p className="muted" style={{ margin: 0 }}>By joining you agree to our <a href="/privacy">privacy notice</a>.</p>
        </form>
        <form action={signIn} className="card stack">
          <h2 style={{ margin: 0 }}>Sign in</h2>
          {next && <input type="hidden" name="next" value={next} />}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <SubmitButton label="Sign in" pending="Signing in…" />
          <details id="resend" open={!!searchParams.resent}>
            <summary className="muted" style={{ fontSize: 14 }}>Did not get the confirmation email?</summary>
            <p className="muted" style={{ margin: '8px 0' }}>Check your spam or promotions folder first. Then enter your email to get a new link.</p>
          </details>
          <p className="muted" style={{ margin: 0 }}>Need help? WhatsApp the office on <a href="https://wa.me/263771331008">+263 77 133 1008</a>.</p>
        </form>
      </div>
      <form action={resendConfirmation} className="card stack" style={{ maxWidth: 520, margin: '16px auto 0' }}>
        <b>Resend my confirmation link</b>
        <label>Email you signed up with<input name="email" type="email" required autoComplete="email" /></label>
        <SubmitButton className="ghost" label="Send a new link" pending="Sending…" />
        {searchParams.resent && <p className="notice" role="status" style={{ margin: 0 }}>If that email has an unconfirmed account, a new link is on its way. Check spam too.</p>}
      </form>
    </div>
  );
}
