import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signUp } from '@/app/actions';
import { currentUser } from '@/lib/supabase';
import SubmitButton from '@/lib/submit-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create your account — Tigermax Jobs' };

const safe = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '');

// Create-account page. No email confirmation: the person ticks that their details are correct and is signed in
// straight away. One email can only have one account.
export default async function Signup({ searchParams }: { searchParams: { as?: string; error?: string; next?: string } }) {
  const next = safe(searchParams.next);
  const { user, role: current } = await currentUser();
  if (user) redirect(next || (current === 'employer' ? '/employer' : current === 'staff' ? '/admin' : '/candidate'));
  const role = searchParams.as === 'employer' ? 'employer' : 'candidate';
  const q = new URLSearchParams({ ...(searchParams.as ? { as: role } : {}), ...(next ? { next } : {}) }).toString();
  return (
    <div className="auth" style={{ maxWidth: 520 }}>
      <div className="center">
        <p className="eyebrow">{role === 'employer' ? 'For employers' : 'Free to join'}</p>
        <h1 className="h-lg">{role === 'employer' ? 'Hire with Tigermax.' : 'Create your account.'}</h1>
        <p className="lead">{role === 'employer'
          ? 'Create your company account, get verified, and start receiving matched candidates.'
          : 'Add your CV once and we start matching you to jobs tomorrow morning.'}</p>
      </div>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <form action={signUp} className="card stack">
        {next && <input type="hidden" name="next" value={next} />}
        <label>I am
          <select name="role" defaultValue={role}>
            <option value="candidate">A job seeker (free)</option>
            <option value="employer">An employer</option>
          </select>
        </label>
        <label>Full name<input name="full_name" autoComplete="name" required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password (at least 8 characters)<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label>Type the password again<input name="password2" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label className="row" style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <input type="checkbox" name="details_correct" required style={{ width: 'auto', marginTop: 4 }} />
          <span>I confirm my details are correct, including my email address. I understand one email can only have one account.</span>
        </label>
        <SubmitButton className="gold" label="Create account" pending="Creating your account…" />
        <p className="muted" style={{ margin: 0 }}>By joining you agree to our <Link href="/privacy">privacy notice</Link>.</p>
      </form>
      <div className="card center">
        <p style={{ margin: '0 0 10px' }}>Already have an account?</p>
        <Link className="btn ghost" href={`/login${q ? `?${q}` : ''}`}>Sign in</Link>
      </div>
    </div>
  );
}
