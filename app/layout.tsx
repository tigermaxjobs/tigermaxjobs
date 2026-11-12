import './globals.css';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { signOut } from './actions';

export const metadata = { title: 'Tigermax Jobs', description: 'Jobs in Zimbabwe, online and abroad. Free CV bank and application service for job seekers.' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await currentUser();
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">Tigermax <span>Jobs</span></Link>
          <Link href="/">Jobs</Link>
          {role === 'candidate' && <Link href="/candidate">My CV &amp; applications</Link>}
          {role === 'employer' && <Link href="/employer">Employer dashboard</Link>}
          {role === 'staff' && <Link href="/admin">Office</Link>}
          {user ? <form action={signOut}><button className="ghost" style={{ padding: '6px 12px' }}>Sign out</button></form>
                : <Link href="/login" className="btn gold" style={{ padding: '6px 12px' }}>Sign in / Join</Link>}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
