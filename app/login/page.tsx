import { signIn, signUp } from '@/app/actions';

export default function Login({ searchParams }: { searchParams: { as?: string; error?: string; check?: string } }) {
  const role = searchParams.as === 'employer' ? 'employer' : 'candidate';
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
      {searchParams.check && <p className="notice">Check your email to confirm your account, then sign in.</p>}
      <div className="grid2">
        <form action={signUp} className="card stack">
          <h2 style={{ margin: 0 }}>Create an account</h2>
          <label>I am
            <select name="role" defaultValue={role}>
              <option value="candidate">A job seeker (free)</option>
              <option value="employer">An employer</option>
            </select>
          </label>
          <label>Full name<input name="full_name" autoComplete="name" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <button className="gold">Create account</button>
          <p className="muted" style={{ margin: 0 }}>By joining you agree to our <a href="/privacy">privacy notice</a>.</p>
        </form>
        <form action={signIn} className="card stack">
          <h2 style={{ margin: 0 }}>Sign in</h2>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button>Sign in</button>
          <p className="muted" style={{ margin: 0 }}>Need help? WhatsApp the office on <a href="https://wa.me/263771331008">+263 77 133 1008</a>.</p>
        </form>
      </div>
    </div>
  );
}
