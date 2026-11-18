import './globals.css';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase';
import { signOut } from './actions';

export const metadata = {
  title: 'Tigermax Jobs — Jobs in Zimbabwe, online and abroad',
  description: 'Upload your CV once. Tigermax Jobs matches you to new jobs every day and applies on your behalf. Free to join. Recruitment agency licensed by the Ministry of Public Service, Labour and Social Welfare, Harare.',
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0f1f3d' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await currentUser();
  const dash = role === 'candidate' ? { href: '/candidate', label: 'My CV' }
    : role === 'employer' ? { href: '/employer', label: 'Dashboard' }
    : role === 'staff' ? { href: '/admin', label: 'Office' }
    : { href: '/login?as=candidate', label: 'Upload CV' };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap" />
      </head>
      <body>
        <header className="top">
          <div className="in">
            <Link href="/" className="brand" aria-label="Tigermax Jobs home">
              <picture>
                <source srcSet="/logo-dark.png" media="(prefers-color-scheme: dark)" />
                <img src="/logo.png" alt="Tigermax Jobs" height={34} />
              </picture>
            </Link>
            <nav className="links">
              <Link href="/jobs">Jobs</Link>
              <Link href="/assessments" className="hide-sm">Career IQ</Link>
              <Link href="/workshops" className="hide-sm">Workshops</Link>
              <Link href="/#how" className="hide-sm">How it works</Link>
              <Link href="/#employers" className="hide-sm">Employers</Link>
              <Link href="/#pricing" className="hide-sm">Pricing</Link>
              {user && <Link href={dash.href} className="hide-sm">{dash.label}</Link>}
              {user
                ? <form action={signOut}><button className="ghost sm">Sign out</button></form>
                : <Link href="/login" className="btn gold sm">Sign in</Link>}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site">
          <div className="in">
            <div>
              <picture>
                <source srcSet="/logo-dark.png" media="(prefers-color-scheme: dark)" />
                <img src="/logo.png" alt="Tigermax Jobs" height={40} style={{ marginBottom: 12 }} />
              </picture>
              <p style={{ margin: '0 0 10px' }}>Youth-owned HR support and recruitment agency, licensed by the Ministry of Public Service, Labour and Social Welfare (MPSLSW).<br />
                “Job creation is as sustainable as the job placement.”</p>
              <p style={{ margin: 0 }}>4th Floor, 3 Anchor House, 54 Jason Moyo Avenue, Harare</p>
            </div>
            <div>
              <h4>Job seekers</h4>
              <Link href="/jobs">Browse jobs</Link>
              <Link href="/login?as=candidate">Upload my CV</Link>
              <Link href="/#how">How auto-apply works</Link>
              <Link href="/assessments">Career Intelligence tests</Link>
              <Link href="/workshops">Workshops & events</Link>
              <Link href="/#faq">FAQ</Link>
            </div>
            <div>
              <h4>Employers</h4>
              <Link href="/login?as=employer">Post a job</Link>
              <Link href="/assessments#employers">Assess your candidates</Link>
              <Link href="/#employers">Recruitment services</Link>
              <Link href="/#pricing">Pricing</Link>
            </div>
            <div>
              <h4>Contact</h4>
              <a href="https://wa.me/263771331008">WhatsApp +263 77 133 1008</a>
              <a href="tel:+263771331008">Call the office</a>
              <a href="mailto:admin@tigermaxjobs.com">admin@tigermaxjobs.com</a>
              <Link href="/privacy">Privacy</Link>
            </div>
            <div className="legal">© {new Date().getFullYear()} Tigermax Jobs, Harare, Zimbabwe. Official recruitment agency for National Youth Service placements.</div>
          </div>
        </footer>

        <nav className="tabbar" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/assessments">Career IQ</Link>
          <Link href="/workshops">Learn</Link>
          <Link href={dash.href}>{dash.label}</Link>
          {user ? <Link href="/#faq">Help</Link> : <Link href="/login">Sign in</Link>}
        </nav>
      </body>
    </html>
  );
}
