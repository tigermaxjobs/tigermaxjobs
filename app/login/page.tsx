import { signIn, signUp } from '@/app/actions';

export default function Login({ searchParams }: { searchParams: { as?: string; error?: string; check?: string } }) {
  const role = searchParams.as === 'employer' ? 'employer' : 'candidate';
  return (
    <div className="grid2">
      {searchParams.error && <p className="notice" style={{ gridColumn: '1/-1' }}>{searchParams.error}</p>}
      {searchParams.check && <p className="notice" style={{ gridColumn: '1/-1' }}>Check your email to confirm your account, then sign in.</p>}
      <form action={signIn} className="card stack">
        <h2 style={{ margin: 0 }}>Sign in</h2>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" required /></label>
        <button>Sign in</button>
      </form>
      <form action={signUp} className="card stack">
        <h2 style={{ margin: 0 }}>Create an account</h2>
        <label>I am
          <select name="role" defaultValue={role}>
            <option value="candidate">A job seeker (free)</option>
            <option value="employer">An employer</option>
          </select>
        </label>
        <label>Full name<input name="full_name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" minLength={8} required /></label>
        <button className="gold">Create account</button>
      </form>
    </div>
  );
}
