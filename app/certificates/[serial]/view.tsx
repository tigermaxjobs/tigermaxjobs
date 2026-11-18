import { AREAS, type Area } from '@/lib/assessments/catalog';

type Snap = { done: { code: string; name: string; area: Area; date: string }[]; pending: { code: string; name: string; area: Area }[] };

// The printable certificate. Security features: serial + HMAC security code, QR link to the public verification page,
// a guilloche border unique to the serial, microtext lines and a name watermark.
export default function CertificateView({ c, snap, qr, seed, code, issued, url }:
  { c: { serial: string; full_name: string; stars: number }; snap: Snap; qr: string; seed: number; code: string; issued: string; url: string }) {
  return (
    <div className="certificate" aria-label="Certificate">
        <Guilloche seed={seed} />
        <div className="cert-micro top">{Array(14).fill(`TIGERMAX JOBS · CAREER INTELLIGENCE · ${c.serial} · `).join('')}</div>
        <div className="cert-micro bottom">{Array(14).fill(`VERIFY AT TIGERMAXJOBS.COM/CERTIFICATES · ${code} · `).join('')}</div>
        <div className="cert-water" aria-hidden>{Array(18).fill(c.full_name.toUpperCase()).join('   ·   ')}</div>
        <div className="cert-body">
          <img src="/logo.png" alt="Tigermax Jobs" height={46} />
          <div className="cert-stars" aria-label={`${c.stars} of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < c.stars ? 'on' : ''}>★</span>)}</div>
          <p className="cert-kicker">Career Intelligence Certificate</p>
          <p className="cert-small">This certifies that</p>
          <h1 className="cert-name">{c.full_name}</h1>
          <p className="cert-small">has completed the following Tigermax Jobs assessments</p>
          <div className="cert-cols">
            <div><b>Completed</b>{(Object.keys(AREAS) as Area[]).map(a => { const d = snap.done.filter(x => x.area === a); return d.length ? <div key={a}><i>{AREAS[a]}</i>{d.map(x => <div key={x.code}>✓ {x.name} · {new Date(x.date + 'T12:00:00').toLocaleDateString('en-GB')}</div>)}</div> : null; })}</div>
            <div><b>Pending</b>{snap.pending.length ? snap.pending.map(x => <div key={x.code}>○ {x.name}</div>) : <div>None: all assessments completed</div>}</div>
          </div>
          <div className="cert-foot">
            <div className="cert-qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="cert-meta">
              <div>Serial <b className="mono">{c.serial}</b></div>
              <div>Security code <b className="mono">{code}</b></div>
              <div>Issued {issued}</div>
              <div className="cert-small">Scan or visit {url.replace(/^https?:\/\//, '')} to verify. This certificate lists assessments taken, not scores.</div>
            </div>
            <div className="cert-seal"><span>TIGERMAX<br />JOBS</span><small>★ VERIFIED ★</small></div>
          </div>
        </div>
      </div>
  );
}

// Fine-line guilloche ribbons around the edge, generated from the serial: every certificate has its own pattern,
// which is hard to reproduce by hand and makes tampering with a printout visible.
function Guilloche({ seed }: { seed: number }) {
  const f = (n: number) => ((seed >> n) & 7) + 4;
  const ph = (seed % 628) / 100;
  const paths: string[] = [];
  for (let k = 0; k < 8; k++) {
    const w = f(k), off = ph + (k * Math.PI) / 4;
    const wave = (n: number, fn: (i: number) => [number, number]) => { let d = ''; for (let i = 0; i <= n; i++) { const [x, y] = fn(i); d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`; } return d; };
    paths.push(wave(400, i => { const x = i / 4; return [x, 3.2 + 1.6 * Math.sin((x / 100) * w * 2 * Math.PI + off)]; }));
    paths.push(wave(400, i => { const x = i / 4; return [x, 96.8 + 1.6 * Math.sin((x / 100) * w * 2 * Math.PI - off)]; }));
    paths.push(wave(300, i => { const y = i / 3; return [2.2 + 1.1 * Math.sin((y / 100) * w * 2 * Math.PI + off), y]; }));
    paths.push(wave(300, i => { const y = i / 3; return [97.8 + 1.1 * Math.sin((y / 100) * w * 2 * Math.PI - off), y]; }));
  }
  return (
    <svg className="cert-guilloche" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke={i % 8 < 4 ? '#1a2f57' : '#c9a227'} strokeWidth="0.5" vectorEffect="non-scaling-stroke" opacity="0.6" />)}
    </svg>
  );
}
