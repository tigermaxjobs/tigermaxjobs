'use client';
import { useFormStatus } from 'react-dom';

// Submit button that shows it is working while the server action runs, so people do not click twice.
export default function SubmitButton({ label, pending, className }: { label: string; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button className={`${className || ''} ${busy ? 'busy' : ''}`} disabled={busy} aria-busy={busy}>
      {busy && <span className="spinner" aria-hidden />}{busy ? pending : label}
    </button>
  );
}
