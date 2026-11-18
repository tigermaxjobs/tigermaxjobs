'use client';
export default function PrintButton({ label }: { label: string }) {
  return <button className="ghost" onClick={() => window.print()}>{label}</button>;
}
