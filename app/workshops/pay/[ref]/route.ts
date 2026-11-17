import { NextResponse } from 'next/server';
import { paynowFor } from '@/lib/workshop-pay';

export const dynamic = 'force-dynamic';

// Payment link for a workshop registration: /workshops/pay/TMJ-WS-XXXX starts a Paynow payment
// (EcoCash, OneMoney, cards). Printed on every invoice so the attendee or their company can pay later.
export async function GET(req: Request, { params }: { params: { ref: string } }) {
  const to = await paynowFor(params.ref);
  return NextResponse.redirect(to.startsWith('http') ? to : new URL(to, req.url));
}
