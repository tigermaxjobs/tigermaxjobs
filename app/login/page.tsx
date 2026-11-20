import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signIn } from '@/app/actions';
import { currentUser } from '@/lib/supabase';
import SubmitButton from '@/lib/submit-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — Tigermax Jobs' };

type P = { as?: string; error?: string; next?: string; email?: string; exists?: string; pw?: string };
const safe = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '');

// Sign-in page only. Creating an account is on /signup; forgotten passwords on /forgot-password.
export default async function Login({ searchParams }: { searchParams: P }) {
  const next = safe(searchParams.next);
  const { user, role: current } = await currentUser();
  if (user) redirect(next || (current === 'employer' ? '/employer' : current === 'staff' ? '/admin' : '/candidate'));
  const role = searchParams.as === 'employer' ? 'employer' : 'candidate';
  const q = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ ...(searchParams.as ? { as: role } : {}), ...(next ? { next } : {}), ...extra });
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  return (
    <div className="auth" style={{ maxWidth: 460 }}>
      <div className="center">
        <p className="eyebrow">{role === 'employer' ? 'For employers' : 'Welcome back'}</p>
        <h1 className="h-lg">Sign in.</h1>
      </div>
      {searchParams.exists && <p className="notice">This email already has a Tigermax account. Sign in below, or <Link href={`/forgot-password${q({ email: searchParams.email || '' })}`}>reset your password</Link> if you have forgotten it.</p>}
      {searchParams.pw && <p className="notice">Your password has been changed. Sign in with your new password.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <form action={signIn} className="card stack">
        {next && <input type="hidden" name="next" value={next} />}
        <label>Email<input name="email" type="email" autoComplete="email" defaultValue={searchParams.email || ''} required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <SubmitButton className="gold" label="Sign in" pending="Signing in…" />
        <p style={{ margin: 0, textAlign: 'right' }}><Link href={`/forgot-password${q()}`}>Forgot password?</Link></p>
      </form>
      <div className="card center">
        <p style={{ margin: '0 0 10px' }}>New to Tigermax Jobs?</p>
        <Link className="btn ghost" href={`/signup${q()}`}>Create a free account</Link>
      </div>
      <p className="muted center">Need help? WhatsApp the office on <a href="https://wa.me/263771331008">+263 77 133 1008</a>.</p>
    </div>
  );
}
