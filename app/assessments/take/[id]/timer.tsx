'use client';
import { useEffect, useState } from 'react';

// Display only: the deadline is enforced on the server. At zero the page reloads and the server closes the sitting.
export default function Timer({ expiresAt }: { expiresAt: string }) {
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, end - Date.now());
      setLeft(l);
      if (l <= 0) { clearInterval(t); setTimeout(() => location.reload(), 1500); }
    }, 500);
    return () => clearInterval(t);
  }, [end]);
  const s = Math.ceil(left / 1000), m = Math.floor(s / 60), r = s % 60;
  return (
    <div className={`timer ${s <= 60 ? 'low' : ''}`} role="timer" aria-live={s <= 60 ? 'polite' : 'off'} aria-label="Time left">
      Time left {m}:{String(r).padStart(2, '0')}
    </div>
  );
}
