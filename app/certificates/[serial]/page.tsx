import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createHash, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';
import { adminClient, currentUser } from '@/lib/supabase';
import { CERTIFICATE_FEE, money, type Area } from '@/lib/assessments/catalog';
import { signCertificate, securityCode } from '@/lib/assessments/server';
import PrintButton from '@/lib/print-button';
import { generateCertificate } from '@/app/assessments/actions';
import CertificateView from './view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Certificate verification — Tigermax Jobs', robots: { index: false } };

const DOWNLOAD_HOURS = 72; // each paid download can be printed or saved for 72 hours; after that a new one costs US$1

// Public verification for anyone holding the serial or scanning the QR code. The printable certificate itself is
// shown only to its owner during the download window. Every certificate is signed (HMAC) on the server: a copy that
// has been altered, or a serial that was never issued, fails here.
export default async function Certificate({ params, searchParams }: { params: { serial: string }; searchParams: Record<string, string> }) {
  const db = adminClient();
  const { data: c } = await db.from('assessment_certificates').select('*').eq('serial', params.serial.toUpperCase()).maybeSingle();
  if (!c) return (
    <div style={{ maxWidth: 620, margin: '30px auto' }} className="center">
      <h1 className="h-lg">No certificate with this serial.</h1>
      <p className="lead">The serial <span className="mono">{params.serial}</span> was not issued by Tigermax Jobs. If someone gave you this certificate, treat it as not genuine and contact us on +263 77 133 1008.</p>
    </div>
  );
  const expected = signCertificate({ serial: c.serial, full_name: c.full_name, issued_at: new Date(c.issued_at).toISOString(), stars: c.stars, snapshot: c.snapshot });
  const authentic = expected.length === c.signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(c.signature));
  const valid = authentic && c.status === 'valid';
  const { user, role } = await currentUser();
  const owner = user?.id === c.user_id || role === 'staff';
  const inWindow = Date.now() - new Date(c.issued_at).getTime() < DOWNLOAD_HOURS * 3600e3;
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tigermaxjobs.com';
  const url = `${site}/certificates/${c.serial}`;
  const snap = c.snapshot as { done: { code: string; name: string; area: Area; date: string }[]; pending: { code: string; name: string; area: Area }[] };
  const issued = new Date(c.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const code = securityCode(c.signature);

  const verify = (
    <div className={`card verify ${valid ? 'ok' : 'bad'}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{valid ? '✓ Genuine Tigermax Jobs certificate' : c.status === 'revoked' ? '✗ This certificate has been revoked' : '✗ This certificate failed verification'}</h2>
        <span className="mono">{c.serial}</span>
      </div>
      <div className="mini">
        <div className="ln"><span>Name</span><b>{c.full_name}</b></div>
        <div className="ln"><span>Issued</span><span>{issued}</span></div>
        <div className="ln"><span>Rating</span><span className="stars">{'★'.repeat(c.stars)}<span className="off">{'★'.repeat(5 - c.stars)}</span> ({c.stars} of 5 assessment areas)</span></div>
        <div className="ln"><span>Security code</span><span className="mono">{code}</span></div>
        <div className="ln"><span>Tests completed</span><span>{snap.done.map(d => `${d.name} (${new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB')})`).join(' · ') || 'None'}</span></div>
        <div className="ln"><span>Tests pending</span><span>{snap.pending.map(d => d.name).join(' · ') || 'None'}</span></div>
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>Check that the name, serial and security code here match the paper or PDF in front of you. The certificate records which assessments were completed by its issue date; it does not show scores. Results are never the only basis for an employment decision.</p>
    </div>
  );

  if (!owner || !inWindow) return (
    <>
      <p className="eyebrow">Certificate verification</p>
      {verify}
      {owner && <div className="card noprint">
        <p style={{ marginTop: 0 }}>The {DOWNLOAD_HOURS}-hour download window for this certificate has closed. It stays verifiable here. Get a new certificate with your latest record for {money(CERTIFICATE_FEE)}.</p>
        <form action={generateCertificate}><button className="gold">Get a new certificate · {money(CERTIFICATE_FEE)}</button></form>
      </div>}
    </>
  );

  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0f1f3d', light: '#ffffff00' } });
  const seed = parseInt(createHash('sha256').update(c.serial).digest('hex').slice(0, 8), 16);

  return (
    <>
      {searchParams.new && <p className="notice noprint">Your certificate is ready. Print it or save it as PDF now: you can download it for {DOWNLOAD_HOURS} hours. Anyone can check it at the QR link.</p>}
      <div className="row noprint" style={{ marginBottom: 14 }}><PrintButton label="Download / print certificate" /><Link className="btn ghost" href="/candidate#career">My dashboard</Link></div>

      <CertificateView c={c} snap={snap} qr={qr} seed={seed} code={code} issued={issued} url={url} />
      <div className="noprint" style={{ marginTop: 22 }}>{verify}</div>
    </>
  );
}

