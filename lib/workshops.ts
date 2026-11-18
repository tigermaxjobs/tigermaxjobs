// Workshops & events. Events live in the `workshops` table; each has its own registration questions (form_fields).
export type Field = { name: string; label: string; type: 'text' | 'textarea' | 'select'; required?: boolean; options?: string[]; help?: string };
export type Workshop = {
  id: string; slug: string; title: string; tagline: string | null; description: string | null; host: string | null;
  starts_on: string; ends_on: string | null; time_label: string | null; venue: string; focus: string[] | null;
  audience: string | null; price_usd: number; member_price_usd: number | null; price_note: string | null;
  capacity: number | null; form_fields: Field[]; published: boolean;
  delivery: 'in_person' | 'online'; modules: Module[];
};
// Online, self-paced workshops: open all the time; attendees start straight after registration (once paid).
export type Module = { id: string; title: string; minutes?: number; body: string; check?: string };
export const isOnline = (w: Pick<Workshop, 'delivery'>) => w.delivery === 'online';
export const totalMinutes = (w: Pick<Workshop, 'modules'>) => (w.modules || []).reduce((n, m) => n + (Number(m.minutes) || 0), 0);
export const canLearn = (status: string) => status === 'confirmed' || status === 'paid';

// Manual payment details printed on invoices (default: EcoCash below). BANK_DETAILS in the hosting environment overrides them, one line per row, e.g.
// "Bank: CBZ Bank\nAccount name: Tigermax Jobs\nAccount number: 0123456789\nBranch: Kwame Nkrumah\nCurrency: USD"
export function bankLines(): string[] {
  const set = (process.env.BANK_DETAILS || '').split(/\\n|\n/).map(s => s.trim()).filter(Boolean);
  return set.length ? set : MANUAL_PAYMENT;
}

// How to pay without the Paynow link. Change here (or override with BANK_DETAILS) if the details change.
export const MANUAL_PAYMENT = ['EcoCash: M. Msipa', 'EcoCash number: 0782 652 675'];
export const PROOF_WHATSAPP = '+263 77 133 1008';
export const PROOF_WHATSAPP_LINK = 'https://wa.me/263771331008';

export const fmtDay = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function dateLabel(w: Pick<Workshop, 'starts_on' | 'ends_on'>) {
  if (!w.ends_on || w.ends_on === w.starts_on) return fmtDay(w.starts_on);
  const a = new Date(w.starts_on + 'T12:00:00'), b = new Date(w.ends_on + 'T12:00:00');
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  return sameMonth
    ? `${a.getDate()}–${b.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : `${a.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} – ${b.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export const priceLabel = (n: number | null | undefined) => (!n ? 'FREE' : `US$${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`);

export const isPast = (w: Pick<Workshop, 'starts_on' | 'ends_on'> & { delivery?: string }) =>
  w.delivery !== 'online' && (w.ends_on || w.starts_on) < new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);

// Unguessable reference: doubles as the attendee's private link to their ticket / invoice.
export function newReference() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return 'TMJ-WS-' + Array.from(bytes, b => abc[b % abc.length]).join('');
}
export function newInvoiceNo() {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Seat confirmed', paid: 'Paid · seat confirmed', awaiting_payment: 'Awaiting payment', cancelled: 'Cancelled',
};
